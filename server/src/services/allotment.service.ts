import {
  AdmissionStage,
  ApplicationStatus,
  RoundStatus,
  SeatPublication,
  SeatResponse,
  SeatResult,
} from '@sams/shared';
import mongoose, { type ClientSession } from 'mongoose';
import { badRequest, conflict, notFound } from '../errors';
import {
  AdmissionCycle,
  AdmissionRound,
  Application,
  Programme,
  SeatAllotment,
} from '../models';

export class AllotmentService {
  /**
   * Helper to execute work inside a MongoDB transaction if supported.
   * Gracefully falls back to non-transactional execution in standalone test/dev MongoDB.
   */
  static async runInTransaction<T>(
    work: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    let session: ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (err: any) {
      if (session && session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore abort error
        }
      }
      // If MongoDB standalone server does not support replica set transactions or retryable writes
      if (
        err?.message?.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
        err?.message?.includes('transactions are not supported') ||
        err?.message?.includes('does not support retryable writes') ||
        (err?.name === 'MongoServerError' && err?.message?.includes('retryable writes'))
      ) {
        return await work(undefined);
      }
      throw err;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch {
          // ignore session end error
        }
      }
    }
  }

  /**
   * Resolves the authoritative current round for the active admission cycle.
   */
  static async getCurrentRound() {
    // 1. Try to find published round with highest round number
    let round = await AdmissionRound.findOne({ status: RoundStatus.Published })
      .populate('seatMatrix.programmeId')
      .sort({ roundNumber: -1 });

    if (!round) {
      // 2. Try to find round in AllotmentRun or Open
      round = await AdmissionRound.findOne({
        status: { $in: [RoundStatus.AllotmentRun, RoundStatus.Open] },
      })
        .populate('seatMatrix.programmeId')
        .sort({ roundNumber: -1 });
    }

    if (!round) {
      // 3. Fallback to latest created round
      round = await AdmissionRound.findOne()
        .populate('seatMatrix.programmeId')
        .sort({ roundNumber: -1 });
    }

    return round;
  }

  /**
   * Resolves the authoritative active allotment for an application in the current round.
   */
  static async getCurrentAllotmentForApplication(applicationId: string, currentRoundInput?: any) {
    let currentRound = currentRoundInput;
    if (!currentRound) {
      currentRound = await this.getCurrentRound();
    } else if (typeof currentRound === 'string') {
      currentRound = await AdmissionRound.findById(currentRound);
    }
    if (!currentRound) return null;

    // First check active allotment for this specific round
    let allotment = await SeatAllotment.findOne({
      applicationId,
      roundId: currentRound._id,
      isActive: true,
      publication: SeatPublication.Published,
    })
      .populate('programmeId')
      .populate('roundId')
      .sort({ revision: -1, createdAt: -1 });

    // If not found in current round, check if applicant holds a confirmed/accepted seat from any active round
    if (!allotment) {
      allotment = await SeatAllotment.findOne({
        applicationId,
        isActive: true,
        publication: SeatPublication.Published,
        result: SeatResult.Allotted,
        response: SeatResponse.Accepted,
      })
        .populate('programmeId')
        .populate('roundId')
        .sort({ createdAt: -1 });
    }

    return allotment;
  }

  /**
   * Reconciles seatMatrix numbers against actual allotment documents.
   */
  static async reconcileRoundSeatMatrix(roundId: string, session?: ClientSession) {
    const round = await AdmissionRound.findById(roundId).session(session || null);
    if (!round) return null;

    const allotments = await SeatAllotment.find({
      roundId: round._id,
      isActive: true,
      publication: SeatPublication.Published,
    }).session(session || null);

    const advancedStages = [
      AdmissionStage.SeatConfirmed,
      AdmissionStage.PaymentCompleted,
      AdmissionStage.VerificationPending,
      AdmissionStage.AdmissionConfirmed,
    ];

    for (const sm of round.seatMatrix) {
      const progIdStr = (sm.programmeId as any)?._id?.toString() || sm.programmeId.toString();
      const progAllotments = allotments.filter(
        (a) => a.programmeId && a.programmeId.toString() === progIdStr && a.result === SeatResult.Allotted,
      );

      const offered = progAllotments.filter((a) => a.response === SeatResponse.Pending).length;
      const accepted = progAllotments.filter((a) => a.response === SeatResponse.Accepted).length;

      // Count confirmed students in this programme
      const appIds = progAllotments.map((a) => a.applicationId);
      const confirmedCount = await Application.countDocuments({
        _id: { $in: appIds },
        admissionStage: { $in: advancedStages },
      }).session(session || null);

      sm.offered = offered;
      sm.accepted = accepted;
      sm.confirmed = confirmedCount;
      sm.allotted = offered + accepted;
      sm.available = Math.max(0, sm.capacity - sm.allotted);
    }

    await round.save({ session: session || undefined });
    return round;
  }

  /**
   * Executes deterministic system-assisted allotment for a round with concurrency locks and transactions.
   */
  static async runRoundAllocation(roundId: string, adminUserId?: string) {
    const round = await AdmissionRound.findById(roundId);
    if (!round) throw notFound('Admission round not found');

    // Rule 5: Prevent rerunning allotment after round is Published or Closed
    if (round.status === RoundStatus.Published || round.status === RoundStatus.Closed) {
      throw conflict(`Cannot run allotment on a round that is already ${round.status}.`);
    }

    // Rule 6: Concurrency lock
    const runId = new mongoose.Types.ObjectId().toString();
    const lockedRound = await AdmissionRound.findOneAndUpdate(
      {
        _id: roundId,
        status: { $nin: [RoundStatus.Published, RoundStatus.Closed] },
        'allocationLock.isLocked': { $ne: true },
      },
      {
        $set: {
          'allocationLock.isLocked': true,
          'allocationLock.lockedAt': new Date(),
          'allocationLock.lockedBy': adminUserId || null,
          'allocationLock.runId': runId,
        },
      },
      { new: true },
    );

    if (!lockedRound) {
      throw conflict('An allotment calculation is already running for this round or round is locked.');
    }

    try {
      return await this.runInTransaction(async (session) => {
        // Rule 8: Exclude applicants who already have an accepted, paid, verification-pending, or admission-confirmed seat
        const confirmedStages = [
          AdmissionStage.SeatConfirmed,
          AdmissionStage.PaymentCompleted,
          AdmissionStage.VerificationPending,
          AdmissionStage.AdmissionConfirmed,
        ];

        // Find application IDs of candidates who have an accepted allotment
        const acceptedAllotmentAppIds = await SeatAllotment.distinct('applicationId', {
          isActive: true,
          result: SeatResult.Allotted,
          response: SeatResponse.Accepted,
        }).session(session || null);
        const acceptedAppIdSet = new Set(acceptedAllotmentAppIds.map((id) => id.toString()));

        // Fetch eligible submitted applicants sorted by meritRank ascending, excluding confirmed candidates
        const rawApplicants = await Application.find({
          status: { $in: [ApplicationStatus.Submitted, ApplicationStatus.Eligible] },
          locked: true,
          admissionStage: {
            $nin: [AdmissionStage.Withdrawn, ...confirmedStages],
          },
        })
          .populate('userId', 'fullName email')
          .sort({ meritRank: 1, submittedAt: 1, _id: 1 })
          .session(session || null);

        // Filter out any candidates who already hold an accepted allotment
        const eligibleApplicants = rawApplicants.filter(
          (app) => !acceptedAppIdSet.has(app._id.toString()),
        );

        // Fetch programme base capacities for reference
        const allProgs = await Programme.find().session(session || null);
        const progBaseCapMap = new Map<string, number>(
          allProgs.map((p: any) => [p._id.toString(), Number(p.baseCapacity) || 0]),
        );

        // Count prior accepted seats per programme
        const priorAcceptedAllotments = await SeatAllotment.find({
          isActive: true,
          roundId: { $ne: round._id },
          result: SeatResult.Allotted,
          response: SeatResponse.Accepted,
        }).session(session || null);

        const priorAcceptedCountMap = new Map<string, number>();
        for (const pa of priorAcceptedAllotments) {
          if (pa.programmeId) {
            const pId = pa.programmeId.toString();
            priorAcceptedCountMap.set(pId, (priorAcceptedCountMap.get(pId) || 0) + 1);
          }
        }

        // Capacity tracking: determine available quota for this round
        const capacityMap = new Map<string, { capacity: number; allotted: number }>();
        round.seatMatrix.forEach((sm) => {
          const progId = (sm.programmeId as any)?._id?.toString() || sm.programmeId.toString();
          const priorAccepted = priorAcceptedCountMap.get(progId) || 0;
          const baseCap: number = progBaseCapMap.get(progId) ?? Number(sm.capacity);

          // If sm.capacity already reflects the round's remaining vacant quota (sm.capacity + priorAccepted <= baseCap),
          // use it directly. Otherwise, subtract prior accepted seats from the total capacity.
          let roundQuota = Number(sm.capacity);
          if (roundQuota + priorAccepted > baseCap) {
            roundQuota = Math.max(0, roundQuota - priorAccepted);
          }

          capacityMap.set(progId, {
            capacity: roundQuota,
            allotted: 0,
          });
        });

        // Clean up uncommitted proposed allotments for this round
        await SeatAllotment.deleteMany({
          roundId: round._id,
          publication: SeatPublication.Proposed,
        }).session(session || null);

        const proposedAllotments = [];

        // Pass 2: Allocate according to merit and preferences
        for (const app of eligibleApplicants) {
          let allottedProgrammeId: string | null = null;
          let isAllotted = false;

          const sortedPrefs = (app.preferences || []).sort(
            (a: any, b: any) => a.preferenceOrder - b.preferenceOrder,
          );

          for (const pref of sortedPrefs) {
            const progId = (pref.programmeId?._id || pref.programmeId).toString();
            const cap = capacityMap.get(progId);
            if (cap && cap.allotted < cap.capacity) {
              allottedProgrammeId = progId;
              cap.allotted += 1;
              isAllotted = true;
              break;
            }
          }

          // Save proposed allotment
          const allotment = await SeatAllotment.findOneAndUpdate(
            { applicationId: app._id, roundId: round._id, publication: SeatPublication.Proposed },
            {
              $set: {
                programmeId: allottedProgrammeId,
                publication: SeatPublication.Proposed,
                result: isAllotted ? SeatResult.Allotted : SeatResult.NotAllotted,
                response: isAllotted ? SeatResponse.Pending : SeatResponse.Declined,
                allottedRank: app.meritRank,
                isActive: true,
                allocationRunId: runId,
                revision: round.version || 1,
              },
            },
            { upsert: true, returnDocument: 'after', session: session || null },
          );

          proposedAllotments.push(allotment);
        }

        // Update seatMatrix locally
        round.seatMatrix.forEach((sm) => {
          const progId = (sm.programmeId as any)?._id?.toString() || sm.programmeId.toString();
          const cap = capacityMap.get(progId);
          if (cap) {
            sm.allotted = cap.allotted;
            sm.available = Math.max(0, sm.capacity - cap.allotted);
          }
        });
        round.status = RoundStatus.AllotmentRun;
        round.version = (round.version || 1) + 1;
        await round.save({ session: session || undefined });

        return {
          allotmentsCount: proposedAllotments.length,
          runId,
          version: round.version,
        };
      });
    } finally {
      // Release lock unconditionally
      await AdmissionRound.updateOne(
        { _id: roundId },
        {
          $set: {
            'allocationLock.isLocked': false,
            'allocationLock.runId': null,
          },
        },
      );
    }
  }

  /**
   * Publishes proposed allotments, marks old allotments inactive/superseded, and updates application stages idempotently.
   */
  static async publishRoundAllotments(roundId: string, adminUserId?: string) {
    const round = await AdmissionRound.findById(roundId);
    if (!round) throw notFound('Admission round not found');

    // Rule 9: Idempotency - if already published, return successfully
    if (round.status === RoundStatus.Published) {
      return { message: 'Round allotments are already published.', round };
    }

    if (round.status !== RoundStatus.AllotmentRun) {
      throw badRequest('Allotment must be run before publishing.');
    }

    return await this.runInTransaction(async (session) => {
      const now = new Date();

      // Find all proposed allotments for this round
      const proposedAllotments = await SeatAllotment.find({
        roundId: round._id,
        publication: SeatPublication.Proposed,
      }).session(session || null);

      if (proposedAllotments.length === 0) {
        throw badRequest('No proposed allotments found to publish.');
      }

      const applicationIds = proposedAllotments.map((a) => a.applicationId);

      // Deactivate/supersede any older active allotments for these applications
      await SeatAllotment.updateMany(
        {
          applicationId: { $in: applicationIds },
          roundId: { $ne: round._id },
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            supersededAt: now,
          },
        },
      ).session(session || null);

      // Publish proposed allotments
      await SeatAllotment.updateMany(
        { roundId: round._id, publication: SeatPublication.Proposed },
        {
          $set: {
            publication: SeatPublication.Published,
            isActive: true,
            publishedAt: now,
            publishedBy: adminUserId || null,
          },
        },
      ).session(session || null);

      // Rule 14: Update candidate stages without moving advanced stages backward
      const advancedStages = [
        AdmissionStage.SeatConfirmed,
        AdmissionStage.PaymentCompleted,
        AdmissionStage.VerificationPending,
        AdmissionStage.AdmissionConfirmed,
      ];

      for (const alt of proposedAllotments) {
        const app = await Application.findById(alt.applicationId).session(session || null);
        if (app) {
          const isAdvanced = advancedStages.includes(app.admissionStage as any);
          if (!isAdvanced) {
            app.admissionStage =
              alt.result === SeatResult.Allotted
                ? AdmissionStage.InRound
                : AdmissionStage.NotAllotted;
            await app.save({ session: session || undefined });
          }
        }
      }

      round.status = RoundStatus.Published;
      round.publishedAt = now;
      round.publishedBy = (adminUserId as any) || null;
      await round.save({ session: session || undefined });

      // Reconcile counters
      await this.reconcileRoundSeatMatrix(round._id.toString(), session);

      return {
        message: 'Round allotments successfully published to all candidates.',
        publishedCount: proposedAllotments.length,
        publishedAt: now,
      };
    });
  }

  /**
   * Responds to an allotment atomically, verifying eligibility, round, and ownership.
   */
  static async respondToAllotment(
    allotmentId: string,
    userId: string,
    decision: 'Accepted' | 'Declined' | 'OptedNextRound',
  ) {
    if (![SeatResponse.Accepted, SeatResponse.Declined, SeatResponse.OptedNextRound].includes(decision as any)) {
      throw badRequest('Response must be Accepted, Declined, or OptedNextRound');
    }

    const app = await Application.findOne({ userId });
    if (!app) throw notFound('Application not found');

    const currentRound = await this.getCurrentRound();
    if (!currentRound) throw notFound('No active admission round found');

    return await this.runInTransaction(async (session) => {
      // Rule 4: Atomic conditional update
      const updatedAllotment = await SeatAllotment.findOneAndUpdate(
        {
          _id: allotmentId,
          applicationId: app._id,
          roundId: currentRound._id,
          publication: SeatPublication.Published,
          isActive: true,
          response: SeatResponse.Pending,
          result: SeatResult.Allotted,
        },
        {
          $set: {
            response: decision,
            respondedAt: new Date(),
          },
        },
        { new: true, session: session || null },
      );

      if (!updatedAllotment) {
        throw conflict(
          'Allotment offer is no longer pending, already responded to, or does not belong to the current published round.',
        );
      }

      // Rule 15: Stage updates based on decision
      if (decision === SeatResponse.Accepted) {
        app.admissionStage = AdmissionStage.SeatConfirmed;
      } else if (decision === SeatResponse.OptedNextRound) {
        // Keeps applicant eligible for subsequent rounds
        app.admissionStage = AdmissionStage.Submitted;
      } else {
        // Declined -> withdrawn
        app.admissionStage = AdmissionStage.Withdrawn;
      }
      await app.save({ session: session || undefined });

      // Rule 13: Reconcile seat counts without blind decrements
      await this.reconcileRoundSeatMatrix(currentRound._id.toString(), session);

      return {
        allotment: updatedAllotment,
        message:
          decision === SeatResponse.Accepted
            ? 'Seat accepted! Please proceed to pay the admission fee.'
            : decision === SeatResponse.OptedNextRound
              ? 'Choice saved. You will participate in the next round for potential upgrades.'
              : 'Seat declined. Application status updated to Withdrawn.',
      };
    });
  }

  /**
   * Diagnostic report checking all 5 integrity constraints (Rule 18).
   */
  static async getDiagnostics(roundId: string) {
    const round = await AdmissionRound.findById(roundId).populate('seatMatrix.programmeId');
    if (!round) throw notFound('Round not found');

    const issues: Array<{ type: string; description: string; count: number; details?: any }> = [];

    // Check 1: More than one active allotment per application
    const activeAllotments = await SeatAllotment.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$applicationId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    if (activeAllotments.length > 0) {
      issues.push({
        type: 'MULTIPLE_ACTIVE_ALLOTMENTS',
        description: 'Applications found with more than one active allotment.',
        count: activeAllotments.length,
        details: activeAllotments,
      });
    }

    // Check 2: Allotments exceeding programme capacity
    const publishedAllotments = await SeatAllotment.find({
      roundId: round._id,
      isActive: true,
      publication: SeatPublication.Published,
      result: SeatResult.Allotted,
    });

    for (const sm of round.seatMatrix) {
      const progId = sm.programmeId._id?.toString() || sm.programmeId.toString();
      const count = publishedAllotments.filter(
        (a) => a.programmeId && a.programmeId.toString() === progId,
      ).length;
      if (count > sm.capacity) {
        issues.push({
          type: 'CAPACITY_EXCEEDED',
          description: `Allotments for programme ${progId} (${count}) exceed capacity (${sm.capacity}).`,
          count: count - sm.capacity,
        });
      }
    }

    // Check 3: SeatMatrix counts matching allotment records
    for (const sm of round.seatMatrix) {
      const progId = sm.programmeId._id?.toString() || sm.programmeId.toString();
      const progAllotments = publishedAllotments.filter(
        (a) => a.programmeId && a.programmeId.toString() === progId,
      );
      const expectedAllotted = progAllotments.filter(
        (a) => a.response === SeatResponse.Pending || a.response === SeatResponse.Accepted,
      ).length;
      if (sm.allotted !== expectedAllotted) {
        issues.push({
          type: 'SEAT_MATRIX_COUNT_MISMATCH',
          description: `Seat matrix allotted (${sm.allotted}) does not match records (${expectedAllotted}) for programme ${progId}.`,
          count: Math.abs(sm.allotted - expectedAllotted),
        });
      }
    }

    // Check 4: Accepted allotments with incorrect application stage
    const acceptedAllotments = await SeatAllotment.find({
      roundId: round._id,
      isActive: true,
      result: SeatResult.Allotted,
      response: SeatResponse.Accepted,
    });
    const appIds = acceptedAllotments.map((a) => a.applicationId);
    const validStages = [
      AdmissionStage.SeatConfirmed,
      AdmissionStage.PaymentCompleted,
      AdmissionStage.VerificationPending,
      AdmissionStage.AdmissionConfirmed,
    ];
    const invalidStageApps = await Application.find({
      _id: { $in: appIds },
      admissionStage: { $nin: validStages },
    });
    if (invalidStageApps.length > 0) {
      issues.push({
        type: 'ACCEPTED_ALLOTMENT_STAGE_MISMATCH',
        description: 'Applicants with accepted seats who do not have an advanced/confirmed stage.',
        count: invalidStageApps.length,
        details: invalidStageApps.map((a) => ({ id: a._id, stage: a.admissionStage })),
      });
    }

    // Check 5: Published allotments from multiple rounds incorrectly marked active
    const multiRoundActive = await SeatAllotment.aggregate([
      { $match: { isActive: true, publication: SeatPublication.Published } },
      { $group: { _id: '$applicationId', distinctRounds: { $addToSet: '$roundId' } } },
      { $project: { _id: 1, roundCount: { $size: '$distinctRounds' } } },
      { $match: { roundCount: { $gt: 1 } } },
    ]);
    if (multiRoundActive.length > 0) {
      issues.push({
        type: 'MULTI_ROUND_ACTIVE_ALLOTMENTS',
        description: 'Applications found with active published allotments from multiple rounds.',
        count: multiRoundActive.length,
      });
    }

    return {
      healthy: issues.length === 0,
      roundId: round._id,
      roundName: round.name,
      status: round.status,
      version: round.version,
      issuesCount: issues.length,
      issues,
    };
  }
}

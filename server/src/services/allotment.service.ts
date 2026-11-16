import { CounsellingService } from './counselling.service';
import {
  AdmissionStage,
  RoundStatus,
  SeatPublication,
  SeatResponse,
  SeatResult,
} from '@sams/shared';
import type { ClientSession } from 'mongoose';
import { notFound } from '../errors';
import {
  AdmissionRound,
  Application,
  SeatAllotment,
} from '../models';

export class AllotmentService {
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
        response: { $in: [SeatResponse.Accepted, SeatResponse.OptedNextRound] },
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
    const round = await AdmissionRound.findById(roundId);
    if (!round) return null;
    round.set('seatMatrix', await CounsellingService.inventory());
    await round.save();
    return round;
  }

  /**
   * Executes deterministic system-assisted allotment for a round with concurrency locks and transactions.
   */
  static async runRoundAllocation(roundId: string, adminUserId?: string) {
    return CounsellingService.allocate(roundId);
  }

  /**
   * Publishes proposed allotments, marks old allotments inactive/superseded, and updates application stages idempotently.
   */
  static async publishRoundAllotments(roundId: string, adminUserId?: string) {
    return CounsellingService.publish(roundId, adminUserId);
  }

  /**
   * Responds to an allotment atomically, verifying eligibility, round, and ownership.
   */
  static async respondToAllotment(id: string, userId: string, decision: any) {
    return CounsellingService.respond(id, userId, decision);
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
        (a) => a.response === SeatResponse.Pending || a.response === SeatResponse.Accepted || a.response === SeatResponse.OptedNextRound,
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
      response: { $in: [SeatResponse.Accepted, SeatResponse.OptedNextRound] },
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

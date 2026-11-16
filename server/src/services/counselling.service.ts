import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  AdmissionStage,
  ApplicationStatus,
  SeatResponse,
  SeatPublication,
  SeatResult,
  RoundStatus,
  PaymentStatus,
  GatePassValidity,
  ChecklistStatus,
  ChecklistItemStatus,
} from '@sams/shared';
import {
  AdmissionRound,
  Application,
  Programme,
  SeatAllotment,
  Payment,
  QRGatePass,
  DigitalChecklist,
  VerificationCounter,
  AuditLog,
} from '../models';
import { badRequest, conflict, notFound } from '../errors';

mongoose.set('transactionAsyncLocalStorage', true);
const State = mongoose.model(
  'CounsellingState',
  new mongoose.Schema({
    _id: String,
    revision: { type: Number, default: 0 },
  }),
);
const heldResponses = [SeatResponse.Accepted, SeatResponse.OptedNextRound];
const holdingQuery = {
  isActive: true,
  publication: SeatPublication.Published,
  result: SeatResult.Allotted,
};

/** One transaction serializes all counselling mutations through a shared revision. */
export async function counsellingTransaction<T>(
  work: (revision: number) => Promise<T>,
): Promise<T> {
  try {
    await State.updateOne(
      { _id: 'current' },
      { $setOnInsert: { revision: 0 } },
      { upsert: true },
    );
  } catch (error: any) {
    if (error.code !== 11000) throw error;
  }
  return mongoose.connection.transaction(async () => {
    const state = await State.findOneAndUpdate(
      { _id: 'current' },
      { $inc: { revision: 1 } },
      { new: true },
    );
    return work(state!.revision);
  });
}

export class CounsellingService {
  static async inventory() {
    const programmes = await Programme.find().sort({ code: 1 });
    const latestRound = await AdmissionRound.findOne().sort({ roundNumber: -1 });

    // If an allotment run has been calculated for the current round (Proposed),
    // include those proposed allotments so allotted counts are immediately visible.
    const hasProposed = latestRound?.status === RoundStatus.AllotmentRun;
    const query = hasProposed
      ? {
          roundId: latestRound._id,
          result: SeatResult.Allotted,
        }
      : {
          ...holdingQuery,
          response: { $in: [SeatResponse.Pending, ...heldResponses] },
        };

    const holdings = await SeatAllotment.find(query);
    const paidApplications = new Set(
      (
        await Payment.distinct('applicationId', {
          status: PaymentStatus.Success,
        })
      ).map(String),
    );
    return programmes.map((p) => {
      const seats = holdings.filter(
        (h) => String(h.programmeId) === String(p._id),
      );
      const offered = seats.filter(
        (h) =>
          h.response === SeatResponse.Pending ||
          !paidApplications.has(String(h.applicationId)),
      ).length;
      const floating = seats.filter(
        (h) =>
          h.response === SeatResponse.OptedNextRound &&
          paidApplications.has(String(h.applicationId)),
      ).length;
      const frozen = seats.filter(
        (h) =>
          h.response === SeatResponse.Accepted &&
          paidApplications.has(String(h.applicationId)),
      ).length;
      return {
        programmeId: p._id,
        capacity: p.baseCapacity,
        offered,
        floating,
        frozen,
        accepted: floating + frozen,
        confirmed: floating + frozen,
        allotted: seats.length,
        available: Math.max(0, p.baseCapacity - seats.length),
      };
    });
  }

  static async refresh() {
    const inventory = await this.inventory();
    const round = await AdmissionRound.findOne().sort({ roundNumber: -1 });
    if (round) {
      round.set('seatMatrix', inventory);
      await round.save();
    }
  }

  static async createRound(input: any) {
    return counsellingTransaction(async () => {
      const latest = await AdmissionRound.findOne().sort({ roundNumber: -1 });
      if (latest && latest.status !== RoundStatus.Closed)
        throw conflict('Close the previous round first.');
      if (latest?.get('isFinal'))
        throw conflict(
          'Regular counselling has ended. Spot rounds are excluded.',
        );
      const responseDeadline = new Date(input.responseDeadline);
      const withdrawalDeadline = new Date(input.withdrawalDeadline);
      if (
        !input.name?.trim() ||
        !Number.isFinite(+responseDeadline) ||
        +responseDeadline <= Date.now()
      )
        throw badRequest('Provide a name and future response deadline.');
      if (
        !Number.isFinite(+withdrawalDeadline) ||
        +withdrawalDeadline < +responseDeadline
      )
        throw badRequest(
          'Withdrawal deadline must be on or after the response deadline.',
        );
      const round = await AdmissionRound.create({
        name: input.name.trim(),
        roundNumber: (latest?.roundNumber || 0) + 1,
        status: RoundStatus.Open,
        responseDeadline,
        withdrawalDeadline,
        isFinal: input.isFinal === true,
        seatMatrix: await this.inventory(),
      });
      return {
        round,
        message: 'Round created with the full counselling seat inventory.',
      };
    });
  }

  static async allocate(roundId: string) {
    return counsellingTransaction(async (revision) => {
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      if (round.allocationLock?.isLocked)
        throw conflict('Allocation is already running');
      if (
        ![
          RoundStatus.Open,
          RoundStatus.Draft,
          RoundStatus.AllotmentRun,
        ].includes(round.status as any)
      )
        throw conflict('This round is locked.');
      if (
        await AdmissionRound.exists({
          roundNumber: { $lt: round.roundNumber },
          status: { $ne: RoundStatus.Closed },
        })
      )
        throw conflict('Close earlier rounds first.');
      const programmes = await Programme.find();
      const remaining = new Map(
        programmes.map((p) => [String(p._id), p.baseCapacity]),
      );
      const holdings = await SeatAllotment.find({
        ...holdingQuery,
        response: { $in: heldResponses },
      });
      const byApplicant = new Map(
        holdings.map((h) => [String(h.applicationId), h]),
      );
      for (const seat of holdings) {
        const id = String(seat.programmeId);
        remaining.set(id, (remaining.get(id) || 0) - 1);
      }
      if ([...remaining.values()].some((n) => n < 0))
        throw conflict(
          'Existing holdings exceed capacity. Correct the inventory first.',
        );
      const applicants = await Application.find({
        locked: true,
        meritRank: { $gt: 0 },
        status: {
          $in: [ApplicationStatus.Submitted, ApplicationStatus.Eligible],
        },
        admissionStage: {
          $nin: [AdmissionStage.Withdrawn, AdmissionStage.Rejected],
        },
      }).sort({ meritRank: 1, submittedAt: 1, _id: 1 });
      const candidates = applicants.filter((a) => {
        const holding = byApplicant.get(String(a._id));
        if (holding?.response === SeatResponse.Accepted) return false;
        return (
          !!holding ||
          ![
            AdmissionStage.SeatConfirmed,
            AdmissionStage.PaymentCompleted,
            AdmissionStage.VerificationPending,
            AdmissionStage.AdmissionConfirmed,
          ].includes(a.admissionStage as any)
        );
      });
      const assignments = new Map<string, string | null>();
      for (const a of candidates)
        assignments.set(
          String(a._id),
          byApplicant.get(String(a._id))?.programmeId?.toString() || null,
        );
      // Revisit merit order until every vacancy released by an upgrade has propagated.
      let changed = true;
      while (changed) {
        changed = false;
        for (const applicant of candidates) {
          const id = String(applicant._id);
          const current = assignments.get(id) || null;
          const preferences = [...applicant.preferences]
            .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
            .map((p) => String(p.programmeId));
          const currentIndex = current
            ? preferences.indexOf(current)
            : preferences.length;
          if (current && currentIndex < 0)
            throw conflict(
              'A held programme is missing from locked preferences.',
            );
          const better = preferences
            .slice(0, currentIndex)
            .find((p) => (remaining.get(p) || 0) > 0);
          if (!better) continue;
          remaining.set(better, remaining.get(better)! - 1);
          if (current)
            remaining.set(current, (remaining.get(current) || 0) + 1);
          assignments.set(id, better);
          changed = true;
        }
      }
      await SeatAllotment.deleteMany({
        roundId,
        publication: SeatPublication.Proposed,
      });
      for (const applicant of candidates) {
        const programmeId = assignments.get(String(applicant._id));
        const held = byApplicant.get(String(applicant._id));
        await SeatAllotment.create({
          applicationId: applicant._id,
          roundId,
          programmeId,
          result: programmeId ? SeatResult.Allotted : SeatResult.NotAllotted,
          response: held
            ? SeatResponse.OptedNextRound
            : programmeId
              ? SeatResponse.Pending
              : SeatResponse.Declined,
          publication: SeatPublication.Proposed,
          isActive: false,
          revision: round.version,
          allottedRank: applicant.meritRank,
        });
      }
      round.version += 1;
      round.status = RoundStatus.AllotmentRun;
      round.set('previewRevision', revision);
      await round.save();
      return {
        round,
        proposedCount: candidates.length,
        message:
          'Preview calculated. Existing seats are retained until publication.',
      };
    });
  }

  static async publish(roundId: string, adminId?: string) {
    return counsellingTransaction(async (revision) => {
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      if (round.status === RoundStatus.Published)
        return { round, message: 'Already published.' };
      if (
        round.status !== RoundStatus.AllotmentRun ||
        round.get('previewRevision') !== revision - 1
      )
        throw conflict('Counselling data changed. Recalculate the preview.');
      if (!round.responseDeadline || +round.responseDeadline <= Date.now())
        throw conflict('Set a future response deadline before publishing.');
      const proposals = await SeatAllotment.find({
        roundId,
        publication: SeatPublication.Proposed,
      });
      for (const proposal of proposals) {
        await SeatAllotment.updateMany(
          {
            applicationId: proposal.applicationId,
            isActive: true,
            publication: SeatPublication.Published,
          },
          {
            $set: {
              isActive: false,
              supersededAt: new Date(),
              supersededBy: proposal._id,
            },
          },
        );
        proposal.publication = SeatPublication.Published;
        proposal.isActive = true;
        proposal.publishedAt = new Date();
        proposal.publishedBy = adminId as any;
        await proposal.save();
        if (proposal.response !== SeatResponse.OptedNextRound)
          await Application.updateOne(
            { _id: proposal.applicationId },
            {
              $set: {
                admissionStage: proposal.programmeId
                  ? AdmissionStage.InRound
                  : AdmissionStage.NotAllotted,
              },
            },
          );
      }
      round.status = RoundStatus.Published;
      round.publishedAt = new Date();
      await round.save();
      await this.refresh();
      return {
        round,
        publishedCount: proposals.length,
        message: 'Allotments published.',
      };
    });
  }

  static async respond(id: string, userId: string, response: string) {
    return counsellingTransaction(async () => {
      if (![...heldResponses, SeatResponse.Declined].includes(response as any))
        throw badRequest('Choose Freeze, Float, or Decline.');
      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');
      const seat = await SeatAllotment.findOne({
        _id: id,
        applicationId: app._id,
        ...holdingQuery,
      });
      if (!seat)
        throw conflict(
          'Offer is inactive or does not belong to the current published round.',
        );
      const round = await AdmissionRound.findOne().sort({ roundNumber: -1 });
      if (
        !round ||
        round.status !== RoundStatus.Published ||
        !round.responseDeadline ||
        +round.responseDeadline <= Date.now()
      )
        throw conflict('Response window is closed.');
      if (
        seat.response === SeatResponse.Pending &&
        String(seat.roundId) !== String(round._id)
      )
        throw conflict('Offer does not belong to the current published round.');
      if (seat.response === response)
        return { allotment: seat, message: 'Choice already saved.' };
      const freezingFloat =
        seat.response === SeatResponse.OptedNextRound &&
        response === SeatResponse.Accepted;
      if (seat.response !== SeatResponse.Pending && !freezingFloat)
        throw conflict('Use withdrawal to exit an accepted seat.');
      seat.response = response as any;
      seat.respondedAt = new Date();
      if (response === SeatResponse.Declined) {
        seat.isActive = false;
        app.admissionStage = AdmissionStage.Withdrawn;
      } else if (!freezingFloat)
        app.admissionStage = AdmissionStage.SeatConfirmed;
      await seat.save();
      await app.save();
      await this.refresh();
      await AuditLog.create({
        actorId: userId,
        actorRole: 'Applicant',
        action: response,
        entity: 'SeatAllotment',
        entityId: String(seat._id),
        summary: 'Counselling choice recorded',
      });
      return {
        allotment: seat,
        message:
          response === SeatResponse.OptedNextRound
            ? 'Float saved. Complete simulated payment to retain your backup seat.'
            : 'Response saved.',
      };
    });
  }

  static async withdraw(userId: string) {
    return counsellingTransaction(async () => {
      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');
      if (app.admissionStage === AdmissionStage.Withdrawn)
        return { message: 'Already withdrawn.' };
      const latest = await AdmissionRound.findOne().sort({ roundNumber: -1 });
      const deadline = latest?.withdrawalDeadline;
      if (!deadline || +deadline <= Date.now())
        throw conflict('Withdrawal deadline has passed.');
      await SeatAllotment.updateMany(
        { applicationId: app._id, isActive: true },
        {
          $set: {
            isActive: false,
            response: SeatResponse.Declined,
            respondedAt: new Date(),
          },
        },
      );
      await QRGatePass.updateOne(
        { applicationId: app._id },
        { $set: { validity: GatePassValidity.Revoked } },
      );
      app.admissionStage = AdmissionStage.Withdrawn;
      await app.save();
      await this.refresh();
      await AuditLog.create({
        actorId: userId,
        actorRole: 'Applicant',
        action: 'Withdraw',
        entity: 'Application',
        entityId: String(app._id),
        summary: 'Withdrew and released current seat',
      });
      return {
        message:
          'Withdrawn from counselling. Your seat has been released. Payment history is retained.',
      };
    });
  }

  static async close(roundId: string) {
    return counsellingTransaction(async () => {
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      if (round.status === RoundStatus.Closed) return { round };
      if (
        round.status !== RoundStatus.Published ||
        !round.responseDeadline ||
        +round.responseDeadline > Date.now()
      )
        throw conflict('The response deadline must pass before closure.');
      const seats = await SeatAllotment.find({
        ...holdingQuery,
        response: { $in: [SeatResponse.Pending, ...heldResponses] },
      });
      for (const seat of seats) {
        const paid = await Payment.exists({
          applicationId: seat.applicationId,
          status: PaymentStatus.Success,
        });
        if (seat.response === SeatResponse.Pending || !paid) {
          seat.response = SeatResponse.Expired;
          seat.isActive = false;
          await Application.updateOne(
            { _id: seat.applicationId },
            { admissionStage: AdmissionStage.Withdrawn },
          );
          await QRGatePass.updateOne(
            { applicationId: seat.applicationId },
            { validity: GatePassValidity.Revoked },
          );
        } else if (round.get('isFinal')) seat.response = SeatResponse.Accepted;
        await seat.save();
      }
      round.status = RoundStatus.Closed;
      await round.save();
      await this.refresh();
      return {
        round,
        message: 'Round closed. Unaccepted and unpaid offers released.',
      };
    });
  }

  static async expireDue() {
    const rounds = await AdmissionRound.find({
      status: RoundStatus.Published,
      responseDeadline: { $lte: new Date(), $ne: null },
    });
    for (const round of rounds) await this.close(String(round._id));
  }

  static async pay(userId: string, outcome: string) {
    return counsellingTransaction(async () => {
      if (!['success', 'fail'].includes(outcome))
        throw badRequest('Choose success or fail.');
      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');
      const seat = await SeatAllotment.findOne({
        ...holdingQuery,
        applicationId: app._id,
        response: { $in: heldResponses },
      });
      if (!seat || app.admissionStage === AdmissionStage.Withdrawn)
        throw conflict('Accept a seat before paying.');
      const previous = await Payment.findOne({
        applicationId: app._id,
        status: PaymentStatus.Success,
      });
      const round = await AdmissionRound.findById(seat.roundId);
      if (
        !previous &&
        (!round?.responseDeadline || +round.responseDeadline <= Date.now())
      )
        throw conflict('Payment deadline has passed.');
      const payment =
        previous ||
        (await Payment.create({
          applicationId: app._id,
          amount: 160000,
          status:
            outcome === 'success'
              ? PaymentStatus.Success
              : PaymentStatus.Failed,
          idempotencyKey:
            outcome === 'success'
              ? 'admission_' + app._id
              : crypto.randomUUID(),
          receiptNumber: outcome === 'success' ? 'REC-' + app._id : null,
          paidAt: outcome === 'success' ? new Date() : null,
          simulated: true,
        }));
      if (payment.status !== PaymentStatus.Success)
        return {
          payment,
          message: 'Simulated failure. Retry before the deadline.',
        };
      const token = crypto.randomBytes(32).toString('hex');
      const counter = await VerificationCounter.findOne().sort({ _id: 1 });
      const gatePass = await QRGatePass.findOneAndUpdate(
        { applicationId: app._id },
        {
          $setOnInsert: {
            rawToken: token,
            passCode: token,
            tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
            date: new Date().toISOString().slice(0, 10),
            timeSlot: 'During counter opening hours',
            counterId: counter?._id,
            validity: GatePassValidity.Valid,
          },
        },
        { upsert: true, new: true },
      );
      const checklist = await DigitalChecklist.findOneAndUpdate(
        { applicationId: app._id },
        {
          $setOnInsert: {
            status: ChecklistStatus.Pending,
            items: [
              'Class 10 certificate',
              'Class 12 marksheet',
              'Government photo ID',
            ].map((name) => ({
              name,
              mandatory: true,
              status: ChecklistItemStatus.Pending,
            })),
          },
        },
        { upsert: true, new: true },
      );
      if (app.admissionStage === AdmissionStage.SeatConfirmed) {
        app.admissionStage = AdmissionStage.PaymentCompleted;
        await app.save();
      }
      await this.refresh();
      return {
        payment,
        gatePass,
        checklist,
        displayToken: gatePass.rawToken,
        message: 'Simulated payment successful. Your gate pass is ready.',
      };
    });
  }
}

import {
  AdmissionStage,
  ApplicationStatus,
  RoundStatus,
  SeatPublication,
  SeatResponse,
  SeatResult,
  UserRole,
} from '@sams/shared';
import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  AdmissionRound,
  AdmissionCycle,
  Application,
  Programme,
  SeatAllotment,
} from '../models';

export const roundRouter = Router();

const advancedStages = new Set<AdmissionStage>([
  AdmissionStage.SeatConfirmed,
  AdmissionStage.PaymentPending,
  AdmissionStage.PaymentCompleted,
  AdmissionStage.VerificationPending,
  AdmissionStage.AdmissionConfirmed,
]);
const publishableStages: AdmissionStage[] = [
  AdmissionStage.Submitted,
  AdmissionStage.Eligible,
  AdmissionStage.InRound,
  AdmissionStage.NotAllotted,
];

async function getCurrentRound(session?: mongoose.ClientSession) {
  return AdmissionRound.findOne({ status: RoundStatus.Published }).sort({ roundNumber: -1 }).session(session || null);
}

async function reconcileSeatMatrix(round: any, session: mongoose.ClientSession) {
  const counts = await SeatAllotment.aggregate([
    { $match: { roundId: round._id, active: true, publication: SeatPublication.Published, result: SeatResult.Allotted } },
    { $group: {
      _id: '$programmeId',
      offered: { $sum: 1 },
      accepted: { $sum: { $cond: [{ $eq: ['$response', SeatResponse.Accepted] }, 1, 0] } },
    } },
  ]).session(session);
  const byProgramme = new Map(counts.map((item) => [item._id?.toString(), item]));
  for (const item of round.seatMatrix) {
    const count = byProgramme.get(item.programmeId.toString());
    item.set({
      allotted: count?.offered || 0,
      offered: count?.offered || 0,
      accepted: count?.accepted || 0,
      confirmed: count?.accepted || 0,
      available: Math.max(0, item.capacity - (count?.offered || 0)),
    });
  }
  await round.save({ session });
}

function validateSeatMatrix(seatMatrix: unknown, programmes: any[]) {
  if (!Array.isArray(seatMatrix) || seatMatrix.length === 0) throw badRequest('Seat matrix with programme seat counts is required');
  const known = new Set(programmes.map((programme) => programme._id.toString()));
  const seen = new Set<string>();
  for (const item of seatMatrix) {
    if (!item || typeof item !== 'object') throw badRequest('Invalid seat matrix item');
    const value = item as { programmeId?: unknown; capacity?: unknown };
    const programmeId = String(value.programmeId || '');
    if (!mongoose.isValidObjectId(programmeId) || !known.has(programmeId)) throw badRequest('Seat matrix contains an invalid programme');
    if (seen.has(programmeId)) throw badRequest('Seat matrix cannot contain duplicate programmes');
    if (!Number.isInteger(value.capacity) || Number(value.capacity) < 0) throw badRequest('Seat capacity must be an integer greater than or equal to zero');
    seen.add(programmeId);
  }
}

/**
 * POST /rounds (Admin only)
 * Creates an admission round with seat counts per programme.
 */
roundRouter.post(
  '/',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const { name, seatMatrix } = req.body;
      if (!name) throw badRequest('Round name is required');
      const programmes = await Programme.find();
      validateSeatMatrix(seatMatrix, programmes);
      const cycle = await AdmissionCycle.findOne({ active: true }).sort({ year: -1 });
      if (!cycle) throw conflict('An active admission cycle is required');
      const cycleProgrammeCount = await Programme.countDocuments({ cycleId: { $ne: null } });
      if (cycleProgrammeCount > 0) {
        const cycleProgrammeIds = new Set(
          (await Programme.find({ cycleId: cycle._id }).select('_id')).map((programme) => programme._id.toString()),
        );
        if ((seatMatrix as any[]).some((item) => !cycleProgrammeIds.has(String(item.programmeId)))) {
          throw badRequest('Seat matrix programmes must belong to the active admission cycle');
        }
      }

      const count = await AdmissionRound.countDocuments();
      const round = await AdmissionRound.create({
        roundNumber: count + 1,
        name,
        status: RoundStatus.Open,
        seatMatrix: seatMatrix.map((item: any) => ({
          programmeId: item.programmeId,
          capacity: item.capacity,
          allotted: 0,
          offered: 0,
          accepted: 0,
          confirmed: 0,
          available: item.capacity,
        })),
      });
      await AdmissionRound.updateOne({ _id: round._id }, { $set: { cycleId: cycle._id } });

      sendSuccess(res, { round, message: 'Admission round created successfully' }, 201);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /rounds (Admin, Management, Faculty)
 */
roundRouter.get(
  '/',
  authenticate,
  requireRoles(UserRole.AdministratorUser, UserRole.Management, UserRole.FacultyVerifier),
  async (_req, res, next) => {
    try {
      const rounds = await AdmissionRound.find()
        .populate('seatMatrix.programmeId')
        .sort({ roundNumber: -1 });
      sendSuccess(res, { rounds });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /rounds/:id/allot (Admin only)
 * Deterministic system-assisted allotment
 */
roundRouter.post(
  '/:id/allot',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = req.params.id;
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      const allotmentStatuses: RoundStatus[] = [RoundStatus.Open, RoundStatus.AllotmentRun];
      if (!allotmentStatuses.includes(round.status)) {
        throw conflict('Allotment cannot be rerun after this round is published or closed');
      }
      const allocationRunId = crypto.randomUUID();
      const locked = await AdmissionRound.findOneAndUpdate(
        { _id: round._id, status: { $in: [RoundStatus.Open, RoundStatus.AllotmentRun] }, allocationInProgress: false },
        { $set: { allocationInProgress: true, allocationRunId } },
        { new: true },
      );
      if (!locked) throw conflict('Another allotment run is already in progress');

      const session = await mongoose.startSession();
      let count = 0;
      try {
        await session.withTransaction(async () => {
          const currentRound = await AdmissionRound.findById(round._id).session(session);
          if (!currentRound || currentRound.status === RoundStatus.Published || currentRound.status === RoundStatus.Closed) {
            throw conflict('Allotment cannot be rerun after this round is published or closed');
          }
          const programmes = await Programme.find({ _id: { $in: currentRound.seatMatrix.map((item) => item.programmeId) } }).session(session);
          validateSeatMatrix(currentRound.seatMatrix.map((item) => ({ programmeId: item.programmeId, capacity: item.capacity })), programmes);
          const activeSeats = await SeatAllotment.find({
            publication: SeatPublication.Published,
            active: true,
            response: SeatResponse.Accepted,
          }).distinct('applicationId').session(session);
          const eligibleApplicants = await Application.find({
            status: { $in: [ApplicationStatus.Submitted, ApplicationStatus.Eligible] },
            admissionStage: { $nin: [...advancedStages, AdmissionStage.Withdrawn] },
            locked: true,
            _id: { $nin: activeSeats },
          }).sort({ meritRank: 1, submittedAt: 1, _id: 1 }).session(session);
          const capacityMap = new Map<string, { capacity: number; allotted: number }>();
          currentRound.seatMatrix.forEach((item) => capacityMap.set(item.programmeId.toString(), { capacity: item.capacity, allotted: 0 }));
          await SeatAllotment.deleteMany({ roundId: currentRound._id, publication: SeatPublication.Proposed }, { session });
          for (const app of eligibleApplicants) {
            const preferences = [...(app.preferences || [])].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
            const programmeId = preferences.map((pref) => pref.programmeId.toString()).find((id) => {
              const seat = capacityMap.get(id);
              return Boolean(seat && seat.allotted < seat.capacity);
            }) || null;
            if (programmeId) capacityMap.get(programmeId)!.allotted += 1;
            await SeatAllotment.create([{
              applicationId: app._id,
              roundId: currentRound._id,
              programmeId,
              publication: SeatPublication.Proposed,
              active: false,
              result: programmeId ? SeatResult.Allotted : SeatResult.NotAllotted,
              response: SeatResponse.Pending,
              allottedRank: app.meritRank,
              allocationRunId,
            }], { session });
            count += 1;
          }
          currentRound.seatMatrix.forEach((item) => {
            const seat = capacityMap.get(item.programmeId.toString());
            item.set({ allotted: seat?.allotted || 0, offered: seat?.allotted || 0, accepted: 0, confirmed: 0, available: item.capacity - (seat?.allotted || 0) });
          });
          currentRound.status = RoundStatus.AllotmentRun;
          currentRound.allocationInProgress = false;
          await currentRound.save({ session });
        });
      } catch (err) {
        await AdmissionRound.updateOne({ _id: round._id, allocationRunId }, { $set: { allocationInProgress: false } });
        throw err;
      } finally {
        await session.endSession();
      }

      sendSuccess(res, {
        message: `Allotment completed: ${count} applicants evaluated.`,
        allotmentsCount: count,
        allocationRunId,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /rounds/:id/publish (Admin only)
 */
roundRouter.post(
  '/:id/publish',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = req.params.id;
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      if (round.status === RoundStatus.Published) {
        sendSuccess(res, { message: 'Round allotments were already published.', round });
        return;
      }
      if (round.status !== RoundStatus.AllotmentRun) throw conflict('Run allotment before publishing this round');
      const newerPublishedRound = await AdmissionRound.findOne({
        status: RoundStatus.Published,
        roundNumber: { $gt: round.roundNumber },
      });
      if (newerPublishedRound) throw conflict('An older round cannot be published after a newer round');
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const current = await AdmissionRound.findById(round._id).session(session);
          if (!current || current.status === RoundStatus.Published) return;
          if (current.status !== RoundStatus.AllotmentRun) throw conflict('Run allotment before publishing this round');
          const publishedAt = new Date();
          const publishedAllotments = await SeatAllotment.find({ roundId: current._id, publication: SeatPublication.Proposed }).session(session);
          await SeatAllotment.updateMany(
            { roundId: { $ne: current._id }, active: true },
            { $set: { active: false, supersededAt: publishedAt, supersededBy: req.user!.id } },
            { session },
          );
          await SeatAllotment.updateMany(
            { roundId: current._id, publication: SeatPublication.Proposed },
            { $set: { publication: SeatPublication.Published, active: true, publishedAt, publishedBy: req.user!.id } },
            { session },
          );
          for (const allotment of publishedAllotments) {
            const app = await Application.findById(allotment.applicationId).session(session);
            if (
              !app ||
              advancedStages.has(app.admissionStage as AdmissionStage) ||
              !publishableStages.includes(app.admissionStage as AdmissionStage)
            ) continue;
            app.admissionStage = allotment.result === SeatResult.Allotted ? AdmissionStage.InRound : AdmissionStage.NotAllotted;
            await app.save({ session });
          }
          current.status = RoundStatus.Published;
          current.publishedAt = publishedAt;
          current.publishedBy = new mongoose.Types.ObjectId(req.user!.id);
          current.allocationInProgress = false;
          await current.save({ session });
          await reconcileSeatMatrix(current, session);
        });
      } finally {
        await session.endSession();
      }

      sendSuccess(res, {
        message: 'Round allotments successfully published to all candidates.',
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /rounds/:id/allotments (Admin & Management)
 */
roundRouter.get(
  '/:id/allotments',
  authenticate,
  requireRoles(UserRole.AdministratorUser, UserRole.Management),
  async (req, res, next) => {
    try {
      const allotments = await SeatAllotment.find({ roundId: req.params.id })
        .populate({
          path: 'applicationId',
          populate: { path: 'userId', select: 'fullName email' },
        })
        .populate('programmeId')
        .sort({ allottedRank: 1 });

      sendSuccess(res, { allotments });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /allotments/me (Applicant only)
 */
roundRouter.get(
  '/me/current',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const app = await Application.findOne({ userId }).populate('preferences.programmeId');
      if (!app) throw notFound('Application not found');

      const currentRound = await getCurrentRound();
      const allotment = currentRound ? await SeatAllotment.findOne({
        applicationId: app._id,
        roundId: currentRound._id,
        active: true,
        publication: SeatPublication.Published,
      })
        .populate('programmeId')
        .populate('roundId') : null;

      sendSuccess(res, {
        currentRound,
        currentAllotment: allotment,
        allotment,
        application: app,
        roundVersion: currentRound?.updatedAt || null,
        lastUpdatedAt: [app.updatedAt, currentRound?.updatedAt, allotment?.updatedAt].filter(Boolean).sort().at(-1) || null,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /allotments/:allotmentId/respond (Applicant only)
 */
roundRouter.post(
  '/:allotmentId/respond',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      const { response: decision } = req.body;
      if (![SeatResponse.Accepted, SeatResponse.Declined].includes(decision)) {
        throw badRequest('Response must be either Accepted or Declined');
      }

      const app = await Application.findOne({ userId: req.user!.id });
      if (!app) throw notFound('Application not found');
      const currentRound = await getCurrentRound();
      if (!currentRound) throw conflict('There is no published admission round');
      const session = await mongoose.startSession();
      let allotment: any;
      try {
        await session.withTransaction(async () => {
          allotment = await SeatAllotment.findOneAndUpdate(
            {
              _id: req.params.allotmentId,
              applicationId: app._id,
              roundId: currentRound._id,
              active: true,
              publication: SeatPublication.Published,
              result: SeatResult.Allotted,
              response: SeatResponse.Pending,
            },
            { $set: { response: decision, respondedAt: new Date() } },
            { new: true, session },
          );
          if (!allotment) throw conflict('This allotment is not the current published offer or has already received a response');
          const currentApp = await Application.findById(app._id).session(session);
          if (!currentApp) throw notFound('Application not found');
          currentApp.admissionStage = decision === SeatResponse.Accepted ? AdmissionStage.SeatConfirmed : AdmissionStage.Withdrawn;
          await currentApp.save({ session });
          const managedRound = await AdmissionRound.findById(currentRound._id).session(session);
          if (managedRound) await reconcileSeatMatrix(managedRound, session);
        });
      } finally {
        await session.endSession();
      }

      sendSuccess(res, {
        allotment,
        message: decision === SeatResponse.Accepted
          ? 'Seat accepted! Please proceed to pay the admission fee.'
          : 'Seat declined permanently. Application status updated to Withdrawn.',
      });
    } catch (err) {
      next(err);
    }
  },
);

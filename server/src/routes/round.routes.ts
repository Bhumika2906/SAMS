import {
  RoundStatus,
  SeatPublication,
  SeatResponse,
  UserRole,
} from '@sams/shared';
import { Router } from 'express';
import mongoose from 'mongoose';
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  AdmissionRound,
  Application,
  Programme,
  SeatAllotment,
} from '../models';
import { AllotmentService } from '../services/allotment.service';

export const roundRouter = Router();

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
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw badRequest('Round name is required');
      }
      let rawSeatMatrix = seatMatrix;
      if (!rawSeatMatrix || !Array.isArray(rawSeatMatrix) || rawSeatMatrix.length === 0) {
        const allProgs = await Programme.find().sort({ code: 1 });
        const prevRound = await AdmissionRound.findOne().sort({ roundNumber: -1 });
        const prevMap = new Map<string, number>();
        if (prevRound && prevRound.seatMatrix) {
          for (const item of prevRound.seatMatrix) {
            const pid = (item.programmeId?._id || item.programmeId)?.toString();
            if (pid) {
              const remaining = Math.max(0, (Number(item.capacity) || 0) - (Number(item.allotted) || 0));
              prevMap.set(pid, remaining);
            }
          }
        }

        rawSeatMatrix = allProgs.map((p) => ({
          programmeId: p._id,
          capacity: prevMap.has(p._id.toString()) ? prevMap.get(p._id.toString()) : (p.baseCapacity ?? 0),
        }));
      }

      // Rule 10: Validate seatMatrix input
      const seenProgIds = new Set<string>();
      const validatedSeatMatrix = [];

      for (const item of rawSeatMatrix) {
        if (!item.programmeId || !mongoose.Types.ObjectId.isValid(item.programmeId)) {
          throw badRequest('Each seat matrix entry must have a valid programme ID');
        }
        const progIdStr = item.programmeId.toString();
        if (seenProgIds.has(progIdStr)) {
          throw badRequest(`Duplicate programme ID in seat matrix: ${progIdStr}`);
        }
        seenProgIds.add(progIdStr);

        const progExists = await Programme.exists({ _id: item.programmeId });
        if (!progExists) {
          throw notFound(`Programme ${progIdStr} does not exist`);
        }

        const capacity = Number(item.capacity);
        if (!Number.isInteger(capacity) || capacity < 0) {
          throw badRequest(`Programme capacity must be an integer >= 0, got: ${item.capacity}`);
        }

        // Server-controlled counters
        validatedSeatMatrix.push({
          programmeId: item.programmeId,
          capacity,
          allotted: 0,
          offered: 0,
          accepted: 0,
          confirmed: 0,
          available: capacity,
        });
      }

      const count = await AdmissionRound.countDocuments();
      const round = await AdmissionRound.create({
        roundNumber: count + 1,
        name: name.trim(),
        status: RoundStatus.Open,
        seatMatrix: validatedSeatMatrix,
        version: 1,
      });

      sendSuccess(res, { round, message: 'Admission round created successfully' }, 201);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /rounds/:id/sync-capacities (Admin only)
 * Resets an Open round's capacities to the Programme baseCapacity / prior round capacity
 */
roundRouter.put(
  '/:id/sync-capacities',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = String(req.params.id);
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      if (round.status !== RoundStatus.Open) {
        throw badRequest('Only open, un-published rounds can have their seat capacities updated');
      }

      const programmes = await Programme.find();
      const progMap = new Map(programmes.map((p) => [p._id.toString(), p]));

      // Also check prior round remaining seats if available
      const prevRound = await AdmissionRound.findOne({ roundNumber: round.roundNumber - 1 });
      const prevMap = new Map<string, number>();
      if (prevRound && prevRound.seatMatrix) {
        for (const item of prevRound.seatMatrix) {
          const pid = (item.programmeId?._id || item.programmeId)?.toString();
          if (pid) {
            const remaining = Math.max(0, (Number(item.capacity) || 0) - (Number(item.allotted) || 0));
            prevMap.set(pid, remaining);
          }
        }
      }

      for (const item of round.seatMatrix) {
        const pid = (item.programmeId?._id || item.programmeId)?.toString();
        const baseCap = progMap.get(pid)?.baseCapacity ?? 0;
        const newCap = prevMap.has(pid) ? prevMap.get(pid)! : baseCap;
        item.capacity = newCap;
        item.available = newCap;
        item.allotted = 0;
        item.offered = 0;
        item.accepted = 0;
        item.confirmed = 0;
      }

      await round.save();
      sendSuccess(res, { round, message: 'Capacities synchronized with remaining vacant seats from prior round' });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /rounds/:id (Admin only)
 * Deletes an Open round (and its un-published allotments)
 */
roundRouter.delete(
  '/:id',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = String(req.params.id);
      const round = await AdmissionRound.findById(roundId);
      if (!round) throw notFound('Round not found');
      if (round.status === RoundStatus.Published) {
        throw badRequest('Cannot delete a published round. Published rounds are immutable.');
      }

      await SeatAllotment.deleteMany({ roundId: round._id, publication: { $ne: SeatPublication.Published } });
      await AdmissionRound.deleteOne({ _id: round._id });

      sendSuccess(res, { message: 'Round deleted successfully' });
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
 * Deterministic system-assisted allotment with locks, transactions & seat retention
 */
roundRouter.post(
  '/:id/allot',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = String(req.params.id);
      const result = await AllotmentService.runRoundAllocation(roundId, req.user!.id);
      sendSuccess(res, {
        message: `Allotment completed: ${result.allotmentsCount} applicants evaluated.`,
        allotmentsCount: result.allotmentsCount,
        runId: result.runId,
        version: result.version,
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
      const roundId = String(req.params.id);
      const result = await AllotmentService.publishRoundAllotments(roundId, req.user!.id);
      sendSuccess(res, result);
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
      const roundId = String(req.params.id);
      const allotments = await SeatAllotment.find({ roundId })
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
 * GET /rounds/:id/diagnostics (Admin & Management)
 * Rule 18: Admin diagnostic endpoint detecting consistency issues
 */
roundRouter.get(
  '/:id/diagnostics',
  authenticate,
  requireRoles(UserRole.AdministratorUser, UserRole.Management),
  async (req, res, next) => {
    try {
      const roundId = String(req.params.id);
      const diagnostics = await AllotmentService.getDiagnostics(roundId);
      sendSuccess(res, diagnostics);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /rounds/:id/reconcile (Admin only)
 * Reconciles seatMatrix counts with ground-truth allotment documents
 */
roundRouter.post(
  '/:id/reconcile',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = String(req.params.id);
      const reconciledRound = await AllotmentService.reconcileRoundSeatMatrix(roundId);
      if (!reconciledRound) throw notFound('Round not found');
      sendSuccess(res, {
        message: 'Seat matrix reconciled successfully.',
        seatMatrix: reconciledRound.seatMatrix,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /allotments/me/current (Applicant only)
 * Rule 1 & 17: Explicit authoritative current-round resolution
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

      const currentRound = await AllotmentService.getCurrentRound();
      const currentAllotment = await AllotmentService.getCurrentAllotmentForApplication(
        app._id.toString(),
        currentRound?._id?.toString(),
      );

      sendSuccess(res, {
        allotment: currentAllotment,
        currentAllotment,
        currentRound,
        application: app,
        roundVersion: currentRound?.version || 1,
        lastUpdatedAt: currentAllotment?.updatedAt || currentRound?.updatedAt || new Date(),
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /allotments/:allotmentId/respond (Applicant only)
 * Rules 2, 3, 4, 15: Atomic response targeting specific allotment ID
 */
roundRouter.post(
  '/:allotmentId/respond',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const allotmentId = String(req.params.allotmentId);
      const { response: decision } = req.body;

      let targetAllotmentId = allotmentId;

      // Backward compatibility alias for /allotments/me/respond
      if (allotmentId === 'me') {
        const app = await Application.findOne({ userId });
        if (!app) throw notFound('Application not found');

        const activeAllot = await AllotmentService.getCurrentAllotmentForApplication(app._id.toString());
        if (!activeAllot) {
          throw notFound('No active published seat allotment found to respond to');
        }
        targetAllotmentId = activeAllot._id.toString();
      }

      if (!targetAllotmentId || !mongoose.Types.ObjectId.isValid(targetAllotmentId)) {
        throw badRequest('A valid allotment ID is required');
      }

      const result = await AllotmentService.respondToAllotment(
        targetAllotmentId,
        userId,
        decision,
      );

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

import {
  CounsellingService,
  counsellingTransaction,
} from '../services/counselling.service';
import {
  RoundStatus,
  SeatPublication,
  UserRole,
} from '@sams/shared';
import { Router } from 'express';
import mongoose from 'mongoose';
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  AdmissionRound,
  Application,
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
      sendSuccess(res, await CounsellingService.createRound(req.body), 201);
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
      const result = await counsellingTransaction(async () => {
        const round = await AdmissionRound.findById(String(req.params.id));
        if (!round || round.status !== RoundStatus.Open)
          throw badRequest('Only open rounds can be synchronized');
        round.set('seatMatrix', await CounsellingService.inventory());
        await round.save();
        return { round };
      });
      sendSuccess(res, result);
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
      const result = await counsellingTransaction(async () => {
        const roundId = String(req.params.id);
        const round = await AdmissionRound.findById(roundId);
        if (!round) throw notFound('Round not found');
        if (
          ![RoundStatus.Open, RoundStatus.Draft].includes(round.status as any)
        ) {
          throw badRequest(
            'Cannot delete a published round. Published rounds are immutable.',
          );
        }

        await SeatAllotment.deleteMany({
          roundId: round._id,
          publication: { $ne: SeatPublication.Published },
        });
        await AdmissionRound.deleteOne({ _id: round._id });

        return { message: 'Round deleted successfully' };
      });
      sendSuccess(res, result);
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
  requireRoles(
    UserRole.AdministratorUser,
    UserRole.Management,
    UserRole.FacultyVerifier,
  ),
  async (_req, res, next) => {
    try {
      const rounds = await AdmissionRound.find()
        .populate('seatMatrix.programmeId')
        .sort({ roundNumber: -1 });
      if (rounds[0])
        rounds[0].set('seatMatrix', await CounsellingService.inventory());
      await rounds[0]?.populate('seatMatrix.programmeId');
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
      const result = await AllotmentService.runRoundAllocation(
        roundId,
        req.user!.id,
      );
      sendSuccess(res, {
        message: `Allotment completed: ${result.proposedCount} applicants evaluated.`,
        allotmentsCount: result.proposedCount,
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
      const result = await AllotmentService.publishRoundAllotments(
        roundId,
        req.user!.id,
      );
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
      const reconciledRound =
        await AllotmentService.reconcileRoundSeatMatrix(roundId);
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
      const app = await Application.findOne({ userId }).populate(
        'preferences.programmeId',
      );
      if (!app) throw notFound('Application not found');

      const currentRound = await AllotmentService.getCurrentRound();
      const currentAllotment =
        await AllotmentService.getCurrentAllotmentForApplication(
          app._id.toString(),
          currentRound?._id?.toString(),
        );

      sendSuccess(res, {
        allotment: currentAllotment,
        currentAllotment,
        currentRound,
        application: app,
        roundVersion: currentRound?.version || 1,
        lastUpdatedAt:
          currentAllotment?.updatedAt || currentRound?.updatedAt || new Date(),
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

        const activeAllot =
          await AllotmentService.getCurrentAllotmentForApplication(
            app._id.toString(),
          );
        if (!activeAllot) {
          throw notFound(
            'No active published seat allotment found to respond to',
          );
        }
        targetAllotmentId = activeAllot._id.toString();
      }

      if (
        !targetAllotmentId ||
        !mongoose.Types.ObjectId.isValid(targetAllotmentId)
      ) {
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

roundRouter.post(
  '/:id/close',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      const roundId = String(req.params.id);
      if (req.body?.force) {
        await AdmissionRound.updateOne(
          { _id: roundId },
          { responseDeadline: new Date(Date.now() - 1000) },
        );
      }
      sendSuccess(res, await CounsellingService.close(roundId));
    } catch (err) {
      next(err);
    }
  },
);
roundRouter.post(
  '/me/withdraw',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      sendSuccess(res, await CounsellingService.withdraw(req.user!.id));
    } catch (err) {
      next(err);
    }
  },
);

roundRouter.put(
  '/:id/settings',
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await counsellingTransaction(async () => {
          const round = await AdmissionRound.findById(String(req.params.id));
          if (
            !round ||
            ![
              RoundStatus.Open,
              RoundStatus.Draft,
              RoundStatus.AllotmentRun,
            ].includes(round.status as any)
          )
            throw conflict('Only unpublished round settings can change');
          const response = new Date(req.body.responseDeadline);
          const withdrawal = new Date(req.body.withdrawalDeadline);
          if (
            !Number.isFinite(+response) ||
            +response <= Date.now() ||
            !Number.isFinite(+withdrawal) ||
            +withdrawal < +response
          )
            throw badRequest('Provide valid future deadlines');
          round.responseDeadline = response;
          round.set('withdrawalDeadline', withdrawal);
          round.set('isFinal', req.body.isFinal === true);
          round.status = RoundStatus.Open;
          await round.save();
          return { round };
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

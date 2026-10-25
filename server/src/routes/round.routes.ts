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
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  AdmissionRound,
  Application,
  Programme,
  SeatAllotment,
} from '../models';

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
      if (!name) throw badRequest('Round name is required');
      if (!seatMatrix || !Array.isArray(seatMatrix) || seatMatrix.length === 0) {
        throw badRequest('Seat matrix with programme seat counts is required');
      }

      const count = await AdmissionRound.countDocuments();
      const round = await AdmissionRound.create({
        roundNumber: count + 1,
        name,
        status: RoundStatus.Open,
        seatMatrix,
      });

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

      // Fetch eligible submitted applicants sorted by meritRank ascending (ties by submittedAt)
      const eligibleApplicants = await Application.find({
        status: { $in: [ApplicationStatus.Submitted, ApplicationStatus.Eligible] },
        locked: true,
      })
        .populate('userId', 'fullName email')
        .sort({ meritRank: 1, submittedAt: 1, _id: 1 });

      // Track capacity locally during algorithm walk
      const capacityMap = new Map<string, { capacity: number; allotted: number }>();
      round.seatMatrix.forEach((sm) => {
        capacityMap.set(sm.programmeId.toString(), {
          capacity: sm.capacity,
          allotted: 0,
        });
      });

      // Clear previous proposed allotments for this round if re-running
      await SeatAllotment.deleteMany({ roundId: round._id, publication: SeatPublication.Proposed });

      const proposedAllotments = [];

      for (const app of eligibleApplicants) {
        let allottedProgrammeId: string | null = null;

        // Walk preferences in ranked order
        const sortedPrefs = (app.preferences || []).sort(
          (a: any, b: any) => a.preferenceOrder - b.preferenceOrder,
        );

        for (const pref of sortedPrefs) {
          const progId = pref.programmeId.toString();
          const cap = capacityMap.get(progId);
          if (cap && cap.allotted < cap.capacity) {
            allottedProgrammeId = progId;
            cap.allotted += 1;
            break;
          }
        }

        const isAllotted = allottedProgrammeId !== null;
        const allotment = await SeatAllotment.findOneAndUpdate(
          { applicationId: app._id, roundId: round._id },
          {
            programmeId: allottedProgrammeId,
            publication: SeatPublication.Proposed,
            result: isAllotted ? SeatResult.Allotted : SeatResult.NotAllotted,
            response: SeatResponse.Pending,
            allottedRank: app.meritRank,
          },
          { upsert: true, new: true },
        );

        proposedAllotments.push(allotment);
      }

      // Update seatMatrix allotted counts on round
      round.seatMatrix.forEach((sm) => {
        const cap = capacityMap.get(sm.programmeId.toString());
        if (cap) sm.allotted = cap.allotted;
      });
      round.status = RoundStatus.AllotmentRun;
      await round.save();

      sendSuccess(res, {
        message: `Allotment completed: ${proposedAllotments.length} applicants evaluated.`,
        allotmentsCount: proposedAllotments.length,
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

      // Publish proposed allotments
      await SeatAllotment.updateMany(
        { roundId: round._id, publication: SeatPublication.Proposed },
        { publication: SeatPublication.Published },
      );

      // Update applicant stages to InRound
      const publishedAllotments = await SeatAllotment.find({
        roundId: round._id,
        publication: SeatPublication.Published,
      });

      for (const alt of publishedAllotments) {
        await Application.findByIdAndUpdate(alt.applicationId, {
          admissionStage:
            alt.result === SeatResult.Allotted
              ? AdmissionStage.InRound
              : AdmissionStage.NotAllotted,
        });
      }

      round.status = RoundStatus.Published;
      await round.save();

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

      const allotment = await SeatAllotment.findOne({
        applicationId: app._id,
        publication: SeatPublication.Published,
      })
        .populate('programmeId')
        .populate('roundId')
        .sort({ createdAt: -1 });

      sendSuccess(res, { allotment, application: app });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /allotments/me/respond (Applicant only)
 */
roundRouter.post(
  '/me/respond',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { response: decision } = req.body;
      if (![SeatResponse.Accepted, SeatResponse.Declined].includes(decision)) {
        throw badRequest('Response must be either Accepted or Declined');
      }

      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');

      const allotment = await SeatAllotment.findOne({
        applicationId: app._id,
        publication: SeatPublication.Published,
        response: SeatResponse.Pending,
      });

      if (!allotment || allotment.result !== SeatResult.Allotted) {
        throw badRequest('No active seat allotment offer available to accept or decline.');
      }

      allotment.response = decision;
      allotment.respondedAt = new Date();
      await allotment.save();

      if (decision === SeatResponse.Accepted) {
        app.admissionStage = AdmissionStage.SeatConfirmed;
      } else {
        app.admissionStage = AdmissionStage.Withdrawn;
        // Release seat count back to matrix
        if (allotment.programmeId) {
          await AdmissionRound.updateOne(
            { _id: allotment.roundId, 'seatMatrix.programmeId': allotment.programmeId },
            { $inc: { 'seatMatrix.$.allotted': -1 } },
          );
        }
      }
      await app.save();

      sendSuccess(res, {
        allotment,
        message: decision === SeatResponse.Accepted
          ? 'Seat accepted! Please proceed to pay the admission fee.'
          : 'Seat declined. Application status updated to Withdrawn.',
      });
    } catch (err) {
      next(err);
    }
  },
);

import { Router } from 'express';
import {
  UserRole,
  AdmissionStage,
  ApplicationStatus,
  GatePassValidity,
  SeatResponse,
} from '@sams/shared';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  Application,
  User,
  Programme,
  VerificationCounter,
  SeatAllotment,
  QRGatePass,
  AuditLog,
  AdmissionRound,
} from '../models';
import {
  counsellingTransaction,
  CounsellingService,
} from '../services/counselling.service';
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
export const adminRouter = Router();
adminRouter.use(authenticate, requireRoles(UserRole.AdministratorUser));
adminRouter.get('/registry', async (_req, res, next) => {
  try {
    sendSuccess(res, {
      applicants: await Application.find()
        .populate('userId', 'fullName email')
        .sort({ meritRank: 1 }),
      programmes: await Programme.find(),
      faculty: await User.find({ role: UserRole.FacultyVerifier }).select(
        'fullName assignedCounterId',
      ),
      counters: await VerificationCounter.find(),
      audit: await AuditLog.find().sort({ timestamp: -1 }).limit(100),
    });
  } catch (err) {
    next(err);
  }
});
adminRouter.post('/applicants/:id', async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await counsellingTransaction(async () => {
        const app = await Application.findById(String(req.params.id));
        if (!app) throw notFound('Applicant not found');
        const { action, rank, reason } = req.body;
        if (action === 'reject') {
          if (typeof reason !== 'string' || !reason.trim())
            throw badRequest('A rejection reason is required');
          app.status = ApplicationStatus.Rejected;
          app.admissionStage = AdmissionStage.Rejected;
          await SeatAllotment.updateMany(
            { applicationId: app._id, isActive: true },
            { isActive: false, response: SeatResponse.Declined },
          );
          await QRGatePass.updateOne(
            { applicationId: app._id },
            { validity: GatePassValidity.Revoked },
          );
        } else if (action === 'rank') {
          if (!Number.isInteger(rank) || rank < 1)
            throw badRequest('Rank must be a positive integer');
          if (
            await AdmissionRound.exists({
              status: { $in: ['Published', 'Closed'] },
            })
          )
            throw conflict('Merit ranks are locked after counselling starts');
          app.meritRank = rank;
        } else throw badRequest('Unknown action');
        await app.save();
        await CounsellingService.refresh();
        await AuditLog.create({
          actorId: req.user!.id,
          actorRole: UserRole.AdministratorUser,
          action,
          entity: 'Application',
          entityId: String(app._id),
          summary: reason || 'Merit rank updated',
          details: { rank },
        });
        return { application: app };
      }),
    );
  } catch (err) {
    next(err);
  }
});
adminRouter.post('/faculty/:id/counter', async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await counsellingTransaction(async () => {
        if (!(await VerificationCounter.exists({ _id: req.body.counterId })))
          throw badRequest('Unknown counter');
        const faculty = await User.findOneAndUpdate(
          { _id: String(req.params.id), role: UserRole.FacultyVerifier },
          { assignedCounterId: req.body.counterId },
          { new: true },
        );
        if (!faculty) throw notFound('Faculty not found');
        await VerificationCounter.updateMany(
          {},
          { $pull: { assignedVerifierIds: faculty._id } },
        );
        await VerificationCounter.updateOne(
          { _id: req.body.counterId },
          { $addToSet: { assignedVerifierIds: faculty._id } },
        );
        return { faculty };
      }),
    );
  } catch (err) {
    next(err);
  }
});

import { AdmissionStage, ApplicationStatus, UserRole } from '@sams/shared';
import { Router } from 'express';
import { sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import { Application, Programme, SeatAllotment } from '../models';

export const managementRouter = Router();

managementRouter.get(
  '/overview',
  authenticate,
  requireRoles(UserRole.Management, UserRole.AdministratorUser),
  async (_req, res, next) => {
    try {
      const [
        totalApplicants,
        submittedCount,
        allottedCount,
        seatConfirmedCount,
        admissionConfirmedCount,
        programmes,
      ] = await Promise.all([
        Application.countDocuments(),
        Application.countDocuments({ status: ApplicationStatus.Submitted }),
        SeatAllotment.countDocuments({ publication: 'Published', result: 'Allotted' }),
        Application.countDocuments({ admissionStage: AdmissionStage.SeatConfirmed }),
        Application.countDocuments({ admissionStage: AdmissionStage.AdmissionConfirmed }),
        Programme.find().sort({ code: 1 }),
      ]);

      sendSuccess(res, {
        stats: {
          totalApplicants,
          submittedCount,
          allottedCount,
          seatConfirmedCount,
          admissionConfirmedCount,
        },
        programmes,
      });
    } catch (err) {
      next(err);
    }
  },
);

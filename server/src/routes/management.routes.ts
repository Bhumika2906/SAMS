import { CounsellingService } from '../services/counselling.service';
import {
  AdmissionStage,
  ApplicationStatus,
  RoundStatus,
  SeatPublication,
  SeatResult,
  UserRole,
} from '@sams/shared';
import { Router } from 'express';
import { sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import { Application, Programme, SeatAllotment } from '../models';
import { AllotmentService } from '../services/allotment.service';

export const managementRouter = Router();

managementRouter.get(
  '/overview',
  authenticate,
  requireRoles(UserRole.Management, UserRole.AdministratorUser),
  async (_req, res, next) => {
    try {
      const currentRound = await AllotmentService.getCurrentRound();

      // Count distinct current applicants who have an active published or proposed seat allotment
      let allottedDistinctCount = 0;
      if (currentRound) {
        const isRun = currentRound.status === RoundStatus.AllotmentRun;
        const query: any = isRun
          ? {
              roundId: currentRound._id,
              result: SeatResult.Allotted,
            }
          : {
              isActive: true,
              publication: SeatPublication.Published,
              result: SeatResult.Allotted,
              response: { $in: ['Pending', 'Accepted', 'OptedNextRound'] },
            };
        const distinctApps = await SeatAllotment.distinct('applicationId', query);
        allottedDistinctCount = distinctApps.length;
      }

      const [
        totalApplicants,
        submittedCount,
        seatConfirmedCount,
        admissionConfirmedCount,
        programmes,
      ] = await Promise.all([
        Application.countDocuments(),
        Application.countDocuments({ status: ApplicationStatus.Submitted }),
        Application.countDocuments({ admissionStage: AdmissionStage.SeatConfirmed }),
        Application.countDocuments({ admissionStage: AdmissionStage.AdmissionConfirmed }),
        Programme.find().sort({ code: 1 }),
      ]);

      // Calculate aggregate seat counter semantics: capacity, offered, accepted, confirmed, available
      const seatStats = {
        capacity: 0,
        offered: 0,
        accepted: 0,
        confirmed: 0,
        available: 0,
      };

      const inventory = await CounsellingService.inventory();
      for (const item of inventory) {
        seatStats.capacity += item.capacity;
        seatStats.offered += item.offered;
        seatStats.accepted += item.accepted;
        seatStats.confirmed += item.confirmed;
        seatStats.available += item.available;
      }

      sendSuccess(res, {
        stats: {
          totalApplicants,
          submittedCount,
          allottedCount: allottedDistinctCount,
          seatConfirmedCount,
          admissionConfirmedCount,
        },
        seatStats,
        inventory,
        currentRound: currentRound
          ? {
              _id: currentRound._id,
              roundNumber: currentRound.roundNumber,
              name: currentRound.name,
              status: currentRound.status,
              version: currentRound.version,
            }
          : null,
        roundVersion: currentRound?.version,
        lastUpdatedAt: currentRound?.updatedAt,
        programmes,
      });
    } catch (err) {
      next(err);
    }
  },
);

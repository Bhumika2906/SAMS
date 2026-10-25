import {
  AdmissionStage,
  ApplicationStatus,
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

      // Count distinct current applicants who have an active published seat allotment
      let allottedDistinctCount = 0;
      if (currentRound) {
        const distinctApps = await SeatAllotment.distinct('applicationId', {
          roundId: currentRound._id,
          isActive: true,
          publication: SeatPublication.Published,
          result: SeatResult.Allotted,
        });
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

      if (currentRound && currentRound.seatMatrix && currentRound.seatMatrix.length > 0) {
        for (const item of currentRound.seatMatrix) {
          seatStats.capacity += item.capacity || 0;
          seatStats.offered += item.offered || 0;
          seatStats.accepted += item.accepted || 0;
          seatStats.confirmed += item.confirmed || 0;
          seatStats.available += item.available || 0;
        }
      } else {
        const totalCap = programmes.reduce((sum, p) => sum + (p.baseCapacity || 0), 0);
        seatStats.capacity = totalCap;
        seatStats.available = totalCap;
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

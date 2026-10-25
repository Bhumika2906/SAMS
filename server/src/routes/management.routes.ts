import { AdmissionStage, ApplicationStatus, UserRole } from '@sams/shared';
import { Router } from 'express';
import { sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import { AdmissionRound, Application, Programme, SeatAllotment } from '../models';

export const managementRouter = Router();

managementRouter.get(
  '/overview',
  authenticate,
  requireRoles(UserRole.Management, UserRole.AdministratorUser),
  async (_req, res, next) => {
    try {
      const currentRound = await AdmissionRound.findOne({ status: 'Published' }).sort({ roundNumber: -1 });
      const currentAllottedCount = currentRound
        ? (await SeatAllotment.distinct('applicationId', {
          roundId: currentRound._id,
          active: true,
          publication: 'Published',
          result: 'Allotted',
        })).length
        : 0;
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
        Promise.resolve(currentAllottedCount),
        Application.countDocuments({ admissionStage: AdmissionStage.SeatConfirmed }),
        Application.countDocuments({ admissionStage: AdmissionStage.AdmissionConfirmed }),
        Programme.find().sort({ code: 1 }),
      ]);

      sendSuccess(res, {
        currentRound,
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

managementRouter.get(
  '/reconciliation',
  authenticate,
  requireRoles(UserRole.Management, UserRole.AdministratorUser),
  async (_req, res, next) => {
    try {
      const activeDuplicates = await SeatAllotment.aggregate([
        { $match: { active: true } },
        { $group: { _id: '$applicationId', count: { $sum: 1 }, allotments: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ]);
      const capacityIssues: unknown[] = [];
      const rounds = await AdmissionRound.find({ status: { $in: ['Published', 'Closed'] } });
      for (const round of rounds) {
        const counts = await SeatAllotment.aggregate([
          { $match: { roundId: round._id, active: true, publication: 'Published', result: 'Allotted' } },
          { $group: { _id: '$programmeId', offered: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$response', 'Accepted'] }, 1, 0] } } } },
        ]);
        for (const item of counts) {
          const matrix = round.seatMatrix.find((seat) => seat.programmeId.toString() === item._id?.toString());
          if (!matrix || item.offered > matrix.capacity || matrix.offered !== item.offered || matrix.accepted !== item.accepted) {
            capacityIssues.push({ roundId: round._id, programmeId: item._id, matrix, records: item });
          }
        }
      }
      const stageIssues = await SeatAllotment.aggregate([
        { $match: { active: true, publication: 'Published', response: 'Accepted' } },
        { $lookup: { from: 'applications', localField: 'applicationId', foreignField: '_id', as: 'application' } },
        { $unwind: '$application' },
        { $match: { 'application.admissionStage': { $nin: ['SeatConfirmed', 'PaymentPending', 'PaymentCompleted', 'VerificationPending', 'AdmissionConfirmed'] } } },
      ]);
      sendSuccess(res, { activeDuplicates, capacityIssues, acceptedStageIssues: stageIssues });
    } catch (err) {
      next(err);
    }
  },
);

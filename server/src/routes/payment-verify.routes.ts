import {
  CounsellingService,
  counsellingTransaction,
} from '../services/counselling.service';
import {
  AdmissionStage,
  ChecklistItemStatus,
  ChecklistStatus,
  GatePassValidity,
  PaymentStatus,
  UserRole,
} from '@sams/shared';
import crypto from 'crypto';
import { Router } from 'express';
import mongoose from 'mongoose';
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  SeatAllotment,
  Application,
  DigitalChecklist,
  Payment,
  QRGatePass,
  User,
} from '../models';

export const paymentVerifyRouter = Router();

/**
 * POST /payments/me (Applicant only)
 * Simulated admission fee payment
 */
paymentVerifyRouter.post(
  '/me',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      sendSuccess(
        res,
        await CounsellingService.pay(req.user!.id, req.body.outcome),
      );
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /payments/me (Applicant only)
 */
paymentVerifyRouter.get(
  '/me',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');

      const payment = await Payment.findOne({
        applicationId: app._id,
        status: PaymentStatus.Success,
      }).sort({ createdAt: -1 });

      sendSuccess(res, { payment });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /gatepass/me (Applicant only)
 */
paymentVerifyRouter.get(
  '/gatepass/me',
  authenticate,
  requireRoles(UserRole.Applicant),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');

      const pass = await QRGatePass.findOne({ applicationId: app._id });
      const checklist = await DigitalChecklist.findOne({
        applicationId: app._id,
      });

      const passCode =
        pass?.passCode ||
        pass?.rawToken ||
        (pass?.tokenHash
          ? pass.tokenHash.substring(0, 8).toUpperCase()
          : 'DEMO-PASS-101');

      sendSuccess(res, { pass, checklist, passCode });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /verify/candidates (Faculty & Admin)
 * Lists all applicants who have generated checklists or gate passes
 */
paymentVerifyRouter.get(
  '/candidates',
  authenticate,
  requireRoles(UserRole.FacultyVerifier, UserRole.AdministratorUser),
  async (_req, res, next) => {
    try {
      const checklists = await DigitalChecklist.find()
        .populate({
          path: 'applicationId',
          populate: { path: 'userId', select: 'fullName email' },
        })
        .sort({ updatedAt: -1 });

      const passes = await QRGatePass.find();
      const passMap = new Map(
        passes.map((p) => [p.applicationId.toString(), p]),
      );

      const candidates = checklists.map((cl) => {
        const app = cl.applicationId as any;
        const pass = app ? passMap.get(app._id.toString()) : null;
        return {
          checklistId: cl._id,
          applicationId: app?._id,
          candidateName: app?.userId?.fullName || 'Candidate',
          candidateEmail: app?.userId?.email || '',
          admissionStage: app?.admissionStage,
          checklistStatus: cl.status,
          passCode:
            pass?.passCode ||
            pass?.rawToken ||
            (pass?.tokenHash
              ? pass.tokenHash.substring(0, 16).toUpperCase()
              : 'DEMO-PASS-101'),
          tokenHashPrefix: pass?.tokenHash
            ? pass.tokenHash.substring(0, 16).toUpperCase()
            : 'DEMO-PASS-101',
          itemsCount: cl.items.length,
          verifiedCount: cl.items.filter(
            (i) => i.status === ChecklistItemStatus.Verified,
          ).length,
        };
      });

      sendSuccess(res, { candidates });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /verify/scan (Faculty only)
 * Scans candidate QR token or manual code
 */
paymentVerifyRouter.post(
  '/scan',
  authenticate,
  requireRoles(UserRole.FacultyVerifier),
  async (req, res, next) => {
    try {
      const token = req.body.token;
      if (typeof token !== 'string' || token.length < 8 || token.length > 256)
        throw badRequest('Invalid QR token');
      const tokenHash = crypto
        .createHash('sha256')
        .update(token.trim())
        .digest('hex');
      const pass = await QRGatePass.findOne({
        $or: [
          { tokenHash },
          { rawToken: token.trim() },
          { passCode: token.trim() },
          { tokenHash: token.trim() },
        ],
      });
      if (!pass || pass.validity !== GatePassValidity.Valid)
        throw notFound('Invalid or revoked gate pass');
      const verifier = await User.findById(req.user!.id);
      if (
        !pass.counterId ||
        String(verifier?.assignedCounterId) !== String(pass.counterId)
      )
        throw conflict('This pass belongs to another verification counter');
      const app = await Application.findById(pass.applicationId).populate(
        'userId',
        'fullName email',
      );
      if (!app) throw notFound('Candidate application not found');

      const checklist = await DigitalChecklist.findOne({
        applicationId: app._id,
      });
      if (!checklist)
        throw notFound('Candidate digital checklist not generated');

      const holding = await SeatAllotment.findOne({
        applicationId: app._id,
        isActive: true,
        publication: 'Published',
        result: 'Allotted',
      }).populate('programmeId');
      sendSuccess(res, {
        currentAllotment: holding,
        candidate: {
          id: app._id,
          fullName: (app.userId as any)?.fullName || 'Candidate',
          email: (app.userId as any)?.email,
          admissionStage: app.admissionStage,
        },
        pass,
        checklist,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /verify/items/:id (Faculty only)
 * Mark an individual checklist item Verified / NotVerified
 */
paymentVerifyRouter.post(
  '/items/:id',
  authenticate,
  requireRoles(UserRole.FacultyVerifier),
  async (req, res, next) => {
    try {
      const result = await counsellingTransaction(async () => {
        const itemId = String(req.params.id);
        const { status, remarks } = req.body; // 'Verified' | 'NotVerified'
        if (
          ![
            ChecklistItemStatus.Verified,
            ChecklistItemStatus.NotVerified,
          ].includes(status)
        ) {
          throw badRequest('Status must be Verified or NotVerified');
        }

        const checklist = await DigitalChecklist.findOne({
          'items._id': itemId,
        });
        if (!checklist) throw notFound('Checklist item not found');

        const item = checklist.items.find((i) => i._id?.toString() === itemId);
        if (!item) throw notFound('Checklist item not found');

        const pass = await QRGatePass.findOne({
          applicationId: checklist.applicationId,
          validity: GatePassValidity.Valid,
        });
        const verifier = await User.findById(req.user!.id);
        if (
          !pass?.counterId ||
          String(pass.counterId) !== String(verifier?.assignedCounterId)
        )
          throw conflict('No valid pass assigned to your counter');
        const applicant = await Application.findById(checklist.applicationId);
        if (!applicant || applicant.admissionStage === AdmissionStage.Withdrawn)
          throw conflict('Applicant has withdrawn');
        const held = await SeatAllotment.exists({
          applicationId: applicant._id,
          isActive: true,
          publication: 'Published',
          response: { $in: ['Accepted', 'OptedNextRound'] },
        });
        const paid = await Payment.exists({
          applicationId: applicant._id,
          status: PaymentStatus.Success,
        });
        if (!held || !paid)
          throw conflict(
            'An accepted seat and successful payment are required',
          );
        item.status = status;
        item.verifiedBy = req.user!.id as any;
        item.verifiedAt = new Date();
        if (remarks) item.remarks = remarks;

        // Check if all mandatory items are now Verified
        const allMandatoryVerified = checklist.items
          .filter((i) => i.mandatory)
          .every((i) => i.status === ChecklistItemStatus.Verified);

        if (allMandatoryVerified) {
          checklist.status = ChecklistStatus.FullyVerified;
          // Update application admission stage to AdmissionConfirmed
          await Application.findByIdAndUpdate(checklist.applicationId, {
            admissionStage: AdmissionStage.AdmissionConfirmed,
          });
        } else {
          await Application.updateOne(
            { _id: applicant._id },
            { admissionStage: AdmissionStage.VerificationPending },
          );
          const anyVerified = checklist.items.some(
            (i) => i.status === ChecklistItemStatus.Verified,
          );
          checklist.status = anyVerified
            ? ChecklistStatus.PartiallyVerified
            : ChecklistStatus.Pending;
        }

        await checklist.save();

        return {
          checklist,
          admissionConfirmed: allMandatoryVerified,
          message: allMandatoryVerified
            ? 'All mandatory documents verified! Admission is now Confirmed.'
            : `Item marked as ${status}.`,
        };
      });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /verify/history (Faculty only)
 */
paymentVerifyRouter.get(
  '/history',
  authenticate,
  requireRoles(UserRole.FacultyVerifier),
  async (req, res, next) => {
    try {
      const facultyId = req.user!.id;
      const verifiedChecklists = await DigitalChecklist.find({
        'items.verifiedBy': facultyId,
      }).populate({
        path: 'applicationId',
        populate: { path: 'userId', select: 'fullName email' },
      });

      sendSuccess(res, { history: verifiedChecklists });
    } catch (err) {
      next(err);
    }
  },
);

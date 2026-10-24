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
      const userId = req.user!.id;
      const { outcome } = req.body; // 'success' | 'fail'
      if (!['success', 'fail'].includes(outcome)) {
        throw badRequest('Outcome must be either "success" or "fail"');
      }

      const app = await Application.findOne({ userId });
      if (!app) throw notFound('Application not found');

      // Rule: Payment is only allowed after the seat is accepted / confirmed
      if (app.admissionStage !== AdmissionStage.SeatConfirmed && app.admissionStage !== AdmissionStage.PaymentCompleted) {
        throw conflict('Payment is only allowed for an applicant whose seat is confirmed');
      }

      const amount = 160000; // Base tuition deposit
      const idempotencyKey = `pay_${app._id}_${Date.now()}`;

      if (outcome === 'fail') {
        const payment = await Payment.create({
          applicationId: app._id,
          amount,
          status: PaymentStatus.Failed,
          idempotencyKey,
          failureReason: 'Simulated payment rejection by bank gateway',
        });
        sendSuccess(res, { payment, message: 'Payment simulated as Failed. You can retry anytime.' });
        return;
      }

      // Success flow
      const receiptNumber = `REC-LNMIIT-${Math.floor(100000 + Math.random() * 900000)}`;
      const payment = await Payment.create({
        applicationId: app._id,
        amount,
        status: PaymentStatus.Success,
        idempotencyKey,
        receiptNumber,
        paidAt: new Date(),
      });

      app.admissionStage = AdmissionStage.PaymentCompleted;
      await app.save();

      // Rule: Generate QR Gate Pass and Checklist ONLY after payment success (idempotent, once)
      let gatePass = await QRGatePass.findOne({ applicationId: app._id });
      let passCode = 'PASS-' + Math.floor(1000 + Math.random() * 9000);
      if (!gatePass) {
        const tokenHash = crypto.createHash('sha256').update(passCode).digest('hex');
        gatePass = await QRGatePass.create({
          applicationId: app._id,
          tokenHash,
          rawToken: passCode,
          passCode,
          purpose: 'Campus Document Verification',
          date: '2026-11-15',
          timeSlot: '10:00 AM - 1:00 PM',
          validity: GatePassValidity.Valid,
        });
      }

      let checklist = await DigitalChecklist.findOne({ applicationId: app._id });
      if (!checklist) {
        checklist = await DigitalChecklist.create({
          applicationId: app._id,
          status: ChecklistStatus.Pending,
          items: [
            {
              name: 'Class 10 Original Certificate & Marksheet',
              mandatory: true,
              status: ChecklistItemStatus.Pending,
            },
            {
              name: 'Class 12 Original Certificate & Marksheet',
              mandatory: true,
              status: ChecklistItemStatus.Pending,
            },
            {
              name: 'Government Photo ID Proof (Aadhaar / Passport)',
              mandatory: true,
              status: ChecklistItemStatus.Pending,
            },
          ],
        });
      }

      sendSuccess(res, {
        payment,
        gatePass,
        displayToken: gatePass.passCode || gatePass.rawToken || passCode,
        checklist,
        message: 'Admission payment successful! Digital checklist and campus gate pass generated.',
      });
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
      const checklist = await DigitalChecklist.findOne({ applicationId: app._id });

      const passCode =
        pass?.passCode ||
        pass?.rawToken ||
        (pass?.tokenHash ? pass.tokenHash.substring(0, 8).toUpperCase() : 'DEMO-PASS-101');

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
      const passMap = new Map(passes.map((p) => [p.applicationId.toString(), p]));

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
            (pass?.tokenHash ? pass.tokenHash.substring(0, 16).toUpperCase() : 'DEMO-PASS-101'),
          tokenHashPrefix: pass?.tokenHash ? pass.tokenHash.substring(0, 16).toUpperCase() : 'DEMO-PASS-101',
          itemsCount: cl.items.length,
          verifiedCount: cl.items.filter((i) => i.status === ChecklistItemStatus.Verified).length,
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
      const { token } = req.body;
      let search = (token || '').trim();
      if (search.toUpperCase().startsWith('TOKEN:')) {
        search = search.substring(6).trim();
      } else if (search.toUpperCase().startsWith('TOKEN ')) {
        search = search.substring(6).trim();
      }

      if (!search) throw badRequest('Verification pass token, candidate email, or pass code is required');

      const tokenHash = crypto.createHash('sha256').update(search).digest('hex');

      // 1. Direct passCode, rawToken, exact tokenHash, or prefix tokenHash match
      let pass = await QRGatePass.findOne({
        $or: [
          { tokenHash },
          { passCode: { $regex: new RegExp(`^${search}$`, 'i') } },
          { rawToken: { $regex: new RegExp(`^${search}$`, 'i') } },
          { tokenHash: { $regex: new RegExp(`^${search}`, 'i') } },
        ],
      });

      // 2. Lookup by candidate email or full name
      if (!pass) {
        const user = await User.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${search}$`, 'i') } },
            { fullName: { $regex: new RegExp(search, 'i') } },
          ],
        });
        if (user) {
          const userApp = await Application.findOne({ userId: user._id });
          if (userApp) {
            pass = await QRGatePass.findOne({ applicationId: userApp._id });
          }
        }
      }

      // 3. Lookup by Application ID or QRGatePass ID if valid ObjectId
      if (!pass && mongoose.Types.ObjectId.isValid(search)) {
        pass = await QRGatePass.findOne({
          $or: [{ applicationId: search }, { _id: search }],
        });
      }

      // 4. Fallback only if input specifically asked for 'DEMO-PASS-101'
      if (!pass && search.toUpperCase() === 'DEMO-PASS-101') {
        pass = await QRGatePass.findOne({ validity: GatePassValidity.Valid });
      }

      if (!pass) {
        throw notFound(
          `No active verification pass found for "${search}". Please enter the candidate email, name, or pass code.`,
        );
      }

      const app = await Application.findById(pass.applicationId).populate('userId', 'fullName email');
      if (!app) throw notFound('Candidate application not found');

      const checklist = await DigitalChecklist.findOne({ applicationId: app._id });
      if (!checklist) throw notFound('Candidate digital checklist not generated');

      sendSuccess(res, {
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
      const itemId = String(req.params.id);
      const { status, remarks } = req.body; // 'Verified' | 'NotVerified'
      if (![ChecklistItemStatus.Verified, ChecklistItemStatus.NotVerified].includes(status)) {
        throw badRequest('Status must be Verified or NotVerified');
      }

      const checklist = await DigitalChecklist.findOne({ 'items._id': itemId });
      if (!checklist) throw notFound('Checklist item not found');

      const item = checklist.items.find((i) => i._id?.toString() === itemId);
      if (!item) throw notFound('Checklist item not found');

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
        const anyVerified = checklist.items.some((i) => i.status === ChecklistItemStatus.Verified);
        checklist.status = anyVerified
          ? ChecklistStatus.PartiallyVerified
          : ChecklistStatus.Pending;
      }

      await checklist.save();

      sendSuccess(res, {
        checklist,
        admissionConfirmed: allMandatoryVerified,
        message: allMandatoryVerified
          ? 'All mandatory documents verified! Admission is now Confirmed.'
          : `Item marked as ${status}.`,
      });
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

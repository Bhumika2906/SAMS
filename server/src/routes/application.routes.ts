import {
  AdmissionStage,
  ApplicationStatus,
  DocumentStatus,
  SeatPublication,
  SeatResponse,
  SeatResult,
  UserRole,
} from '@sams/shared';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { badRequest, conflict, notFound, sendSuccess } from '../errors';
import { authenticate, requireRoles } from '../middleware/auth';
import { Application, DocumentModel, Programme, SeatAllotment } from '../models';
import { AllotmentService } from '../services/allotment.service';

export const applicationRouter = Router();

// Multer disk storage setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are accepted'));
    }
  },
});

// All application routes require Applicant role
applicationRouter.use(authenticate, requireRoles(UserRole.Applicant));

/**
 * GET /applications/me
 */
applicationRouter.get('/me', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    let application = await Application.findOne({ userId }).populate('preferences.programmeId');
    if (!application) {
      application = await Application.create({ userId, status: ApplicationStatus.Draft });
    }
    const programmes = await Programme.find().sort({ code: 1 });
    sendSuccess(res, { application, programmes });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /applications/me
 */
applicationRouter.put('/me', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const application = await Application.findOne({ userId });
    if (!application) throw notFound('Application not found');
    if (application.locked) {
      throw conflict('Application is locked and cannot be modified after submission');
    }

    const { personal, address, education, preferences, category } = req.body;
    if (personal) application.personal = { ...application.personal, ...personal };
    if (address) application.address = { ...application.address, ...address };
    if (education) application.education = { ...application.education, ...education };
    if (category) application.category = category;

    if (preferences !== undefined) {
      if (!Array.isArray(preferences)) {
        throw badRequest('Preferences must be an array');
      }
      if (preferences.length > 0) {
        // Validate preferences uniqueness, sequential order, and existing programmes
        const seenProgrammes = new Set<string>();
        const orders = new Set<number>();
        for (const pref of preferences) {
          if (!pref.programmeId || pref.preferenceOrder === undefined) {
            throw badRequest('Each preference must include programmeId and preferenceOrder');
          }
          const progIdStr = String(pref.programmeId);
          if (seenProgrammes.has(progIdStr)) {
            throw badRequest(`Duplicate programme in preferences: ${progIdStr}`);
          }
          seenProgrammes.add(progIdStr);

          const order = Number(pref.preferenceOrder);
          if (!Number.isInteger(order) || order < 1) {
            throw badRequest('preferenceOrder must be a positive integer');
          }
          if (orders.has(order)) {
            throw badRequest(`Duplicate preferenceOrder: ${order}`);
          }
          orders.add(order);
        }

        const sortedOrders = Array.from(orders).sort((a, b) => a - b);
        for (let i = 0; i < sortedOrders.length; i++) {
          if (sortedOrders[i] !== i + 1) {
            throw badRequest(
              'preferenceOrder values must be unique and sequential starting from 1 (e.g. 1, 2, 3...)',
            );
          }
        }

        const progIds = Array.from(seenProgrammes);
        const existingProgs = await Programme.find({ _id: { $in: progIds } });
        if (existingProgs.length !== progIds.length) {
          throw badRequest('One or more selected programmes do not exist');
        }

        const currentRound = await AllotmentService.getCurrentRound();
        if (currentRound && currentRound.seatMatrix && currentRound.seatMatrix.length > 0) {
          const validCycleProgIds = new Set(
            currentRound.seatMatrix.map((m: any) => {
              const pid = m.programmeId?._id || m.programmeId;
              return pid ? pid.toString() : '';
            }),
          );
          for (const progIdStr of progIds) {
            if (!validCycleProgIds.has(progIdStr)) {
              throw badRequest(`Programme ${progIdStr} is not part of the current admission cycle`);
            }
          }
        }
      }
      application.preferences = preferences as any;
    }

    application.admissionStage = AdmissionStage.ApplicationInProgress;
    await application.save();

    sendSuccess(res, { application, message: 'Application updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /applications/me/pay-fee
 * UC-002: Pay application fee (₹1,000) before final review & submission
 */
applicationRouter.post('/me/pay-fee', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const application = await Application.findOne({ userId });
    if (!application) throw notFound('Application not found');
    if (application.locked) {
      throw conflict('Application has already been submitted and locked');
    }

    // Step 3 in UC-002: Check mandatory details before fee payment
    const { personal, education, preferences } = application;
    if (!personal?.phone || !personal?.gender) {
      throw badRequest('Please complete Personal Details (Phone and Gender) before paying the application fee');
    }
    if (!education?.class12Score) {
      throw badRequest('Please complete Academic Qualifications (Class 12 marks) before paying the application fee');
    }
    if (!preferences || preferences.length === 0) {
      throw badRequest('Please select at least one branch preference before paying the application fee');
    }

    const { outcome } = req.body;
    if (outcome === 'fail') {
      sendSuccess(res, {
        feePaid: false,
        message: 'Payment simulated as Failed (Bank Gateway Declined). You can retry payment anytime.',
      });
      return;
    }

    const txnId = `TXN-APP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const receiptNo = `RCP-APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    application.applicationFee = {
      paid: true,
      amount: 1000,
      transactionId: txnId,
      receiptNumber: receiptNo,
      paidAt: new Date(),
    };
    await application.save();

    sendSuccess(res, {
      feePaid: true,
      applicationFee: application.applicationFee,
      message: 'Application fee of ₹1,000 paid successfully! Receipt generated. You can now review and submit your application.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /applications/me/submit
 */
applicationRouter.post('/me/submit', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const application = await Application.findOne({ userId });
    if (!application) throw notFound('Application not found');
    if (application.locked) {
      throw conflict('Application has already been submitted');
    }

    // Validate minimum required fields
    const { personal, education, preferences } = application;
    if (!personal?.phone || !personal?.gender) {
      throw badRequest('Please complete your Personal Information (Phone and Gender are required)');
    }
    if (!education?.class12Score) {
      throw badRequest('Please complete Academic Qualifications (Class 12 marks are required)');
    }
    if (!preferences || preferences.length === 0) {
      throw badRequest('Please select at least one branch preference');
    }

    // UC-002: Check application fee payment
    if (!application.applicationFee?.paid) {
      throw badRequest('Application fee of ₹1,000 must be paid before submitting and locking your application.');
    }

    application.locked = true;
    application.status = ApplicationStatus.Submitted;
    application.admissionStage = AdmissionStage.Submitted;
    application.submittedAt = new Date();
    await application.save();

    sendSuccess(res, {
      application,
      message: 'Application submitted successfully! Your submission is now locked for round evaluation.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /applications/me/documents
 */
applicationRouter.post('/me/documents', upload.single('file'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const application = await Application.findOne({ userId });
    if (!application) throw notFound('Application not found');

    const file = req.file;
    if (!file) throw badRequest('No file uploaded');

    const docName = req.body.name || file.originalname;
    const docType = req.body.type || 'general';

    const document = await DocumentModel.create({
      applicationId: application._id,
      name: docName,
      type: docType,
      url: `/uploads/${file.filename}`,
      status: DocumentStatus.Uploaded,
    });

    sendSuccess(res, { document, message: 'Document uploaded successfully' }, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /applications/me/documents
 */
applicationRouter.get('/me/documents', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const application = await Application.findOne({ userId });
    if (!application) throw notFound('Application not found');

    const documents = await DocumentModel.find({ applicationId: application._id }).sort({ createdAt: -1 });
    sendSuccess(res, { documents });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /applications/me/tracker
 */
applicationRouter.get('/me/tracker', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const application = await Application.findOne({ userId });
    if (!application) throw notFound('Application not found');

    const currentRound = await AllotmentService.getCurrentRound();
    const currentAllotment = await AllotmentService.getCurrentAllotmentForApplication(
      application._id.toString(),
      currentRound?._id?.toString(),
    );

    let effectiveStage = application.admissionStage;
    if (currentAllotment) {
      if (currentAllotment.result === SeatResult.NotAllotted) {
        effectiveStage = AdmissionStage.NotAllotted;
        if (
          application.admissionStage !== AdmissionStage.NotAllotted &&
          application.admissionStage === AdmissionStage.InRound
        ) {
          application.admissionStage = AdmissionStage.NotAllotted;
          await application.save();
        }
      } else if (currentAllotment.result === SeatResult.Allotted) {
        if (currentAllotment.response === SeatResponse.Accepted) {
          effectiveStage = application.admissionStage;
        } else {
          effectiveStage = AdmissionStage.InRound;
        }
      }
    }

    const stageOrder = [
      { key: AdmissionStage.Registered, label: 'Account Registered' },
      { key: AdmissionStage.ApplicationInProgress, label: 'Application Form' },
      { key: AdmissionStage.Submitted, label: 'Application Submitted' },
      {
        key:
          effectiveStage === AdmissionStage.NotAllotted
            ? AdmissionStage.NotAllotted
            : AdmissionStage.InRound,
        label:
          effectiveStage === AdmissionStage.NotAllotted
            ? 'No Seat Allotted'
            : 'Round Allotment',
      },
      { key: AdmissionStage.SeatConfirmed, label: 'Seat Confirmed' },
      { key: AdmissionStage.PaymentCompleted, label: 'Admission Fee Paid' },
      { key: AdmissionStage.VerificationPending, label: 'Campus Verification' },
      { key: AdmissionStage.AdmissionConfirmed, label: 'Admission Confirmed' },
    ];

    let nextAction = 'Fill application details & pay ₹1,000 application fee';
    if (application.applicationFee?.paid && !application.locked) {
      nextAction = 'Review application and submit before round deadline';
    } else if (effectiveStage === AdmissionStage.Submitted) {
      nextAction = 'Wait for Round 1 seat allotment publication';
    } else if (effectiveStage === AdmissionStage.InRound) {
      nextAction = 'Review allotment and tap Accept or Decline';
    } else if (effectiveStage === AdmissionStage.NotAllotted) {
      nextAction = 'No seat allotted in this round based on merit rank. Awaiting subsequent rounds.';
    } else if (effectiveStage === AdmissionStage.SeatConfirmed) {
      nextAction = 'Pay the admission fee to confirm enrollment';
    } else if (
      effectiveStage === AdmissionStage.PaymentCompleted ||
      effectiveStage === AdmissionStage.VerificationPending
    ) {
      nextAction = 'Visit campus with QR gate pass for physical document verification';
    } else if (effectiveStage === AdmissionStage.AdmissionConfirmed) {
      nextAction = 'Admission complete! Welcome to LNMIIT Jaipur.';
    }

    sendSuccess(res, {
      currentStage: effectiveStage,
      nextAction,
      stages: stageOrder,
      currentRound: currentRound
        ? {
            _id: currentRound._id,
            roundNumber: currentRound.roundNumber,
            name: currentRound.name,
            status: currentRound.status,
            version: currentRound.version,
          }
        : null,
      currentAllotment,
      application,
      roundVersion: currentRound?.version,
      lastUpdatedAt: currentRound?.updatedAt || application.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

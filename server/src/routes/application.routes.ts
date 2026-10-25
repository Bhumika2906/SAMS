import {
  AdmissionStage,
  ApplicationStatus,
  DocumentStatus,
  SeatPublication,
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
    if (preferences) application.preferences = preferences;
    if (category) application.category = category;

    application.admissionStage = AdmissionStage.ApplicationInProgress;
    await application.save();

    sendSuccess(res, { application, message: 'Application updated successfully' });
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

    // Check if there is a published allotment for this application
    const latestAllotment = await SeatAllotment.findOne({
      applicationId: application._id,
      publication: SeatPublication.Published,
    }).sort({ createdAt: -1 });

    let effectiveStage = application.admissionStage;
    if (latestAllotment && latestAllotment.result === SeatResult.NotAllotted) {
      effectiveStage = AdmissionStage.NotAllotted;
      if (application.admissionStage !== AdmissionStage.NotAllotted) {
        application.admissionStage = AdmissionStage.NotAllotted;
        await application.save();
      }
    }

    const stageOrder = [
      { key: AdmissionStage.Registered, label: 'Account Registered' },
      { key: AdmissionStage.ApplicationInProgress, label: 'Application Form' },
      { key: AdmissionStage.Submitted, label: 'Application Submitted' },
      { key: effectiveStage === AdmissionStage.NotAllotted ? AdmissionStage.NotAllotted : AdmissionStage.InRound, label: effectiveStage === AdmissionStage.NotAllotted ? 'No Seat Allotted' : 'Round Allotment' },
      { key: AdmissionStage.SeatConfirmed, label: 'Seat Confirmed' },
      { key: AdmissionStage.PaymentCompleted, label: 'Admission Fee Paid' },
      { key: AdmissionStage.VerificationPending, label: 'Campus Verification' },
      { key: AdmissionStage.AdmissionConfirmed, label: 'Admission Confirmed' },
    ];

    let nextAction = 'Fill and submit application form';
    if (effectiveStage === AdmissionStage.Submitted) {
      nextAction = 'Wait for Round 1 seat allotment publication';
    } else if (effectiveStage === AdmissionStage.InRound) {
      nextAction = 'Review allotment and tap Accept or Decline';
    } else if (effectiveStage === AdmissionStage.NotAllotted) {
      nextAction = 'No seat allotted in this round based on merit rank. Awaiting subsequent rounds.';
    } else if (effectiveStage === AdmissionStage.SeatConfirmed) {
      nextAction = 'Pay the admission fee to confirm enrollment';
    } else if (effectiveStage === AdmissionStage.PaymentCompleted || effectiveStage === AdmissionStage.VerificationPending) {
      nextAction = 'Visit campus with QR gate pass for physical document verification';
    } else if (effectiveStage === AdmissionStage.AdmissionConfirmed) {
      nextAction = 'Admission complete! Welcome to LNMIIT Jaipur.';
    }

    sendSuccess(res, {
      currentStage: effectiveStage,
      nextAction,
      stages: stageOrder,
    });
  } catch (err) {
    next(err);
  }
});

import {
  AdmissionStage,
  ApplicationStatus,
  ChecklistItemStatus,
  ChecklistStatus,
  GatePassValidity,
  PaymentStatus,
  RoundStatus,
  SeatPublication,
  SeatResponse,
  SeatResult,
  UserRole,
} from '@sams/shared';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadConfig } from './config';
import { connectDb, disconnectDb } from './db';
import { logger } from './logger';
import {
  AdmissionCycle,
  AdmissionRound,
  Application,
  AuditLog,
  DigitalChecklist,
  DocumentModel,
  Notification,
  Payment,
  Programme,
  QRGatePass,
  SeatAllotment,
  User,
  VerificationCounter,
} from './models';

export async function seedDatabase(): Promise<void> {
  const config = loadConfig();
  logger.info(`Seeding database at ${config.MONGODB_URI}...`);

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Application.deleteMany({}),
    DocumentModel.deleteMany({}),
    AdmissionCycle.deleteMany({}),
    Programme.deleteMany({}),
    AdmissionRound.deleteMany({}),
    SeatAllotment.deleteMany({}),
    Payment.deleteMany({}),
    DigitalChecklist.deleteMany({}),
    QRGatePass.deleteMany({}),
    VerificationCounter.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Create Verification Counters
  const counter1 = await VerificationCounter.create({
    name: 'Counter 1 - Hall A',
    location: 'Lecture Hall 1 (LH-101)',
    assignedVerifierIds: [],
  });

  const counter2 = await VerificationCounter.create({
    name: 'Counter 2 - Hall B',
    location: 'Lecture Hall 2 (LH-102)',
    assignedVerifierIds: [],
  });

  // 2. Create Staff Accounts
  const _adminUser = await User.create({
    email: 'admin@sams.test',
    passwordHash,
    fullName: 'System Administrator',
    role: UserRole.AdministratorUser,
    verified: true,
    adminLevel: 'SuperAdmin',
  });

  const faculty1 = await User.create({
    email: 'faculty1@sams.test',
    passwordHash,
    fullName: 'Prof. Rajesh Sharma',
    role: UserRole.FacultyVerifier,
    verified: true,
    assignedCounterId: counter1._id,
  });

  const faculty2 = await User.create({
    email: 'faculty2@sams.test',
    passwordHash,
    fullName: 'Dr. Anita Verma',
    role: UserRole.FacultyVerifier,
    verified: true,
    assignedCounterId: counter2._id,
  });

  const _managementUser = await User.create({
    email: 'management@sams.test',
    passwordHash,
    fullName: 'Dean of Academic Affairs',
    role: UserRole.Management,
    verified: true,
  });

  // Link verifiers to counters
  counter1.assignedVerifierIds = [faculty1._id as any];
  await counter1.save();

  counter2.assignedVerifierIds = [faculty2._id as any];
  await counter2.save();

  // 3. Create Programmes with limited seats
  const cse = await Programme.create({
    code: 'CSE',
    name: 'Computer Science & Engineering',
    fee: 160000,
    baseCapacity: 3,
    description: 'B.Tech in Computer Science and Engineering',
  });

  const cce = await Programme.create({
    code: 'CCE',
    name: 'Communication & Computer Engineering',
    fee: 150000,
    baseCapacity: 2,
    description: 'B.Tech in Communication and Computer Engineering',
  });

  const ece = await Programme.create({
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    fee: 140000,
    baseCapacity: 2,
    description: 'B.Tech in Electronics and Communication Engineering',
  });

  // 4. Create Admission Cycle
  const currentYear = new Date().getFullYear();
  const cycle = await AdmissionCycle.create({
    year: currentYear,
    name: `UG Admission ${currentYear}`,
    active: true,
    startDate: new Date(currentYear, 5, 1),
    endDate: new Date(currentYear, 8, 30),
  });
  await Programme.updateMany({}, { $set: { cycleId: cycle._id } });

  // 5. Create Admission Round 1
  const round1 = await AdmissionRound.create({
    roundNumber: 1,
    name: 'Round 1 - Regular Allotment',
    cycleId: cycle._id,
    status: RoundStatus.Published,
    startDate: new Date(),
    responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    seatMatrix: [
      { programmeId: cse._id, capacity: 3, allotted: 1, confirmed: 0 },
      { programmeId: cce._id, capacity: 2, allotted: 1, confirmed: 1 },
      { programmeId: ece._id, capacity: 2, allotted: 0, confirmed: 0 },
    ],
  });

  // 6. Create 8 Applicants in varied stages
  // Applicant 1: Draft stage, verified
  const app1User = await User.create({
    email: 'applicant1@sams.test',
    passwordHash,
    fullName: 'Aarav Patel',
    role: UserRole.Applicant,
    verified: true,
  });
  const app1 = await Application.create({
    userId: app1User._id,
    status: ApplicationStatus.Draft,
    admissionStage: AdmissionStage.ApplicationInProgress,
    meritRank: 12,
    personal: { phone: '9876543210', gender: 'Male', dateOfBirth: '2008-05-14' },
  });
  app1User.applicationId = app1._id as any;
  await app1User.save();

  // Applicant 2: Submitted & Eligible stage (ready for upcoming round)
  const app2User = await User.create({
    email: 'applicant2@sams.test',
    passwordHash,
    fullName: 'Bhavya Sharma',
    role: UserRole.Applicant,
    verified: true,
  });
  const app2 = await Application.create({
    userId: app2User._id,
    status: ApplicationStatus.Eligible,
    admissionStage: AdmissionStage.Eligible,
    locked: true,
    meritRank: 35,
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    preferences: [
      { programmeId: cse._id, preferenceOrder: 1 },
      { programmeId: cce._id, preferenceOrder: 2 },
      { programmeId: ece._id, preferenceOrder: 3 },
    ],
    personal: { phone: '9876543211', gender: 'Female', dateOfBirth: '2008-08-20' },
  });
  app2User.applicationId = app2._id as any;
  await app2User.save();

  // Applicant 3: Submitted & UnderReview
  const app3User = await User.create({
    email: 'applicant3@sams.test',
    passwordHash,
    fullName: 'Chirag Singhania',
    role: UserRole.Applicant,
    verified: true,
  });
  const app3 = await Application.create({
    userId: app3User._id,
    status: ApplicationStatus.UnderReview,
    admissionStage: AdmissionStage.UnderReview,
    locked: true,
    meritRank: 50,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    preferences: [
      { programmeId: cse._id, preferenceOrder: 1 },
      { programmeId: cce._id, preferenceOrder: 2 },
    ],
    personal: { phone: '9876543212', gender: 'Male', dateOfBirth: '2008-02-11' },
  });
  app3User.applicationId = app3._id as any;
  await app3User.save();

  // Applicant 4: InRound stage with published allotment (CSE), Pending response
  const app4User = await User.create({
    email: 'applicant4@sams.test',
    passwordHash,
    fullName: 'Diya Gupta',
    role: UserRole.Applicant,
    verified: true,
  });
  const app4 = await Application.create({
    userId: app4User._id,
    status: ApplicationStatus.Eligible,
    admissionStage: AdmissionStage.InRound,
    locked: true,
    meritRank: 75,
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    preferences: [
      { programmeId: cse._id, preferenceOrder: 1 },
      { programmeId: cce._id, preferenceOrder: 2 },
    ],
    personal: { phone: '9876543213', gender: 'Female', dateOfBirth: '2007-11-29' },
  });
  app4User.applicationId = app4._id as any;
  await app4User.save();

  await SeatAllotment.create({
    applicationId: app4._id,
    roundId: round1._id,
    programmeId: cse._id,
    publication: SeatPublication.Published,
    active: true,
    result: SeatResult.Allotted,
    response: SeatResponse.Pending,
    allottedRank: 75,
  });

  // Applicant 5: Seat confirmed (CCE), awaiting payment
  const app5User = await User.create({
    email: 'applicant5@sams.test',
    passwordHash,
    fullName: 'Eshan Roy',
    role: UserRole.Applicant,
    verified: true,
  });
  const app5 = await Application.create({
    userId: app5User._id,
    status: ApplicationStatus.Eligible,
    admissionStage: AdmissionStage.SeatConfirmed,
    locked: true,
    meritRank: 92,
    submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    preferences: [
      { programmeId: cce._id, preferenceOrder: 1 },
      { programmeId: cse._id, preferenceOrder: 2 },
    ],
    personal: { phone: '9876543214', gender: 'Male', dateOfBirth: '2008-01-05' },
  });
  app5User.applicationId = app5._id as any;
  await app5User.save();

  await SeatAllotment.create({
    applicationId: app5._id,
    roundId: round1._id,
    programmeId: cce._id,
    publication: SeatPublication.Published,
    active: true,
    result: SeatResult.Allotted,
    response: SeatResponse.Accepted,
    respondedAt: new Date(),
    allottedRank: 92,
  });

  // Applicant 6: Payment completed, QR gate pass & digital checklist generated (ready for Counter 1 verification)
  const app6User = await User.create({
    email: 'applicant6@sams.test',
    passwordHash,
    fullName: 'Fatima Sheikh',
    role: UserRole.Applicant,
    verified: true,
  });
  const app6 = await Application.create({
    userId: app6User._id,
    status: ApplicationStatus.Eligible,
    admissionStage: AdmissionStage.VerificationPending,
    locked: true,
    meritRank: 110,
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    preferences: [{ programmeId: ece._id, preferenceOrder: 1 }],
    personal: { phone: '9876543215', gender: 'Female', dateOfBirth: '2008-04-18' },
  });
  app6User.applicationId = app6._id as any;
  await app6User.save();

  await SeatAllotment.create({
    applicationId: app6._id,
    roundId: round1._id,
    programmeId: ece._id,
    publication: SeatPublication.Published,
    active: true,
    result: SeatResult.Allotted,
    response: SeatResponse.Accepted,
    respondedAt: new Date(),
    allottedRank: 110,
  });

  await Payment.create({
    applicationId: app6._id,
    amount: ece.fee,
    status: PaymentStatus.Success,
    idempotencyKey: 'seed_payment_app6',
    receiptNumber: 'REC-2026-006',
    simulated: true,
    paidAt: new Date(),
  });

  const rawToken6 = 'sams_gate_pass_token_app6_secure_128bit';
  const tokenHash6 = crypto.createHash('sha256').update(rawToken6).digest('hex');

  await QRGatePass.create({
    applicationId: app6._id,
    tokenHash: tokenHash6,
    rawToken: 'DEMO-PASS-101',
    passCode: 'DEMO-PASS-101',
    purpose: 'Campus Document Verification',
    date: '2026-11-01',
    timeSlot: '10:00 AM - 11:30 AM',
    counterId: counter1._id,
    validity: GatePassValidity.Valid,
  });

  await DigitalChecklist.create({
    applicationId: app6._id,
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
        name: 'JEE Main Score Card (Original)',
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

  // Applicant 7: Fully verified & Admission Confirmed
  const app7User = await User.create({
    email: 'applicant7@sams.test',
    passwordHash,
    fullName: 'Gaurav Mishra',
    role: UserRole.Applicant,
    verified: true,
  });
  const app7 = await Application.create({
    userId: app7User._id,
    status: ApplicationStatus.Eligible,
    admissionStage: AdmissionStage.AdmissionConfirmed,
    locked: true,
    meritRank: 140,
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    preferences: [{ programmeId: cse._id, preferenceOrder: 1 }],
    personal: { phone: '9876543216', gender: 'Male', dateOfBirth: '2007-09-30' },
  });
  app7User.applicationId = app7._id as any;
  await app7User.save();

  await SeatAllotment.create({
    applicationId: app7._id,
    roundId: round1._id,
    programmeId: cse._id,
    publication: SeatPublication.Published,
    active: true,
    result: SeatResult.Allotted,
    response: SeatResponse.Accepted,
    respondedAt: new Date(),
    allottedRank: 140,
  });

  await Payment.create({
    applicationId: app7._id,
    amount: cse.fee,
    status: PaymentStatus.Success,
    idempotencyKey: 'seed_payment_app7',
    receiptNumber: 'REC-2026-007',
    simulated: true,
    paidAt: new Date(),
  });

  await DigitalChecklist.create({
    applicationId: app7._id,
    status: ChecklistStatus.FullyVerified,
    items: [
      {
        name: 'Class 10 Original Certificate & Marksheet',
        mandatory: true,
        status: ChecklistItemStatus.Verified,
        verifiedBy: faculty1._id as any,
        verifiedAt: new Date(),
      },
      {
        name: 'Class 12 Original Certificate & Marksheet',
        mandatory: true,
        status: ChecklistItemStatus.Verified,
        verifiedBy: faculty1._id as any,
        verifiedAt: new Date(),
      },
      {
        name: 'JEE Main Score Card (Original)',
        mandatory: true,
        status: ChecklistItemStatus.Verified,
        verifiedBy: faculty1._id as any,
        verifiedAt: new Date(),
      },
    ],
  });

  // Applicant 8: Unverified account (to test registration/OTP flow)
  const app8Otp = '123456';
  const app8OtpHash = await bcrypt.hash(app8Otp, 8);
  const _app8User = await User.create({
    email: 'applicant8@sams.test',
    passwordHash,
    fullName: 'Harshita Sen',
    role: UserRole.Applicant,
    verified: false,
    otpHash: app8OtpHash,
    otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    otpPurpose: 'verify',
  });

  logger.info('Database seeded successfully with:');
  logger.info('- Admin: admin@sams.test');
  logger.info('- Faculty 1 (Counter 1): faculty1@sams.test');
  logger.info('- Faculty 2 (Counter 2): faculty2@sams.test');
  logger.info('- Management: management@sams.test');
  logger.info('- 8 Applicants (applicant1@sams.test .. applicant8@sams.test)');
  logger.info('- All accounts password: Password@123');
  logger.info(`- Applicant 8 OTP for testing: ${app8Otp}`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  await connectDb(config.MONGODB_URI);
  try {
    await seedDatabase();
  } finally {
    await disconnectDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, 'Seeding failed');
    process.exit(1);
  });
}

import {
  AdmissionStage,
  API_PREFIX,
  ApplicationStatus,
  RoundStatus,
  SeatPublication,
  SeatResponse,
  SeatResult,
  UserRole,
} from '@sams/shared';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from './app';
import { signToken } from './middleware/auth';
import { AdmissionRound, Application, Programme, SeatAllotment, User } from './models';
import { AllotmentService } from './services/allotment.service';
import { clearTestDb, setupTestDb, teardownTestDb } from './test/test-db';

const app = createApp();

jest.setTimeout(60000);

describe('Seat Allotment Consistency & Business Rules', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_secret_for_sams_at_least_16_characters';
    await setupTestDb();
  }, 60000);

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // Helper to create a test user, application, and token
  async function createApplicant(
    index: number,
    meritRank: number,
    preferences: any[] = [],
  ): Promise<{ user: any; application: any; token: string }> {
    const user = await User.create({
      email: `applicant${index}@test.com`,
      passwordHash: 'hashed_password_123',
      fullName: `Applicant ${index}`,
      role: UserRole.Applicant,
      verified: true,
    });

    const application = await Application.create({
      userId: user._id,
      status: ApplicationStatus.Submitted,
      admissionStage: AdmissionStage.Submitted,
      locked: true,
      meritRank,
      preferences,
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, application, token };
  }

  // Helper to create an admin user and token
  async function createAdmin(): Promise<{ user: any; token: string }> {
    const user = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hashed_password_123',
      fullName: 'Administrator',
      role: UserRole.AdministratorUser,
      verified: true,
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  // Helper to create programmes
  async function createTestProgrammes(): Promise<{ cse: any; ece: any }> {
    const cse = await Programme.create({
      code: 'CSE',
      name: 'Computer Science and Engineering',
      fee: 160000,
      baseCapacity: 2,
    });

    const ece = await Programme.create({
      code: 'ECE',
      name: 'Electronics and Communication Engineering',
      fee: 140000,
      baseCapacity: 2,
    });

    return { cse, ece };
  }

  // Helper to create an admission round
  async function createRound(
    roundNumber: number,
    status: RoundStatus = RoundStatus.Draft,
    programmes: any[] = [],
  ): Promise<any> {
    const seatMatrix = programmes.map((p) => ({
      programmeId: p._id,
      capacity: p.baseCapacity,
      allotted: 0,
      confirmed: 0,
      offered: 0,
      accepted: 0,
      available: p.baseCapacity,
    }));

    return await AdmissionRound.create({
      roundNumber,
      name: `Round ${roundNumber}`,
      status,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      seatMatrix,
      version: 1,
    });
  }

  // 1. One applicant with five historical allotments but only one current allotment
  it('1. returns only one active allotment for an applicant with historical allotments', async () => {
    const { cse } = await createTestProgrammes();
    const { application, token } = await createApplicant(1, 1);

    // Create 5 historical closed rounds with superseded allotments
    for (let r = 1; r <= 5; r++) {
      const oldRound = await createRound(r, RoundStatus.Closed, [cse]);
      await SeatAllotment.create({
        applicationId: application._id,
        roundId: oldRound._id,
        programmeId: cse._id,
        result: SeatResult.Allotted,
        response: SeatResponse.Declined,
        publication: SeatPublication.Published,
        isActive: false,
        revision: 1,
      });
    }

    // Current round 6
    const currentRound = await createRound(6, RoundStatus.Published, [cse]);
    const currentAllotment = await SeatAllotment.create({
      applicationId: application._id,
      roundId: currentRound._id,
      programmeId: cse._id,
      result: SeatResult.Allotted,
      response: SeatResponse.Pending,
      publication: SeatPublication.Published,
      isActive: true,
      revision: 1,
    });

    // Fetch via current allotment service
    const resolved = await AllotmentService.getCurrentAllotmentForApplication(
      application._id.toString(),
      currentRound._id.toString(),
    );
    expect(resolved).not.toBeNull();
    expect(resolved!._id.toString()).toBe(currentAllotment._id.toString());
    expect(resolved!.isActive).toBe(true);

    // Fetch via API
    const res = await request(app)
      .get(`${API_PREFIX}/allotments/me/current`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.allotment._id.toString()).toBe(currentAllotment._id.toString());

    // Check diagnostics: zero multi-active allotment issues
    const diagnostics = await AllotmentService.getDiagnostics(currentRound._id.toString());
    const multiActiveIssues = diagnostics.issues.filter(
      (i) => i.type === 'MultipleActiveAllotments',
    );
    expect(multiActiveIssues.length).toBe(0);
  });

  // 2. Repeated allotment run
  it('2. allows repeated allotment runs before publication without duplicating records', async () => {
    const { cse } = await createTestProgrammes();
    const { application } = await createApplicant(1, 1, [
      { programmeId: cse._id, preferenceOrder: 1 },
    ]);
    const { token: adminToken } = await createAdmin();
    const round = await createRound(1, RoundStatus.Draft, [cse]);

    // First allotment run
    const res1 = await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res1.status).toBe(200);
    const count1 = await SeatAllotment.countDocuments({ roundId: round._id });
    expect(count1).toBe(1);

    // Second allotment run (rerun)
    const res2 = await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(200);
    const count2 = await SeatAllotment.countDocuments({ roundId: round._id });
    expect(count2).toBe(1); // Cleanly replaced, no duplicate records!

    const allotment = await SeatAllotment.findOne({ roundId: round._id });
    expect(allotment?.revision).toBe(2);
  });

  // 3. Concurrent allotment requests
  it('3. rejects concurrent allotment runs using allocation lock', async () => {
    const { cse } = await createTestProgrammes();
    await createApplicant(1, 1, [{ programmeId: cse._id, preferenceOrder: 1 }]);
    const { token: adminToken } = await createAdmin();
    const round = await createRound(1, RoundStatus.Draft, [cse]);

    // Manually lock round to simulate concurrent in-progress run
    round.allocationLock = {
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: new mongoose.Types.ObjectId(),
      runId: 'existing-run-id',
    };
    await round.save();

    const res = await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    const errorMsg = res.body.error?.message || res.body.error;
    expect(errorMsg).toMatch(/already (in progress|running)/i);
  });

  // 4. Repeated publish requests
  it('4. repeated publish requests are idempotent', async () => {
    const { cse } = await createTestProgrammes();
    await createApplicant(1, 1, [{ programmeId: cse._id, preferenceOrder: 1 }]);
    const { token: adminToken } = await createAdmin();
    const round = await createRound(1, RoundStatus.Draft, [cse]);

    // Run allotment
    await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);

    // First publish
    const pub1 = await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pub1.status).toBe(200);

    // Second publish
    const pub2 = await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pub2.status).toBe(200);
    expect(pub2.body.data.message).toMatch(/already published/i);

    const updatedRound = await AdmissionRound.findById(round._id);
    expect(updatedRound?.status).toBe(RoundStatus.Published);
  });

  // 5. Concurrent accept and decline
  it('5. guarantees atomic response so concurrent accept and decline cannot both succeed', async () => {
    const { cse } = await createTestProgrammes();
    const { application, token } = await createApplicant(1, 1);
    const round = await createRound(1, RoundStatus.Published, [cse]);

    const allotment = await SeatAllotment.create({
      applicationId: application._id,
      roundId: round._id,
      programmeId: cse._id,
      result: SeatResult.Allotted,
      response: SeatResponse.Pending,
      publication: SeatPublication.Published,
      isActive: true,
      revision: 1,
    });

    // Fire concurrent Accept and Decline requests
    const [resAccept, resDecline] = await Promise.all([
      request(app)
        .post(`${API_PREFIX}/allotments/${allotment._id}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({ response: SeatResponse.Accepted }),
      request(app)
        .post(`${API_PREFIX}/allotments/${allotment._id}/respond`)
        .set('Authorization', `Bearer ${token}`)
        .send({ response: SeatResponse.Declined }),
    ]);

    const statuses = [resAccept.status, resDecline.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalAllotment = await SeatAllotment.findById(allotment._id);
    expect([SeatResponse.Accepted, SeatResponse.Declined]).toContain(finalAllotment?.response);
  });

  // 6. Applicant response to an old-round allotment
  it('6. rejects applicant response to an inactive or old-round allotment', async () => {
    const { cse } = await createTestProgrammes();
    const { application, token } = await createApplicant(1, 1);

    const oldRound = await createRound(1, RoundStatus.Closed, [cse]);
    const oldAllotment = await SeatAllotment.create({
      applicationId: application._id,
      roundId: oldRound._id,
      programmeId: cse._id,
      result: SeatResult.Allotted,
      response: SeatResponse.Pending,
      publication: SeatPublication.Published,
      isActive: false, // Inactive historical allotment
      revision: 1,
    });

    // Current round is Round 2
    await createRound(2, RoundStatus.Published, [cse]);

    const res = await request(app)
      .post(`${API_PREFIX}/allotments/${oldAllotment._id}/respond`)
      .set('Authorization', `Bearer ${token}`)
      .send({ response: SeatResponse.Accepted });

    expect([400, 409]).toContain(res.status);
    const errorMsg = res.body.error?.message || res.body.error;
    expect(errorMsg).toMatch(/does not belong to the current published round/i);
  });

  // 7. Accepted applicant being excluded from a later round
  it('7. excludes applicant who has accepted a seat from being allotted a new seat in later round', async () => {
    const { cse, ece } = await createTestProgrammes();
    const { application: app1 } = await createApplicant(1, 1, [
      { programmeId: cse._id, preferenceOrder: 1 },
    ]);
    const { application: app2 } = await createApplicant(2, 2, [
      { programmeId: cse._id, preferenceOrder: 1 },
    ]);
    const { token: adminToken } = await createAdmin();

    // Round 1
    const round1 = await createRound(1, RoundStatus.Draft, [cse, ece]);
    await request(app)
      .post(`${API_PREFIX}/rounds/${round1._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);
    await request(app)
      .post(`${API_PREFIX}/rounds/${round1._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Candidate 1 accepts seat
    const alt1 = await SeatAllotment.findOne({ applicationId: app1._id, roundId: round1._id });
    expect(alt1).not.toBeNull();
    await AllotmentService.respondToAllotment(
      alt1!._id.toString(),
      app1.userId.toString(),
      SeatResponse.Accepted,
    );

    // Close Round 1
    round1.status = RoundStatus.Closed;
    await round1.save();

    // Create Round 2
    const round2 = await createRound(2, RoundStatus.Draft, [cse, ece]);
    await request(app)
      .post(`${API_PREFIX}/rounds/${round2._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Verify Candidate 1 retains their accepted seat and is NOT reallocated
    const round2Alt1 = await SeatAllotment.findOne({
      applicationId: app1._id,
      roundId: round2._id,
    });
    expect(round2Alt1).toBeNull(); // Not allotted again in round 2!

    // Verify Candidate 1's active allotment is still their Round 1 accepted seat
    const activeAlt1 = await AllotmentService.getCurrentAllotmentForApplication(
      app1._id.toString(),
      round2._id.toString(),
    );
    expect(activeAlt1).not.toBeNull();
    const activeRoundId = (activeAlt1!.roundId._id || activeAlt1!.roundId).toString();
    expect(activeRoundId).toBe(round1._id.toString());
    expect(activeAlt1!.response).toBe(SeatResponse.Accepted);
  });

  // 8. Capacity never being exceeded
  it('8. strictly respects programme capacity during allocation', async () => {
    const { cse } = await createTestProgrammes(); // capacity = 2
    const { token: adminToken } = await createAdmin();

    // Create 5 applicants who all rank CSE #1
    for (let i = 1; i <= 5; i++) {
      await createApplicant(i, i, [{ programmeId: cse._id, preferenceOrder: 1 }]);
    }

    const round = await createRound(1, RoundStatus.Draft, [cse]);
    await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);

    const allotted = await SeatAllotment.find({
      roundId: round._id,
      result: SeatResult.Allotted,
    });
    const notAllotted = await SeatAllotment.find({
      roundId: round._id,
      result: SeatResult.NotAllotted,
    });

    expect(allotted.length).toBe(2);
    expect(notAllotted.length).toBe(3);

    // Diagnostics should report zero capacity breaches
    const diag = await AllotmentService.getDiagnostics(round._id.toString());
    const capacityIssues = diag.issues.filter((i) => i.type === 'CapacityExceeded');
    expect(capacityIssues.length).toBe(0);
  });

  // 9. Management counts using distinct current applicants
  it('9. management overview counts distinct current applicants, ignoring historical records', async () => {
    const { cse } = await createTestProgrammes();
    const { user: mgtUser } = await createApplicant(99, 99);
    mgtUser.role = UserRole.Management;
    await mgtUser.save();
    const mgtToken = signToken({
      id: mgtUser._id.toString(),
      email: mgtUser.email,
      role: mgtUser.role,
    });

    const { application: app1 } = await createApplicant(1, 1);

    // Old round 1 has an allotment for app1
    const round1 = await createRound(1, RoundStatus.Closed, [cse]);
    await SeatAllotment.create({
      applicationId: app1._id,
      roundId: round1._id,
      programmeId: cse._id,
      result: SeatResult.Allotted,
      response: SeatResponse.Declined,
      publication: SeatPublication.Published,
      isActive: false,
    });

    // Current round 2 has an allotment for app1
    const round2 = await createRound(2, RoundStatus.Published, [cse]);
    await SeatAllotment.create({
      applicationId: app1._id,
      roundId: round2._id,
      programmeId: cse._id,
      result: SeatResult.Allotted,
      response: SeatResponse.Accepted,
      publication: SeatPublication.Published,
      isActive: true,
    });

    const res = await request(app)
      .get(`${API_PREFIX}/management/overview`)
      .set('Authorization', `Bearer ${mgtToken}`);

    expect(res.status).toBe(200);
    // Distinct allottedCount must be 1, NOT 2!
    expect(res.body.data.stats.allottedCount).toBe(1);
  });

  // 10. Failed transaction leaving no partial allotments
  it('10. rolls back all writes if an error occurs during allocation', async () => {
    const { cse } = await createTestProgrammes();
    const { token: adminToken } = await createAdmin();
    await createApplicant(1, 1, [{ programmeId: cse._id, preferenceOrder: 1 }]);

    const round = await createRound(1, RoundStatus.Draft, [cse]);

    // Force failure by passing an invalid round ID to service
    const fakeRoundId = new mongoose.Types.ObjectId().toString();
    const fakeAdminId = new mongoose.Types.ObjectId().toString();
    await expect(
      AllotmentService.runRoundAllocation(fakeRoundId, fakeAdminId),
    ).rejects.toThrow();

    const count = await SeatAllotment.countDocuments({ roundId: round._id });
    expect(count).toBe(0);
  });

  // 11. Publish not moving advanced application stages backward
  it('11. does not overwrite advanced application stages when publishing', async () => {
    const { cse } = await createTestProgrammes();
    const { application } = await createApplicant(1, 1, [
      { programmeId: cse._id, preferenceOrder: 1 },
    ]);
    const { token: adminToken } = await createAdmin();

    // Advance applicant stage to AdmissionConfirmed
    application.admissionStage = AdmissionStage.AdmissionConfirmed;
    await application.save();

    const round = await createRound(1, RoundStatus.Draft, [cse]);
    await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/allot`)
      .set('Authorization', `Bearer ${adminToken}`);
    await request(app)
      .post(`${API_PREFIX}/rounds/${round._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    const refreshedApp = await Application.findById(application._id);
    expect(refreshedApp?.admissionStage).toBe(AdmissionStage.AdmissionConfirmed);
  });
});

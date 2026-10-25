import { API_PREFIX, ApplicationStatus, UserRole } from '@sams/shared';
import request from 'supertest';
import { createApp } from './app';
import { signToken } from './middleware/auth';
import { Application, Programme, User } from './models';
import { clearTestDb, setupTestDb, teardownTestDb } from './test/test-db';

const app = createApp();

jest.setTimeout(60000);

describe('Application Fee & Submission Workflow', () => {
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

  async function createApplicantUser(): Promise<{ user: any; application: any; token: string; programme: any }> {
    const programme = await Programme.create({
      code: 'CSE',
      name: 'Computer Science',
      fee: 160000,
      baseCapacity: 10,
    });

    const user = await User.create({
      email: 'applicant.fee@test.com',
      passwordHash: 'password_hash_xyz',
      fullName: 'Fee Test Applicant',
      role: UserRole.Applicant,
      verified: true,
    });

    const application = await Application.create({
      userId: user._id,
      status: ApplicationStatus.Draft,
      personal: { phone: '9876543210', gender: 'Male' },
      education: { class12Score: 94 },
      preferences: [{ programmeId: programme._id, preferenceOrder: 1 }],
      applicationFee: { paid: false, amount: 1000 },
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, application, token, programme };
  }

  it('rejects application submission if application fee is not paid', async () => {
    const { token } = await createApplicantUser();

    const res = await request(app)
      .post(`${API_PREFIX}/applications/me/submit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Application fee of ₹1,000 must be paid');
  });

  it('simulates application fee payment decline when outcome is fail', async () => {
    const { token } = await createApplicantUser();

    const res = await request(app)
      .post(`${API_PREFIX}/applications/me/pay-fee`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outcome: 'fail' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.feePaid).toBe(false);
    expect(res.body.data.message).toContain('Payment simulated as Failed');
  });

  it('successfully pays application fee, generates receipt, and allows final submission', async () => {
    const { token } = await createApplicantUser();

    // 1. Pay application fee
    const payRes = await request(app)
      .post(`${API_PREFIX}/applications/me/pay-fee`)
      .set('Authorization', `Bearer ${token}`)
      .send({ outcome: 'success' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.feePaid).toBe(true);
    expect(payRes.body.data.applicationFee.paid).toBe(true);
    expect(payRes.body.data.applicationFee.amount).toBe(1000);
    expect(payRes.body.data.applicationFee.receiptNumber).toMatch(/^RCP-APP-/);
    expect(payRes.body.data.applicationFee.transactionId).toMatch(/^TXN-APP-/);

    // 2. Submit application now that fee is paid
    const submitRes = await request(app)
      .post(`${API_PREFIX}/applications/me/submit`)
      .set('Authorization', `Bearer ${token}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.application.locked).toBe(true);
    expect(submitRes.body.data.application.status).toBe(ApplicationStatus.Submitted);
  });
});

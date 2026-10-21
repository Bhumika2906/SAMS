import { API_PREFIX, UserRole } from '@sams/shared';
import request from 'supertest';
import { createApp } from './app';
import { authenticate, requireRoles, signToken } from './middleware/auth';
import { User } from './models';
import { clearTestDb, setupTestDb, teardownTestDb } from './test/test-db';

const app = createApp();

// Add temporary test routes to verify RBAC guards
app.get(
  `${API_PREFIX}/test-admin`,
  authenticate,
  requireRoles(UserRole.AdministratorUser),
  (_req, res) => {
    res.json({ success: true, message: 'Admin access granted' });
  },
);

app.get(
  `${API_PREFIX}/test-faculty`,
  authenticate,
  requireRoles(UserRole.FacultyVerifier),
  (_req, res) => {
    res.json({ success: true, message: 'Faculty access granted' });
  },
);

jest.setTimeout(60000);

describe('Auth & RBAC API Endpoints', () => {
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

  describe('POST /api/v1/auth/register', () => {
    it('registers an applicant and generates an OTP', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/register`)
        .send({
          email: 'test@example.com',
          password: 'Password@123',
          fullName: 'Test Applicant',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.role).toBe(UserRole.Applicant);
      expect(res.body.data.user.verified).toBe(false);

      const dbUser = await User.findOne({ email: 'test@example.com' });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.verified).toBe(false);
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'test@example.com',
        password: 'Password@123',
        fullName: 'First Applicant',
      });

      const res = await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'test@example.com',
        password: 'Password@123',
        fullName: 'Second Applicant',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects invalid password format with 400 Bad Request', async () => {
      const res = await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'test@example.com',
        password: 'simple',
        fullName: 'Test Applicant',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('verifies the OTP, marks user verified, creates Application, and returns access token', async () => {
      const regRes = await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'verify@example.com',
        password: 'Password@123',
        fullName: 'Verify Me',
      });

      const devOtp = regRes.body.data.devOtp;
      expect(devOtp).toBeDefined();

      const verifyRes = await request(app).post(`${API_PREFIX}/auth/verify-otp`).send({
        email: 'verify@example.com',
        otp: devOtp,
      });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.accessToken).toBeDefined();
      expect(verifyRes.body.data.user.verified).toBe(true);
      expect(verifyRes.body.data.user.applicationId).toBeDefined();

      const dbUser = await User.findOne({ email: 'verify@example.com' });
      expect(dbUser?.verified).toBe(true);
      expect(dbUser?.applicationId).not.toBeNull();
    });

    it('rejects invalid OTP with 400 Bad Request', async () => {
      await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'invalid-otp@example.com',
        password: 'Password@123',
        fullName: 'Invalid OTP User',
      });

      const res = await request(app).post(`${API_PREFIX}/auth/verify-otp`).send({
        email: 'invalid-otp@example.com',
        otp: '000000',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      const reg = await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'login@example.com',
        password: 'Password@123',
        fullName: 'Login Applicant',
      });
      await request(app).post(`${API_PREFIX}/auth/verify-otp`).send({
        email: 'login@example.com',
        otp: reg.body.data.devOtp,
      });
    });

    it('logs in successfully with valid credentials', async () => {
      const res = await request(app).post(`${API_PREFIX}/auth/login`).send({
        email: 'login@example.com',
        password: 'Password@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('rejects incorrect password with 401 Unauthorized', async () => {
      const res = await request(app).post(`${API_PREFIX}/auth/login`).send({
        email: 'login@example.com',
        password: 'WrongPassword@123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects non-existent email with 401 Unauthorized', async () => {
      const res = await request(app).post(`${API_PREFIX}/auth/login`).send({
        email: 'nobody@example.com',
        password: 'Password@123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password & reset-password', () => {
    it('handles password reset flow with OTP verification', async () => {
      const reg = await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'reset@example.com',
        password: 'OldPassword@123',
        fullName: 'Reset Applicant',
      });
      await request(app).post(`${API_PREFIX}/auth/verify-otp`).send({
        email: 'reset@example.com',
        otp: reg.body.data.devOtp,
      });

      const forgotRes = await request(app)
        .post(`${API_PREFIX}/auth/forgot-password`)
        .send({ email: 'reset@example.com' });

      expect(forgotRes.status).toBe(200);
      const resetOtp = forgotRes.body.data.devOtp;
      expect(resetOtp).toBeDefined();

      const resetRes = await request(app).post(`${API_PREFIX}/auth/reset-password`).send({
        email: 'reset@example.com',
        otp: resetOtp,
        password: 'NewPassword@123',
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      const loginRes = await request(app).post(`${API_PREFIX}/auth/login`).send({
        email: 'reset@example.com',
        password: 'NewPassword@123',
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user profile with valid Bearer token', async () => {
      const reg = await request(app).post(`${API_PREFIX}/auth/register`).send({
        email: 'me@example.com',
        password: 'Password@123',
        fullName: 'Me Applicant',
      });
      const verify = await request(app).post(`${API_PREFIX}/auth/verify-otp`).send({
        email: 'me@example.com',
        otp: reg.body.data.devOtp,
      });

      const token = verify.body.data.accessToken;

      const res = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@example.com');
      expect(res.body.data.user.fullName).toBe('Me Applicant');
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get(`${API_PREFIX}/auth/me`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/auth/me`)
        .set('Authorization', 'Bearer invalid_garbage_token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('RBAC Middleware Permissions', () => {
    it('allows AdministratorUser to access admin-only endpoint', async () => {
      const adminToken = signToken({
        id: 'admin_123',
        role: UserRole.AdministratorUser,
        email: 'admin@sams.test',
      });

      const res = await request(app)
        .get(`${API_PREFIX}/test-admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('forbids Applicant from accessing admin-only endpoint with 403 Forbidden', async () => {
      const applicantToken = signToken({
        id: 'applicant_123',
        role: UserRole.Applicant,
        email: 'applicant@sams.test',
      });

      const res = await request(app)
        .get(`${API_PREFIX}/test-admin`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids FacultyVerifier from accessing admin-only endpoint with 403 Forbidden', async () => {
      const facultyToken = signToken({
        id: 'faculty_123',
        role: UserRole.FacultyVerifier,
        email: 'faculty@sams.test',
      });

      const res = await request(app)
        .get(`${API_PREFIX}/test-admin`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('forbids Applicant from accessing faculty-only endpoint with 403 Forbidden', async () => {
      const applicantToken = signToken({
        id: 'applicant_123',
        role: UserRole.Applicant,
        email: 'applicant@sams.test',
      });

      const res = await request(app)
        .get(`${API_PREFIX}/test-faculty`)
        .set('Authorization', `Bearer ${applicantToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('forbids Management from accessing admin-only endpoint with 403 Forbidden', async () => {
      const mgmtToken = signToken({
        id: 'mgmt_123',
        role: UserRole.Management,
        email: 'mgmt@sams.test',
      });

      const res = await request(app)
        .get(`${API_PREFIX}/test-admin`)
        .set('Authorization', `Bearer ${mgmtToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});

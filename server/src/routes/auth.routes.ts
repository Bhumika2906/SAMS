import {
  forgotPasswordBodySchema,
  loginBodySchema,
  publicUserSchema,
  registerBodySchema,
  resendOtpBodySchema,
  resetPasswordBodySchema,
  UserRole,
  verifyOtpBodySchema,
} from '@sams/shared';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loadConfig } from '../config';
import { badRequest, conflict, notFound, sendSuccess, unauthorized } from '../errors';
import { authenticate, signToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { Application, User } from '../models';
import { NotificationService } from '../services/notification.service';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
      },
    });
  },
});

authRouter.use(authLimiter);

function formatPublicUser(userDoc: any) {
  return publicUserSchema.parse({
    id: userDoc._id.toString(),
    email: userDoc.email,
    fullName: userDoc.fullName,
    role: userDoc.role,
    verified: userDoc.verified,
    applicationId: userDoc.applicationId ? userDoc.applicationId.toString() : null,
    assignedCounterId: userDoc.assignedCounterId ? userDoc.assignedCounterId.toString() : null,
  });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /register
 */
authRouter.post('/register', validate(registerBodySchema), async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      throw conflict('An account with this email address already exists');
    }

    const config = loadConfig();
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 8);
    const otpExpiresAt = new Date(Date.now() + config.OTP_TTL_SECONDS * 1000);

    const user = await User.create({
      email,
      passwordHash,
      fullName,
      role: UserRole.Applicant,
      verified: false,
      otpHash,
      otpExpiresAt,
      otpPurpose: 'verify',
    });

    await NotificationService.sendSms(
      email,
      `Your SAMS verification code is ${otp}. Valid for 5 minutes.`,
    );

    sendSuccess(
      res,
      {
        message: 'Registration successful. Please verify your account with the OTP sent.',
        user: formatPublicUser(user),
        // In development/test mode, expose OTP in response for testing convenience
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
      },
      201,
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /verify-otp
 */
authRouter.post('/verify-otp', validate(verifyOtpBodySchema), async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpPurpose');
    if (!user) {
      throw notFound('User not found');
    }

    if (!user.otpHash || !user.otpExpiresAt || !user.otpPurpose) {
      throw badRequest('No pending OTP request found for this account');
    }

    if (user.otpPurpose !== 'verify') {
      throw badRequest('Invalid OTP purpose');
    }

    if (new Date() > user.otpExpiresAt) {
      throw badRequest('OTP has expired. Please request a new one.');
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      throw badRequest('Invalid OTP code');
    }

    user.verified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;

    if (user.role === UserRole.Applicant && !user.applicationId) {
      const application = await Application.create({
        userId: user._id,
      });
      user.applicationId = application._id as any;
    }

    await user.save();

    const publicUser = formatPublicUser(user);
    const accessToken = signToken({
      id: publicUser.id,
      role: publicUser.role,
      email: publicUser.email,
    });

    sendSuccess(res, {
      accessToken,
      user: publicUser,
      message: 'Account verified successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /login
 */
authRouter.post('/login', validate(loginBodySchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw unauthorized('Invalid email or password');
    }

    const publicUser = formatPublicUser(user);
    const accessToken = signToken({
      id: publicUser.id,
      role: publicUser.role,
      email: publicUser.email,
    });

    sendSuccess(res, {
      accessToken,
      user: publicUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /forgot-password
 */
authRouter.post('/forgot-password', validate(forgotPasswordBodySchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    const config = loadConfig();

    if (user) {
      const otp = generateOtp();
      user.otpHash = await bcrypt.hash(otp, 8);
      user.otpExpiresAt = new Date(Date.now() + config.OTP_TTL_SECONDS * 1000);
      user.otpPurpose = 'reset';
      await user.save();

      await NotificationService.sendSms(
        email,
        `Your SAMS password reset code is ${otp}. Valid for 5 minutes.`,
      );

      sendSuccess(res, {
        message: 'Password reset code has been sent.',
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
      });
      return;
    }

    // Always return success to prevent email enumeration
    sendSuccess(res, {
      message: 'Password reset code has been sent if the email is registered.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /resend-otp
 */
authRouter.post('/resend-otp', validate(resendOtpBodySchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw notFound('User not found');
    }

    if (user.verified) {
      throw badRequest('Account is already verified. Please proceed to login.');
    }

    const config = loadConfig();
    const otp = generateOtp();
    user.otpHash = await bcrypt.hash(otp, 8);
    user.otpExpiresAt = new Date(Date.now() + config.OTP_TTL_SECONDS * 1000);
    user.otpPurpose = 'verify';
    await user.save();

    await NotificationService.sendSms(
      email,
      `Your SAMS verification code is ${otp}. Valid for 5 minutes.`,
    );

    sendSuccess(res, {
      message: 'A new 6-digit verification code has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reset-password
 */
authRouter.post('/reset-password', validate(resetPasswordBodySchema), async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpPurpose');
    if (!user) {
      throw notFound('User not found');
    }

    if (!user.otpHash || !user.otpExpiresAt || user.otpPurpose !== 'reset') {
      throw badRequest('No active password reset request found');
    }

    if (new Date() > user.otpExpiresAt) {
      throw badRequest('Password reset code has expired');
    }

    const isValid = await bcrypt.compare(otp, user.otpHash);
    if (!isValid) {
      throw badRequest('Invalid password reset code');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;
    await user.save();

    sendSuccess(res, {
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /me
 */
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw unauthorized();
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      throw notFound('User not found');
    }

    sendSuccess(res, {
      user: formatPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

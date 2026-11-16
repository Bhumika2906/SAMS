import { z } from 'zod';
import { UserRole } from './enums';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/\d/, 'Password needs a number');

export const emailSchema = z.string().trim().toLowerCase().email();

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(80),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resendOtpBodySchema = z.object({
  email: emailSchema,
});
export type ResendOtpBody = z.infer<typeof resendOtpBodySchema>;

export const resetPasswordBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  password: passwordSchema,
});
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export const idParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id'),
});

export const userRoleSchema = z.nativeEnum(UserRole);

export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: userRoleSchema,
  verified: z.boolean(),
  applicationId: z.string().nullable().optional(),
  assignedCounterId: z.string().nullable().optional(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthTokens {
  accessToken: string;
  user: PublicUser;
}


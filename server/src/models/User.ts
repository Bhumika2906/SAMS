import { USER_ROLES, UserRole } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, required: true, default: UserRole.Applicant },
    verified: { type: Boolean, default: false },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', default: null },
    assignedCounterId: { type: Schema.Types.ObjectId, ref: 'VerificationCounter', default: null },
    adminLevel: { type: String, default: null },
    otpHash: { type: String, select: false, default: null },
    otpExpiresAt: { type: Date, select: false, default: null },
    otpPurpose: { type: String, enum: ['verify', 'reset', null], default: null, select: false },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

export const User = mongoose.model('User', userSchema);

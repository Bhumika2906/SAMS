import {
  AdmissionStage,
  ADMISSION_STAGES,
  ApplicationStatus,
  APPLICATION_STATUSES,
} from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: ApplicationStatus.Draft },
    admissionStage: { type: String, enum: ADMISSION_STAGES, default: AdmissionStage.Registered },
    locked: { type: Boolean, default: false },
    meritRank: { type: Number, default: null },
    submittedAt: { type: Date, default: null },
    category: { type: String, default: 'General' },
    personal: {
      dateOfBirth: { type: String, default: '' },
      gender: { type: String, default: '' },
      phone: { type: String, default: '' },
      fatherName: { type: String, default: '' },
      motherName: { type: String, default: '' },
      nationality: { type: String, default: 'Indian' },
    },
    address: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    education: {
      class10Board: { type: String, default: '' },
      class10RollNumber: { type: String, default: '' },
      class10Year: { type: Number, default: null },
      class10Score: { type: Number, default: null },
      class12Board: { type: String, default: '' },
      class12RollNumber: { type: String, default: '' },
      class12Year: { type: Number, default: null },
      class12Score: { type: Number, default: null },
      examName: { type: String, default: 'JEE Main' },
      examRollNumber: { type: String, default: '' },
      examRank: { type: Number, default: null },
      examScore: { type: Number, default: null },
    },
    preferences: [
      {
        programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', required: true },
        preferenceOrder: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1 }, { unique: true });
applicationSchema.index({ status: 1, meritRank: 1 });

export const Application = mongoose.model('Application', applicationSchema);

import { GatePassValidity } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const qrGatePassSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, default: 'Campus Document Verification' },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    counterId: { type: Schema.Types.ObjectId, ref: 'VerificationCounter', default: null },
    validity: {
      type: String,
      enum: Object.values(GatePassValidity),
      default: GatePassValidity.Valid,
    },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

qrGatePassSchema.index({ tokenHash: 1 }, { unique: true });
qrGatePassSchema.index({ applicationId: 1 }, { unique: true });
qrGatePassSchema.index({ validity: 1 });

export const QRGatePass = mongoose.model('QRGatePass', qrGatePassSchema);

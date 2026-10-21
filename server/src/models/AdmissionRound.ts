import { RoundStatus } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const seatMatrixItemSchema = new Schema(
  {
    programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', required: true },
    capacity: { type: Number, required: true, min: 0 },
    allotted: { type: Number, default: 0, min: 0 },
    confirmed: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const admissionRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(RoundStatus),
      default: RoundStatus.Draft,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    responseDeadline: { type: Date, default: null },
    seatMatrix: [seatMatrixItemSchema],
  },
  { timestamps: true },
);

admissionRoundSchema.index({ roundNumber: 1 }, { unique: true });
admissionRoundSchema.index({ status: 1 });

export const AdmissionRound = mongoose.model('AdmissionRound', admissionRoundSchema);

import mongoose, { Schema } from 'mongoose';

const admissionCycleSchema = new Schema(
  {
    year: { type: Number, required: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true },
);

admissionCycleSchema.index({ active: 1 });
admissionCycleSchema.index({ year: 1 });

export const AdmissionCycle = mongoose.model('AdmissionCycle', admissionCycleSchema);

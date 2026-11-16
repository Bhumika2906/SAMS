import mongoose, { Schema } from 'mongoose';

const programmeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    baseCapacity: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

programmeSchema.index({ code: 1 }, { unique: true });

export const Programme = mongoose.model('Programme', programmeSchema);

import mongoose, { Schema } from 'mongoose';

const verificationCounterSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    assignedVerifierIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

verificationCounterSchema.index({ name: 1 });

export const VerificationCounter = mongoose.model(
  'VerificationCounter',
  verificationCounterSchema,
);

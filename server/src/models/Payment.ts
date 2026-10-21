import { PaymentStatus } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const paymentSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    receiptNumber: { type: String, default: null },
    simulated: { type: Boolean, default: true },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ idempotencyKey: 1 }, { unique: true });
paymentSchema.index({ applicationId: 1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);

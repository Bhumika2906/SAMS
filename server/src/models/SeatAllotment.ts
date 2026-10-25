import { SeatPublication, SeatResponse, SeatResult } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const seatAllotmentSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'AdmissionRound', required: true },
    programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', default: null },
    publication: {
      type: String,
      enum: Object.values(SeatPublication),
      default: SeatPublication.Proposed,
    },
    result: {
      type: String,
      enum: Object.values(SeatResult),
      required: true,
    },
    response: {
      type: String,
      enum: Object.values(SeatResponse),
      default: SeatResponse.Pending,
    },
    respondedAt: { type: Date, default: null },
    allottedRank: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
    allocationRunId: { type: String, default: null },
    revision: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    supersededAt: { type: Date, default: null },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'SeatAllotment', default: null },
  },
  { timestamps: true },
);

seatAllotmentSchema.index({ applicationId: 1, roundId: 1, revision: 1 });
seatAllotmentSchema.index({ applicationId: 1, isActive: 1 });
seatAllotmentSchema.index({ roundId: 1, result: 1, isActive: 1 });
seatAllotmentSchema.index({ roundId: 1, publication: 1 });

export const SeatAllotment = mongoose.model('SeatAllotment', seatAllotmentSchema);

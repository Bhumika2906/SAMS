import { ChecklistItemStatus, ChecklistStatus } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const checklistItemSchema = new Schema(
  {
    name: { type: String, required: true },
    mandatory: { type: Boolean, default: true },
    status: {
      type: String,
      enum: Object.values(ChecklistItemStatus),
      default: ChecklistItemStatus.Pending,
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    remarks: { type: String, default: null },
  },
  { _id: true },
);

const digitalChecklistSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(ChecklistStatus),
      default: ChecklistStatus.Pending,
    },
    items: [checklistItemSchema],
  },
  { timestamps: true },
);

digitalChecklistSchema.index({ applicationId: 1 }, { unique: true });
digitalChecklistSchema.index({ status: 1 });

export const DigitalChecklist = mongoose.model('DigitalChecklist', digitalChecklistSchema);

import { DocumentStatus } from '@sams/shared';
import mongoose, { Schema } from 'mongoose';

const documentSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(DocumentStatus),
      default: DocumentStatus.Uploaded,
    },
    rejectionReason: { type: String, default: null },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentSchema.index({ applicationId: 1 });
documentSchema.index({ status: 1 });

export const DocumentModel = mongoose.model('Document', documentSchema);

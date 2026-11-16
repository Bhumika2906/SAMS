import mongoose, { Schema } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    summary: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

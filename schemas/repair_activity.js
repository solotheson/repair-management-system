const mongoose = require('mongoose');
const { APP_REPAIR_STATUS } = require('../config/app');

const RepairActivitySchema = new mongoose.Schema(
  {
    repair_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Repair', required: true, index: true },
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actor_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: { type: String, enum: ['created', 'status_changed', 'note_added', 'updated'], required: true, index: true },
    from_status: { type: String, enum: [...Object.values(APP_REPAIR_STATUS), null], default: null },
    to_status: { type: String, enum: [...Object.values(APP_REPAIR_STATUS), null], default: null },
    note: { type: String, trim: true, default: null },
    metadata: { type: Object, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('RepairActivity', RepairActivitySchema);

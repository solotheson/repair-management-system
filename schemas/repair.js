const mongoose = require('mongoose');
const { APP_REPAIR_STATUS } = require('../config/app');

const RepairSchema = new mongoose.Schema(
  {
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    created_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assigned_to_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: Object.values(APP_REPAIR_STATUS), required: true, index: true },
    customer: {
      name: { type: String, trim: true, required: true },
      telephone_number: { type: String, trim: true, required: true },
    },
    item: {
      type: { type: String, trim: true, default: null },
      brand: { type: String, trim: true, default: null },
      model: { type: String, trim: true, default: null },
      serial_number: { type: String, trim: true, default: null },
    },
    issue_description: { type: String, trim: true, required: true },
    received_at: { type: Date, default: () => new Date() },
    completed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Repair', RepairSchema);

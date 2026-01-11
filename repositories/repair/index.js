const Repair = require('../../schemas/repair');
const { APP_REPAIR_STATUS } = require('../../config/app');

async function createRepair({
  workspace_id,
  created_by_user_id,
  customer,
  item,
  issue_description,
  assigned_to_user_id = null,
}) {
  return Repair.create({
    workspace_id,
    created_by_user_id,
    assigned_to_user_id,
    status: APP_REPAIR_STATUS.in_progress,
    customer,
    item,
    issue_description,
    received_at: new Date(),
    completed_at: null,
  });
}

async function listRepairs({ workspace_id, status }) {
  const query = { workspace_id };
  if (status) query.status = status;
  return Repair.find(query).sort({ created_at: -1 });
}

async function getRepairById({ id, workspace_id }) {
  return Repair.findOne({ _id: id, workspace_id });
}

async function completeRepair({ repair }) {
  if (repair.status === APP_REPAIR_STATUS.completed) return repair;
  repair.status = APP_REPAIR_STATUS.completed;
  repair.completed_at = new Date();
  await repair.save();
  return repair;
}

module.exports = { createRepair, listRepairs, getRepairById, completeRepair };

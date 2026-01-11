const RepairActivity = require('../../schemas/repair_activity');

async function addActivity({
  repair_id,
  workspace_id,
  actor_user_id = null,
  type,
  from_status = null,
  to_status = null,
  note = null,
  metadata = null,
}) {
  return RepairActivity.create({
    repair_id,
    workspace_id,
    actor_user_id,
    type,
    from_status,
    to_status,
    note,
    metadata,
  });
}

async function listActivity({ repair_id }) {
  return RepairActivity.find({ repair_id }).sort({ created_at: -1 });
}

module.exports = { addActivity, listActivity };

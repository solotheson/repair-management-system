const Workspace = require('../../schemas/workspace');

async function getWorkspaceById({ id }) {
  return Workspace.findById(id);
}

async function createWorkspace({ name, created_by_user_id, owner_user_id }) {
  return Workspace.create({
    name,
    created_by_user_id,
    owner_user_id,
    status: 'active',
  });
}

module.exports = { getWorkspaceById, createWorkspace };

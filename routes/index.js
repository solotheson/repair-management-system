const healthRoutes = require('./v1/health');
const authRoutes = require('./v1/auth');
const workspaceRoutes = require('./v1/workspaces');
const adminSuperadminRoutes = require('./admin/v1/superadmin');
const adminWorkspacesRoutes = require('./admin/v1/workspaces');

module.exports = ({ appServer }) => {
  appServer.use('/repair/v1/health', healthRoutes);
  appServer.use('/repair/v1/auth', authRoutes);
  appServer.use('/repair/v1/workspaces', workspaceRoutes);

  appServer.use('/repair/admin/v1/superadmin', adminSuperadminRoutes);
  appServer.use('/repair/admin/v1/workspaces', adminWorkspacesRoutes);
};

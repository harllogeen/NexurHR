const ROLE_PERMISSIONS = {
  'super-admin': {
    employee: ['create', 'read', 'update', 'delete', 'import', 'search', 'org-chart', 'upload-document'],
    leave: ['request', 'approve', 'reject', 'view-all', 'bulk-approve', 'manage-types', 'manage-policies', 'manage-calendars', 'manage-workflows', 'adjust-balance', 'calendar', 'view-balance'],
    attendance: ['clock-in-out', 'view-all', 'adjust', 'export'],
    notification: ['create', 'view-all'],
    dashboard: ['view-admin'],
    audit: ['view', 'filter'],
    session: ['view', 'revoke'],
    profile: ['read', 'update'],
  },
  hr: {
    employee: ['create', 'read', 'update', 'delete', 'import', 'search', 'org-chart', 'upload-document'],
    leave: ['request', 'approve', 'reject', 'view-all', 'bulk-approve', 'manage-types', 'manage-policies', 'manage-calendars', 'manage-workflows', 'adjust-balance', 'calendar', 'view-balance'],
    attendance: ['clock-in-out', 'view-all', 'adjust', 'export'],
    notification: ['create', 'view-all'],
    dashboard: ['view-admin'],
    audit: ['view', 'filter'],
    session: ['view', 'revoke'],
    profile: ['read', 'update'],
  },
  manager: {
    employee: ['read', 'search', 'org-chart'],
    leave: ['request', 'approve', 'reject', 'view-all', 'bulk-approve', 'calendar', 'view-balance'],
    attendance: ['clock-in-out', 'view-all', 'export'],
    notification: ['create', 'view-all'],
    dashboard: ['view-manager'],
    profile: ['read', 'update'],
  },
  employee: {
    employee: ['read', 'search', 'org-chart', 'upload-document'],
    leave: ['request', 'view-all', 'calendar', 'view-balance'],
    attendance: ['clock-in-out', 'view-all', 'export'],
    notification: ['view-all'],
    dashboard: ['view-employee'],
    profile: ['read', 'update'],
  },
  staff: {
    employee: ['read', 'search', 'org-chart', 'upload-document'],
    leave: ['request', 'view-all', 'calendar', 'view-balance'],
    attendance: ['clock-in-out', 'view-all', 'export'],
    notification: ['view-all'],
    dashboard: ['view-employee'],
    profile: ['read', 'update'],
  },
};

const normalizeRole = (role) => {
  if (!role) return 'employee';
  const normalized = String(role).toLowerCase();
  if (normalized === 'superadmin' || normalized === 'super-admin' || normalized === 'super_admin') return 'super-admin';
  if (normalized === 'staff') return 'employee';
  return normalized;
};

const hasPermission = (user, action, resource) => {
  const role = normalizeRole(user?.role || user?.systemRole);
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.employee;
  const allowedActions = permissions[resource] || [];

  if (allowedActions.includes(action) || allowedActions.includes('*')) {
    return true;
  }

  return false;
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  normalizeRole,
};

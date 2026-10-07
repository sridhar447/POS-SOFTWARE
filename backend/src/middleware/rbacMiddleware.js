/**
 * Role-Based Access Control Middleware
 * @param {string[]} allowedRoles Array of allowed role names (e.g., ['ADMIN'])
 */
export const requireRole = (allowedRoles = ['ADMIN']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'UNAUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized access: Requires one of [${allowedRoles.join(', ')}] role.`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireBillingOrAdmin = requireRole(['ADMIN', 'BILLING_USER']);

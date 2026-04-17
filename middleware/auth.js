/**
 * Authentication Middleware
 * LOGIN TEMPORARILY DISABLED — default admin session auto-injected.
 * Re-enable by restoring original logic in this file.
 */
const DEFAULT_USER = { id: 1, username: 'Admin', name: 'Puan Siti Nurhaliza', role: 'admin' };

function requireAuth(req, res, next) {
    if (!req.session.user) req.session.user = DEFAULT_USER;
    req.user = req.session.user;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) req.session.user = DEFAULT_USER;
    req.user = req.session.user;
    next();
}

module.exports = { requireAuth, requireAdmin };

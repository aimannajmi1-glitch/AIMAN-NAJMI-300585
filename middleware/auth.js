/**
 * Authentication Middleware — N.A.D.I. POS
 * Real session-based auth enforced.
 */

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Sila log masuk terlebih dahulu' });
    }
    req.user = req.session.user;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Sila log masuk terlebih dahulu' });
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses pentadbir diperlukan' });
    }
    req.user = req.session.user;
    next();
}

module.exports = { requireAuth, requireAdmin };

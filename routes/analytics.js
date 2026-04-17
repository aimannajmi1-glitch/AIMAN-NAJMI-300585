/**
 * Analytics API Routes
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

function toObjects(result) {
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

function getValue(result) {
    if (!result.length) return 0;
    return result[0].values[0][0];
}

// GET /api/analytics/summary
router.get('/summary', requireAdmin, (req, res) => {
    const db = getDb();
    const { from, to } = req.query;
    let df = '', params = [];
    if (from && to) { df = `AND DATE(sale_time) BETWEEN ? AND ?`; params = [from, to]; }

    const today = new Date().toISOString().split('T')[0];
    const totalSales = getValue(db.exec(`SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE status='completed' ${df}`, params));
    const totalTx = getValue(db.exec(`SELECT COUNT(*) FROM sales WHERE status='completed' ${df}`, params));
    const todayRev = getValue(db.exec(`SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE status='completed' AND DATE(sale_time)=?`, [today]));
    const todayTx = getValue(db.exec(`SELECT COUNT(*) FROM sales WHERE status='completed' AND DATE(sale_time)=?`, [today]));
    const cash = getValue(db.exec(`SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE status='completed' AND payment_method='cash' ${df}`, params));
    const qr = getValue(db.exec(`SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE status='completed' AND payment_method='qr_pay' ${df}`, params));
    const voided = getValue(db.exec(`SELECT COUNT(*) FROM sales WHERE status='voided' ${df}`, params));
    const products = getValue(db.exec(`SELECT COUNT(*) FROM products WHERE is_active=1`));
    const credits = getValue(db.exec(`SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END)-SUM(CASE WHEN type='payment' THEN amount ELSE 0 END),0) FROM teacher_credits`));

    res.json({
        totalSales: Math.round(totalSales * 100) / 100,
        totalTransactions: totalTx,
        todayRevenue: Math.round(todayRev * 100) / 100,
        todayTransactions: todayTx,
        cashTotal: Math.round(cash * 100) / 100,
        qrTotal: Math.round(qr * 100) / 100,
        voidedCount: voided,
        activeProducts: products,
        avgTransaction: totalTx > 0 ? Math.round((totalSales / totalTx) * 100) / 100 : 0,
        outstandingCredits: Math.round(credits * 100) / 100
    });
});

// GET /api/analytics/hourly
router.get('/hourly', requireAdmin, (req, res) => {
    const db = getDb();
    const { from, to } = req.query;
    let df = '', params = [];
    if (from && to) { df = `AND DATE(sale_time) BETWEEN ? AND ?`; params = [from, to]; }

    const result = db.exec(`SELECT CAST(strftime('%H', sale_time) AS INTEGER) as hour, COUNT(*) as transactions, COALESCE(SUM(total_amount),0) as revenue FROM sales WHERE status='completed' ${df} GROUP BY hour ORDER BY hour`, params);
    const data = toObjects(result);
    const hourly = [];
    for (let h = 0; h < 24; h++) {
        const f = data.find(d => d.hour === h);
        hourly.push({ hour: h, label: `${String(h).padStart(2,'0')}:00`, transactions: f ? f.transactions : 0, revenue: f ? Math.round(f.revenue * 100) / 100 : 0 });
    }
    res.json(hourly);
});

// GET /api/analytics/daily
router.get('/daily', requireAdmin, (req, res) => {
    const db = getDb();
    const days = parseInt(req.query.days) || 30;
    const result = db.exec(`SELECT DATE(sale_time) as sale_date, COUNT(*) as transactions, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END),0) as cash_revenue, COALESCE(SUM(CASE WHEN payment_method='qr_pay' THEN total_amount ELSE 0 END),0) as qr_revenue FROM sales WHERE status='completed' AND DATE(sale_time) >= DATE('now','-'||?||' days','+8 hours') GROUP BY sale_date ORDER BY sale_date`, [days]);
    res.json(toObjects(result));
});

// GET /api/analytics/products
router.get('/products', requireAdmin, (req, res) => {
    const db = getDb();
    const { limit, sort, from, to } = req.query;
    const n = parseInt(limit) || 10;
    const s = sort === 'quantity' ? 'total_qty' : 'total_revenue';
    let df = '', params = [];
    if (from && to) { df = `AND DATE(s.sale_time) BETWEEN ? AND ?`; params = [from, to]; }

    const result = db.exec(`SELECT si.product_name, si.product_id, SUM(si.quantity) as total_qty, SUM(si.line_total) as total_revenue, COUNT(DISTINCT si.sale_id) as transaction_count FROM sale_items si JOIN sales s ON si.sale_id=s.id AND s.status='completed' ${df} GROUP BY si.product_id, si.product_name ORDER BY ${s} DESC LIMIT ?`, [...params, n]);
    res.json(toObjects(result));
});

// GET /api/analytics/payments
router.get('/payments', requireAdmin, (req, res) => {
    const db = getDb();
    const { from, to } = req.query;
    let df = '', params = [];
    if (from && to) { df = `AND DATE(sale_time) BETWEEN ? AND ?`; params = [from, to]; }
    const result = db.exec(`SELECT payment_method, COUNT(*) as transaction_count, COALESCE(SUM(total_amount),0) as total_amount FROM sales WHERE status='completed' ${df} GROUP BY payment_method`, params);
    res.json(toObjects(result));
});

// GET /api/analytics/categories
router.get('/categories', requireAdmin, (req, res) => {
    const db = getDb();
    const { from, to } = req.query;
    let df = '', params = [];
    if (from && to) { df = `AND DATE(s.sale_time) BETWEEN ? AND ?`; params = [from, to]; }
    const result = db.exec(`SELECT c.name as category_name, c.color_code, SUM(si.quantity) as total_qty, SUM(si.line_total) as total_revenue FROM sale_items si JOIN sales s ON si.sale_id=s.id AND s.status='completed' ${df} JOIN products p ON si.product_id=p.id JOIN categories c ON p.category_id=c.id GROUP BY c.id, c.name, c.color_code ORDER BY total_revenue DESC`, params);
    res.json(toObjects(result));
});

module.exports = router;

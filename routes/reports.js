/**
 * Reports Routes — Financial report generation and CSV export
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

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', requireAdmin, (req, res) => {
    const db = getDb();
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const sales = toObjects(db.exec(
        `SELECT s.*, u.full_name as cashier_name FROM sales s JOIN users u ON s.user_id=u.id WHERE DATE(s.sale_time)=? ORDER BY s.sale_time`, [date]
    ));
    const shifts = toObjects(db.exec(
        `SELECT s.*, u.full_name as cashier_name FROM shifts s JOIN users u ON s.user_id=u.id WHERE DATE(s.start_time)=?`, [date]
    ));

    const summary = {
        date,
        total_revenue: sales.filter(s=>s.status==='completed').reduce((sum,s)=>sum+s.total_amount,0),
        total_transactions: sales.filter(s=>s.status==='completed').length,
        cash_total: sales.filter(s=>s.status==='completed'&&s.payment_method==='cash').reduce((sum,s)=>sum+s.total_amount,0),
        qr_total: sales.filter(s=>s.status==='completed'&&s.payment_method==='qr_pay').reduce((sum,s)=>sum+s.total_amount,0),
        voided_count: sales.filter(s=>s.status==='voided').length,
        total_discounts: sales.filter(s=>s.status==='completed').reduce((sum,s)=>sum+s.discount_amount,0)
    };

    res.json({ summary, sales, shifts });
});

// GET /api/reports/monthly?month=YYYY-MM
router.get('/monthly', requireAdmin, (req, res) => {
    const db = getDb();
    const month = req.query.month || new Date().toISOString().substring(0, 7);

    const dailyData = toObjects(db.exec(`
        SELECT DATE(sale_time) as sale_date, COUNT(*) as transactions,
               SUM(total_amount) as revenue,
               SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END) as cash,
               SUM(CASE WHEN payment_method='qr_pay' THEN total_amount ELSE 0 END) as qr,
               SUM(discount_amount) as discounts
        FROM sales WHERE status='completed' AND strftime('%Y-%m', sale_time)=?
        GROUP BY sale_date ORDER BY sale_date
    `, [month]));

    const topProducts = toObjects(db.exec(`
        SELECT si.product_name, SUM(si.quantity) as qty, SUM(si.line_total) as revenue
        FROM sale_items si JOIN sales s ON si.sale_id=s.id
        WHERE s.status='completed' AND strftime('%Y-%m', s.sale_time)=?
        GROUP BY si.product_id ORDER BY revenue DESC LIMIT 10
    `, [month]));

    const totals = {
        revenue: dailyData.reduce((s,d)=>s+d.revenue,0),
        transactions: dailyData.reduce((s,d)=>s+d.transactions,0),
        cash: dailyData.reduce((s,d)=>s+d.cash,0),
        qr: dailyData.reduce((s,d)=>s+d.qr,0),
        discounts: dailyData.reduce((s,d)=>s+d.discounts,0),
        days: dailyData.length
    };

    res.json({ month, totals, dailyData, topProducts });
});

// GET /api/reports/export?type=daily&date=YYYY-MM-DD
router.get('/export', requireAdmin, (req, res) => {
    const db = getDb();
    const { type, date, month } = req.query;

    if (type === 'daily') {
        const d = date || new Date().toISOString().split('T')[0];
        const sales = toObjects(db.exec(`
            SELECT s.receipt_no, s.sale_time, s.payment_method, s.subtotal, s.discount_amount,
                   s.total_amount, s.status, u.full_name as cashier
            FROM sales s JOIN users u ON s.user_id=u.id WHERE DATE(s.sale_time)=? ORDER BY s.sale_time
        `, [d]));

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="laporan-harian-${d}.csv"`);
        res.write('\ufeff'); // BOM
        res.write('No Resit,Masa,Kaedah Bayaran,Jumlah Sebelum,Diskaun,Jumlah Akhir,Status,Juruwang\n');
        sales.forEach(s => {
            res.write(`${s.receipt_no},${s.sale_time},${s.payment_method==='cash'?'Tunai':'QR Pay'},${s.subtotal},${s.discount_amount},${s.total_amount},${s.status},${s.cashier}\n`);
        });
        return res.end();
    }

    res.status(400).json({ error: 'Jenis laporan tidak sah' });
});

module.exports = router;

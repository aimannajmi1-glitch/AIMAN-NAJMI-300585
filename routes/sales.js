/**
 * Sales / Transaction Log Routes
 */
const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function toObjects(result) {
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// GET /api/sales — list with filters
router.get('/', requireAdmin, (req, res) => {
    const db = getDb();
    const { date, status, payment_method, search, limit, offset } = req.query;

    let sql = `SELECT s.*, u.full_name as cashier_name 
               FROM sales s JOIN users u ON s.user_id = u.id`;
    let conditions = [];
    let params = [];

    if (date) {
        conditions.push(`DATE(s.sale_time) = ?`);
        params.push(date);
    }
    if (status) {
        conditions.push(`s.status = ?`);
        params.push(status);
    }
    if (payment_method) {
        conditions.push(`s.payment_method = ?`);
        params.push(payment_method);
    }
    if (search) {
        conditions.push(`(s.receipt_no LIKE ? OR u.full_name LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length) sql += ` WHERE ` + conditions.join(' AND ');
    sql += ` ORDER BY s.sale_time DESC`;

    if (limit) {
        sql += ` LIMIT ?`;
        params.push(parseInt(limit));
        if (offset) {
            sql += ` OFFSET ?`;
            params.push(parseInt(offset));
        }
    }

    const result = db.exec(sql, params);
    const sales = toObjects(result);

    // Get count for pagination
    let countSql = `SELECT COUNT(*) as total FROM sales s JOIN users u ON s.user_id = u.id`;
    if (conditions.length) countSql += ` WHERE ` + conditions.join(' AND ');
    const countParams = params.slice(0, conditions.length + (search ? 1 : 0));
    const countResult = db.exec(countSql, countParams.slice(0, params.length - (limit ? 1 : 0) - (offset ? 1 : 0)));
    const total = countResult.length ? countResult[0].values[0][0] : 0;

    res.json({ sales, total });
});

// GET /api/sales/:id — single sale with items
router.get('/:id', requireAuth, (req, res) => {
    const db = getDb();
    const saleResult = db.exec(
        `SELECT s.*, u.full_name as cashier_name FROM sales s JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
        [req.params.id]
    );
    const sales = toObjects(saleResult);
    if (!sales.length) return res.status(404).json({ error: 'Jualan tidak dijumpai' });

    const itemsResult = db.exec(`SELECT * FROM sale_items WHERE sale_id = ?`, [req.params.id]);
    const items = toObjects(itemsResult);

    res.json({ ...sales[0], items });
});

// POST /api/sales/:id/void — void a sale
router.post('/:id/void', requireAdmin, (req, res) => {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Alasan pembatalan diperlukan' });

    const db = getDb();
    const saleResult = db.exec(`SELECT * FROM sales WHERE id = ? AND status = 'completed'`, [req.params.id]);
    const sales = toObjects(saleResult);
    if (!sales.length) return res.status(404).json({ error: 'Jualan tidak dijumpai atau sudah dibatalkan' });

    const sale = sales[0];
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.run(`UPDATE sales SET status = 'voided', void_reason = ?, voided_by = ?, voided_at = ? WHERE id = ?`,
        [reason, req.session.user.id, now, req.params.id]);

    // Reverse shift totals
    if (sale.payment_method === 'cash') {
        db.run(`UPDATE shifts SET total_cash_sales = total_cash_sales - ?, total_sales = total_sales - ?,
                total_transactions = total_transactions - 1 WHERE id = ?`,
            [sale.total_amount, sale.total_amount, sale.shift_id]);
    } else {
        db.run(`UPDATE shifts SET total_qr_sales = total_qr_sales - ?, total_sales = total_sales - ?,
                total_transactions = total_transactions - 1 WHERE id = ?`,
            [sale.total_amount, sale.total_amount, sale.shift_id]);
    }

    // Audit log
    db.run(`INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
            VALUES (?, 'sale.void', 'sales', ?, ?, ?, ?)`,
        [req.session.user.id, req.params.id, JSON.stringify({ status: 'completed' }),
         JSON.stringify({ status: 'voided', reason }), req.ip]);

    saveDb();
    res.json({ message: 'Jualan berjaya dibatalkan' });
});

module.exports = router;

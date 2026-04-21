/**
 * Database Module — sql.js (SQLite compiled to JavaScript)
 * Zero native dependencies, works on Windows/Mac/Linux without compilation.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'koperasi_pos.db');

let db = null;

/**
 * Initialize the database — load from file or create fresh with schema
 */
async function initDb() {
    const SQL = await initSqlJs();

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    let hadExistingDb = false;
    // Load existing DB or create new
    if (fs.existsSync(DB_PATH)) {
        hadExistingDb = true;
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('📂 Loaded existing database');
    } else {
        db = new SQL.Database();
        createSchema();
        saveDb();
        console.log('🆕 Created new database with schema');
    }

    // Enable WAL mode for better concurrent reads
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA foreign_keys=ON');

    return { db, isNew: !fs.existsSync(DB_PATH) || !hadExistingDb };
}

/**
 * Create all tables
 */
function createSchema() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('cashier', 'admin')),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color_code TEXT DEFAULT '#3B82F6',
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            barcode TEXT UNIQUE,
            price REAL NOT NULL,
            quick_select_icon TEXT,
            is_quick_select INTEGER NOT NULL DEFAULT 0,
            quick_select_position INTEGER,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            opening_cash REAL NOT NULL DEFAULT 0.00,
            closing_cash REAL,
            expected_cash REAL,
            cash_variance REAL,
            total_cash_sales REAL NOT NULL DEFAULT 0.00,
            total_qr_sales REAL NOT NULL DEFAULT 0.00,
            total_sales REAL NOT NULL DEFAULT 0.00,
            total_transactions INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'reconciled')),
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_no TEXT NOT NULL UNIQUE,
            shift_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            subtotal REAL NOT NULL,
            discount_amount REAL NOT NULL DEFAULT 0.00,
            total_amount REAL NOT NULL,
            amount_tendered REAL,
            change_given REAL,
            payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'qr_pay')),
            status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'voided', 'refunded')),
            void_reason TEXT,
            voided_by INTEGER,
            voided_at TEXT,
            sale_time TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (shift_id) REFERENCES shifts(id) ON UPDATE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
            FOREIGN KEY (voided_by) REFERENCES users(id) ON UPDATE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            line_total REAL NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            staff_id TEXT NOT NULL UNIQUE,
            department TEXT,
            phone TEXT,
            email TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS teacher_credits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            sale_id INTEGER,
            recorded_by INTEGER NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('credit', 'payment')),
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON UPDATE CASCADE,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON UPDATE CASCADE,
            FOREIGN KEY (recorded_by) REFERENCES users(id) ON UPDATE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
        )
    `);

    // Default settings
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('discount_enabled', '0')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('system_name', 'N.A.D.I.')`);

    // --- Indexes for analytics performance ---
    db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_products_quick ON products(is_quick_select, quick_select_position)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sales_time ON sales(sale_time)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(payment_method)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_teacher_credits_teacher ON teacher_credits(teacher_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at)`);
}

/**
 * Save database to file
 */
function saveDb() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

/**
 * Get the database instance
 */
function getDb() {
    if (!db) throw new Error('Database not initialized');
    return db;
}

// Auto-save every 5 seconds
setInterval(() => {
    if (db) saveDb();
}, 5000);

module.exports = { initDb, getDb, saveDb };

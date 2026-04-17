/**
 * KoperasiPOS — Main Server Entry Point
 * Malaysian School Cooperative Point of Sale System
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb, getDb, saveDb } = require('./database');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'koperasi-pos-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 8 * 60 * 60 * 1000, // 8 hours (school day)
        httpOnly: true
    }
}));

// Make session user available to all routes
app.use((req, res, next) => {
    req.user = req.session.user || null;
    next();
});

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/credits', require('./routes/credits'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));

// --- HTML Page Routes ---
// Serve HTML pages (SPA-style with separate pages)
const pages = [
    'login', 'dashboard', 'pos', 'products', 'categories',
    'sales', 'shifts', 'teachers', 'credits', 'analytics', 'reports'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// Root redirects to dashboard (login temporarily disabled)
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// --- Initialize DB and Start Server ---
async function seedIfNew(isNew) {
    if (!isNew) return;
    console.log('🌱 Fresh database — seeding sample data...');
    const db = getDb();
    const adminHash = bcrypt.hashSync('sekolah123', 10);
    const cashierHash = bcrypt.hashSync('cashier123', 10);
    db.run(`INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)`,['Admin',adminHash,'Puan Siti Nurhaliza','admin']);
    db.run(`INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)`,['cashier1',cashierHash,'Ahmad bin Ali','cashier']);
    db.run(`INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)`,['cashier2',cashierHash,'Nurul Aisyah','cashier']);
    [['Makanan','#EF4444',1],['Minuman','#3B82F6',2],['Alat Tulis','#10B981',3],['Roti & Kek','#F59E0B',4],['Lain-lain','#8B5CF6',5]].forEach(c=>db.run(`INSERT INTO categories(name,color_code,sort_order)VALUES(?,?,?)`,c));
    [[1,'Nasi Lemak','NL001',2.50,'🍚',1,1],[1,'Mee Goreng','MG001',2.00,'🍜',1,2],[1,'Roti Canai','RC001',1.50,'🫓',1,3],[1,'Karipap','KP001',0.80,'🥟',1,4],[1,'Sandwich','SW001',2.50,'🥪',1,5],[2,'Air Sirap','AS001',1.00,'🥤',1,6],[2,'Milo Ais','MI001',1.50,'🧋',1,7],[2,'Teh Tarik','TT001',1.50,'☕',1,8],[2,'Air Mineral','AM001',1.00,'💧',1,9],[2,'Jus Oren','JO001',2.00,'🍊',1,10],[3,'Pen Biru','PB001',1.50,'🖊️',1,11],[3,'Pensil 2B','P2B01',1.00,'✏️',1,12],[3,'Pemadam','PM001',1.00,'🧽',1,13],[4,'Roti Gardenia','RG001',3.50,'🍞',1,14],[4,'Donut','DN001',1.00,'🍩',1,15],[4,'Kek Coklat','KC001',2.00,'🍫',1,16]].forEach(p=>db.run(`INSERT INTO products(category_id,name,barcode,price,quick_select_icon,is_quick_select,quick_select_position)VALUES(?,?,?,?,?,?,?)`,p));
    [['Encik Razak','T001','Matematik'],['Puan Faridah','T002','Bahasa Melayu'],['Cikgu Lee','T003','Sains']].forEach(t=>db.run(`INSERT INTO teachers(name,staff_id,department)VALUES(?,?,?)`,t));
    saveDb();
    console.log('✅ Seed done: 3 users, 5 categories, 16 products');
}

initDb().then(async ({ isNew }) => {
    await seedIfNew(isNew);
    app.listen(PORT, () => {
        console.log(`🏪 KoperasiPOS running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});


const I18N_DICT = {
    ms: {
        // Sidebar
        "sidebar.dashboard": "Papan Pemuka",
        "sidebar.pos": "Terminal POS",
        "sidebar.products": "Produk",
        "sidebar.categories": "Kategori",
        "sidebar.sales": "Jualan",
        "sidebar.shifts": "Syif",
        "sidebar.reports": "Laporan",
        "sidebar.teachers": "Guru",
        "sidebar.credits": "Hutang",
        "sidebar.logout": "Log Keluar",
        "sidebar.theme": "Tema Terang/Gelap",

        // Login
        "login.title": "Sistem Jualan Koperasi Sekolah",
        "login.username": "Nama Pengguna",
        "login.password": "Kata Laluan",
        "login.username_ph": "Masukkan nama pengguna...",
        "login.password_ph": "Masukkan kata laluan...",
        "login.btn": "Log Masuk",
        "login.footer": "N.A.D.I. v2.0 — Hak cipta terpelihara © 2026",

        // Dashboard
        "dash.title": "Ringkasan",
        "dash.desc": "Koperasi Sekolah Menengah",
        "dash.revenue_today": "Hasil Hari Ini",
        "dash.tx_today": "Transaksi Hari Ini",
        "dash.total_sales": "Jumlah Keseluruhan",
        "dash.active_products": "Produk Aktif",
        "dash.avg_tx": "Purata Transaksi",
        "dash.teacher_credits": "Hutang Guru",
        "dash.chart_revenue": "Trend Hasil (30 Hari)",
        "dash.chart_hourly": "Waktu Puncak",
        "dash.chart_payment": "Kaedah Pembayaran",
        "dash.chart_products": "Produk Terlaris",

        // POS
        "pos.search_ph": "Cari produk atau imbas kod bar...",
        "pos.all": "Semua",
        "pos.empty_products": "Tiada produk dijumpai",
        "pos.cart_empty": "Troli kosong",
        "pos.subtotal": "Jumlah Kecil",
        "pos.discount": "Diskaun",
        "pos.total": "JUMLAH",
        "pos.pay_cash": "Tunai (F1)",
        "pos.pay_qr": "QR Pay (F2)",
        "pos.clear_cart": "Kosongkan (Esc)",
        "pos.open_shift": "Buka Syif",
        "pos.close_shift": "Tutup Syif",
        "pos.no_shift": "Tiada Syif",
        "pos.active_shift": "Syif Aktif ✓",

        // Modal POS
        "modal.open_shift.title": "Buka Syif Baharu",
        "modal.open_shift.label": "Tunai Permulaan Dalam Laci (RM)",
        "modal.open_shift.btn": "Buka Syif Sekarang",
        "modal.close_shift.title": "Tutup Syif",
        "modal.close_shift.desc": "Adakah anda pasti mahu menutup syif ini? Penyesuaian tunai akan dilakukan oleh pentadbir dalam halaman Syif.",
        "modal.cancel": "Batal",
        "modal.cash.title": "Pembayaran Tunai",
        "modal.cash.total": "Jumlah Perlu Dibayar",
        "modal.cash.tendered": "Tunai Diterima (RM)",
        "modal.cash.change": "Baki Dipulangkan",
        "modal.cash.confirm": "Sahkan & Cetak Resit",
        "modal.receipt.title": "Resit",
        "modal.receipt.close": "Tutup",
        "modal.receipt.print": "Cetak",

        // Shift Gate
        "gate.shift.title": "Syif Belum Dibuka",
        "gate.shift.desc": "Sila buka syif di Terminal POS sebelum meneruskan operasi.",
        "gate.shift.btn": "Buka Syif Sekarang",

        // PIN Gate
        "gate.pin.title": "Akses Disekat",
        "gate.pin.desc": "Sila masukkan kata laluan pentadbir untuk mengakses bahagian ini.",
        "gate.pin.ph": "Kata laluan...",
        "gate.pin.btn": "Sahkan",

        // Common
        "common.action": "Tindakan",
        "common.status": "Status",
        "common.date": "Tarikh",
        "common.time": "Masa"
    },
    en: {
        // Sidebar
        "sidebar.dashboard": "Dashboard",
        "sidebar.pos": "POS Terminal",
        "sidebar.products": "Products",
        "sidebar.categories": "Categories",
        "sidebar.sales": "Sales",
        "sidebar.shifts": "Shifts",
        "sidebar.reports": "Reports",
        "sidebar.teachers": "Teachers",
        "sidebar.credits": "Credits",
        "sidebar.logout": "Logout",
        "sidebar.theme": "Light/Dark Theme",

        // Login
        "login.title": "School Cooperative POS System",
        "login.username": "Username",
        "login.password": "Password",
        "login.username_ph": "Enter username...",
        "login.password_ph": "Enter password...",
        "login.btn": "Login",
        "login.footer": "N.A.D.I. v2.0 — All rights reserved © 2026",

        // Dashboard
        "dash.title": "Overview",
        "dash.desc": "High School Cooperative",
        "dash.revenue_today": "Today's Revenue",
        "dash.tx_today": "Today's Transactions",
        "dash.total_sales": "Total Sales",
        "dash.active_products": "Active Products",
        "dash.avg_tx": "Avg Transaction",
        "dash.teacher_credits": "Teacher Credits",
        "dash.chart_revenue": "Revenue Trend (30 Days)",
        "dash.chart_hourly": "Peak Hours",
        "dash.chart_payment": "Payment Methods",
        "dash.chart_products": "Top Selling Products",

        // POS
        "pos.search_ph": "Search product or scan barcode...",
        "pos.all": "All",
        "pos.empty_products": "No products found",
        "pos.cart_empty": "Cart is empty",
        "pos.subtotal": "Subtotal",
        "pos.discount": "Discount",
        "pos.total": "TOTAL",
        "pos.pay_cash": "Cash (F1)",
        "pos.pay_qr": "QR Pay (F2)",
        "pos.clear_cart": "Clear (Esc)",
        "pos.open_shift": "Open Shift",
        "pos.close_shift": "Close Shift",
        "pos.no_shift": "No Shift",
        "pos.active_shift": "Active Shift ✓",

        // Modal POS
        "modal.open_shift.title": "Open New Shift",
        "modal.open_shift.label": "Opening Cash in Drawer (RM)",
        "modal.open_shift.btn": "Open Shift Now",
        "modal.close_shift.title": "Close Shift",
        "modal.close_shift.desc": "Are you sure you want to close this shift? Cash reconciliation will be handled by the admin in the Shifts page.",
        "modal.cancel": "Cancel",
        "modal.cash.title": "Cash Payment",
        "modal.cash.total": "Total Payable",
        "modal.cash.tendered": "Cash Tendered (RM)",
        "modal.cash.change": "Change Due",
        "modal.cash.confirm": "Confirm & Print Receipt",
        "modal.receipt.title": "Receipt",
        "modal.receipt.close": "Close",
        "modal.receipt.print": "Print",

        // Shift Gate
        "gate.shift.title": "Shift Not Opened",
        "gate.shift.desc": "Please open a shift at the POS Terminal before continuing operations.",
        "gate.shift.btn": "Open Shift Now",

        // PIN Gate
        "gate.pin.title": "Access Restricted",
        "gate.pin.desc": "Please enter the admin password to access this section.",
        "gate.pin.ph": "Password...",
        "gate.pin.btn": "Verify",

        // Common
        "common.action": "Action",
        "common.status": "Status",
        "common.date": "Date",
        "common.time": "Time"
    }
};

window.I18N = {
    lang: localStorage.getItem('lang') || 'ms',
    setLang(l) {
        this.lang = l;
        localStorage.setItem('lang', l);
        this.updateDOM();
    },
    toggleLang() {
        this.setLang(this.lang === 'ms' ? 'en' : 'ms');
    },
    t(key) {
        return (I18N_DICT[this.lang] && I18N_DICT[this.lang][key]) || key;
    },
    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (el.tagName === 'INPUT') {
                if (el.type === 'submit' || el.type === 'button') el.value = translation;
                else el.placeholder = translation;
            } else {
                el.innerHTML = translation;
            }
        });
        document.documentElement.lang = this.lang;
        
        // Dispatch event so charts/other JS can react
        window.dispatchEvent(new Event('languageChanged'));
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => window.I18N.updateDOM());

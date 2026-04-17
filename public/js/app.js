/**
 * KoperasiPOS — Global JavaScript Utilities
 */

const APP = {
    currency: 'RM',

    /** Format number as RM currency */
    formatRM(amount) {
        return `RM ${parseFloat(amount || 0).toFixed(2)}`;
    },

    /** Make an API request */
    async api(url, options = {}) {
        const defaults = {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        const config = { ...defaults, ...options };
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const res = await fetch(url, config);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Request failed (${res.status})`);
            }
            return data;
        } catch (err) {
            if (err.message === 'Unexpected end of JSON input') {
                throw new Error('Server error. Please try again.');
            }
            throw err;
        }
    },

    /** Show a toast notification */
    toast(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /** Check if user is authenticated — LOGIN DISABLED, returns default admin */
    async checkAuth(requiredRole = null) {
        // Login temporarily disabled — return default admin user
        return { id: 1, username: 'Admin', name: 'Puan Siti Nurhaliza', role: 'admin' };
    },

    /** Logout */
    async logout() {
        try {
            await this.api('/api/auth/logout', { method: 'POST' });
        } catch {}
        window.location.href = '/login';
    },

    /** Initialize sidebar for admin pages */
    initSidebar(activePage) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.page === activePage) {
                item.classList.add('active');
            }
        });

        // Mobile toggle
        const toggle = document.querySelector('.mobile-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
                    sidebar.classList.remove('open');
                }
            });
        }
    },

    /** Render sidebar HTML */
    renderSidebar(user) {
        return `
        <div class="sidebar-brand">
            <div class="brand-icon">🏪</div>
            <div>
                <h1>KoperasiPOS</h1>
                <div class="brand-sub">Sistem Jualan Koperasi</div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-section">
                <div class="nav-section-title">Utama</div>
                <a href="/dashboard" class="nav-item" data-page="dashboard">
                    <span class="nav-icon">📊</span> Dashboard
                </a>
                <a href="/pos" class="nav-item" data-page="pos">
                    <span class="nav-icon">🖥️</span> Terminal POS
                </a>
            </div>
            <div class="nav-section">
                <div class="nav-section-title">Pengurusan</div>
                <a href="/products" class="nav-item" data-page="products">
                    <span class="nav-icon">📦</span> Produk
                </a>
                <a href="/categories" class="nav-item" data-page="categories">
                    <span class="nav-icon">🏷️</span> Kategori
                </a>
            </div>
            <div class="nav-section">
                <div class="nav-section-title">Kewangan</div>
                <a href="/sales" class="nav-item" data-page="sales">
                    <span class="nav-icon">🧾</span> Jualan
                </a>
                <a href="/shifts" class="nav-item" data-page="shifts">
                    <span class="nav-icon">⏰</span> Syif
                </a>
                <a href="/teachers" class="nav-item" data-page="teachers">
                    <span class="nav-icon">👩‍🏫</span> Guru
                </a>
                <a href="/credits" class="nav-item" data-page="credits">
                    <span class="nav-icon">💳</span> Hutang Guru
                </a>
            </div>
            <div class="nav-section">
                <div class="nav-section-title">Laporan</div>
                <a href="/analytics" class="nav-item" data-page="analytics">
                    <span class="nav-icon">📈</span> Analitik
                </a>
                <a href="/reports" class="nav-item" data-page="reports">
                    <span class="nav-icon">📋</span> Laporan
                </a>
            </div>
        </nav>
        <div class="sidebar-footer">
            <div class="user-card">
                <div class="user-avatar">${(user.name || 'U')[0].toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-role">${user.role === 'admin' ? 'Pentadbir' : 'Juruwang'}</div>
                </div>
                <button class="btn-ghost" onclick="APP.logout()" title="Log Keluar">🚪</button>
            </div>
        </div>`;
    },

    /** Date formatting helpers */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return `${this.formatDate(dateStr)} ${this.formatTime(dateStr)}`;
    },

    /** Debounce helper */
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
};

import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { renderNavbar } from '../components/navigation.js';
import { showLoading, hideLoading, showNotification, formatDate } from '../utils/helpers.js';

let allCustomers = [];
let employees = [];

export async function renderAdminCustomersPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg flex justify-between items-center">
          <div>
            <h1>👥 Database Pelanggan</h1>
            <p style="color: var(--text-muted);">Seluruh pelanggan yang terdaftar di sistem</p>
          </div>
          <button class="btn btn-outline" onclick="window.location.reload()">🔄 Refresh</button>
        </div>

        <!-- Search & Filter Bar -->
        <div class="card mb-lg p-md">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div class="form-group mb-0">
                    <label class="form-label">Cari Nama / Alamat</label>
                    <input type="text" id="cust-search" class="form-input" placeholder="🔍 Cari pelanggan...">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Filter Sales</label>
                    <select id="cust-filter-sales" class="form-input">
                        <option value="all">Semua Sales</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Customer Count -->
        <div class="mb-md text-sm text-muted">
            Menampilkan <span id="cust-count" class="font-bold text-primary">0</span> pelanggan
        </div>

        <!-- List Area -->
        <div id="admin-cust-list" class="flex flex-col gap-md">
            <div class="text-center p-xl"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
    `;

    // Event Listeners
    document.getElementById('cust-search').addEventListener('input', applyFilters);
    document.getElementById('cust-filter-sales').addEventListener('change', applyFilters);

    await Promise.all([
        loadSalesOptions(),
        loadAllCustomers()
    ]);
}

async function loadSalesOptions() {
    const select = document.getElementById('cust-filter-sales');
    try {
        const { data } = await db.getAllEmployees();
        employees = data || [];
        select.innerHTML = '<option value="all">Semua Sales</option>' +
            employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadAllCustomers() {
    const container = document.getElementById('admin-cust-list');
    try {
        const { data, error } = await db.getCustomers(); // Passing no ID should get all if handled in lib
        if (error) throw error;

        allCustomers = data || [];
        renderList(allCustomers);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Gagal memuat data: ${err.message}</div>`;
    }
}

function renderList(list) {
    const container = document.getElementById('admin-cust-list');
    document.getElementById('cust-count').textContent = list.length;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="card p-xl text-center">
                <div style="font-size: 3rem; opacity: 0.5;">👥</div>
                <p class="text-muted mt-sm">Data pelanggan tidak ditemukan.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(c => `
        <div class="card hover-bg">
            <div class="flex justify-between items-start">
                <div class="flex gap-md items-center">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--bg-tertiary); display:flex; align-items:center; justify-content:center; font-size: 1.25rem;">
                        🏢
                    </div>
                    <div>
                        <h4 class="mb-0 text-primary">${c.name}</h4>
                        <div class="text-sm text-muted">📍 ${c.address}</div>
                        <div class="flex gap-2 mt-xs">
                             <span class="badge badge-outline badge-small">👤 ${c.users?.name || 'Unknown'}</span>
                             <span class="text-xs text-muted" style="align-self:center;">Daftar: ${formatDate(c.created_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-bold">${c.phone || '-'}</div>
                    <button class="btn btn-ghost btn-small mt-2" onclick="window.location.hash='#admin/histori?user_id=${c.employee_id}'">📊 Cek Aktivitas</button>
                </div>
            </div>
        </div>
    `).join('');
}

function applyFilters() {
    const query = document.getElementById('cust-search').value.toLowerCase();
    const salesId = document.getElementById('cust-filter-sales').value;

    const filtered = allCustomers.filter(c => {
        const matchesQuery = c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query);
        const matchesSales = salesId === 'all' || c.employee_id === salesId;
        return matchesQuery && matchesSales;
    });

    renderList(filtered);
}

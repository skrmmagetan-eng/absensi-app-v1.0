import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { formatTime, formatDate, formatCurrency, showLoading, hideLoading, getTodayDateString } from '../utils/helpers.js';
import { renderNavbar } from '../components/navigation.js';

let employees = [];
let selectedEmployeeId = 'all';
let startDate = getTodayDateString();
let endDate = getTodayDateString();
let currentTab = 'visits'; // 'visits' or 'orders'

export async function renderAdminHistoryPage() {
    const app = document.getElementById('app');

    // Parse URL params for initial filters
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    selectedEmployeeId = params.get('user_id') || 'all';

    // Set default date range to today if not set
    if (!startDate) startDate = getTodayDateString();
    if (!endDate) endDate = getTodayDateString();

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg">
          <h1>📋 Riwayat Seluruh User</h1>
          <p style="color: var(--text-muted);">Pantau aktivitas kunjungan dan omset tim Anda</p>
        </div>

        <!-- Filters Section -->
        <div class="card p-md mb-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div class="form-group mb-0">
                    <label class="form-label">Karyawan</label>
                    <select id="filter-user" class="form-input">
                        <option value="all">Semua Karyawan</option>
                        <!-- Options will be loaded dynamically -->
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Dari Tanggal</label>
                    <input type="date" id="filter-start-date" class="form-input" value="${startDate}">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Sampai Tanggal</label>
                    <input type="date" id="filter-end-date" class="form-input" value="${endDate}">
                </div>
            </div>
            <div class="mt-md flex justify-end">
                <button class="btn btn-primary" id="btn-apply-filters">
                    🔍 Terapkan Filter
                </button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="card p-2 mb-md bg-tertiary flex gap-2" style="border-radius: var(--radius-full); display: inline-flex;">
            <button class="btn btn-small ${currentTab === 'visits' ? 'btn-primary' : 'btn-ghost'}" id="tab-visits">
                📍 Kunjungan
            </button>
            <button class="btn btn-small ${currentTab === 'orders' ? 'btn-primary' : 'btn-ghost'}" id="tab-orders">
                📦 Omset Barang
            </button>
        </div>

        <!-- Content Area -->
        <div id="admin-history-content">
            <div class="text-center p-xl"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

    // Attach Events
    document.getElementById('tab-visits').addEventListener('click', () => switchTab('visits'));
    document.getElementById('tab-orders').addEventListener('click', () => switchTab('orders'));
    document.getElementById('btn-apply-filters').addEventListener('click', applyFilters);

    // Load Workers & Initial Data
    await Promise.all([
        loadEmployeeOptions(),
        loadHistoryData()
    ]);
}

async function loadEmployeeOptions() {
    const select = document.getElementById('filter-user');
    try {
        const { data } = await db.getAllEmployees();
        employees = data || [];

        select.innerHTML = '<option value="all">Semua Karyawan</option>' +
            employees.map(emp => `<option value="${emp.id}" ${selectedEmployeeId === emp.id ? 'selected' : ''}>${emp.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading employees:', err);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-visits').className = `btn btn-small ${tab === 'visits' ? 'btn-primary' : 'btn-ghost'}`;
    document.getElementById('tab-orders').className = `btn btn-small ${tab === 'orders' ? 'btn-primary' : 'btn-ghost'}`;
    loadHistoryData();
}

function applyFilters() {
    selectedEmployeeId = document.getElementById('filter-user').value;
    startDate = document.getElementById('filter-start-date').value;
    endDate = document.getElementById('filter-end-date').value;
    loadHistoryData();
}

async function loadHistoryData() {
    const container = document.getElementById('admin-history-content');
    container.innerHTML = '<div class="text-center p-xl"><div class="spinner"></div></div>';

    try {
        const startTimestamp = `${startDate}T00:00:00`;
        const endTimestamp = `${endDate}T23:59:59`;

        if (currentTab === 'visits') {
            let { data: visits, error } = await db.getAllAttendance(startTimestamp, endTimestamp);
            if (error) throw error;

            // Client side filter for user if needed (though we could add it to db.getAllAttendance)
            if (selectedEmployeeId !== 'all') {
                visits = visits.filter(v => v.employee_id === selectedEmployeeId);
            }

            renderVisitsList(visits, container);
        } else {
            let { data: orders, error } = await db.getOrders();
            if (error) throw error;

            // Filter by date and user
            const startDt = new Date(startDate);
            const endDt = new Date(endDate);
            endDt.setHours(23, 59, 59, 999);

            let filteredOrders = orders.filter(o => {
                const d = new Date(o.created_at);
                const matchUser = selectedEmployeeId === 'all' || o.employee_id === selectedEmployeeId;
                const matchDate = d >= startDt && d <= endDt;
                return matchUser && matchDate;
            });

            renderOrdersList(filteredOrders, container);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="card text-center p-xl border-danger">
                <p class="text-danger">Gagal memuat data: ${err.message}</p>
                <button class="btn btn-outline btn-small mt-sm" onclick="loadHistoryData()">Coba Lagi</button>
            </div>
        `;
    }
}

function renderVisitsList(visits, container) {
    if (!visits || visits.length === 0) {
        container.innerHTML = emptyState('Tidak ada riwayat kunjungan pada periode ini.');
        return;
    }

    container.innerHTML = `
        <div class="flex flex-col gap-md">
            ${visits.map(v => `
                <div class="card card-expandable" onclick="this.classList.toggle('active')">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="card-title text-primary mb-0">${v.customers?.name || 'Unknown'}</h3>
                            <small class="badge badge-outline mt-1">👤 ${v.users?.name || 'Unknown Staff'}</small>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <span class="badge ${v.check_out_time ? 'badge-success' : 'badge-warning'}">
                                ${v.check_out_time ? 'Selesai' : 'Berlangsung'}
                            </span>
                            <div class="text-xs text-muted mt-1 font-bold">${formatDate(v.check_in_time)}</div>
                            <span class="chevron-icon mt-2">▼</span>
                        </div>
                    </div>
                    
                    <!-- Hidden Detail -->
                    <div class="expand-content mt-md border-top pt-md">
                        <div class="grid grid-cols-2 gap-sm text-sm p-sm bg-tertiary rounded">
                            <div>
                                <div class="text-muted text-xs">CHECK IN</div>
                                <div>${formatTime(v.check_in_time)}</div>
                            </div>
                            <div>
                                <div class="text-muted text-xs">CHECK OUT</div>
                                <div>${v.check_out_time ? formatTime(v.check_out_time) : '-'}</div>
                            </div>
                        </div>

                        ${v.notes || v.photo_url ? `
                            <div class="mt-sm text-sm">
                                ${v.notes ? `<p class="mb-2 p-2 bg-secondary rounded">📝 "${v.notes}"</p>` : ''}
                                ${v.photo_url ? `<a href="${v.photo_url}" target="_blank" class="btn btn-outline btn-small w-full">📸 Lihat Bukti Foto</a>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderOrdersList(orders, container) {
    if (!orders || orders.length === 0) {
        container.innerHTML = emptyState('Tidak ada riwayat pesanan pada periode ini.');
        return;
    }

    const statusColors = {
        pending: 'warning',
        approved: 'primary',
        loading: 'primary',
        shipped: 'info',
        completed: 'success',
        cancelled: 'danger'
    };

    container.innerHTML = `
        <div class="flex flex-col gap-md">
            ${orders.map(o => `
                <div class="card card-expandable" onclick="this.classList.toggle('active')">
                     <div class="flex justify-between items-start">
                        <div>
                             <h3 class="card-title mb-0">${o.customers?.name || 'Unknown'}</h3>
                             <small class="badge badge-outline mt-1">👤 ${o.users?.name || 'Unknown Staff'}</small>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <span class="badge badge-${statusColors[o.status] || 'outline'}">
                                ${o.status.toUpperCase()}
                            </span>
                            <div class="font-bold text-primary mt-1">${formatCurrency(o.total_amount)}</div>
                            <span class="chevron-icon mt-1">▼</span>
                        </div>
                    </div>

                    <!-- Hidden Detail -->
                    <div class="expand-content mt-md border-top pt-md">
                        <div class="text-sm mb-sm p-sm bg-tertiary rounded">
                            <div class="text-muted text-xs mb-1">DETAIL BARANG:</div>
                            ${o.items_summary || 'Detail item tidak tersedia'}
                            ${o.notes ? `<div class="mt-2 pt-2 border-top"><strong>Catatan:</strong><br>${o.notes}</div>` : ''}
                        </div>
                        <div class="flex justify-between items-center text-xs text-muted">
                            <span>ID: #${o.id.substring(0, 8)}</span>
                            <span>${formatDate(o.created_at)} ${formatTime(o.created_at)}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <style>
            .card-expandable { cursor: pointer; transition: all 0.3s ease; }
            .card-expandable:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
            .expand-content { display: none; overflow: hidden; animation: slideDown 0.3s ease-out; }
            .card-expandable.active .expand-content { display: block; }
            .chevron-icon { transition: transform 0.3s ease; opacity: 0.5; font-size: 0.75rem; }
            .card-expandable.active .chevron-icon { transform: rotate(180deg); opacity: 1; }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;
}

function emptyState(msg) {
    return `
        <div class="text-center py-5">
            <div style="font-size: 3rem; opacity: 0.5;">📜</div>
            <p class="text-muted mt-sm">${msg}</p>
        </div>
    `;
}

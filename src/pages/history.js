import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { formatTime, formatDate, getTimeAgo, showLoading, hideLoading } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';

let currentTab = 'visits'; // 'visits' or 'orders'

export async function renderHistoryPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg">
          <h1>📜 Riwayat Aktivitas</h1>
          <p style="color: var(--text-muted);">Jejak kunjungan dan pesanan Anda</p>
        </div>

        <!-- Tabs -->
        <div class="card p-2 mb-md bg-tertiary flex gap-2" style="border-radius: var(--radius-full); display: inline-flex;">
            <button class="btn btn-small ${currentTab === 'visits' ? 'btn-primary' : 'btn-ghost'}" id="tab-visits">
                📍 Kunjungan
            </button>
            <button class="btn btn-small ${currentTab === 'orders' ? 'btn-primary' : 'btn-ghost'}" id="tab-orders">
                📦 Order Barang
            </button>
        </div>

        <!-- Content Area -->
        <div id="history-content">
            <div class="text-center p-xl"><div class="spinner"></div></div>
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

    // Attach Tab Events
    document.getElementById('tab-visits').addEventListener('click', () => switchTab('visits'));
    document.getElementById('tab-orders').addEventListener('click', () => switchTab('orders'));

    // Initial Load
    await loadHistoryData();
}

function switchTab(tab) {
    currentTab = tab;

    // Update UI Classes
    document.getElementById('tab-visits').className = `btn btn-small ${tab === 'visits' ? 'btn-primary' : 'btn-ghost'}`;
    document.getElementById('tab-orders').className = `btn btn-small ${tab === 'orders' ? 'btn-primary' : 'btn-ghost'}`;

    // Reload Data
    loadHistoryData();
}

async function loadHistoryData() {
    const container = document.getElementById('history-content');
    const user = state.getState('user');

    container.innerHTML = '<div class="text-center p-xl"><div class="spinner"></div></div>';

    try {
        if (currentTab === 'visits') {
            const { data: visits, error } = await db.getAttendanceHistory(user.id, 50); // Last 50 visits
            if (error) throw error;
            renderVisitsList(visits, container);
        } else {
            const { data: orders, error } = await db.getOrders(user.id);
            if (error) throw error;
            renderOrdersList(orders, container);
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
        container.innerHTML = emptyState('Belum ada riwayat kunjungan.');
        return;
    }

    container.innerHTML = `
        <div class="flex flex-col gap-md">
            ${visits.map(v => `
                <div class="card">
                    <div class="flex justify-between items-start mb-sm">
                        <div>
                            <h3 class="card-title text-primary">${v.customers?.name || 'Unknown'}</h3>
                            <p class="text-sm text-muted">${v.customers?.address || '-'}</p>
                        </div>
                        <div class="text-right">
                            <span class="badge ${v.check_out_time ? 'badge-success' : 'badge-warning'}">
                                ${v.check_out_time ? 'Selesai' : 'Berlangsung'}
                            </span>
                            <div class="text-xs text-muted mt-1">${formatDate(v.check_in_time)}</div>
                        </div>
                    </div>
                    
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
                        <div class="mt-sm border-top pt-sm text-sm">
                            ${v.notes ? `<p class="mb-1">📝 "${v.notes}"</p>` : ''}
                            ${v.photo_url ? `<a href="${v.photo_url}" target="_blank" class="text-primary text-xs flex items-center gap-1">📸 Lihat Bukti Foto</a>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function renderOrdersList(orders, container) {
    if (!orders || orders.length === 0) {
        container.innerHTML = emptyState('Belum ada riwayat pesanan.');
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
                <div class="card">
                     <div class="flex justify-between items-start mb-sm">
                        <div>
                             <h3 class="card-title">${o.customers?.name || 'Unknown'}</h3>
                             <small class="text-muted">#${o.id.substring(0, 8)}</small>
                        </div>
                        <span class="badge badge-${statusColors[o.status] || 'outline'}">
                            ${o.status.toUpperCase()}
                        </span>
                    </div>

                    <div class="text-sm mb-sm">
                        ${o.items_summary || 'Detail item tidak tersedia'}
                    </div>

                    <div class="flex justify-between items-center border-top pt-sm mt-sm">
                         <div class="text-muted text-xs">${formatDate(o.created_at)}</div>
                         <div class="font-bold text-primary">Rp ${parseInt(o.total_amount).toLocaleString('id-ID')}</div>
                    </div>
                </div>
            `).join('')}
        </div>
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

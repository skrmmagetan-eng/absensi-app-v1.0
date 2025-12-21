import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { formatTime, formatDate, getTimeAgo, showLoading, hideLoading, formatOrderItems } from '../utils/helpers.js';
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
          <p style="color: var(--text-muted);">Jejak kunjungan dan omset Anda</p>
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
        <div id="latest-visits-list" class="flex flex-col gap-2">
            ${visits.map((v, index) => `
                <div class="visit-card-expandable" onclick="this.classList.toggle('active')" data-visit-id="${v.id}">
                    <div class="visit-main-row">
                        <div class="visit-left-section">
                            <div class="visit-customer-name">${v.customers?.name || 'Unknown'}</div>
                            <div class="visit-customer-address">${v.customers?.address || '-'}</div>
                        </div>
                        <div class="visit-right-section">
                            <span class="visit-status-badge ${v.check_out_time ? 'status-completed' : 'status-ongoing'}">
                                ${v.check_out_time ? 'Selesai' : 'Berlangsung'}
                            </span>
                            <div class="visit-date">${formatDate(v.check_in_time)}</div>
                        </div>
                    </div>
                    
                    <!-- Expanded Detail Section -->
                    <div class="visit-expand-content">
                        <div class="visit-detail-separator"></div>
                        <div class="visit-time-grid">
                            <div class="time-item">
                                <div class="time-label">CHECK IN</div>
                                <div class="time-value">${formatTime(v.check_in_time)}</div>
                            </div>
                            <div class="time-item">
                                <div class="time-label">CHECK OUT</div>
                                <div class="time-value">${v.check_out_time ? formatTime(v.check_out_time) : 'Belum checkout'}</div>
                            </div>
                        </div>

                        ${v.notes || v.photo_url ? `
                            <div class="visit-additional-info">
                                ${v.notes ? `
                                    <div class="visit-notes">
                                        <div class="notes-label">📝 Catatan Kunjungan:</div>
                                        <div class="notes-content">"${v.notes}"</div>
                                    </div>
                                ` : ''}
                                ${v.photo_url ? `
                                    <div class="visit-photo">
                                        <a href="${v.photo_url}" target="_blank" class="photo-link">
                                            📸 Lihat Bukti Foto Kunjungan
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <style>
            .visit-card-expandable {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            .visit-card-expandable:hover {
                border-color: var(--primary);
                box-shadow: var(--shadow-md);
            }
            
            .visit-main-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid transparent;
            }
            
            .visit-card-expandable.active .visit-main-row {
                border-bottom-color: var(--border-color);
            }
            
            .visit-left-section {
                flex: 1;
            }
            
            .visit-customer-name {
                font-weight: 600;
                font-size: 16px;
                color: var(--primary);
                margin-bottom: 4px;
            }
            
            .visit-customer-address {
                font-size: 14px;
                color: var(--text-muted);
            }
            
            .visit-right-section {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
            }
            
            .visit-status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .status-completed {
                background: var(--success-light);
                color: var(--success-dark);
            }
            
            .status-ongoing {
                background: var(--warning-light);
                color: var(--warning-dark);
            }
            
            .visit-date {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .visit-expand-content {
                display: none;
                padding: 0 16px 16px 16px;
                animation: slideDown 0.3s ease-out;
            }
            
            .visit-card-expandable.active .visit-expand-content {
                display: block;
            }
            
            .visit-detail-separator {
                height: 1px;
                background: var(--border-color);
                margin-bottom: 16px;
            }
            
            .visit-time-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .time-item {
                background: var(--bg-tertiary);
                padding: 12px;
                border-radius: 6px;
            }
            
            .time-label {
                font-size: 11px;
                color: var(--text-muted);
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .time-value {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .visit-additional-info {
                border-top: 1px solid var(--border-color);
                padding-top: 16px;
            }
            
            .visit-notes {
                margin-bottom: 12px;
            }
            
            .notes-label {
                font-size: 12px;
                color: var(--text-muted);
                margin-bottom: 6px;
            }
            
            .notes-content {
                background: var(--bg-secondary);
                padding: 10px;
                border-radius: 6px;
                font-size: 14px;
                color: var(--text-secondary);
                font-style: italic;
            }
            
            .photo-link {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                color: var(--primary);
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                padding: 8px 12px;
                background: var(--primary-light);
                border-radius: 6px;
                transition: background 0.2s;
            }
            
            .photo-link:hover {
                background: var(--primary-lighter);
            }
            
            @keyframes slideDown {
                from { opacity: 0; max-height: 0; }
                to { opacity: 1; max-height: 500px; }
            }
        </style>
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
                <div class="card card-expandable" onclick="this.classList.toggle('active')">
                     <div class="flex justify-between items-start">
                        <div>
                             <h3 class="card-title mb-0">${o.customers?.name || 'Unknown'}</h3>
                             <small class="text-muted">#${o.id.substring(0, 8)}</small>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <span class="badge badge-${statusColors[o.status] || 'outline'}">
                                ${o.status.toUpperCase()}
                            </span>
                            <div class="text-xs text-muted mt-1 font-bold">${formatDate(o.created_at)}</div>
                            <span class="chevron-icon mt-2">▼</span>
                        </div>
                    </div>

                    <!-- Hidden Detail -->
                    <div class="expand-content mt-md border-top pt-md">
                        <div class="text-sm mb-sm p-sm bg-tertiary rounded" style="white-space: pre-wrap;">
                            <div class="text-muted text-xs mb-1">DETAIL BARANG:</div>
                            ${o.items_summary || formatOrderItems(o.items)}
                        </div>

                        <div class="flex justify-between items-center mt-sm">
                             <div class="text-muted text-xs">Total Pesanan</div>
                             <div class="font-bold text-primary text-lg">Rp ${parseInt(o.total_amount).toLocaleString('id-ID')}</div>
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
                from { opacity: 0; max-height: 0; }
                to { opacity: 1; max-height: 500px; }
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

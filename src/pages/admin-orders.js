import { db } from '../lib/supabase.js';
import { renderNavbar } from '../components/navigation.js';
import { formatCurrency, formatDate, showLoading, hideLoading, showNotification, createModal } from '../utils/helpers.js';

let currentFilter = 'all';

export async function renderAdminOrdersPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg flex justify-between items-center">
            <div>
                <h1>📦 Kelola Pesanan</h1>
                <p style="color: var(--text-muted);">Verifikasi dan update status pesanan pelanggan</p>
            </div>
            <button class="btn btn-outline" onclick="window.location.reload()">🔄 Refresh</button>
        </div>

        <!-- Filter Tabs -->
        <div class="card p-2 mb-md bg-tertiary flex gap-2 overflow-x-auto no-scrollbar" style="border-radius: var(--radius-full); display: inline-flex;">
            <button class="btn btn-small ${currentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('all')">Semua</button>
            <button class="btn btn-small ${currentFilter === 'pending' ? 'btn-warning' : 'btn-ghost'}" onclick="filterOrders('pending')">Pending</button>
            <button class="btn btn-small ${currentFilter === 'approved' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('approved')">Disetujui</button>
            <button class="btn btn-small ${currentFilter === 'loading' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('loading')">Di Muat</button>
            <button class="btn btn-small ${currentFilter === 'shipped' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('shipped')">Di Kirim</button>
            <button class="btn btn-small ${currentFilter === 'completed' ? 'btn-success' : 'btn-ghost'}" onclick="filterOrders('completed')">Selesai</button>
        </div>

        <!-- Orders List -->
        <div id="admin-orders-list" class="flex flex-col gap-md"></div>
      </div>
    </div>
  `;

    // Make global for onclick handlers
    window.filterOrders = (status) => {
        currentFilter = status;
        renderAdminOrdersPage(); // Re-render with new filter
    };

    window.updateStatus = handleUpdateStatus;

    await loadAdminOrders();
}

async function loadAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    container.innerHTML = '<div class="text-center p-lg"><div class="spinner"></div></div>';

    try {
        const { data: orders, error } = await db.getOrders();

        if (error) throw error;

        // Filter logic
        const filtered = currentFilter === 'all'
            ? orders
            : orders.filter(o => o.status === currentFilter);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card text-center p-xl">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <h3>Tidak ada pesanan ${currentFilter !== 'all' ? `status "${currentFilter}"` : ''}</h3>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map(order => renderOrderCard(order)).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="card p-lg text-danger">Gagal memuat pesanan: ${e.message}</div>`;
    }
}

function renderOrderCard(order) {
    const statusColors = {
        pending: 'warning',
        approved: 'primary',
        loading: 'primary',
        shipped: 'info',
        completed: 'success',
        cancelled: 'danger'
    };

    const statusLabels = {
        pending: '⏳ Menunggu Konfirmasi',
        approved: '✅ Disetujui Admin',
        loading: '📦 Sedang Dimuat',
        shipped: '🚚 Sedang Dikirim',
        completed: '🎉 Selesai',
        cancelled: '❌ Dibatalkan'
    };

    const nextActions = {
        pending: [{ label: '✅ Setujui', status: 'approved', cls: 'btn-primary' }, { label: '❌ Tolak', status: 'cancelled', cls: 'btn-outline text-danger' }],
        approved: [{ label: '📦 Mulai Muat', status: 'loading', cls: 'btn-primary' }],
        loading: [{ label: '🚚 Kirim Barang', status: 'shipped', cls: 'btn-primary' }],
        shipped: [{ label: '🏁 Selesai', status: 'completed', cls: 'btn-success' }],
        completed: [],
        cancelled: []
    };

    return `
    <div class="card">
        <div class="card-header flex justify-between items-start" style="padding-bottom: 0.5rem; border:none;">
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="badge badge-${statusColors[order.status] || 'outline'}">
                        ${order.status.toUpperCase()}
                    </span>
                    <small class="text-muted">#${order.id.substring(0, 8)}</small>
                </div>
                <h3 class="card-title">${order.customers?.name || 'Unknown Customer'}</h3>
                <p class="text-sm text-muted">Sales: ${order.users?.name || 'Unknown'}</p>
            </div>
            <div class="text-right">
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary-light);">
                    ${formatCurrency(order.total_amount)}
                </div>
                <small class="text-muted">${formatDate(order.created_at)}</small>
            </div>
        </div>
        
        <div class="card-body" style="padding-top: 0;">
            <div class="p-sm bg-tertiary rounded mb-md text-sm">
                ${order.items_summary || 'Detail pesanan tidak tersedia'}
                ${order.notes ? `<br><em class="text-muted">Catatan: ${order.notes}</em>` : ''}
            </div>
            
            <div class="flex justify-end gap-2 items-center border-top pt-md mt-sm" style="border-color: var(--border-color);">
                ${nextActions[order.status]?.map(action => `
                    <button class="btn btn-small ${action.cls}" onclick="updateStatus(this, '${order.id}', '${action.status}')">
                        ${action.label}
                    </button>
                `).join('') || '<span class="text-muted text-sm">Tidak ada aksi</span>'}
            </div>
        </div>
    </div>
    `;
}

async function handleUpdateStatus(btnElement, orderId, newStatus) {
    const confirmMsg = {
        approved: 'Setujui pesanan ini?',
        loading: 'Ubah status menjadi SEDANG DIMUAT?',
        shipped: 'Ubah status menjadi DIKIRIM?',
        completed: 'Tandai pesanan SELESAI?',
        cancelled: 'Batalkan pesanan ini?'
    };

    if (!confirm(confirmMsg[newStatus] || 'Update status?')) return;

    // Loading State
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `⏳ Proses...`;

    showLoading('Mengupdate status...');
    try {
        const { error } = await db.updateOrderStatus(orderId, newStatus);
        if (error) throw error;

        hideLoading();
        showNotification('Status berhasil diperbarui', 'success');

        // Refresh list
        loadAdminOrders();
    } catch (e) {
        // Reset Button
        btnElement.disabled = false;
        btnElement.innerHTML = originalText;

        hideLoading();
        showNotification('Gagal update: ' + e.message, 'danger');
    }
}

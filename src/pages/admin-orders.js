import { db } from '../lib/supabase.js';
import { renderNavbar } from '../components/navigation.js';
import { formatCurrency, formatDate, showLoading, hideLoading, showNotification, createModal } from '../utils/helpers.js';

let currentFilter = 'all';
let allOrders = []; // Store orders locally for access

export async function renderAdminOrdersPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg flex justify-between items-center">
            <div>
                <h1>📦 Kelola Omset</h1>
                <p style="color: var(--text-muted);">Verifikasi dan update status omset pelanggan</p>
            </div>
            <button class="btn btn-outline" onclick="window.location.reload()">🔄 Refresh</button>
        </div>

        <!-- Filter Tabs -->
        <div class="card p-2 mb-md bg-tertiary gap-2 no-scrollbar" style="border-radius: var(--radius-full); display: flex; overflow-x: auto; white-space: nowrap; max-width: 100%; -webkit-overflow-scrolling: touch;">
            <button class="btn btn-small ${currentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('all')" style="flex-shrink: 0;">Semua</button>
            <button class="btn btn-small ${currentFilter === 'pending' ? 'btn-warning' : 'btn-ghost'}" onclick="filterOrders('pending')" style="flex-shrink: 0;">Pending</button>
            <button class="btn btn-small ${currentFilter === 'approved' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('approved')" style="flex-shrink: 0;">Disetujui</button>
            <button class="btn btn-small ${currentFilter === 'loading' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('loading')" style="flex-shrink: 0;">Di Muat</button>
            <button class="btn btn-small ${currentFilter === 'shipped' ? 'btn-primary' : 'btn-ghost'}" onclick="filterOrders('shipped')" style="flex-shrink: 0;">Di Kirim</button>
            <button class="btn btn-small ${currentFilter === 'completed' ? 'btn-success' : 'btn-ghost'}" onclick="filterOrders('completed')" style="flex-shrink: 0;">Selesai</button>
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

        allOrders = orders; // Save to global

        // Filter logic
        const filtered = currentFilter === 'all'
            ? orders
            : orders.filter(o => (o.status || '').toLowerCase() === currentFilter.toLowerCase());

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

    const statusKey = order.status ? order.status.toLowerCase() : 'pending';

    return `
    <div class="card">
        <div class="card-header flex justify-between items-start" style="padding-bottom: 0.5rem; border:none;">
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="badge badge-${statusColors[statusKey] || 'outline'}">
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
                ${order.notes ? `<br><div class="mt-2 pt-2 border-top border-gray-200"><strong>Catatan:</strong><br>${order.notes.replace(/\n/g, '<br>')}</div>` : ''}
            </div>
            
            <div class="flex justify-end gap-2 items-center border-top pt-md mt-sm" style="border-color: var(--border-color);">
                ${nextActions[statusKey]?.map(action => `
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
    const order = allOrders.find(o => o.id === orderId);
    let appendNote = '';

    // Interactive Logic
    const nextStatus = newStatus.toLowerCase();

    if (nextStatus === 'cancelled') {
        const reason = prompt('❌ Masukkan alasan penolakan/pembatalan:');
        if (!reason) return; // Cancel action if no reason provided
        appendNote = `\n[Admin - ${formatDate(new Date())}]: Dibatalkan. Alasan: ${reason}`;
    }
    else if (nextStatus === 'shipped') {
        const resi = prompt('🚚 Masukkan Resi / Info Pengiriman (Opsional):');
        if (resi) {
            appendNote = `\n[Admin - ${formatDate(new Date())}]: Omset dikirim. Info: ${resi}`;
        }
    }
    else if (nextStatus === 'approved') {
        if (!confirm('Setujui pesanan ini?')) return;
    }
    else if (nextStatus === 'completed') {
        if (!confirm('Tandai pesanan sebagai SELESAI?')) return;
        appendNote = `\n[System]: Omset selesai pada ${formatDate(new Date())}`;
    }
    else {
        if (!confirm(`Update status pesanan ke "${newStatus}"?`)) return;
    }

    // Loading State
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `⏳ Proses...`;

    showLoading('Mengupdate status...');
    try {
        const newNotes = (order.notes || '') + appendNote;

        const { error } = await db.updateOrderStatus(orderId, newStatus, newNotes);
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

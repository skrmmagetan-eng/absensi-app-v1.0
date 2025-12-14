import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { showNotification, showLoading, hideLoading, formatCurrency, formatDate } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';

export async function renderOrderPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="flex justify-between items-center mb-lg">
          <div>
            <h1>📦 Order Barang</h1>
            <p style="color: var(--text-muted);">Kelola pesanan pelanggan</p>
          </div>
          <button class="btn btn-primary" onclick="window.location.hash='#order/baru'">
            <span>➕</span>
            <span>Buat Order Baru</span>
          </button>
        </div>

        <!-- Filter/Tabs -->
        <div class="flex gap-sm mb-md overflow-x-auto">
          <button class="btn btn-outline active" id="filter-all">Semua</button>
          <button class="btn btn-outline" id="filter-pending">Pending</button>
          <button class="btn btn-outline" id="filter-completed">Selesai</button>
        </div>

        <!-- Orders List -->
        <div id="orders-container"></div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  await loadOrders();
}

export async function renderCreateOrderPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container" style="max-width: 800px;">
        <div class="mb-lg">
          <button class="btn btn-outline" onclick="window.history.back()">
            ← Kembali
          </button>
        </div>

        <div class="card-glass">
          <div class="card-header">
            <h2 class="card-title">📝 Buat Order Baru</h2>
          </div>

          <form id="order-form">
            <!-- Select Customer -->
            <div class="form-group">
              <label class="form-label" for="customer">Pelanggan</label>
              <select id="customer" class="form-select" required>
                <option value="">Memuat daftar pelanggan...</option>
              </select>
            </div>

            <!-- Order Items -->
            <div class="form-group">
              <label class="form-label">Daftar Barang</label>
              <div id="order-items-container">
                <!-- Initial Item Row -->
                <div class="order-item-row flex gap-sm mb-sm">
                  <input type="text" class="form-input item-name" placeholder="Nama Barang" required style="flex: 2;">
                  <input type="number" class="form-input item-qty" placeholder="Qty" required style="flex: 1;" min="1">
                  <input type="number" class="form-input item-price" placeholder="Harga/Unit (Rp)" required style="flex: 2;" min="0">
                  <button type="button" class="btn btn-danger btn-icon remove-item" disabled>×</button>
                </div>
              </div>
              
              <button type="button" class="btn btn-outline btn-small mt-sm" id="add-item-btn">
                <span>➕</span> Tambah Barang
              </button>
            </div>

            <!-- Total Summary -->
            <div class="card mb-md bg-secondary">
              <div class="flex justify-between items-center">
                <span class="text-muted">Total Estimasi:</span>
                <span class="text-primary" style="font-size: 1.5rem; font-weight: 700;" id="total-amount">Rp 0</span>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group">
              <label class="form-label" for="notes">Catatan Order</label>
              <textarea id="notes" class="form-textarea" placeholder="Instruksi pengiriman, dll..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary w-full" id="btn-submit-order">
              Kirim Order
            </button>
          </form>
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  await loadCustomersForDropdown();
  setupOrderFormEvents();
}

async function loadOrders() {
  const container = document.getElementById('orders-container');
  const user = state.getState('user');

  showLoading('Memuat data order...');

  try {
    const { data: orders, error } = await db.getOrders(user.id);
    hideLoading();

    if (error) throw error;

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <div style="font-size: 3rem;">📦</div>
          <p class="text-muted">Belum ada order yang dibuat.</p>
        </div>
      `;
      return;
    }

    renderOrdersList(orders, container);
  } catch (err) {
    hideLoading();
    showNotification('Gagal memuat order', 'danger');
    console.error(err);
  }
}

function renderOrdersList(orders, container) {
  container.innerHTML = orders.map(order => {
    const steps = ['pending', 'approved', 'loading', 'shipped', 'completed'];
    const currentStepIndex = steps.indexOf(order.status.toLowerCase());
    const isCancelled = order.status.toLowerCase() === 'cancelled';

    // Helper to determine step status class
    const getStepClass = (stepIndex) => {
      if (isCancelled) return 'step-cancelled';
      if (currentStepIndex >= stepIndex) return 'active';
      return '';
    };

    return `
    <div class="card mb-md">
      <div class="flex justify-between items-start mb-sm">
        <div>
          <h4 class="mb-0 text-primary">${order.customers?.name || 'Pelanggan Dihapus'}</h4>
          <span class="text-muted text-small">Order #${order.id.slice(0, 8)} • ${formatDate(order.created_at)}</span>
        </div>
        <div class="text-right">
             <span class="badge badge-${getStatusBadgeColor(order.status)}">${getStatusLabel(order.status)}</span>
        </div>
      </div>
      
      <div class="mb-sm p-3" style="background: var(--bg-tertiary); border-radius: var(--radius-sm);">
        <pre style="font-family: inherit; margin: 0; white-space: pre-wrap; color: var(--text-secondary); line-height: 1.5;">${formatOrderContent(order.items)}</pre>
        ${order.notes ? `<div class="mt-2 text-small text-muted border-top pt-2" style="white-space: pre-wrap;">📝 <strong>Catatan:</strong><br>${order.notes}</div>` : ''}
      </div>

      <div class="flex justify-between items-center mb-sm">
        <span class="text-muted">Total Tagihan:</span>
        <span style="font-size: 1.1rem; font-weight: 700; color: var(--text-accent);">${formatCurrency(order.total_amount || 0)}</span>
      </div>

      ${!isCancelled ? `
      <!-- Elegant Status Timeline -->
      <div class="status-timeline mt-md pt-sm border-top" style="overflow-x: auto; padding-bottom: 5px;">
        <div class="steps-container flex justify-between items-center relative text-center">
            <!-- Line Background -->
            <div style="position: absolute; top: 12px; left: 0; right: 0; height: 2px; background: var(--bg-tertiary); z-index: 0;"></div>
            
            <!-- Steps -->
            <div class="step-item ${getStepClass(0)}" style="z-index: 1;">
                <div class="step-circle">1</div>
                <div class="step-label">Pending</div>
            </div>
            <div class="step-item ${getStepClass(1)}" style="z-index: 1;">
                <div class="step-circle">2</div>
                <div class="step-label">Approved</div>
            </div>
            <div class="step-item ${getStepClass(2)}" style="z-index: 1;">
                <div class="step-circle">3</div>
                <div class="step-label">Di Muat</div>
            </div>
            <div class="step-item ${getStepClass(3)}" style="z-index: 1;">
                <div class="step-circle">4</div>
                <div class="step-label">Di Kirim</div>
            </div>
            <div class="step-item ${getStepClass(4)}" style="z-index: 1;">
                <div class="step-circle">5</div>
                <div class="step-label">Selesai</div>
            </div>
        </div>
      </div>
      ` : '<div class="alert alert-danger mt-sm text-center">🚫 Order Dibatalkan</div>'}
    </div>
  `}).join('');

  // Inject styles if not present
  if (!document.getElementById('timeline-styles')) {
    const style = document.createElement('style');
    style.id = 'timeline-styles';
    style.textContent = `
        .steps-container { width: 100%; min-width: 300px; }
        .step-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; opacity: 0.5; transition: all 0.3s ease; }
        .step-item.active { opacity: 1; }
        .step-circle { width: 24px; height: 24px; background: var(--bg-tertiary); border: 2px solid var(--text-muted); color: var(--text-muted); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; background: var(--bg-card); transition: all 0.3s; }
        .step-item.active .step-circle { background: var(--primary-gradient); border-color: transparent; color: white; box-shadow: 0 0 10px rgba(102, 126, 234, 0.4); transform: scale(1.1); }
        .step-label { font-size: 0.7rem; margin-top: 6px; color: var(--text-muted); font-weight: 500; }
        .step-item.active .step-label { color: var(--primary-light); font-weight: 700; }
        
        /* Connecting Lines Logic - Complex to do purely CSS without separate elements, so we rely on background line + active colors. 
           For a cleaner look, 'active' items just pop out. */
      `;
    document.head.appendChild(style);
  }
}

function getStatusBadgeColor(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'success';
    case 'shipped': return 'info';
    case 'loading': return 'primary';
    case 'approved': return 'primary';
    case 'cancelled': return 'danger';
    default: return 'warning';
  }
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    loading: 'Di Muat',
    shipped: 'Di Kirim',
    completed: 'Selesai',
    cancelled: 'Batal'
  };
  return labels[status?.toLowerCase()] || status;
}

function formatOrderContent(items) {
  if (Array.isArray(items)) {
    return items.map(item => `📦 ${item.name} (${item.qty}x)`).join('\n');
  }
  return 'Detail tidak tersedia';
}

async function loadCustomersForDropdown() {
  const select = document.getElementById('customer');
  const user = state.getState('user');

  try {
    const { data: customers } = await db.getCustomers(user.id);
    if (customers && customers.length > 0) {
      select.innerHTML = `
        <option value="">-- Pilih Pelanggan --</option>
        ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      `;
    } else {
      select.innerHTML = '<option value="">Belum ada pelanggan aktif</option>';
    }
  } catch (e) {
    console.error(e);
    select.innerHTML = '<option value="">Gagal memuat</option>';
  }
}

function setupOrderFormEvents() {
  // Add Item
  document.getElementById('add-item-btn').addEventListener('click', () => {
    const container = document.getElementById('order-items-container');
    const row = document.createElement('div');
    row.className = 'order-item-row flex gap-sm mb-sm';
    row.innerHTML = `
      <input type="text" class="form-input item-name" placeholder="Nama Barang" required style="flex: 2;">
      <input type="number" class="form-input item-qty" placeholder="Qty" required style="flex: 1;" min="1" value="1">
      <input type="number" class="form-input item-price" placeholder="Harga" required style="flex: 2;" min="0">
      <button type="button" class="btn btn-danger btn-icon remove-item">×</button>
    `;
    container.appendChild(row);

    // Attach event listeners for the new row
    attachRowEvents(row);
  });

  // Attach events for initial row
  document.querySelectorAll('.order-item-row').forEach(row => attachRowEvents(row));

  // Form Submit
  document.getElementById('order-form').addEventListener('submit', handleOrderSubmit);
}

function attachRowEvents(row) {
  // Remove button
  const removeBtn = row.querySelector('.remove-item');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      // Don't remove if it's the last row
      if (document.querySelectorAll('.order-item-row').length > 1) {
        row.remove();
        calculateTotal();
      }
    });
  }

  // Inputs change to recalc total
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', calculateTotal);
  });
}

function calculateTotal() {
  let total = 0;
  document.querySelectorAll('.order-item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    total += qty * price;
  });

  document.getElementById('total-amount').textContent = formatCurrency(total);
  return total;
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const customerId = document.getElementById('customer').value;
  if (!customerId) {
    showNotification('Pilih pelanggan terlebih dahulu', 'warning');
    return;
  }

  const items = [];
  let totalAmount = 0;

  document.querySelectorAll('.order-item-row').forEach(row => {
    const name = row.querySelector('.item-name').value;
    const qty = parseFloat(row.querySelector('.item-qty').value);
    const price = parseFloat(row.querySelector('.item-price').value);

    if (name && qty > 0) {
      items.push({ name, qty, price });
      totalAmount += qty * price;
    }
  });

  if (items.length === 0) {
    showNotification('Masukkan minimal satu barang', 'warning');
    return;
  }

  const notes = document.getElementById('notes').value;
  const user = state.getState('user');

  // Loading State
  const btnSubmit = document.getElementById('btn-submit-order');
  const originalText = btnSubmit.innerHTML;
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span>⏳</span> Mengirim...`;
  }

  showLoading('Mengirim order...');

  try {
    const orderData = {
      employee_id: user.id,
      customer_id: customerId,
      items: items, // JSONB column
      total_amount: totalAmount,
      status: 'Pending',
      notes: notes
    };

    const { error } = await db.createOrder(orderData);

    hideLoading();
    if (error) throw error;

    showNotification('Order berhasil dibuat! 🚀', 'success');
    setTimeout(() => {
      window.location.hash = '#order';
    }, 1000);

  } catch (error) {
    hideLoading();

    // Reset Button
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalText;
    }

    console.error('Order error:', error);
    showNotification('Gagal membuat order: ' + error.message, 'danger');
  }
}

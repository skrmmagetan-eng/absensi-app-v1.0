import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { formatDate, formatTime, getTimeAgo } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';

export async function renderDashboardPage() {
  const app = document.getElementById('app');
  const user = state.getState('user');
  const profile = state.getState('profile');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <!-- Welcome Header -->
        <div class="mb-lg">
          <h1>Selamat Datang, ${profile?.name || 'Karyawan'}! 👋</h1>
          <p style="color: var(--text-muted);">${formatDate(new Date())}</p>
        </div>

        <!-- Quick Stats -->
        <div class="stats-grid" id="stats-container">
          <div class="stat-card primary">
            <div class="stat-header">
              <div class="stat-icon">📍</div>
              <div class="stat-details">
                <div class="stat-label">Absensi Hari Ini</div>
                <div class="stat-value" id="today-attendance">-</div>
              </div>
            </div>
          </div>

          <div class="stat-card success">
            <div class="stat-header">
              <div class="stat-icon">👥</div>
              <div class="stat-details">
                <div class="stat-label">Total Pelanggan</div>
                <div class="stat-value" id="total-customers">-</div>
              </div>
            </div>
          </div>

          <div class="stat-card warning">
            <div class="stat-header">
              <div class="stat-icon">📦</div>
              <div class="stat-details">
                <div class="stat-label">Order Bulan Ini</div>
                <div class="stat-value" id="total-orders">-</div>
              </div>
            </div>
          </div>

          <div class="stat-card danger">
            <div class="stat-header">
              <div class="stat-icon">⭐</div>
              <div class="stat-details">
                <div class="stat-label">Skor KPI</div>
                <div class="stat-value" id="kpi-score">-</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">Aksi Cepat</h3>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
            <button class="btn btn-primary" onclick="window.location.hash='#check-in'">
              <span>📍</span>
              <span>Check In</span>
            </button>
            <button class="btn btn-success" onclick="window.location.hash='#pelanggan/tambah'">
              <span>➕</span>
              <span>Tambah Pelanggan</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#order/baru'">
              <span>📦</span>
              <span>Buat Order</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#katalog'">
              <span>🛍️</span>
              <span>Lihat Katalog</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#riwayat'">
              <span>📊</span>
              <span>Riwayat</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#targets'">
              <span>🎯</span>
              <span>Target Saya</span>
            </button>
          </div>
        </div>

        <!-- Today's Attendance -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Absensi Hari Ini</h3>
          </div>
          <div id="today-attendance-list"></div>
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  // Load data
  await loadDashboardData();
}

async function loadDashboardData() {
  const user = state.getState('user');

  try {
    // Load today's attendance
    const { data: attendance } = await db.getTodayAttendance(user.id);
    document.getElementById('today-attendance').textContent = attendance?.length || 0;
    renderTodayAttendance(attendance || []);

    // Load customers
    const { data: customers } = await db.getCustomers(user.id);
    document.getElementById('total-customers').textContent = customers?.length || 0;

    // Load orders (this month)
    const { data: orders } = await db.getOrders(user.id);
    const thisMonth = new Date().getMonth();
    const thisMonthOrders = orders?.filter(
      (o) => new Date(o.created_at).getMonth() === thisMonth
    ) || [];
    document.getElementById('total-orders').textContent = thisMonthOrders.length;

    // Load KPI (placeholder for now)
    document.getElementById('kpi-score').textContent = '85%';
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function renderTodayAttendance(attendance) {
  const container = document.getElementById('today-attendance-list');

  if (!attendance || attendance.length === 0) {
    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <p>Belum ada absensi hari ini</p>
        <button class="btn btn-primary mt-sm" onclick="window.location.hash='#check-in'">
          Check In Sekarang
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Pelanggan</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${attendance.map((item) => {
    const isOngoing = !item.check_out_time;
    const clickHandler = isOngoing ? `onclick="openCheckOutModal('${item.id}', '${item.customers?.name || 'Pelanggan'}')"` : '';
    const rowStyle = isOngoing ? 'cursor: pointer; background-color: rgba(255, 193, 7, 0.05);' : '';

    return `
            <tr ${clickHandler} style="${rowStyle}" title="${isOngoing ? 'Klik untuk Lapor & Check Out' : ''}">
              <td>
                <strong>${item.customers?.name || 'N/A'}</strong><br>
                <small style="color: var(--text-muted);">${item.customers?.address || ''}</small>
              </td>
              <td>
                ${formatTime(item.check_in_time)}<br>
                <small style="color: var(--text-muted);">${getTimeAgo(item.check_in_time)}</small>
              </td>
              <td>
                ${item.check_out_time ? formatTime(item.check_out_time) : '-'}
              </td>
              <td>
                ${item.check_out_time
        ? '<span class="badge badge-success">Selesai</span>'
        : '<span class="badge badge-warning">📝 Lapor & Check Out</span>'
      }
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Expose global function for onclick
  window.openCheckOutModal = openCheckOutModal;
}

// Modal Logic for Reporting & Checkout
async function openCheckOutModal(visitId, customerName) {
  const modalId = 'checkout-modal-' + Date.now();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = modalId;

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">📝 Laporan Kunjungan</h3>
        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p class="mb-md text-muted">Selesaikan kunjungan ke <strong>${customerName}</strong>.</p>
        
        <form id="checkout-form">
            <div class="form-group">
                <label class="form-label">Catatan Hasil Kunjungan</label>
                <textarea id="visit-notes" class="form-textarea" rows="3" placeholder="Contoh: Stok menipis, minta dikirim besok..." required></textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Bukti Foto (Selfie/Lokasi)</label>
                <input type="file" id="visit-photo" class="form-input" accept="image/*;capture=camera" required>
                <small class="text-muted">Wajib melampirkan foto bukti kunjungan.</small>
            </div>

            <div class="flex gap-2 justify-end mt-lg">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Batal</button>
                <button type="submit" class="btn btn-primary" id="btn-submit-checkout">
                    ✅ Simpan & Check Out
                </button>
            </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#checkout-form');
  form.addEventListener('submit', (e) => handleCheckOutWithReport(e, visitId, modalId));
}

import { geo, showLoading, hideLoading, showNotification, compressImage } from '../utils/helpers.js';

async function handleCheckOutWithReport(e, visitId, modalId) {
  e.preventDefault();

  const notes = document.getElementById('visit-notes').value;
  const photoInput = document.getElementById('visit-photo');
  const photoFile = photoInput.files[0];
  const btnSubmit = document.getElementById('btn-submit-checkout');

  if (!photoFile) {
    showNotification('Mohon lampirkan foto bukti kunjungan', 'warning');
    return;
  }

  // Loading State
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `⏳ Memproses...`;
  showLoading('Mengirim laporan & check out...');

  try {
    // 1. Get Location
    const position = await geo.getCurrentPosition();

    // 2. Upload Photo (using our new helper)
    const { data: photoUrl, error: uploadError } = await db.uploadVisitEvidence(photoFile);
    if (uploadError) throw new Error('Gagal upload foto: ' + uploadError.message);

    // 3. Update DB (Check Out + Report)
    const checkOutData = {
      check_out_time: new Date().toISOString(),
      check_out_latitude: position.latitude,
      check_out_longitude: position.longitude,
      notes: notes,
      photo_url: photoUrl
    };

    const { error: dbError } = await db.checkOut(visitId, checkOutData);
    if (dbError) throw dbError;

    hideLoading();
    showNotification('Kunjungan selesai! Laporan tersimpan. ✅', 'success');

    // Close Modal
    document.getElementById(modalId).remove();

    // Refresh Dashboard
    loadDashboardData();

  } catch (err) {
    hideLoading();
    console.error(err);
    showNotification(err.message || 'Gagal check out', 'danger');

    // Reset Button
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalText;
  }
}

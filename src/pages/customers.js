import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { geo, showNotification, showLoading, hideLoading, createModal } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import L from 'leaflet';

let map = null;
let marker = null;

export async function renderCustomersPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="flex justify-between items-center mb-lg">
          <div>
            <h1>👥 Data Pelanggan</h1>
            <p style="color: var(--text-muted);">Kelola data pelanggan Anda</p>
          </div>
          <button class="btn btn-primary" id="add-customer-btn">
            <span>➕</span>
            <span>Tambah Pelanggan</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="card mb-md">
          <input
            type="text"
            id="search-input"
            class="form-input"
            placeholder="🔍 Cari pelanggan..."
            style="margin: 0;"
          />
        </div>

        <!-- Customers List -->
        <div id="customers-container"></div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  // Load customers
  await loadCustomers();

  // Event listeners
  document.getElementById('add-customer-btn').addEventListener('click', () => {
    window.location.hash = '#pelanggan/tambah';
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    filterCustomers(e.target.value);
  });
}

async function loadCustomers() {
  const user = state.getState('user');
  const container = document.getElementById('customers-container');

  showLoading('Memuat data pelanggan...');

  try {
    const { data: customers, error } = await db.getCustomers(user.id);

    hideLoading();

    if (error) throw error;

    if (!customers || customers.length === 0) {
      container.innerHTML = `
        <div class="card text-center" style="padding: 3rem;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">📭</div>
          <h3>Belum Ada Pelanggan</h3>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">
            Mulai tambahkan pelanggan untuk memulai kunjungan
          </p>
          <button class="btn btn-primary" onclick="window.location.hash='#pelanggan/tambah'">
            <span>➕</span>
            <span>Tambah Pelanggan Pertama</span>
          </button>
        </div>
      `;
      return;
    }

    // Store customers in state for filtering
    state.setState('customers', customers);
    renderCustomersList(customers);
  } catch (error) {
    hideLoading();
    console.error('Error loading customers:', error);
    showNotification('Gagal memuat data pelanggan', 'danger');
  }
}

function renderCustomersList(customers) {
  const container = document.getElementById('customers-container');

  container.innerHTML = customers.map(customer => `
    <div class="card mb-md customer-item" data-name="${customer.name.toLowerCase()}" data-address="${customer.address.toLowerCase()}">
      <div class="flex justify-between items-center gap-md">
        <div class="flex items-center gap-md" style="flex: 1;">
          <div style="width: 60px; height: 60px; border-radius: var(--radius-md); background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
            👤
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0; color: var(--text-primary);">${customer.name}</h4>
            <p style="margin: 0.25rem 0; color: var(--text-secondary); font-size: 0.875rem;">
              📍 ${customer.address}
            </p>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.875rem;">
              📞 ${customer.phone || 'Tidak ada telepon'}
            </p>
          </div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-outline btn-icon" onclick="viewCustomer('${customer.id}')" title="Lihat Detail">
            👁️
          </button>
          <button class="btn btn-outline btn-icon" onclick="editCustomer('${customer.id}')" title="Edit">
            ✏️
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterCustomers(query) {
  const customers = state.getState('customers');
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.address.toLowerCase().includes(query.toLowerCase())
  );
  renderCustomersList(filtered);
}

// Add customer page
export async function renderAddCustomerPage() {
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
            <h2 class="card-title">➕ Tambah Pelanggan Baru</h2>
            <p class="card-subtitle">Lengkapi data pelanggan dan tentukan lokasi</p>
          </div>

          <form id="customer-form">
            <div class="form-group">
              <label class="form-label" for="name">Nama Pelanggan *</label>
              <input
                type="text"
                id="name"
                class="form-input"
                placeholder="PT. Contoh Indonesia"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="phone">Nomor Telepon</label>
              <input
                type="tel"
                id="phone"
                class="form-input"
                placeholder="08123456789"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input
                type="email"
                id="email"
                class="form-input"
                placeholder="email@pelanggan.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="address">Alamat Lengkap *</label>
              <textarea
                id="address"
                class="form-textarea"
                placeholder="Jl. Contoh No. 123, Jakarta Selatan"
                rows="3"
                required
              ></textarea>
            </div>

            <!-- Map for location -->
            <div class="form-group">
              <label class="form-label">Lokasi pada Peta *</label>
              <div id="map" class="map-container"></div>
              <div class="mt-sm" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline btn-small" id="use-current-location">
                  📍 Gunakan Lokasi Saat Ini
                </button>
                <button type="button" class="btn btn-outline btn-small" id="search-location">
                  🔍 Cari Lokasi
                </button>
              </div>
              <div id="coordinate-info" class="mt-sm" style="font-size: 0.875rem; color: var(--text-muted);"></div>
            </div>

            <div class="form-group">
              <label class="form-label" for="notes">Catatan Tambahan</label>
              <textarea
                id="notes"
                class="form-textarea"
                placeholder="Informasi tambahan tentang pelanggan..."
                rows="2"
              ></textarea>
            </div>

            <div class="flex gap-md">
              <button type="button" class="btn btn-outline w-full" onclick="window.history.back()">
                Batal
              </button>
              <button type="submit" class="btn btn-primary w-full" id="submit-btn" disabled>
                <span>✅</span>
                <span>Simpan Pelanggan</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  initCustomerMap();
  setupCustomerFormListeners();
}

function initCustomerMap() {
  map = L.map('map').setView([-6.2088, 106.8456], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Click on map to set location
  map.on('click', (e) => {
    setMarkerLocation(e.latlng.lat, e.latlng.lng);
  });
}

function setMarkerLocation(lat, lng) {
  if (marker) {
    map.removeLayer(marker);
  }

  marker = L.marker([lat, lng], {
    draggable: true,
    icon: L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#f5576c">
          <path d="M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z"/>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    }),
  }).addTo(map);

  marker.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    updateCoordinateInfo(pos.lat, pos.lng);
  });

  map.setView([lat, lng], 16);
  updateCoordinateInfo(lat, lng);

  // Enable submit button
  document.getElementById('submit-btn').disabled = false;
}

function updateCoordinateInfo(lat, lng) {
  const info = document.getElementById('coordinate-info');
  info.textContent = `📍 Koordinat: ${geo.formatCoordinates(lat, lng)}`;
  info.dataset.lat = lat;
  info.dataset.lng = lng;
}

function setupCustomerFormListeners() {
  // Use current location
  document.getElementById('use-current-location').addEventListener('click', async () => {
    const btn = document.getElementById('use-current-location');
    btn.disabled = true;
    btn.textContent = '⏳ Mendapatkan lokasi...';

    try {
      const position = await geo.getCurrentPosition();
      setMarkerLocation(position.latitude, position.longitude);
      btn.textContent = '✅ Lokasi Terdeteksi';
      setTimeout(() => {
        btn.textContent = '📍 Gunakan Lokasi Saat Ini';
        btn.disabled = false;
      }, 2000);
    } catch (error) {
      showNotification(error.message, 'danger');
      btn.textContent = '📍 Gunakan Lokasi Saat Ini';
      btn.disabled = false;
    }
  });

  // Search location (simple implementation - could be enhanced with geocoding API)
  document.getElementById('search-location').addEventListener('click', async () => {
    const address = document.getElementById('address').value;
    if (!address) {
      showNotification('Masukkan alamat terlebih dahulu', 'warning');
      return;
    }

    showNotification('Fitur pencarian lokasi akan segera tersedia. Silakan klik pada peta atau gunakan lokasi saat ini.', 'info');
  });

  // Form submission
  document.getElementById('customer-form').addEventListener('submit', handleAddCustomer);
}

async function handleAddCustomer(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const coordinateInfo = document.getElementById('coordinate-info');
  const user = state.getState('user');

  if (!coordinateInfo.dataset.lat || !coordinateInfo.dataset.lng) {
    showNotification('Tentukan lokasi pelanggan pada peta', 'warning');
    return;
  }

  // Loading State
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.innerHTML;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳</span> <span>Menyimpan...</span>`;
  }

  showLoading('Menyimpan data pelanggan...');

  try {
    const customerData = {
      employee_id: user.id,
      name,
      phone: phone || null,
      email: email || null,
      address,
      latitude: parseFloat(coordinateInfo.dataset.lat),
      longitude: parseFloat(coordinateInfo.dataset.lng),
      notes: notes || null,
    };

    const { data, error } = await db.createCustomer(customerData);

    if (error) throw error;

    hideLoading();
    showNotification('Pelanggan berhasil ditambahkan! ✅', 'success');

    // Navigate back to customers page
    setTimeout(() => {
      window.location.hash = '#pelanggan';
    }, 1500);
  } catch (error) {
    hideLoading();

    // Reset button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }

    console.error('Error adding customer:', error);
    showNotification('Gagal menambahkan pelanggan: ' + error.message, 'danger');
  }
}

// Global functions for customer actions
window.viewCustomer = async (customerId) => {
  showLoading('Memuat detail pelanggan...');

  try {
    const { data: customer, error } = await db.getCustomerById(customerId);
    
    if (error) throw error;

    // Get customer statistics
    const { data: visitStats } = await db.supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time, notes')
      .eq('customer_id', customerId)
      .order('check_in_time', { ascending: false })
      .limit(5);

    const totalVisits = visitStats?.length || 0;
    const thisMonthVisits = visitStats?.filter(v => {
      const visitDate = new Date(v.check_in_time);
      const now = new Date();
      return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
    }).length || 0;

    const lastVisit = visitStats?.[0];
    const lastVisitText = lastVisit 
      ? `${new Date(lastVisit.check_in_time).toLocaleDateString('id-ID')} (${Math.floor((Date.now() - new Date(lastVisit.check_in_time)) / (1000 * 60 * 60 * 24))} hari lalu)`
      : 'Belum pernah dikunjungi';

    hideLoading();

    const action = await createModal(
      `👤 ${customer.name}`,
      `
        <div style="line-height: 1.6;">
          <!-- Customer Info -->
          <div class="card p-sm bg-tertiary mb-md">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
              <div>
                <div style="color: var(--text-muted); font-size: 0.8rem;">📍 ALAMAT</div>
                <div style="font-weight: 500;">${customer.address || 'Tidak ada alamat'}</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 0.8rem;">📞 TELEPON</div>
                <div style="font-weight: 500;">${customer.phone || 'Tidak ada nomor'}</div>
              </div>
            </div>
          </div>

          <!-- Location Info -->
          <div class="mb-md">
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem;">🗺️ KOORDINAT</div>
            <div style="font-family: monospace; background: var(--bg-secondary); padding: 0.5rem; border-radius: 4px; font-size: 0.85rem;">
              ${geo.formatCoordinates(customer.latitude, customer.longitude)}
            </div>
          </div>

          <!-- Statistics -->
          <div class="card p-sm bg-secondary mb-md">
            <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary);">📊 Statistik Kunjungan</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; text-align: center; font-size: 0.85rem;">
              <div>
                <div style="font-weight: 600; color: var(--primary); font-size: 1.2rem;">${totalVisits}</div>
                <div style="color: var(--text-muted);">Total</div>
              </div>
              <div>
                <div style="font-weight: 600; color: var(--success); font-size: 1.2rem;">${thisMonthVisits}</div>
                <div style="color: var(--text-muted);">Bulan Ini</div>
              </div>
              <div>
                <div style="font-weight: 600; color: var(--warning); font-size: 0.9rem;">${lastVisitText.split('(')[0]}</div>
                <div style="color: var(--text-muted);">Terakhir</div>
              </div>
            </div>
          </div>

          <!-- Recent Visits -->
          ${visitStats && visitStats.length > 0 ? `
            <div class="mb-md">
              <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--primary);">📅 Riwayat Terakhir</div>
              <div style="max-height: 120px; overflow-y: auto;">
                ${visitStats.slice(0, 3).map(visit => `
                  <div style="display: flex; justify-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
                    <div>
                      <div style="font-weight: 500;">${new Date(visit.check_in_time).toLocaleDateString('id-ID')}</div>
                      ${visit.notes ? `<div style="color: var(--text-muted); font-size: 0.8rem;">${visit.notes.substring(0, 30)}${visit.notes.length > 30 ? '...' : ''}</div>` : ''}
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.8rem;">
                      ${new Date(visit.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}
                      ${visit.check_out_time ? ` - ${new Date(visit.check_out_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Notes -->
          ${customer.notes ? `
            <div class="mb-md">
              <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem;">📝 CATATAN</div>
              <div style="background: var(--bg-tertiary); padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; font-style: italic;">
                "${customer.notes}"
              </div>
            </div>
          ` : ''}

          <!-- Action Info -->
          <div class="card p-sm" style="background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%); color: white;">
            <div style="font-weight: 600; margin-bottom: 0.5rem;">🎯 Catat Kunjungan</div>
            <div style="font-size: 0.85rem; opacity: 0.9;">
              Klik tombol di bawah saat Anda berada di lokasi customer untuk mencatat kunjungan dengan GPS dan foto.
            </div>
          </div>
        </div>
      `,
      [
        { label: 'Tutup', action: 'close', type: 'outline' },
        { label: '📞 Telepon', action: 'call', type: 'outline', hidden: !customer.phone },
        { label: '🗺️ Buka Maps', action: 'maps', type: 'outline' },
        { label: '📍 Catat Kunjungan', action: 'visit', type: 'primary' }
      ].filter(btn => !btn.hidden)
    );

    // Handle actions
    if (action === 'visit') {
      await handleLogVisit(customer);
    } else if (action === 'call' && customer.phone) {
      window.open(`tel:${customer.phone}`);
    } else if (action === 'maps') {
      const mapsUrl = `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`;
      window.open(mapsUrl, '_blank');
    }

  } catch (error) {
    hideLoading();
    console.error('Error loading customer details:', error);
    showNotification('Gagal memuat detail pelanggan: ' + error.message, 'danger');
  }
};

async function handleLogVisit(customer) {
  showLoading('Mendapatkan lokasi Anda...');
  try {
    // 1. Get Location
    const pos = await geo.getCurrentPosition();

    // 2. Calculate Distance
    const dist = geo.calculateDistance(
      pos.latitude, pos.longitude,
      customer.latitude, customer.longitude
    );

    hideLoading();

    // 3. Create Custom Modal for Visit
    const modalId = 'visit-modal-' + Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">📍 Absen Kunjungan</h3>
          <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-sm text-muted mb-md">
            Anda berjarak <strong>${Math.round(dist * 1000)}m</strong> dari <strong>${customer.name}</strong>.
          </p>
          <form id="visit-form">
            <div class="form-group">
              <label class="form-label">Catatan Kunjungan</label>
              <textarea id="visit-modal-notes" class="form-textarea" rows="2" placeholder="Apa hasil kunjungannya?" required></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Foto Selfie Absen *</label>
              <input type="file" id="visit-modal-photo" class="form-input" accept="image/*" capture="user" required>
              <small class="text-muted">Gunakan kamera untuk memvalidasi kehadiran Anda.</small>
            </div>
            <div class="modal-footer" style="padding: 0; margin-top: 1.5rem; border: none;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Batal</button>
              <button type="submit" class="btn btn-primary" id="btn-submit-visit">✅ Kirim Absen</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const form = overlay.querySelector('#visit-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const notes = document.getElementById('visit-modal-notes').value;
      const photoFile = document.getElementById('visit-modal-photo').files[0];
      const btn = document.getElementById('btn-submit-visit');

      if (!photoFile) {
        showNotification('Mohon ambil foto selfie', 'warning');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ Mengirim...';
      showLoading('Mengunggah data kunjungan...');

      try {
        // Upload photo
        const { data: photoUrl, error: uploadError } = await db.uploadVisitEvidence(photoFile);
        if (uploadError) throw uploadError;

        const user = state.getState('user');
        const { error } = await db.logVisit({
          customer_id: customer.id,
          user_id: user.id,
          latitude: pos.latitude,
          longitude: pos.longitude,
          notes: notes,
          photo_url: photoUrl
        });

        if (error) throw error;

        hideLoading();
        overlay.remove();
        showNotification('Kunjungan berhasil dicatat! ✅', 'success');
      } catch (err) {
        hideLoading();
        btn.disabled = false;
        btn.innerHTML = '✅ Kirim Absen';
        showNotification(err.message || 'Gagal mencatat kunjungan', 'danger');
      }
    });

  } catch (e) {
    hideLoading();
    showNotification(e.message || 'Gagal mendeteksi lokasi', 'danger');
  }
}

window.editCustomer = (customerId) => {
  // Navigate to edit page (to be implemented)
  showNotification('Fitur edit akan segera tersedia', 'info');
};

window.deleteCustomer = async (customerId, customerName) => {
  const action = await createModal(
    '🗑️ Hapus Pelanggan',
    `<p>Apakah Anda yakin ingin menghapus pelanggan <strong>${customerName}</strong>?</p>
     <p style="color: var(--text-muted); font-size: 0.875rem;">Tindakan ini tidak dapat dibatalkan.</p>`,
    [
      { label: 'Batal', action: 'cancel', type: 'outline' },
      { label: 'Hapus', action: 'delete', type: 'danger' },
    ]
  );

  if (action === 'delete') {
    showLoading('Menghapus pelanggan...');

    try {
      const { error } = await db.deleteCustomer(customerId);

      if (error) throw error;

      hideLoading();
      showNotification('Pelanggan berhasil dihapus', 'success');

      // Reload customers
      await loadCustomers();
    } catch (error) {
      hideLoading();
      console.error('Error deleting customer:', error);
      showNotification('Gagal menghapus pelanggan', 'danger');
    }
  }
};

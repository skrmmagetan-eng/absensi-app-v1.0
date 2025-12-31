import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { geo, showNotification, showLoading, hideLoading, createModal } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import { sessionValidator } from '../utils/session-validator.js';
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
            placeholder="🔍 Cari pelanggan (nama, alamat, atau jenis ternak)..."
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
  const container = document.getElementById('customers-container');

  // Validate user session using session validator
  const sessionData = sessionValidator.validateUserSession(false);
  if (!sessionData) {
    container.innerHTML = `
      <div class="text-center" style="padding: 2rem;">
        <div style="color: var(--danger); margin-bottom: 1rem;">⚠️</div>
        <h3>Sesi Tidak Valid</h3>
        <p style="color: var(--text-muted); margin-bottom: 1rem;">
          Sesi pengguna tidak valid. Silakan login kembali.
        </p>
        <button class="btn btn-primary" onclick="window.location.hash='#login'">
          Login Kembali
        </button>
      </div>
    `;
    return;
  }

  const { user, profile } = sessionData;

  showLoading('Memuat data pelanggan...');

  try {
    // Admin dan Manager melihat semua pelanggan, Employee hanya melihat pelanggan mereka sendiri
    const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';
    const { data: customers, error } = await db.getCustomers(isAdminOrManager ? null : user.id);

    hideLoading();

    if (error) throw error;

    if (!customers || customers.length === 0) {
      const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';
      container.innerHTML = `
        <div class="card text-center" style="padding: 3rem;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">📭</div>
          <h3>Belum Ada Pelanggan</h3>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">
            ${isAdminOrManager 
              ? 'Belum ada pelanggan yang didaftarkan oleh karyawan. Instruksikan karyawan untuk menambahkan pelanggan.' 
              : 'Mulai tambahkan pelanggan untuk memulai kunjungan'
            }
          </p>
          ${!isAdminOrManager ? `
            <button class="btn btn-primary" onclick="window.location.hash='#pelanggan/tambah'">
              <span>➕</span>
              <span>Tambah Pelanggan Pertama</span>
            </button>
          ` : `
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-outline" onclick="window.location.hash='#admin/karyawan'">
                <span>👥</span>
                <span>Kelola Karyawan</span>
              </button>
              <button class="btn btn-primary" onclick="window.location.hash='#pelanggan/tambah'">
                <span>➕</span>
                <span>Tambah Pelanggan</span>
              </button>
            </div>
          `}
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
    
    // Detailed error handling
    let errorMessage = 'Gagal memuat data pelanggan';
    let errorDetails = '';
    
    if (error.message.includes('relation "customers" does not exist')) {
      errorMessage = 'Tabel pelanggan belum dibuat';
      errorDetails = 'Silakan jalankan setup database terlebih dahulu';
    } else if (error.message.includes('permission denied') || error.message.includes('policy')) {
      errorMessage = 'Akses ditolak ke data pelanggan';
      errorDetails = 'Periksa permissions atau hubungi administrator';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Koneksi database bermasalah';
      errorDetails = 'Periksa koneksi internet atau konfigurasi database';
    }
    
    // Show detailed error in UI
    container.innerHTML = `
      <div class="card text-center" style="padding: 3rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
        <h3 style="color: var(--danger);">${errorMessage}</h3>
        <p style="color: var(--text-muted); margin-bottom: 1rem;">${errorDetails}</p>
        <details style="margin: 1rem 0; text-align: left;">
          <summary style="cursor: pointer; color: var(--text-secondary);">Detail Error (untuk developer)</summary>
          <pre style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-top: 0.5rem; font-size: 0.875rem; overflow-x: auto;">${error.message}</pre>
        </details>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="window.location.reload()">
            <span>🔄</span>
            <span>Coba Lagi</span>
          </button>
          <button class="btn btn-primary" onclick="window.location.hash='#dashboard'">
            <span>🏠</span>
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
      </div>
    `;
    
    showNotification(errorMessage, 'danger');
  }
}

function renderCustomersList(customers) {
  const container = document.getElementById('customers-container');
  const profile = state.getState('profile');
  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  container.innerHTML = customers.map(customer => {
    // Get livestock emoji based on type
    const getLivestockEmoji = (type) => {
      if (!type) return '🐾';
      const lowerType = type.toLowerCase();
      if (lowerType.includes('ayam') && lowerType.includes('broiler')) return '🐔';
      if (lowerType.includes('ayam') && lowerType.includes('layer')) return '🐓';
      if (lowerType.includes('ayam') && (lowerType.includes('grower') || lowerType.includes('pullet'))) return '🐥';
      if (lowerType.includes('ayam') && lowerType.includes('kampung')) return '🐤';
      if (lowerType.includes('bebek')) return '🦆';
      if (lowerType.includes('sapi') && lowerType.includes('potong')) return '🐄';
      if (lowerType.includes('sapi') && lowerType.includes('perah')) return '🐮';
      if (lowerType.includes('kambing')) return '🐐';
      if (lowerType.includes('domba')) return '🐑';
      if (lowerType.includes('babi')) return '🐷';
      if (lowerType.includes('ikan')) return '🐟';
      if (lowerType.includes('udang')) return '🦐';
      return '🐾'; // Default for others
    };

    return `
      <div class="card mb-md customer-item" data-name="${customer.name.toLowerCase()}" data-address="${customer.address.toLowerCase()}" data-livestock="${(customer.livestock_type || '').toLowerCase()}">
        <div class="flex justify-between items-center gap-md">
          <div class="flex items-center gap-md" style="flex: 1;">
            <div style="width: 60px; height: 60px; border-radius: var(--radius-md); background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
              ${getLivestockEmoji(customer.livestock_type)}
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0; color: var(--text-primary);">${customer.name}</h4>
              <p style="margin: 0.25rem 0; color: var(--text-secondary); font-size: 0.875rem;">
                ${getLivestockEmoji(customer.livestock_type)} ${customer.livestock_type || '⚠️ Jenis ternak belum diisi'}
                ${!customer.livestock_type ? '<span style="color: #f5576c; font-weight: 500;"> (Perlu diupdate)</span>' : ''}
              </p>
              <p style="margin: 0.25rem 0; color: var(--text-secondary); font-size: 0.875rem;">
                📍 ${customer.address}
              </p>
              <p style="margin: 0.25rem 0; color: var(--text-muted); font-size: 0.875rem;">
                📞 ${customer.phone || 'Tidak ada telepon'}
              </p>
              ${customer.population_count ? `
                <p style="margin: 0.25rem 0; color: var(--success); font-size: 0.875rem;">
                  🐄 ${customer.population_count} ${customer.population_unit || 'ekor'}
                  ${customer.feed_type ? `• 🌾 ${customer.feed_type}` : ''}
                  ${customer.daily_feed_consumption ? `• ${customer.daily_feed_consumption} ${customer.feed_unit || 'kg'}/hari` : ''}
                </p>
              ` : `
                <p style="margin: 0.25rem 0; color: var(--warning); font-size: 0.875rem;">
                  ⚠️ Data populasi & pakan belum diisi
                </p>
              `}
              ${isAdminOrManager && customer.users ? `
                <p style="margin: 0; color: var(--primary); font-size: 0.875rem; font-weight: 500;">
                  👤 Didaftarkan oleh: ${customer.users.name || 'Unknown'}
                </p>
              ` : ''}
            </div>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-outline btn-icon" onclick="viewCustomer('${customer.id}')" title="Lihat Detail">
              👁️
            </button>
            <button class="btn btn-outline btn-icon" onclick="updatePopulationFeed('${customer.id}')" title="Update Populasi & Pakan">
              🐄
            </button>
            <button class="btn btn-outline btn-icon" onclick="editCustomer('${customer.id}')" title="Edit">
              ✏️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterCustomers(query) {
  const customers = state.getState('customers');
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.address.toLowerCase().includes(query.toLowerCase()) ||
    (c.livestock_type && c.livestock_type.toLowerCase().includes(query.toLowerCase()))
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
              <label class="form-label" for="livestock-type">Jenis/Tipe Ternak *</label>
              <select id="livestock-type" class="form-input" required>
                <option value="">-- Pilih Jenis Ternak --</option>
                <option value="ayam-broiler">🐔 Ayam Broiler (Pedaging)</option>
                <option value="ayam-layer">🐓 Ayam Layer (Petelur)</option>
                <option value="ayam-grower">🐥 Ayam Grower/Pullet</option>
                <option value="ayam-kampung">🐤 Ayam Kampung</option>
                <option value="bebek">🦆 Bebek</option>
                <option value="sapi-potong">🐄 Sapi Potong</option>
                <option value="sapi-perah">🐮 Sapi Perah</option>
                <option value="kambing">🐐 Kambing</option>
                <option value="domba">🐑 Domba</option>
                <option value="babi">🐷 Babi</option>
                <option value="ikan">🐟 Ikan (Budidaya)</option>
                <option value="udang">🦐 Udang</option>
                <option value="lainnya">🦜 Lainnya</option>
              </select>
            </div>

            <div class="form-group" id="other-livestock-group" style="display: none;">
              <label class="form-label" for="other-livestock">Sebutkan Jenis Ternak Lainnya</label>
              <input
                type="text"
                id="other-livestock"
                class="form-input"
                placeholder="Contoh: Burung Puyuh, Kelinci, dll"
              />
            </div>

            <!-- Population & Feed Section -->
            <div class="form-section" style="background: var(--bg-secondary); padding: 1.5rem; border-radius: var(--radius-md); margin: 1.5rem 0;">
              <h3 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem;">
                🐄 Data Populasi & Pakan
              </h3>
              
              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="population-count">Jumlah Ternak *</label>
                  <input
                    type="number"
                    id="population-count"
                    class="form-input"
                    placeholder="100"
                    min="0"
                    required
                  />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="population-unit">Satuan</label>
                  <select id="population-unit" class="form-input">
                    <option value="ekor">Ekor</option>
                    <option value="kg">Kg</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="feed-type">Jenis Pakan</label>
                <input
                  type="text"
                  id="feed-type"
                  class="form-input"
                  placeholder="Contoh: Pakan Starter, Grower, Finisher"
                />
              </div>

              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="feed-brand">Merek/Supplier Pakan</label>
                  <input
                    type="text"
                    id="feed-brand"
                    class="form-input"
                    placeholder="Contoh: Charoen Pokphand, Japfa"
                  />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="daily-consumption">Konsumsi Harian</label>
                  <div style="display: flex; gap: 0.5rem;">
                    <input
                      type="number"
                      id="daily-consumption"
                      class="form-input"
                      placeholder="50"
                      min="0"
                      step="0.1"
                      style="flex: 1;"
                    />
                    <select id="feed-unit" class="form-input" style="width: 80px;">
                      <option value="kg">Kg</option>
                      <option value="sak">Sak</option>
                    </select>
                  </div>
                </div>
              </div>
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
  // Livestock type change handler
  document.getElementById('livestock-type').addEventListener('change', (e) => {
    const otherGroup = document.getElementById('other-livestock-group');
    const otherInput = document.getElementById('other-livestock');
    
    if (e.target.value === 'lainnya') {
      otherGroup.style.display = 'block';
      otherInput.required = true;
    } else {
      otherGroup.style.display = 'none';
      otherInput.required = false;
      otherInput.value = '';
    }
  });

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
  const livestockType = document.getElementById('livestock-type').value;
  const otherLivestock = document.getElementById('other-livestock').value.trim();
  const address = document.getElementById('address').value.trim();
  const notes = document.getElementById('notes').value.trim();
  
  // Population & Feed data
  const populationCount = parseInt(document.getElementById('population-count').value) || 0;
  const populationUnit = document.getElementById('population-unit').value;
  const feedType = document.getElementById('feed-type').value.trim();
  const feedBrand = document.getElementById('feed-brand').value.trim();
  const dailyConsumption = parseFloat(document.getElementById('daily-consumption').value) || 0;
  const feedUnit = document.getElementById('feed-unit').value;
  
  const coordinateInfo = document.getElementById('coordinate-info');
  
  // Validate user session using session validator
  const sessionData = sessionValidator.validateForCriticalOperation('menambahkan pelanggan');
  if (!sessionData) {
    return;
  }
  
  const { user } = sessionData;

  if (!coordinateInfo.dataset.lat || !coordinateInfo.dataset.lng) {
    showNotification('Tentukan lokasi pelanggan pada peta', 'warning');
    return;
  }

  if (!livestockType) {
    showNotification('Pilih jenis ternak pelanggan', 'warning');
    return;
  }

  // Determine final livestock type
  let finalLivestockType = livestockType;
  if (livestockType === 'lainnya' && otherLivestock) {
    finalLivestockType = otherLivestock;
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
    // Ensure livestock_type is properly formatted for consistency
    let finalLivestockType = livestockType;
    if (livestockType === 'lainnya') {
      const otherType = document.getElementById('other-livestock').value.trim();
      finalLivestockType = otherType || 'Lainnya';
    }

    const customerData = {
      employee_id: user.id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      livestock_type: finalLivestockType,
      address: address.trim(),
      latitude: parseFloat(coordinateInfo.dataset.lat),
      longitude: parseFloat(coordinateInfo.dataset.lng),
      notes: notes?.trim() || null,
      // Population & Feed data
      population_count: populationCount,
      population_unit: populationUnit,
      feed_type: feedType || null,
      feed_brand: feedBrand || null,
      daily_feed_consumption: dailyConsumption,
      feed_unit: feedUnit,
      created_at: new Date().toISOString()
    };

    const { data, error } = await db.createCustomer(customerData);

    if (error) throw error;

    hideLoading();
    showNotification('Pelanggan berhasil ditambahkan! ✅', 'success');

    // Clear form for potential next entry
    document.getElementById('customer-form').reset();
    
    // Reset coordinate info
    const coordinateInfoEl = document.getElementById('coordinate-info');
    coordinateInfoEl.textContent = 'Belum ada koordinat dipilih';
    delete coordinateInfoEl.dataset.lat;
    delete coordinateInfoEl.dataset.lng;
    
    // Reset map marker if exists
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }

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
  console.log('🔍 Opening customer detail for ID:', customerId);
  console.log('🔍 Function called from:', new Error().stack);
  
  if (!customerId) {
    console.error('❌ No customer ID provided');
    showNotification('ID pelanggan tidak valid', 'danger');
    return;
  }

  showLoading('Memuat detail pelanggan...');

  try {
    // Get customer data
    console.log('📡 Fetching customer data...');
    const { data: customer, error } = await db.getCustomerById(customerId);
    
    if (error) {
      console.error('❌ Error loading customer:', error);
      throw new Error(`Gagal memuat data pelanggan: ${error.message}`);
    }

    if (!customer) {
      console.error('❌ Customer not found');
      throw new Error('Pelanggan tidak ditemukan');
    }

    console.log('✅ Customer loaded:', customer);

    // Get customer statistics
    console.log('📊 Loading visit statistics...');
    const { data: visitStats, error: visitError } = await db.supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time, notes')
      .eq('customer_id', customerId)
      .order('check_in_time', { ascending: false })
      .limit(5);

    if (visitError) {
      console.warn('⚠️ Error loading visit stats:', visitError);
      // Don't throw error, just continue with empty stats
    }

    console.log('📈 Visit stats loaded:', visitStats);

    const totalVisits = visitStats?.length || 0;
    const thisMonthVisits = visitStats?.filter(v => {
      try {
        const visitDate = new Date(v.check_in_time);
        const now = new Date();
        return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
      } catch (e) {
        console.warn('Date parsing error:', e);
        return false;
      }
    }).length || 0;

    const lastVisit = visitStats?.[0];
    let lastVisitText = 'Belum pernah dikunjungi';
    
    if (lastVisit) {
      try {
        const lastVisitDate = new Date(lastVisit.check_in_time);
        const daysDiff = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        lastVisitText = `${lastVisitDate.toLocaleDateString('id-ID')} (${daysDiff} hari lalu)`;
      } catch (e) {
        console.warn('Date calculation error:', e);
        lastVisitText = 'Data tidak valid';
      }
    }

    console.log('📊 Statistics calculated:', { totalVisits, thisMonthVisits, lastVisitText });

    hideLoading();

    // Ensure geo utility is available
    if (!window.geo && !geo) {
      console.error('❌ Geo utility not available');
      throw new Error('Utility geografis tidak tersedia');
    }

    const geoUtil = window.geo || geo;

    const modalContent = `
        <div style="line-height: 1.6;">
          <!-- Customer Info -->
          <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
              <div>
                <div style="color: #6c757d; font-size: 0.8rem;">📍 ALAMAT</div>
                <div style="font-weight: 500; color: #212529;">${customer.address || 'Tidak ada alamat'}</div>
              </div>
              <div>
                <div style="color: #6c757d; font-size: 0.8rem;">📞 TELEPON</div>
                <div style="font-weight: 500; color: #212529;">${customer.phone || 'Tidak ada nomor'}</div>
              </div>
            </div>
            ${customer.livestock_type ? `
              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dee2e6;">
                <div style="color: #6c757d; font-size: 0.8rem;">🐾 JENIS TERNAK</div>
                <div style="font-weight: 500; color: #212529; display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 1.2rem;">${(() => {
                    const type = customer.livestock_type.toLowerCase();
                    if (type.includes('ayam') && type.includes('broiler')) return '🐔';
                    if (type.includes('ayam') && type.includes('layer')) return '🐓';
                    if (type.includes('ayam') && (type.includes('grower') || type.includes('pullet'))) return '🐥';
                    if (type.includes('ayam') && type.includes('kampung')) return '🐤';
                    if (type.includes('bebek')) return '🦆';
                    if (type.includes('sapi') && type.includes('potong')) return '🐄';
                    if (type.includes('sapi') && type.includes('perah')) return '🐮';
                    if (type.includes('kambing')) return '🐐';
                    if (type.includes('domba')) return '🐑';
                    if (type.includes('babi')) return '🐷';
                    if (type.includes('ikan')) return '🐟';
                    if (type.includes('udang')) return '🦐';
                    return '🐾';
                  })()}</span>
                  <span>${customer.livestock_type}</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Location Info -->
          <div style="margin-bottom: 16px;">
            <div style="color: #6c757d; font-size: 0.8rem; margin-bottom: 0.5rem;">🗺️ KOORDINAT</div>
            <div style="font-family: monospace; background: #e9ecef; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; color: #495057;">
              ${geoUtil.formatCoordinates ? geoUtil.formatCoordinates(customer.latitude, customer.longitude) : `${customer.latitude}, ${customer.longitude}`}
            </div>
          </div>

          <!-- Statistics -->
          <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1976d2;">📊 Statistik Kunjungan</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; text-align: center; font-size: 0.85rem;">
              <div>
                <div style="font-weight: 600; color: #1976d2; font-size: 1.2rem;">${totalVisits}</div>
                <div style="color: #6c757d;">Total</div>
              </div>
              <div>
                <div style="font-weight: 600; color: #388e3c; font-size: 1.2rem;">${thisMonthVisits}</div>
                <div style="color: #6c757d;">Bulan Ini</div>
              </div>
              <div>
                <div style="font-weight: 600; color: #f57c00; font-size: 0.9rem;">${lastVisitText.split('(')[0]}</div>
                <div style="color: #6c757d;">Terakhir</div>
              </div>
            </div>
          </div>

          <!-- Recent Visits -->
          ${visitStats && visitStats.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1976d2;">📅 Riwayat Terakhir</div>
              <div style="max-height: 120px; overflow-y: auto;">
                ${visitStats.slice(0, 3).map(visit => {
                  try {
                    const checkInDate = new Date(visit.check_in_time);
                    const checkInTime = checkInDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
                    const checkOutTime = visit.check_out_time ? new Date(visit.check_out_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : '';
                    
                    return `
                      <div style="display: flex; justify-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #dee2e6; font-size: 0.85rem;">
                        <div>
                          <div style="font-weight: 500; color: #212529;">${checkInDate.toLocaleDateString('id-ID')}</div>
                          ${visit.notes ? `<div style="color: #6c757d; font-size: 0.8rem;">${visit.notes.substring(0, 30)}${visit.notes.length > 30 ? '...' : ''}</div>` : ''}
                        </div>
                        <div style="color: #6c757d; font-size: 0.8rem;">
                          ${checkInTime}${checkOutTime ? ` - ${checkOutTime}` : ''}
                        </div>
                      </div>
                    `;
                  } catch (e) {
                    console.warn('Visit rendering error:', e);
                    return '<div style="color: #dc3545; font-size: 0.8rem;">Data tidak valid</div>';
                  }
                }).join('')}
              </div>
            </div>
          ` : `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1976d2;">📅 Riwayat Terakhir</div>
              <div style="text-align: center; padding: 1rem; color: #6c757d; font-style: italic;">
                Belum ada riwayat kunjungan
              </div>
            </div>
          `}

          <!-- Notes -->
          ${customer.notes ? `
            <div style="margin-bottom: 16px;">
              <div style="color: #6c757d; font-size: 0.8rem; margin-bottom: 0.5rem;">📝 CATATAN</div>
              <div style="background: #f8f9fa; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; font-style: italic; color: #495057;">
                "${customer.notes}"
              </div>
            </div>
          ` : ''}

          <!-- Action Info -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 8px;">
            <div style="font-weight: 600; margin-bottom: 0.5rem;">🎯 Catat Kunjungan</div>
            <div style="font-size: 0.85rem; opacity: 0.9;">
              Klik tombol di bawah saat Anda berada di lokasi customer untuk mencatat kunjungan dengan GPS dan foto.
            </div>
          </div>
        </div>
      `;

    console.log('🎨 Modal content prepared, showing modal...');
    console.log('📝 Modal content length:', modalContent.length);
    console.log('📝 Modal content preview:', modalContent.substring(0, 200) + '...');

    // Ensure createModal is available
    if (!window.createModal && !createModal) {
      console.error('❌ createModal function not available');
      throw new Error('Fungsi modal tidak tersedia');
    }

    const modalFunc = window.createModal || createModal;

    const action = await modalFunc(
      `👤 ${customer.name}`,
      modalContent,
      [
        { label: 'Tutup', action: 'close', type: 'outline' },
        { label: '📞 Telepon', action: 'call', type: 'outline', hidden: !customer.phone },
        { label: '🗺️ Buka Maps', action: 'maps', type: 'outline' },
        { label: '✏️ Edit Data Ternak', action: 'edit-livestock', type: 'warning', hidden: false },
        { label: '📍 Catat Kunjungan', action: 'visit', type: 'primary' }
      ].filter(btn => !btn.hidden)
    );

    console.log('👆 User action:', action);

    // Handle actions
    if (action === 'visit') {
      await handleLogVisit(customer);
    } else if (action === 'call' && customer.phone) {
      window.open(`tel:${customer.phone}`);
    } else if (action === 'maps') {
      const mapsUrl = `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`;
      window.open(mapsUrl, '_blank');
    } else if (action === 'edit-livestock') {
      await handleEditLivestockType(customer);
    }

  } catch (error) {
    hideLoading();
    console.error('❌ Error in viewCustomer:', error);
    showNotification(error.message || 'Gagal memuat detail pelanggan', 'danger');
  }
};

async function handleEditLivestockType(customer) {
  const modalId = 'edit-livestock-modal-' + Date.now();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = modalId;
  
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">🐾 Update Data Ternak</h3>
        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="mb-md" style="background: #e3f2fd; padding: 1rem; border-radius: 8px;">
          <div style="font-weight: 600; color: #1976d2; margin-bottom: 0.5rem;">📍 ${customer.name}</div>
          <div style="font-size: 0.9rem; color: #666;">
            ${customer.address}
          </div>
        </div>
        
        <form id="edit-livestock-form">
          <div class="form-group">
            <label class="form-label">Jenis/Tipe Ternak *</label>
            <select id="edit-livestock-type" class="form-input" required>
              <option value="">-- Pilih Jenis Ternak --</option>
              <option value="ayam-broiler">🐔 Ayam Broiler (Pedaging)</option>
              <option value="ayam-layer">🐓 Ayam Layer (Petelur)</option>
              <option value="ayam-grower">🐥 Ayam Grower/Pullet</option>
              <option value="ayam-kampung">🐤 Ayam Kampung</option>
              <option value="bebek">🦆 Bebek</option>
              <option value="sapi-potong">🐄 Sapi Potong</option>
              <option value="sapi-perah">🐮 Sapi Perah</option>
              <option value="kambing">🐐 Kambing</option>
              <option value="domba">🐑 Domba</option>
              <option value="babi">🐷 Babi</option>
              <option value="ikan">🐟 Ikan (Budidaya)</option>
              <option value="udang">🦐 Udang</option>
              <option value="lainnya">🦜 Lainnya</option>
            </select>
          </div>
          
          <div class="form-group" id="edit-other-livestock-group" style="display: none;">
            <label class="form-label">Sebutkan Jenis Ternak Lainnya</label>
            <input
              type="text"
              id="edit-other-livestock"
              class="form-input"
              placeholder="Contoh: Burung Puyuh, Kelinci, dll"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Catatan Tambahan (Opsional)</label>
            <textarea
              id="edit-livestock-notes"
              class="form-textarea"
              rows="2"
              placeholder="Informasi tambahan tentang ternak..."
            ></textarea>
          </div>
          
          <div class="modal-footer" style="padding: 0; margin-top: 1.5rem; border: none;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-update-livestock">✅ Update Data</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Set current value if exists
  const livestockSelect = document.getElementById('edit-livestock-type');
  if (customer.livestock_type) {
    // Try to match existing value with dropdown options
    const options = livestockSelect.options;
    let matched = false;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === customer.livestock_type || 
          options[i].text.toLowerCase().includes(customer.livestock_type.toLowerCase())) {
        livestockSelect.value = options[i].value;
        matched = true;
        break;
      }
    }
    
    // If no match found, set to "lainnya" and fill the custom field
    if (!matched) {
      livestockSelect.value = 'lainnya';
      document.getElementById('edit-other-livestock-group').style.display = 'block';
      document.getElementById('edit-other-livestock').value = customer.livestock_type;
      document.getElementById('edit-other-livestock').required = true;
    }
  }

  // Handle livestock type change
  livestockSelect.addEventListener('change', (e) => {
    const otherGroup = document.getElementById('edit-other-livestock-group');
    const otherInput = document.getElementById('edit-other-livestock');
    
    if (e.target.value === 'lainnya') {
      otherGroup.style.display = 'block';
      otherInput.required = true;
    } else {
      otherGroup.style.display = 'none';
      otherInput.required = false;
      otherInput.value = '';
    }
  });

  // Handle form submission
  const form = overlay.querySelector('#edit-livestock-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const livestockType = document.getElementById('edit-livestock-type').value;
    const otherLivestock = document.getElementById('edit-other-livestock').value.trim();
    const notes = document.getElementById('edit-livestock-notes').value.trim();
    const btn = document.getElementById('btn-update-livestock');

    if (!livestockType) {
      showNotification('Pilih jenis ternak', 'warning');
      return;
    }

    // Determine final livestock type
    let finalLivestockType = livestockType;
    if (livestockType === 'lainnya' && otherLivestock) {
      finalLivestockType = otherLivestock;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Menyimpan...';
    showLoading('Mengupdate data ternak...');

    try {
      // Update customer livestock type
      const { error } = await db.supabase
        .from('customers')
        .update({ 
          livestock_type: finalLivestockType,
          notes: notes || customer.notes // Keep existing notes if no new notes
        })
        .eq('id', customer.id);

      if (error) throw error;

      hideLoading();
      overlay.remove();
      showNotification('✅ Data ternak berhasil diupdate!', 'success');
      
      // Refresh customer list if we're on the customers page
      if (window.location.hash.includes('pelanggan')) {
        setTimeout(() => {
          loadCustomers();
        }, 1000);
      }

    } catch (err) {
      hideLoading();
      btn.disabled = false;
      btn.innerHTML = '✅ Update Data';
      showNotification(err.message || 'Gagal mengupdate data ternak', 'danger');
    }
  });
}

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

        // Validate user session using session validator
        const sessionData = sessionValidator.validateForCriticalOperation('mencatat kunjungan');
        if (!sessionData) {
          throw new Error('Sesi pengguna tidak valid untuk mencatat kunjungan.');
        }
        
        const { user } = sessionData;
        
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

// Update Population & Feed Function
window.updatePopulationFeed = async (customerId) => {
  console.log('🐄 Opening population & feed update for customer ID:', customerId);
  
  if (!customerId) {
    console.error('❌ No customer ID provided');
    showNotification('ID pelanggan tidak valid', 'danger');
    return;
  }

  showLoading('Memuat data pelanggan...');

  try {
    // Get customer data
    const { data: customer, error } = await db.getCustomerById(customerId);
    
    if (error) {
      console.error('❌ Error loading customer:', error);
      throw new Error(`Gagal memuat data pelanggan: ${error.message}`);
    }

    if (!customer) {
      console.error('❌ Customer not found');
      throw new Error('Pelanggan tidak ditemukan');
    }

    hideLoading();

    const modalId = 'update-population-feed-modal-' + Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    
    overlay.innerHTML = `
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">🐄 Update Populasi & Pakan</h3>
          <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="mb-md" style="background: #e3f2fd; padding: 1rem; border-radius: 8px;">
            <div style="font-weight: 600; color: #1976d2; margin-bottom: 0.5rem;">📍 ${customer.name}</div>
            <div style="font-size: 0.9rem; color: #666;">
              ${customer.livestock_type} • ${customer.address}
            </div>
          </div>
          
          <form id="update-population-feed-form">
            <!-- Population Section -->
            <div class="form-section" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
              <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">🐄 Data Populasi</h4>
              <div class="form-row" style="display: grid; grid-template-columns: 1fr auto; gap: 1rem;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Jumlah Ternak</label>
                  <input
                    type="number"
                    id="update-population-count"
                    class="form-input"
                    value="${customer.population_count || ''}"
                    min="0"
                  />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Satuan</label>
                  <select id="update-population-unit" class="form-input">
                    <option value="ekor" ${customer.population_unit === 'ekor' ? 'selected' : ''}>Ekor</option>
                    <option value="kg" ${customer.population_unit === 'kg' ? 'selected' : ''}>Kg</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Feed Section -->
            <div class="form-section" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
              <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">🌾 Data Pakan</h4>
              <div class="form-group">
                <label class="form-label">Jenis Pakan</label>
                <input
                  type="text"
                  id="update-feed-type"
                  class="form-input"
                  value="${customer.feed_type || ''}"
                  placeholder="Contoh: Pakan Starter, Grower, Finisher"
                />
              </div>
              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Merek/Supplier</label>
                  <input
                    type="text"
                    id="update-feed-brand"
                    class="form-input"
                    value="${customer.feed_brand || ''}"
                    placeholder="Contoh: Charoen Pokphand"
                  />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label class="form-label">Konsumsi Harian</label>
                  <div style="display: flex; gap: 0.5rem;">
                    <input
                      type="number"
                      id="update-daily-consumption"
                      class="form-input"
                      value="${customer.daily_feed_consumption || ''}"
                      min="0"
                      step="0.1"
                      style="flex: 1;"
                    />
                    <select id="update-feed-unit" class="form-input" style="width: 80px;">
                      <option value="kg" ${customer.feed_unit === 'kg' ? 'selected' : ''}>Kg</option>
                      <option value="sak" ${customer.feed_unit === 'sak' ? 'selected' : ''}>Sak</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Catatan Update (Opsional)</label>
              <textarea
                id="update-notes"
                class="form-textarea"
                rows="2"
                placeholder="Alasan perubahan atau catatan tambahan..."
              ></textarea>
            </div>
            
            <div class="modal-footer" style="padding: 0; margin-top: 1.5rem; border: none;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Batal</button>
              <button type="submit" class="btn btn-primary" id="btn-update-population-feed">✅ Update Data</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Handle form submission
    const form = overlay.querySelector('#update-population-feed-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const populationCount = parseInt(document.getElementById('update-population-count').value) || 0;
      const populationUnit = document.getElementById('update-population-unit').value;
      const feedType = document.getElementById('update-feed-type').value.trim();
      const feedBrand = document.getElementById('update-feed-brand').value.trim();
      const dailyConsumption = parseFloat(document.getElementById('update-daily-consumption').value) || 0;
      const feedUnit = document.getElementById('update-feed-unit').value;
      const notes = document.getElementById('update-notes').value.trim();
      const btn = document.getElementById('btn-update-population-feed');

      btn.disabled = true;
      btn.innerHTML = '⏳ Menyimpan...';
      showLoading('Mengupdate data populasi & pakan...');

      try {
        // Update population if changed
        if (populationCount !== (customer.population_count || 0) || populationUnit !== customer.population_unit) {
          await db.updatePopulation(customerId, {
            count: populationCount,
            unit: populationUnit,
            notes: notes
          });
        }

        // Update feed if changed
        if (feedType !== (customer.feed_type || '') || 
            feedBrand !== (customer.feed_brand || '') || 
            dailyConsumption !== (customer.daily_feed_consumption || 0) ||
            feedUnit !== customer.feed_unit) {
          await db.updateFeed(customerId, {
            type: feedType,
            brand: feedBrand,
            consumption: dailyConsumption,
            unit: feedUnit,
            notes: notes
          });
        }

        hideLoading();
        overlay.remove();
        showNotification('✅ Data populasi & pakan berhasil diupdate!', 'success');
        
        // Refresh customer list
        setTimeout(() => {
          loadCustomers();
        }, 1000);

      } catch (err) {
        hideLoading();
        btn.disabled = false;
        btn.innerHTML = '✅ Update Data';
        showNotification(err.message || 'Gagal mengupdate data populasi & pakan', 'danger');
      }
    });

  } catch (error) {
    hideLoading();
    console.error('❌ Error in updatePopulationFeed:', error);
    showNotification(error.message || 'Gagal memuat data pelanggan', 'danger');
  }
};

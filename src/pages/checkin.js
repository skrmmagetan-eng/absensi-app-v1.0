import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { geo, showNotification, showLoading, hideLoading } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import { createSearchableDropdown } from '../utils/searchable-dropdown.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map = null;
let currentMarker = null;
let customerMarker = null;

export async function renderCheckInPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg">
          <h1>📍 Check In Kunjungan</h1>
          <p style="color: var(--text-muted);">Pilih pelanggan dan konfirmasi lokasi Anda</p>
        </div>

        <div class="card-glass mb-lg">
          <form id="checkin-form">
            <!-- Customer Selection -->
            <div class="form-group">
              <label class="form-label" for="customer">Pilih Pelanggan *</label>
              <select id="customer" class="form-select" required>
                <option value="">Memuat pelanggan...</option>
              </select>
            </div>

            <!-- Map Container -->
            <div class="form-group">
              <label class="form-label">Lokasi Anda Saat Ini</label>
              <div id="map" class="map-container"></div>
              <div class="mt-sm" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline btn-small" id="get-location-btn">
                  <span>📍</span>
                  <span>Dapatkan Lokasi</span>
                </button>
                <span id="location-info" style="color: var(--text-muted); font-size: 0.875rem; line-height: 2.5;"></span>
              </div>
            </div>

            <!-- Customer Distance Info -->
            <div id="distance-info" class="hidden" style="padding: 1rem; background: rgba(79, 172, 254, 0.1); border-radius: var(--radius-md); margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.5rem;">📏</span>
                <div>
                  <strong style="color: var(--text-primary);">Jarak ke Pelanggan</strong>
                  <p id="distance-text" style="margin: 0; color: var(--text-secondary);"></p>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group">
              <label class="form-label" for="notes">Catatan (opsional)</label>
              <textarea
                id="notes"
                class="form-textarea"
                placeholder="Tambahkan catatan kunjungan..."
                rows="3"
              ></textarea>
            </div>

            <!-- Selfie Input -->
            <div class="form-group">
              <label class="form-label">Selfie Check-In *</label>
              <input type="file" id="checkin-photo" class="form-input" accept="image/*" capture="user" required>
              <small class="text-muted">Foto selfie langsung di lokasi untuk validasi absen.</small>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="btn btn-primary w-full" id="submit-btn" disabled>
              <span>✅</span>
              <span>Konfirmasi Check In</span>
            </button>
          </form>
        </div>

        <!-- Info Card -->
        <div class="alert alert-info">
          💡 <strong>Tips:</strong> Pastikan Anda sudah berada di lokasi pelanggan sebelum melakukan check in. 
          Sistem akan merekam lokasi GPS Anda secara real-time.
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  // Initialize
  await loadCustomers();
  initializeMap();
  setupEventListeners();
}

async function loadCustomers() {
  const user = state.getState('user');
  const select = document.getElementById('customer');

  try {
    const { data: customers, error } = await db.getCustomers(user.id);

    if (error) throw error;

    if (!customers || customers.length === 0) {
      select.innerHTML = '<option value="">Belum ada pelanggan</option>';
      showNotification('Anda belum memiliki pelanggan. Tambahkan pelanggan terlebih dahulu.', 'warning');
      return;
    }

    // Store customers data for search functionality
    window.customersData = customers;
    
    // Replace select with searchable dropdown
    createSearchableDropdown('customer', customers, {
      placeholder: '-- Pilih Pelanggan --',
      searchPlaceholder: '🔍 Cari pelanggan (nama, alamat, jenis ternak)...',
      displayField: (customer) => `${customer.name} - ${customer.address}`,
      searchFields: ['name', 'address', 'livestock_type'],
      valueField: 'id',
      onSelect: (customer) => {
        // Store customer data for distance calculation
        const select = document.getElementById('customer');
        select.dataset.lat = customer.latitude;
        select.dataset.lng = customer.longitude;
        calculateDistance();
      }
    });
  } catch (error) {
    console.error('Error loading customers:', error);
    select.innerHTML = '<option value="">Error memuat pelanggan</option>';
  }
}

function initializeMap() {
  const mapElement = document.getElementById('map');

  // Initialize Leaflet map
  map = L.map('map').setView([-6.2088, 106.8456], 13); // Default: Jakarta

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // Try to get user's current location
  getCurrentLocation();
}

async function getCurrentLocation() {
  const btn = document.getElementById('get-location-btn');
  const locationInfo = document.getElementById('location-info');
  const submitBtn = document.getElementById('submit-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>';
  locationInfo.textContent = 'Mendapatkan lokasi...';

  try {
    const position = await geo.getCurrentPosition();

    // Update map
    map.setView([position.latitude, position.longitude], 16);

    // Remove old marker if exists
    if (currentMarker) {
      map.removeLayer(currentMarker);
    }

    // Add marker for current position
    currentMarker = L.marker([position.latitude, position.longitude], {
      icon: L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#667eea">
            <path d="M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z"/>
          </svg>
        `),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(map);

    // Add circle to show accuracy
    L.circle([position.latitude, position.longitude], {
      radius: position.accuracy,
      color: '#667eea',
      fillColor: '#667eea',
      fillOpacity: 0.1,
    }).addTo(map);

    locationInfo.textContent = `📍 ${geo.formatCoordinates(position.latitude, position.longitude)} (±${Math.round(position.accuracy)}m)`;
    locationInfo.dataset.lat = position.latitude;
    locationInfo.dataset.lng = position.longitude;

    btn.innerHTML = '<span>✅</span><span>Lokasi Terdeteksi</span>';
    btn.disabled = false;

    // Check if all required fields are filled to enable submit
    const customerSelect = document.getElementById('customer');
    const photoInput = document.getElementById('checkin-photo');
    const hasCustomer = customerSelect.value;
    const hasPhoto = photoInput.files && photoInput.files.length > 0;

    if (hasCustomer && hasPhoto) {
      submitBtn.disabled = false;
    }

    // Calculate distance if customer is selected
    if (hasCustomer) {
      calculateDistance();
    }

    showNotification('Lokasi berhasil terdeteksi', 'success');
  } catch (error) {
    locationInfo.textContent = '❌ ' + error.message;
    btn.innerHTML = '<span>🔄</span><span>Coba Lagi</span>';
    btn.disabled = false;
    
    // Show manual location option after GPS fails
    showManualLocationOption();
    showNotification(error.message + ' - Gunakan lokasi manual sebagai alternatif', 'warning');
  }
}

function calculateDistance() {
  const customerSelect = document.getElementById('customer');
  const locationInfo = document.getElementById('location-info');
  const distanceInfo = document.getElementById('distance-info');
  const distanceText = document.getElementById('distance-text');

  if (!customerSelect.value || !locationInfo.dataset.lat) {
    distanceInfo.classList.add('hidden');
    return;
  }

  const customerLat = parseFloat(customerSelect.dataset.lat);
  const customerLng = parseFloat(customerSelect.dataset.lng);
  const currentLat = parseFloat(locationInfo.dataset.lat);
  const currentLng = parseFloat(locationInfo.dataset.lng);

  // Calculate distance
  const distance = geo.calculateDistance(currentLat, currentLng, customerLat, customerLng);
  const distanceInMeters = distance * 1000;

  // Show customer location on map
  if (customerMarker) {
    map.removeLayer(customerMarker);
  }

  customerMarker = L.marker([customerLat, customerLng], {
    icon: L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#f5576c">
          <path d="M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z"/>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    }),
  }).addTo(map).bindPopup(`<strong>Lokasi Pelanggan</strong><br>Lokasi Pelanggan`).openPopup();

  // Fit bounds to show both markers
  const bounds = L.latLngBounds([
    [currentLat, currentLng],
    [customerLat, customerLng],
  ]);
  map.fitBounds(bounds, { padding: [50, 50] });

  // Display distance
  distanceInfo.classList.remove('hidden');
  if (distanceInMeters < 1000) {
    distanceText.textContent = `${Math.round(distanceInMeters)} meter dari lokasi pelanggan`;
  } else {
    distanceText.textContent = `${distance.toFixed(2)} km dari lokasi pelanggan`;
  }

  // Warning if too far
  if (distanceInMeters > 500) {
    distanceInfo.style.background = 'rgba(250, 112, 154, 0.1)';
    distanceText.innerHTML += ' ⚠️ <em>Anda cukup jauh dari lokasi pelanggan</em>';
  } else {
    distanceInfo.style.background = 'rgba(79, 172, 254, 0.1)';
  }
}

function setupEventListeners() {
  // Get location button
  document.getElementById('get-location-btn').addEventListener('click', getCurrentLocation);

  // Customer selection change
  document.getElementById('customer').addEventListener('change', (e) => {
    const submitBtn = document.getElementById('submit-btn');
    const locationInfo = document.getElementById('location-info');
    const photoInput = document.getElementById('checkin-photo');

    // Check if all required fields are filled
    const hasCustomer = e.target.value;
    const hasLocation = locationInfo.dataset.lat || document.getElementById('manual-location-input');
    const hasPhoto = photoInput.files && photoInput.files.length > 0;

    if (hasCustomer && hasLocation) {
      submitBtn.disabled = false;
      calculateDistance();
    } else {
      submitBtn.disabled = true;
    }
  });

  // Photo input change
  document.getElementById('checkin-photo').addEventListener('change', (e) => {
    const submitBtn = document.getElementById('submit-btn');
    const customerSelect = document.getElementById('customer');
    const locationInfo = document.getElementById('location-info');

    // Check if all required fields are filled
    const hasCustomer = customerSelect.value;
    const hasLocation = locationInfo.dataset.lat || document.getElementById('manual-location-input');
    const hasPhoto = e.target.files && e.target.files.length > 0;

    if (hasCustomer && hasLocation && hasPhoto) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  });

  // Form submission
  document.getElementById('checkin-form').addEventListener('submit', handleCheckIn);
}

function showManualLocationOption() {
  const locationDiv = document.querySelector('#map').parentElement;
  
  // Check if manual option already exists
  if (document.getElementById('manual-location-section')) return;
  
  const manualSection = document.createElement('div');
  manualSection.id = 'manual-location-section';
  manualSection.innerHTML = `
    <div class="alert alert-warning mt-sm">
      <strong>⚠️ GPS Tidak Tersedia</strong>
      <p>Gunakan opsi manual di bawah ini untuk melanjutkan check-in:</p>
      
      <div class="form-group mt-sm">
        <label class="form-label">Lokasi Manual *</label>
        <input 
          type="text" 
          id="manual-location-input" 
          class="form-input" 
          placeholder="Contoh: Jl. Sudirman No. 123, Jakarta"
          required
        >
        <small class="text-muted">Masukkan alamat lengkap lokasi Anda saat ini</small>
      </div>
      
      <button type="button" class="btn btn-outline btn-small" id="confirm-manual-location">
        <span>✅</span>
        <span>Konfirmasi Lokasi Manual</span>
      </button>
    </div>
  `;
  
  locationDiv.appendChild(manualSection);
  
  // Add event listener for manual location
  document.getElementById('confirm-manual-location').addEventListener('click', () => {
    const manualInput = document.getElementById('manual-location-input');
    const locationInfo = document.getElementById('location-info');
    
    if (!manualInput.value.trim()) {
      showNotification('Mohon masukkan alamat lokasi', 'warning');
      return;
    }
    
    // Set manual location data
    locationInfo.textContent = `📍 ${manualInput.value.trim()} (Manual)`;
    locationInfo.dataset.lat = '0'; // Dummy coordinates for manual
    locationInfo.dataset.lng = '0';
    locationInfo.dataset.manual = 'true';
    locationInfo.dataset.address = manualInput.value.trim();
    
    // Enable submit if other requirements are met
    const customerSelect = document.getElementById('customer');
    const photoInput = document.getElementById('checkin-photo');
    const submitBtn = document.getElementById('submit-btn');
    
    if (customerSelect.value && photoInput.files && photoInput.files.length > 0) {
      submitBtn.disabled = false;
    }
    
    showNotification('Lokasi manual berhasil dikonfirmasi', 'success');
    
    // Hide manual section
    manualSection.style.display = 'none';
  });
}

async function handleCheckIn(e) {
  e.preventDefault();

  const customerId = document.getElementById('customer').value;
  const notes = document.getElementById('notes').value.trim();
  const photoInput = document.getElementById('checkin-photo');
  const photoFile = photoInput.files[0];
  const locationInfo = document.getElementById('location-info');
  const user = state.getState('user');

  // Check for manual location
  const isManualLocation = locationInfo.dataset.manual === 'true';
  const manualAddress = locationInfo.dataset.address;

  if (!isManualLocation && (!locationInfo.dataset.lat || !locationInfo.dataset.lng)) {
    showNotification('Harap dapatkan lokasi Anda terlebih dahulu', 'warning');
    return;
  }

  if (!photoFile) {
    showNotification('Mohon ambil foto selfie untuk absen', 'warning');
    return;
  }

  showLoading('Memproses check in...');

  try {
    // 1. Upload Photo
    const { data: photoUrl, error: uploadError } = await db.uploadVisitEvidence(photoFile);
    if (uploadError) throw new Error('Gagal upload foto: ' + uploadError.message);

    // 2. Prepare Data
    const attendanceData = {
      employee_id: user.id,
      customer_id: customerId,
      check_in_time: new Date().toISOString(),
      notes: notes || null,
      photo_url: photoUrl,
    };

    // Add location data based on type
    if (isManualLocation) {
      attendanceData.check_in_latitude = 0; // Dummy coordinates
      attendanceData.check_in_longitude = 0;
      attendanceData.manual_location = manualAddress;
      attendanceData.notes = (notes ? notes + '\n\n' : '') + `📍 Lokasi Manual: ${manualAddress}`;
    } else {
      attendanceData.check_in_latitude = parseFloat(locationInfo.dataset.lat);
      attendanceData.check_in_longitude = parseFloat(locationInfo.dataset.lng);
    }

    const { data, error } = await db.checkIn(attendanceData);

    if (error) throw error;

    hideLoading();
    
    if (isManualLocation) {
      showNotification('Check in berhasil dengan lokasi manual! ✅', 'success');
    } else {
      showNotification('Check in berhasil! ✅', 'success');
    }

    // Navigate to dashboard
    setTimeout(() => {
      window.location.hash = '#dashboard';
    }, 1500);
  } catch (error) {
    hideLoading();
    console.error('Check in error:', error);
    showNotification('Gagal melakukan check in: ' + error.message, 'danger');
  }
}

import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { geo, showNotification, showLoading, hideLoading } from '../utils/helpers.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
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

    select.innerHTML = `
      <option value="">-- Pilih Pelanggan --</option>
      ${customers.map(c => `
        <option value="${c.id}" data-lat="${c.latitude}" data-lng="${c.longitude}">
          ${c.name} - ${c.address}
        </option>
      `).join('')}
    `;
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

    // Enable submit if customer is selected
    if (document.getElementById('customer').value) {
      submitBtn.disabled = false;
      calculateDistance();
    }

    showNotification('Lokasi berhasil terdeteksi', 'success');
  } catch (error) {
    locationInfo.textContent = '❌ ' + error.message;
    btn.innerHTML = '<span>🔄</span><span>Coba Lagi</span>';
    btn.disabled = false;
    showNotification(error.message, 'danger');
  }
}

function calculateDistance() {
  const customerSelect = document.getElementById('customer');
  const selectedOption = customerSelect.options[customerSelect.selectedIndex];
  const locationInfo = document.getElementById('location-info');
  const distanceInfo = document.getElementById('distance-info');
  const distanceText = document.getElementById('distance-text');

  if (!selectedOption.value || !locationInfo.dataset.lat) {
    distanceInfo.classList.add('hidden');
    return;
  }

  const customerLat = parseFloat(selectedOption.dataset.lat);
  const customerLng = parseFloat(selectedOption.dataset.lng);
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
  }).addTo(map).bindPopup(`<strong>Lokasi Pelanggan</strong><br>${selectedOption.text}`).openPopup();

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

    if (e.target.value && locationInfo.dataset.lat) {
      submitBtn.disabled = false;
      calculateDistance();
    } else {
      submitBtn.disabled = true;
    }
  });

  // Form submission
  document.getElementById('checkin-form').addEventListener('submit', handleCheckIn);
}

async function handleCheckIn(e) {
  e.preventDefault();

  const customerId = document.getElementById('customer').value;
  const notes = document.getElementById('notes').value.trim();
  const locationInfo = document.getElementById('location-info');
  const user = state.getState('user');

  if (!locationInfo.dataset.lat || !locationInfo.dataset.lng) {
    showNotification('Harap dapatkan lokasi Anda terlebih dahulu', 'warning');
    return;
  }

  showLoading('Memproses check in...');

  try {
    const attendanceData = {
      employee_id: user.id,
      customer_id: customerId,
      check_in_time: new Date().toISOString(),
      check_in_latitude: parseFloat(locationInfo.dataset.lat),
      check_in_longitude: parseFloat(locationInfo.dataset.lng),
      notes: notes || null,
    };

    const { data, error } = await db.checkIn(attendanceData);

    if (error) throw error;

    hideLoading();
    showNotification('Check in berhasil! ✅', 'success');

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

// About Page - Application Information and Manual Update
// Provides app info, version details, and manual update options

import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import { versionManager } from '../utils/version.js';
import { notificationManager } from '../utils/notification-manager.js';
import { clearAppCache, checkForUpdates } from '../utils/pwa-update-manager.js';

export async function renderAboutPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page pb-nav">
      <div class="container">
        <h1 class="mb-lg">📱 Tentang Aplikasi</h1>
        
        <!-- App Info Card -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3>🏢 Informasi Aplikasi</h3>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Nama Aplikasi:</span>
                <span class="info-value">SKRM - Sistem Kunjungan & Riwayat Medis</span>
              </div>
              <div class="info-item">
                <span class="info-label">Versi Saat Ini:</span>
                <span class="info-value" id="current-version">${versionManager.getCleanVersion()}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Terakhir Update:</span>
                <span class="info-value" id="last-update">Memeriksa...</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status PWA:</span>
                <span class="info-value" id="pwa-status">Memeriksa...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Update Section -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3>🔄 Update Aplikasi</h3>
          </div>
          <div class="card-body">
            <div id="update-status" class="mb-3">
              <div class="loading-indicator">
                <span>🔍</span>
                <span>Memeriksa update...</span>
              </div>
            </div>
            
            <div class="update-actions" style="display: none;">
              <button id="check-update-btn" class="btn btn-outline mb-2">
                <span>🔍</span>
                <span>Periksa Update</span>
              </button>
              
              <button id="force-update-btn" class="btn btn-primary mb-2">
                <span>🚀</span>
                <span>Update Sekarang</span>
              </button>
              
              <button id="clear-cache-btn" class="btn btn-outline mb-2">
                <span>🧹</span>
                <span>Bersihkan Cache</span>
              </button>
              
              <button id="reinstall-pwa-btn" class="btn btn-outline">
                <span>📱</span>
                <span>Install Ulang PWA</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Features Section -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3>✨ Fitur Terbaru</h3>
          </div>
          <div class="card-body">
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">🛒</span>
                <div class="feature-content">
                  <h4>Quick Order dari Katalog</h4>
                  <p>Buat pesanan langsung dari katalog produk dengan keranjang belanja interaktif</p>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📱</span>
                <div class="feature-content">
                  <h4>Mobile Optimization</h4>
                  <p>Optimasi khusus untuk penggunaan mobile dengan touch controls</p>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔄</span>
                <div class="feature-content">
                  <h4>Offline Support</h4>
                  <p>Dapat bekerja tanpa koneksi internet dengan sinkronisasi otomatis</p>
                </div>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔒</span>
                <div class="feature-content">
                  <h4>Enhanced Security</h4>
                  <p>Validasi keamanan dan session management yang lebih baik</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Info -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3>⚙️ Informasi Sistem</h3>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Browser:</span>
                <span class="info-value" id="browser-info">Mendeteksi...</span>
              </div>
              <div class="info-item">
                <span class="info-label">Platform:</span>
                <span class="info-value" id="platform-info">Mendeteksi...</span>
              </div>
              <div class="info-item">
                <span class="info-label">Koneksi:</span>
                <span class="info-value" id="connection-info">Memeriksa...</span>
              </div>
              <div class="info-item">
                <span class="info-label">Cache Status:</span>
                <span class="info-value" id="cache-info">Memeriksa...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Support Section -->
        <div class="card">
          <div class="card-header">
            <h3>📞 Dukungan</h3>
          </div>
          <div class="card-body">
            <p class="mb-3">Jika mengalami masalah dengan aplikasi:</p>
            <div class="support-actions">
              <button id="report-issue-btn" class="btn btn-outline mb-2">
                <span>🐛</span>
                <span>Laporkan Masalah</span>
              </button>
              <button id="reset-app-btn" class="btn btn-danger">
                <span>🔄</span>
                <span>Reset Aplikasi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${renderBottomNav()}

    <style>
      .info-grid {
        display: grid;
        gap: 1rem;
      }
      
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border-light);
      }
      
      .info-item:last-child {
        border-bottom: none;
      }
      
      .info-label {
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .info-value {
        color: var(--text-muted);
        text-align: right;
        max-width: 60%;
        word-break: break-word;
      }
      
      .loading-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-muted);
        font-style: italic;
      }
      
      .update-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .feature-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-secondary);
        border-radius: 8px;
      }
      
      .feature-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }
      
      .feature-content h4 {
        margin: 0 0 0.5rem 0;
        color: var(--text-primary);
        font-size: 1rem;
      }
      
      .feature-content p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.4;
      }
      
      .support-actions {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      
      @media (min-width: 640px) {
        .update-actions,
        .support-actions {
          flex-direction: row;
          flex-wrap: wrap;
        }
        
        .update-actions button,
        .support-actions button {
          flex: 1;
          min-width: 200px;
        }
      }
    </style>
  `;

  // Initialize page functionality
  await initializeAboutPage();
}

async function initializeAboutPage() {
  // Check system information
  updateSystemInfo();
  
  // Check update status
  await checkUpdateStatus();
  
  // Setup event listeners
  setupEventListeners();
}

function updateSystemInfo() {
  // Browser info
  const browserInfo = `${navigator.userAgent.split(' ').pop()} ${navigator.platform}`;
  document.getElementById('browser-info').textContent = browserInfo.substring(0, 50) + '...';
  
  // Platform info
  document.getElementById('platform-info').textContent = navigator.platform;
  
  // Connection info
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const connectionInfo = connection ? 
    `${connection.effectiveType || 'Unknown'} (${connection.downlink || 'Unknown'}Mbps)` : 
    'Unknown';
  document.getElementById('connection-info').textContent = connectionInfo;
  
  // PWA status
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone === true;
  document.getElementById('pwa-status').textContent = isPWA ? '✅ Terinstall' : '❌ Belum Terinstall';
  
  // Last update time
  const lastUpdate = localStorage.getItem('app_last_update') || 'Tidak diketahui';
  document.getElementById('last-update').textContent = lastUpdate;
}

async function checkUpdateStatus() {
  const statusElement = document.getElementById('update-status');
  const actionsElement = document.querySelector('.update-actions');
  
  try {
    // Check for version updates
    const updateCheck = versionManager.checkForUpdate();
    
    if (updateCheck.hasUpdate) {
      statusElement.innerHTML = `
        <div style="color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
          <span>🎉</span>
          <span>Update tersedia: v${updateCheck.oldVersion} → v${updateCheck.newVersion}</span>
        </div>
      `;
    } else {
      statusElement.innerHTML = `
        <div style="color: var(--success); display: flex; align-items: center; gap: 0.5rem;">
          <span>✅</span>
          <span>Aplikasi sudah versi terbaru</span>
        </div>
      `;
    }
    
    // Check cache status
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      document.getElementById('cache-info').textContent = `${cacheNames.length} cache tersimpan`;
    } else {
      document.getElementById('cache-info').textContent = 'Cache tidak didukung';
    }
    
  } catch (error) {
    statusElement.innerHTML = `
      <div style="color: var(--danger); display: flex; align-items: center; gap: 0.5rem;">
        <span>❌</span>
        <span>Gagal memeriksa update: ${error.message}</span>
      </div>
    `;
  }
  
  // Show action buttons
  actionsElement.style.display = 'flex';
}

function setupEventListeners() {
  // Check update button
  document.getElementById('check-update-btn').addEventListener('click', async () => {
    const btn = document.getElementById('check-update-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span>⏳</span><span>Memeriksa...</span>';
    btn.disabled = true;
    
    try {
      await checkForUpdates();
      await checkUpdateStatus();
      showNotification('✅ Pemeriksaan update selesai', 'success');
    } catch (error) {
      showNotification('❌ Gagal memeriksa update: ' + error.message, 'danger');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
  
  // Force update button
  document.getElementById('force-update-btn').addEventListener('click', () => {
    if (confirm('Yakin ingin memperbarui aplikasi sekarang? Aplikasi akan dimuat ulang.')) {
      // Clear dismissed update flags
      localStorage.removeItem('update_dismissed');
      localStorage.removeItem('last_notification_time');
      
      // Set last update time
      localStorage.setItem('app_last_update', new Date().toLocaleString('id-ID'));
      
      // Show update notification
      const updateCheck = versionManager.checkForUpdate();
      if (updateCheck.hasUpdate) {
        versionManager.showUpdateNotification();
      } else {
        // Force reload even if no version change detected
        window.location.reload();
      }
    }
  });
  
  // Clear cache button
  document.getElementById('clear-cache-btn').addEventListener('click', async () => {
    if (confirm('Yakin ingin membersihkan cache? Ini akan menghapus data offline.')) {
      const btn = document.getElementById('clear-cache-btn');
      const originalText = btn.innerHTML;
      
      btn.innerHTML = '<span>⏳</span><span>Membersihkan...</span>';
      btn.disabled = true;
      
      try {
        await clearAppCache();
        showNotification('✅ Cache berhasil dibersihkan', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        showNotification('❌ Gagal membersihkan cache: ' + error.message, 'danger');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  });
  
  // Reinstall PWA button
  document.getElementById('reinstall-pwa-btn').addEventListener('click', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
        
        showNotification('🔄 PWA akan diinstall ulang saat reload', 'info');
        setTimeout(() => window.location.reload(), 2000);
      });
    } else {
      showNotification('❌ Service Worker tidak didukung', 'danger');
    }
  });
  
  // Report issue button
  document.getElementById('report-issue-btn').addEventListener('click', () => {
    const systemInfo = {
      version: versionManager.getCurrentVersion(),
      browser: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    };
    
    const reportData = encodeURIComponent(JSON.stringify(systemInfo, null, 2));
    const subject = encodeURIComponent('SKRM - Laporan Masalah');
    const body = encodeURIComponent(`Deskripsi masalah:
[Jelaskan masalah yang dialami]

Informasi Sistem:
${JSON.stringify(systemInfo, null, 2)}`);
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  });
  
  // Reset app button
  document.getElementById('reset-app-btn').addEventListener('click', () => {
    if (confirm('PERINGATAN: Ini akan menghapus semua data lokal dan logout. Yakin ingin melanjutkan?')) {
      if (confirm('Konfirmasi sekali lagi: Semua data offline akan hilang!')) {
        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all caches
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        
        // Unregister service worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => registration.unregister());
          });
        }
        
        showNotification('🔄 Aplikasi akan direset...', 'info');
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 2000);
      }
    }
  });
}

// Helper function for notifications
function showNotification(message, type = 'info') {
  // Create simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
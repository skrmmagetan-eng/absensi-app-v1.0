/**
 * 🚀 PWA Update Manager
 * Mengelola update aplikasi PWA dengan pembersihan cache otomatis
 */

// PWA Update Manager Class
export class PWAUpdateManager {
  constructor(registration) {
    this.registration = registration;
    this.updateAvailable = false;
    this.waitingWorker = null;
  }

  init() {
    // Auto-check for updates on app focus
    window.addEventListener('focus', () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 App focused, checking for updates...');
        this.registration.update();
      }
    });

    // Check for updates on page load
    this.checkForUpdates();
  }

  async checkForUpdates() {
    try {
      await this.registration.update();
      console.log('✅ Update check completed');
    } catch (error) {
      console.error('❌ Update check failed:', error);
    }
  }

  showUpdateAvailable(worker = null) {
    if (this.updateAvailable) return; // Prevent multiple notifications
    
    this.updateAvailable = true;
    this.waitingWorker = worker;

    // Create update notification
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 90vw;
        text-align: center;
        animation: slideInDown 0.5s ease-out;
      ">
        <div style="display: flex; align-items: center; gap: 12px; justify-content: center;">
          <span style="font-size: 24px;">🚀</span>
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">Update Tersedia!</div>
            <div style="font-size: 14px; opacity: 0.9;">Versi baru aplikasi siap digunakan</div>
          </div>
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: center;">
          <button id="update-now-btn" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Update Sekarang</button>
          <button id="update-later-btn" style="
            background: transparent;
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Nanti Saja</button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Add animation styles
    if (!document.getElementById('pwa-update-styles')) {
      const styles = document.createElement('style');
      styles.id = 'pwa-update-styles';
      styles.textContent = `
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes slideOutUp {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
        }
      `;
      document.head.appendChild(styles);
    }

    // Event listeners
    document.getElementById('update-now-btn').addEventListener('click', () => {
      this.applyUpdate();
    });

    document.getElementById('update-later-btn').addEventListener('click', () => {
      this.dismissUpdate();
    });

    // HAPUS AUTO-DISMISS - Biarkan user yang memutuskan
    // setTimeout(() => {
    //   if (document.getElementById('pwa-update-notification')) {
    //     this.dismissUpdate();
    //   }
    // }, 30000);
  }

  async applyUpdate() {
    console.log('🔄 Applying PWA update...');
    
    // Show step-by-step progress
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
      // Step 1: Preparing update
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          z-index: 10000;
          max-width: 90vw;
          text-align: center;
        ">
          <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
            <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            <div><strong>Step 1/4:</strong> Mempersiapkan update...</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
            <div style="background: white; height: 100%; width: 25%; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }

    try {
      // Step 2: Clearing cache
      setTimeout(() => {
        if (notification) {
          notification.innerHTML = `
            <div style="
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px 24px;
              border-radius: 12px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              z-index: 10000;
              max-width: 90vw;
              text-align: center;
            ">
              <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
                <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
                <div><strong>Step 2/4:</strong> Membersihkan cache lama...</div>
              </div>
              <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                <div style="background: white; height: 100%; width: 50%; transition: width 0.3s ease;"></div>
              </div>
            </div>
          `;
        }
      }, 500);

      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // Step 3: Activating new version
      setTimeout(() => {
        if (notification) {
          notification.innerHTML = `
            <div style="
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px 24px;
              border-radius: 12px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              z-index: 10000;
              max-width: 90vw;
              text-align: center;
            ">
              <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
                <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
                <div><strong>Step 3/4:</strong> Mengaktifkan versi baru...</div>
              </div>
              <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                <div style="background: white; height: 100%; width: 75%; transition: width 0.3s ease;"></div>
              </div>
            </div>
          `;
        }
      }, 1500);

      // Tell service worker to skip waiting and activate
      if (this.waitingWorker) {
        this.waitingWorker.postMessage({ action: 'skipWaiting' });
      } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
      }

      // Step 4: Completing update
      setTimeout(() => {
        if (notification) {
          notification.innerHTML = `
            <div style="
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 20px 24px;
              border-radius: 12px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              z-index: 10000;
              max-width: 90vw;
              text-align: center;
            ">
              <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 24px;">✅</span>
                <div><strong>Step 4/4:</strong> Update selesai!</div>
              </div>
              <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                <div style="background: white; height: 100%; width: 100%; transition: width 0.3s ease;"></div>
              </div>
              <div style="margin-top: 16px; font-size: 14px; opacity: 0.9;">
                Aplikasi akan di-refresh dalam <span id="countdown">3</span> detik...
              </div>
              <div style="margin-top: 12px;">
                <button id="refresh-now-btn" style="
                  background: rgba(255,255,255,0.2);
                  border: 1px solid rgba(255,255,255,0.3);
                  color: white;
                  padding: 8px 16px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                ">Refresh Sekarang</button>
              </div>
            </div>
          `;

          // Add refresh now button functionality
          document.getElementById('refresh-now-btn').addEventListener('click', () => {
            window.location.reload(true);
          });

          // Countdown timer
          let countdown = 3;
          const countdownEl = document.getElementById('countdown');
          const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownEl) {
              countdownEl.textContent = countdown;
            }
            if (countdown <= 0) {
              clearInterval(countdownInterval);
              window.location.reload(true);
            }
          }, 1000);
        }
      }, 2500);

    } catch (error) {
      console.error('❌ Update failed:', error);
      
      // Show error with retry option
      if (notification) {
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            padding: 20px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 90vw;
            text-align: center;
          ">
            <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
              <span style="font-size: 24px;">❌</span>
              <div><strong>Update Gagal!</strong></div>
            </div>
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 16px;">
              ${error.message || 'Terjadi kesalahan saat update'}
            </div>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <button id="retry-update-btn" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              ">Coba Lagi</button>
              <button id="manual-refresh-btn" style="
                background: transparent;
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              ">Refresh Manual</button>
            </div>
          </div>
        `;

        // Add retry functionality
        document.getElementById('retry-update-btn').addEventListener('click', () => {
          this.applyUpdate();
        });

        document.getElementById('manual-refresh-btn').addEventListener('click', () => {
          window.location.reload(true);
        });
      }
    }
  }

  dismissUpdate() {
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
      // Show dismissal message with options
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
          color: white;
          padding: 20px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          z-index: 10000;
          max-width: 90vw;
          text-align: center;
        ">
          <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 12px;">
            <span style="font-size: 24px;">⏰</span>
            <div><strong>Update Ditunda</strong></div>
          </div>
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 16px;">
            Update akan tersedia lagi saat Anda refresh halaman atau restart aplikasi
          </div>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button id="update-later-ok-btn" style="
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">OK, Mengerti</button>
            <button id="update-now-later-btn" style="
              background: transparent;
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            ">Update Sekarang</button>
          </div>
        </div>
      `;

      // Add event listeners for new buttons
      document.getElementById('update-later-ok-btn').addEventListener('click', () => {
        notification.style.animation = 'slideOutUp 0.3s ease-in';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            notification.remove();
          }
        }, 300);
        this.updateAvailable = false;
      });

      document.getElementById('update-now-later-btn').addEventListener('click', () => {
        this.applyUpdate();
      });

      // Auto-close after 10 seconds with countdown
      let countdown = 10;
      const countdownInterval = setInterval(() => {
        const okBtn = document.getElementById('update-later-ok-btn');
        if (okBtn && countdown > 0) {
          okBtn.textContent = `OK, Mengerti (${countdown})`;
          countdown--;
        } else {
          clearInterval(countdownInterval);
          if (document.getElementById('pwa-update-notification')) {
            notification.style.animation = 'slideOutUp 0.3s ease-in';
            setTimeout(() => {
              if (document.body.contains(notification)) {
                notification.remove();
              }
            }, 300);
            this.updateAvailable = false;
          }
        }
      }, 1000);
    }
  }

  // Force clear all caches (for manual troubleshooting)
  async clearAllCaches() {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🧹 All caches cleared');
      
      // Also tell service worker to clear its caches
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'clearAllCaches' });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return false;
    }
  }
}

// Global functions for manual control
export const clearAppCache = async () => {
  const updateManager = new PWAUpdateManager(null);
  const success = await updateManager.clearAllCaches();
  if (success) {
    alert('✅ Cache berhasil dibersihkan! Aplikasi akan di-refresh.');
    window.location.reload(true);
  } else {
    alert('❌ Gagal membersihkan cache.');
  }
};

export const checkForUpdates = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('🔍 Manual update check triggered');
        await registration.update();
        alert('✅ Pengecekan update selesai. Jika ada update, notifikasi akan muncul.');
      }
    } catch (error) {
      console.error('❌ Manual update check failed:', error);
      alert('❌ Gagal memeriksa update.');
    }
  }
};
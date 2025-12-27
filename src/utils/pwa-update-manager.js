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

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (document.getElementById('pwa-update-notification')) {
        this.dismissUpdate();
      }
    }, 30000);
  }

  async applyUpdate() {
    console.log('🔄 Applying PWA update...');
    
    // Show loading
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
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
        ">
          <div style="display: flex; align-items: center; gap: 12px; justify-content: center;">
            <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            <div>Mengupdate aplikasi...</div>
          </div>
        </div>
      `;
    }

    try {
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

      // Tell service worker to skip waiting and activate
      if (this.waitingWorker) {
        this.waitingWorker.postMessage({ action: 'skipWaiting' });
      } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
      }

      // Force reload after a short delay
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);

    } catch (error) {
      console.error('❌ Update failed:', error);
      alert('Gagal mengupdate aplikasi. Silakan refresh manual.');
    }
  }

  dismissUpdate() {
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
      notification.style.animation = 'slideOutUp 0.3s ease-in';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
    this.updateAvailable = false;
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
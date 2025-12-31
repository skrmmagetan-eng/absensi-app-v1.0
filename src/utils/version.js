// Version Management and Update Notification System

const APP_VERSION = '2.2.0-quick-order-system'; // Added Quick Order from Catalog system
const VERSION_KEY = 'app_version';
const UPDATE_DISMISSED_KEY = 'update_dismissed';
const LAST_NOTIFICATION_KEY = 'last_notification_time';

export const versionManager = {
  getCurrentVersion() {
    return APP_VERSION;
  },

  getStoredVersion() {
    return localStorage.getItem(VERSION_KEY);
  },

  setStoredVersion(version) {
    localStorage.setItem(VERSION_KEY, version);
  },

  checkForUpdate() {
    const storedVersion = this.getStoredVersion();
    const currentVersion = this.getCurrentVersion();
    
    // First time user or version changed
    if (!storedVersion) {
      this.setStoredVersion(currentVersion);
      return { hasUpdate: false, isFirstTime: true };
    }

    if (storedVersion !== currentVersion) {
      return { hasUpdate: true, oldVersion: storedVersion, newVersion: currentVersion };
    }

    return { hasUpdate: false };
  },

  dismissUpdate() {
    localStorage.setItem(UPDATE_DISMISSED_KEY, this.getCurrentVersion());
    localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());
  },

  isUpdateDismissed() {
    return localStorage.getItem(UPDATE_DISMISSED_KEY) === this.getCurrentVersion();
  },

  shouldShowNotification() {
    const lastNotification = localStorage.getItem(LAST_NOTIFICATION_KEY);
    const now = Date.now();
    
    // Don't show notification if shown within last 5 minutes
    if (lastNotification && (now - parseInt(lastNotification)) < 5 * 60 * 1000) {
      return false;
    }
    
    return true;
  },

  showUpdateNotification() {
    const updateCheck = this.checkForUpdate();
    
    if (updateCheck.hasUpdate && !this.isUpdateDismissed() && this.shouldShowNotification()) {
      this.displayUpdateBanner(updateCheck.oldVersion, updateCheck.newVersion);
      localStorage.setItem(LAST_NOTIFICATION_KEY, Date.now().toString());
    }
  },

  displayUpdateBanner(oldVersion, newVersion) {
    // Remove existing banner if any
    const existingBanner = document.getElementById('update-banner');
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 16px;
        max-width: 90%;
        animation: slideDown 0.4s ease-out;
        backdrop-filter: blur(10px);
      ">
        <span style="font-size: 2rem;">🛒</span>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">Fitur Baru Tersedia!</div>
          <div style="font-size: 13px; opacity: 0.95; margin-bottom: 2px;">🚀 Quick Order dari Katalog</div>
          <div style="font-size: 11px; opacity: 0.8;">v${oldVersion} → v${newVersion}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="update-reload-btn" style="
            background: white;
            color: #667eea;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🚀 Update Sekarang
          </button>
          <button id="update-dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.6);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
            Nanti Saja
          </button>
        </div>
      </div>
      <style>
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -30px) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 1; transform: translate(-50%, 0) scale(1); }
          to { opacity: 0; transform: translate(-50%, -30px) scale(0.9); }
        }
      </style>
    `;

    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('update-reload-btn').addEventListener('click', () => {
      this.setStoredVersion(newVersion);
      localStorage.removeItem(UPDATE_DISMISSED_KEY);
      localStorage.removeItem(LAST_NOTIFICATION_KEY);
      
      // Show loading indicator
      const btn = document.getElementById('update-reload-btn');
      btn.innerHTML = '⏳ Memuat...';
      btn.disabled = true;
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });

    document.getElementById('update-dismiss-btn').addEventListener('click', () => {
      this.dismissUpdate();
      banner.style.animation = 'slideUp 0.3s ease-in forwards';
      setTimeout(() => banner.remove(), 300);
    });

    // Auto dismiss after 25 seconds
    setTimeout(() => {
      if (document.getElementById('update-banner')) {
        this.dismissUpdate();
        banner.style.animation = 'slideUp 0.3s ease-in forwards';
        setTimeout(() => banner.remove(), 300);
      }
    }, 25000);
  },

  renderVersionFooter() {
    return `
      <div style="
        text-align: center;
        padding: 8px;
        font-size: 10px;
        color: var(--text-muted);
        opacity: 0.6;
        user-select: none;
      ">
        v${this.getCurrentVersion()}
      </div>
    `;
  }
};

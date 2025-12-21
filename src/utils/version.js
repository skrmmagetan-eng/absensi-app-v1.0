// Version Management and Update Notification System

const APP_VERSION = '1.2.2'; // Update this when releasing new version
const VERSION_KEY = 'app_version';
const UPDATE_DISMISSED_KEY = 'update_dismissed';

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
  },

  isUpdateDismissed() {
    return localStorage.getItem(UPDATE_DISMISSED_KEY) === this.getCurrentVersion();
  },

  showUpdateNotification() {
    const updateCheck = this.checkForUpdate();
    
    if (updateCheck.hasUpdate && !this.isUpdateDismissed()) {
      this.displayUpdateBanner(updateCheck.oldVersion, updateCheck.newVersion);
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
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 90%;
        animation: slideDown 0.3s ease-out;
      ">
        <span style="font-size: 1.5rem;">🎉</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px;">Aplikasi Diperbarui!</div>
          <div style="font-size: 12px; opacity: 0.9;">v${oldVersion} → v${newVersion}</div>
        </div>
        <button id="update-reload-btn" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
        ">Muat Ulang</button>
        <button id="update-dismiss-btn" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.5);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        ">Nanti</button>
      </div>
      <style>
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      </style>
    `;

    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('update-reload-btn').addEventListener('click', () => {
      this.setStoredVersion(newVersion);
      window.location.reload();
    });

    document.getElementById('update-dismiss-btn').addEventListener('click', () => {
      this.dismissUpdate();
      banner.remove();
    });

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      if (document.getElementById('update-banner')) {
        this.dismissUpdate();
        banner.remove();
      }
    }, 10000);
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

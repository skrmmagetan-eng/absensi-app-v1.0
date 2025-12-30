/**
 * 🔒 ACTIVITY-BASED SESSION MONITOR
 * Sistem keamanan yang lebih smart berdasarkan aktivitas user
 * Non-invasive - tidak mengubah core auth system
 */

class ActivityMonitor {
  constructor() {
    this.isActive = false;
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.lastActivity = Date.now();
    
    // Konfigurasi (dalam milidetik) - DIPERPANJANG UNTUK MENGURANGI GANGGUAN
    this.config = {
      inactivityTimeout: 2 * 60 * 60 * 1000,    // 2 JAM idle = logout (diperpanjang dari 30 menit)
      warningTime: 110 * 60 * 1000,             // 110 menit = show warning (10 menit sebelum logout)
      checkInterval: 5 * 60 * 1000,             // Cek setiap 5 menit (dikurangi frekuensi)
      debugMode: false                          // Set true untuk debugging
    };

    // Events yang dianggap sebagai aktivitas
    this.activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'blur'
    ];

    // Callback functions
    this.onLogout = null;
    this.onWarning = null;
    this.onActivityResume = null;

    // State tracking
    this.warningShown = false;
    this.isMonitoring = false;

    this.log('ActivityMonitor initialized');
  }

  /**
   * Mulai monitoring aktivitas user
   * @param {Object} callbacks - { onLogout, onWarning, onActivityResume }
   */
  start(callbacks = {}) {
    if (this.isMonitoring) {
      this.log('Already monitoring, stopping previous session');
      this.stop();
    }

    // Set callbacks
    this.onLogout = callbacks.onLogout || this.defaultLogout;
    this.onWarning = callbacks.onWarning || this.defaultWarning;
    this.onActivityResume = callbacks.onActivityResume || this.defaultActivityResume;

    // Bind activity listeners
    this.bindActivityListeners();

    // Start monitoring
    this.isMonitoring = true;
    this.isActive = true;
    this.resetTimer();

    this.log('Activity monitoring started', {
      inactivityTimeout: this.config.inactivityTimeout / 1000 / 60 + ' minutes',
      warningTime: this.config.warningTime / 1000 / 60 + ' minutes'
    });

    // TIDAK TAMPILKAN NOTIFIKASI STARTUP - MENGURANGI GANGGUAN
    // this.showStatusNotification('🔒 Keamanan aktif: Auto-logout setelah 2 jam tidak aktif', 'info');
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.unbindActivityListeners();
    this.clearTimers();
    this.isMonitoring = false;
    this.isActive = false;
    this.log('Activity monitoring stopped');
  }

  /**
   * Bind event listeners untuk deteksi aktivitas
   */
  bindActivityListeners() {
    this.activityHandler = this.handleActivity.bind(this);
    
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.activityHandler, true);
    });

    // Special handling untuk visibility change
    this.visibilityHandler = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Window focus/blur
    this.focusHandler = this.handleWindowFocus.bind(this);
    this.blurHandler = this.handleWindowBlur.bind(this);
    window.addEventListener('focus', this.focusHandler);
    window.addEventListener('blur', this.blurHandler);
  }

  /**
   * Unbind event listeners
   */
  unbindActivityListeners() {
    if (this.activityHandler) {
      this.activityEvents.forEach(event => {
        document.removeEventListener(event, this.activityHandler, true);
      });
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    if (this.focusHandler && this.blurHandler) {
      window.removeEventListener('focus', this.focusHandler);
      window.removeEventListener('blur', this.blurHandler);
    }
  }

  /**
   * Handle user activity
   */
  handleActivity(event) {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;

    // Throttle: hanya process jika sudah 5 detik sejak aktivitas terakhir (diperpanjang untuk mengurangi gangguan)
    if (timeSinceLastActivity < 5000) return;

    this.lastActivity = now;
    this.isActive = true;

    // Reset timer
    this.resetTimer();

    // Jika warning sedang ditampilkan, hide dan notify resume
    if (this.warningShown) {
      this.warningShown = false;
      this.hideWarning();
      if (this.onActivityResume) {
        this.onActivityResume();
      }
    }

    this.log('Activity detected', { 
      event: event.type, 
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000) + 's'
    });
  }

  /**
   * Handle visibility change (tab switch, minimize, etc)
   */
  handleVisibilityChange() {
    if (!this.isMonitoring) return;

    if (document.hidden) {
      this.log('Tab hidden - continuing timer');
      // Tidak stop timer, biarkan jalan terus
    } else {
      this.log('Tab visible - activity detected');
      this.handleActivity({ type: 'visibilitychange' });
    }
  }

  /**
   * Handle window focus
   */
  handleWindowFocus() {
    if (!this.isMonitoring) return;
    this.log('Window focused');
    this.handleActivity({ type: 'focus' });
  }

  /**
   * Handle window blur
   */
  handleWindowBlur() {
    if (!this.isMonitoring) return;
    this.log('Window blurred');
    // Tidak reset timer saat blur, biarkan timer jalan
  }

  /**
   * Reset inactivity timer
   */
  resetTimer() {
    this.clearTimers();

    // Set warning timer
    this.warningTimer = setTimeout(() => {
      this.showInactivityWarning();
    }, this.config.warningTime);

    // Set logout timer
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivityLogout();
    }, this.config.inactivityTimeout);

    this.log('Timer reset', {
      warningIn: Math.round(this.config.warningTime / 1000 / 60) + ' minutes',
      logoutIn: Math.round(this.config.inactivityTimeout / 1000 / 60) + ' minutes'
    });
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Show inactivity warning
   */
  showInactivityWarning() {
    if (!this.isMonitoring || this.warningShown) return;

    this.warningShown = true;
    this.log('Showing inactivity warning');

    if (this.onWarning) {
      this.onWarning();
    }
  }

  /**
   * Handle inactivity logout
   */
  handleInactivityLogout() {
    if (!this.isMonitoring) return;

    this.log('Inactivity timeout reached - logging out');
    this.stop(); // Stop monitoring first

    if (this.onLogout) {
      this.onLogout('inactivity');
    }
  }

  /**
   * Hide warning
   */
  hideWarning() {
    // Implementation akan ditambah di integration
    this.log('Hiding inactivity warning');
  }

  /**
   * Default logout handler
   */
  defaultLogout(reason = 'inactivity') {
    this.log('Default logout triggered', { reason });
    
    // Show logout message
    this.showStatusNotification(
      '🔒 Sesi berakhir: Tidak ada aktivitas selama 30 menit. Silakan login kembali.', 
      'warning'
    );

    // Redirect to login after delay
    setTimeout(() => {
      window.location.hash = '#login';
      window.location.reload();
    }, 3000);
  }

  /**
   * Default warning handler - LEBIH SUBTLE
   */
  defaultWarning() {
    this.log('Default warning triggered');
    
    // PERINGATAN YANG LEBIH HALUS - TIDAK MENGGUNAKAN ALERT
    this.showStatusNotification(
      '⚠️ Sesi akan berakhir dalam 10 menit jika tidak ada aktivitas', 
      'warning'
    );
  }

  /**
   * Default activity resume handler - LEBIH SUBTLE
   */
  defaultActivityResume() {
    this.log('Activity resumed');
    
    // TIDAK TAMPILKAN NOTIFIKASI RESUME - MENGURANGI GANGGUAN
    // this.showStatusNotification('✅ Aktivitas terdeteksi. Sesi dilanjutkan.', 'success');
  }

  /**
   * Show status notification
   */
  showStatusNotification(message, type = 'info') {
    // Try to use existing notification system
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
    } else {
      // Fallback to console and alert
      console.log(`[${type.toUpperCase()}] ${message}`);
      if (type === 'warning') {
        alert(message);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    const timeUntilWarning = Math.max(0, this.config.warningTime - timeSinceActivity);
    const timeUntilLogout = Math.max(0, this.config.inactivityTimeout - timeSinceActivity);

    return {
      isMonitoring: this.isMonitoring,
      isActive: this.isActive,
      warningShown: this.warningShown,
      lastActivity: new Date(this.lastActivity).toISOString(),
      timeSinceActivity: Math.round(timeSinceActivity / 1000),
      timeUntilWarning: Math.round(timeUntilWarning / 1000),
      timeUntilLogout: Math.round(timeUntilLogout / 1000)
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated', this.config);
    
    // Restart monitoring if active
    if (this.isMonitoring) {
      this.resetTimer();
    }
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.config.debugMode = enabled;
    this.log('Debug mode ' + (enabled ? 'enabled' : 'disabled'));
  }

  /**
   * Logging utility
   */
  log(message, data = null) {
    if (this.config.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`[ActivityMonitor ${timestamp}] ${message}`, data || '');
    }
  }
}

// Create singleton instance
export const activityMonitor = new ActivityMonitor();

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.activityMonitor = activityMonitor;
}

export default ActivityMonitor;
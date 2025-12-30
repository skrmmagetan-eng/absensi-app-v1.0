/**
 * 🔒 SESSION SECURITY INTEGRATION
 * Integrasi activity monitor dengan sistem auth yang ada
 * Safe integration tanpa mengubah core auth files
 */

import { activityMonitor } from './activity-monitor.js';
import { auth } from '../lib/supabase.js';
import { state } from '../lib/router.js';

class SessionSecurity {
  constructor() {
    this.isInitialized = false;
    this.warningModal = null;
    this.countdownInterval = null;
    this.originalLogout = null;
  }

  /**
   * Initialize session security
   * Call this after successful login
   */
  init() {
    if (this.isInitialized) {
      console.log('Session security already initialized');
      return;
    }

    // Check if user is logged in
    const user = state.getState('user');
    if (!user) {
      console.log('No user found, skipping session security init');
      return;
    }

    // Setup activity monitor with custom callbacks
    activityMonitor.start({
      onLogout: this.handleSecureLogout.bind(this),
      onWarning: this.showInactivityWarning.bind(this),
      onActivityResume: this.hideInactivityWarning.bind(this)
    });

    this.isInitialized = true;
    console.log('✅ Session security initialized for user:', user.email);

    // TIDAK TAMPILKAN NOTIFIKASI STARTUP - MENGURANGI GANGGUAN
    // this.showNotification('🔒 Keamanan sesi aktif: Auto-logout setelah 2 jam tidak aktif', 'info');
  }

  /**
   * Cleanup session security
   * Call this during logout
   */
  cleanup() {
    if (!this.isInitialized) return;

    activityMonitor.stop();
    this.hideInactivityWarning();
    this.isInitialized = false;
    
    console.log('Session security cleaned up');
  }

  /**
   * Handle secure logout
   */
  async handleSecureLogout(reason = 'inactivity') {
    console.log('🔒 Secure logout triggered:', reason);

    try {
      // Show logout message
      this.showNotification(
        '🔒 Sesi berakhir: Tidak ada aktivitas selama 30 menit. Mengamankan data...', 
        'warning'
      );

      // Cleanup first
      this.cleanup();

      // Clear application state
      state.reset();

      // Clear any cached data
      this.clearCachedData();

      // Logout from Supabase
      await auth.signOut();

      // Show final message
      setTimeout(() => {
        this.showNotification(
          '✅ Data berhasil diamankan. Silakan login kembali.', 
          'success'
        );
      }, 1000);

      // Redirect to login
      setTimeout(() => {
        window.location.hash = '#login';
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Error during secure logout:', error);
      
      // Force redirect even if logout fails
      setTimeout(() => {
        window.location.hash = '#login';
        window.location.reload();
      }, 2000);
    }
  }

  /**
   * Show inactivity warning modal
   */
  showInactivityWarning() {
    if (this.warningModal) return; // Already showing

    console.log('Showing inactivity warning modal');

    // Create warning modal
    this.warningModal = this.createWarningModal();
    document.body.appendChild(this.warningModal);

    // Start countdown
    this.startWarningCountdown();

    // Focus on modal for accessibility
    const continueBtn = this.warningModal.querySelector('#continue-session-btn');
    if (continueBtn) {
      continueBtn.focus();
    }
  }

  /**
   * Hide inactivity warning modal
   */
  hideInactivityWarning() {
    if (!this.warningModal) return;

    console.log('Hiding inactivity warning modal');

    // Clear countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    // Remove modal
    document.body.removeChild(this.warningModal);
    this.warningModal = null;
  }

  /**
   * Create warning modal HTML
   */
  createWarningModal() {
    const modal = document.createElement('div');
    modal.className = 'session-warning-overlay';
    modal.innerHTML = `
      <div class="session-warning-modal">
        <div class="session-warning-header">
          <div class="session-warning-icon">⚠️</div>
          <h3>Peringatan Keamanan Sesi</h3>
        </div>
        
        <div class="session-warning-body">
          <p>Sesi Anda akan berakhir dalam <strong id="countdown-timer">10:00</strong> karena tidak ada aktivitas.</p>
          <p>Klik "Lanjutkan Sesi" untuk melanjutkan bekerja.</p>
        </div>
        
        <div class="session-warning-footer">
          <button id="continue-session-btn" class="btn btn-primary">
            🔄 Lanjutkan Sesi
          </button>
          <button id="logout-now-btn" class="btn btn-outline">
            🚪 Logout Sekarang
          </button>
        </div>
      </div>
    `;

    // Add styles
    this.addWarningModalStyles();

    // Add event listeners
    const continueBtn = modal.querySelector('#continue-session-btn');
    const logoutBtn = modal.querySelector('#logout-now-btn');

    continueBtn.addEventListener('click', () => {
      this.hideInactivityWarning();
      // Trigger activity to reset timer
      document.dispatchEvent(new Event('click'));
    });

    logoutBtn.addEventListener('click', () => {
      this.handleSecureLogout('manual');
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideInactivityWarning();
        document.dispatchEvent(new Event('click'));
      }
    });

    return modal;
  }

  /**
   * Start countdown timer in warning modal
   */
  startWarningCountdown() {
    let timeLeft = 10 * 60; // 10 minutes in seconds (diperpanjang dari 5 menit)

    this.countdownInterval = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const timer = document.getElementById('countdown-timer');
      if (timer) {
        timer.textContent = display;
        
        // Change color as time runs out
        if (timeLeft <= 60) {
          timer.style.color = '#dc3545'; // Red
        } else if (timeLeft <= 120) {
          timer.style.color = '#fd7e14'; // Orange
        }
      }

      timeLeft--;

      if (timeLeft < 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    }, 1000);
  }

  /**
   * Add CSS styles for warning modal
   */
  addWarningModalStyles() {
    if (document.getElementById('session-warning-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'session-warning-styles';
    styles.textContent = `
      .session-warning-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      }

      .session-warning-modal {
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 480px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: sessionWarningSlideIn 0.3s ease-out;
      }

      @keyframes sessionWarningSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .session-warning-header {
        padding: 24px 24px 16px;
        text-align: center;
        border-bottom: 1px solid #e9ecef;
      }

      .session-warning-icon {
        font-size: 3rem;
        margin-bottom: 12px;
      }

      .session-warning-header h3 {
        margin: 0;
        color: #495057;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .session-warning-body {
        padding: 24px;
        text-align: center;
      }

      .session-warning-body p {
        margin: 0 0 16px 0;
        color: #6c757d;
        line-height: 1.5;
      }

      .session-warning-body p:last-child {
        margin-bottom: 0;
      }

      #countdown-timer {
        color: #dc3545;
        font-weight: 700;
        font-size: 1.1em;
      }

      .session-warning-footer {
        padding: 16px 24px 24px;
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .session-warning-footer .btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }

      .session-warning-footer .btn-primary {
        background: #007bff;
        color: white;
      }

      .session-warning-footer .btn-primary:hover {
        background: #0056b3;
        transform: translateY(-1px);
      }

      .session-warning-footer .btn-outline {
        background: transparent;
        color: #6c757d;
        border: 1px solid #dee2e6;
      }

      .session-warning-footer .btn-outline:hover {
        background: #f8f9fa;
        border-color: #adb5bd;
      }

      @media (max-width: 480px) {
        .session-warning-footer {
          flex-direction: column;
        }
        
        .session-warning-footer .btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Clear cached data for security
   */
  clearCachedData() {
    try {
      // Clear localStorage except for essential items
      const keysToKeep = ['auth_cache']; // Keep remember me if user wants it
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();

      console.log('Cached data cleared for security');
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  }

  /**
   * Show notification (try to use existing system)
   */
  showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get current session status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activityMonitor: activityMonitor.getStatus(),
      warningShown: !!this.warningModal
    };
  }

  /**
   * Update security configuration
   */
  updateConfig(config) {
    activityMonitor.updateConfig(config);
  }

  /**
   * Manual session extension (for testing)
   */
  extendSession() {
    if (this.isInitialized) {
      document.dispatchEvent(new Event('click'));
      this.showNotification('✅ Sesi diperpanjang secara manual', 'success');
    }
  }
}

// Create singleton instance
export const sessionSecurity = new SessionSecurity();

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.sessionSecurity = sessionSecurity;
}

export default SessionSecurity;
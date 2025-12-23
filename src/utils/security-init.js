/**
 * 🔒 SECURITY AUTO-INITIALIZATION
 * Otomatis mengaktifkan session security setelah login berhasil
 * Non-invasive integration dengan sistem yang ada
 */

import { sessionSecurity } from './session-security.js';
import { state } from '../lib/router.js';

class SecurityInitializer {
  constructor() {
    this.isWatching = false;
    this.initAttempts = 0;
    this.maxInitAttempts = 10;
  }

  /**
   * Start watching for successful login
   */
  startWatching() {
    if (this.isWatching) return;

    this.isWatching = true;
    console.log('🔒 Security initializer started watching for login');

    // Method 1: Watch state changes
    this.watchStateChanges();

    // Method 2: Periodic check for logged in user
    this.startPeriodicCheck();

    // Method 3: Listen for hash changes (navigation)
    this.watchNavigationChanges();
  }

  /**
   * Stop watching
   */
  stopWatching() {
    this.isWatching = false;
    
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
      this.stateUnsubscribe = null;
    }

    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }

    if (this.hashChangeHandler) {
      window.removeEventListener('hashchange', this.hashChangeHandler);
      this.hashChangeHandler = null;
    }

    console.log('Security initializer stopped watching');
  }

  /**
   * Watch for state changes
   */
  watchStateChanges() {
    // Subscribe to user state changes
    this.stateUnsubscribe = state.subscribe('user', (user) => {
      if (user && user.id) {
        console.log('🔒 User login detected via state change:', user.email);
        this.attemptSecurityInit();
      } else {
        console.log('🔒 User logout detected via state change');
        sessionSecurity.cleanup();
      }
    });

    // Subscribe to authentication state changes
    state.subscribe('isAuthenticated', (isAuth) => {
      if (isAuth) {
        console.log('🔒 Authentication confirmed via state change');
        this.attemptSecurityInit();
      }
    });
  }

  /**
   * Periodic check for logged in user
   */
  startPeriodicCheck() {
    this.periodicCheckInterval = setInterval(() => {
      if (!this.isWatching) return;

      const user = state.getState('user');
      const isAuthenticated = state.getState('isAuthenticated');

      if (user && user.id && !sessionSecurity.isInitialized) {
        console.log('🔒 User found via periodic check:', user.email);
        this.attemptSecurityInit();
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Watch for navigation changes
   */
  watchNavigationChanges() {
    this.hashChangeHandler = () => {
      if (!this.isWatching) return;

      const hash = window.location.hash.replace('#', '');
      
      // If navigating away from login, check if user is logged in
      if (hash !== 'login' && hash !== '') {
        setTimeout(() => {
          const user = state.getState('user');
          if (user && user.id && !sessionSecurity.isInitialized) {
            console.log('🔒 User found via navigation change to:', hash);
            this.attemptSecurityInit();
          }
        }, 1000); // Wait for page to load
      }
    };

    window.addEventListener('hashchange', this.hashChangeHandler);
  }

  /**
   * Attempt to initialize security
   */
  attemptSecurityInit() {
    if (sessionSecurity.isInitialized) {
      console.log('🔒 Security already initialized, skipping');
      return;
    }

    this.initAttempts++;
    
    if (this.initAttempts > this.maxInitAttempts) {
      console.warn('🔒 Max security init attempts reached, stopping');
      return;
    }

    const user = state.getState('user');
    const profile = state.getState('profile');

    if (!user || !user.id) {
      console.log('🔒 No user found, delaying security init');
      setTimeout(() => this.attemptSecurityInit(), 1000);
      return;
    }

    // Check if we're on login page (don't init security on login page)
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash === 'login') {
      console.log('🔒 Still on login page, delaying security init');
      setTimeout(() => this.attemptSecurityInit(), 2000);
      return;
    }

    try {
      console.log('🔒 Initializing session security for user:', user.email);
      sessionSecurity.init();
      
      // Reset attempt counter on success
      this.initAttempts = 0;
      
      console.log('✅ Session security successfully initialized');
    } catch (error) {
      console.error('❌ Failed to initialize session security:', error);
      
      // Retry after delay
      setTimeout(() => this.attemptSecurityInit(), 3000);
    }
  }

  /**
   * Force initialization (for manual testing)
   */
  forceInit() {
    console.log('🔒 Force initializing session security');
    this.initAttempts = 0;
    this.attemptSecurityInit();
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      initAttempts: this.initAttempts,
      maxInitAttempts: this.maxInitAttempts,
      securityInitialized: sessionSecurity.isInitialized,
      currentUser: state.getState('user')?.email || 'none',
      currentHash: window.location.hash.replace('#', '') || 'root'
    };
  }
}

// Create singleton instance
export const securityInitializer = new SecurityInitializer();

// Auto-start watching when module loads
securityInitializer.startWatching();

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.securityInitializer = securityInitializer;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  securityInitializer.stopWatching();
  sessionSecurity.cleanup();
});

export default SecurityInitializer;
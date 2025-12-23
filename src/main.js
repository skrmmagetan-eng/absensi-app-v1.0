import { auth, db } from './lib/supabase.js';
import { router, state } from './lib/router.js';
import { themeManager } from './utils/theme.js';
import { versionManager } from './utils/version.js';
import { authChecker } from './utils/auth-check.js';

// Initialize Theme
themeManager.init();
import { renderLoginPage } from './pages/login.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderCheckInPage } from './pages/checkin.js';
import { renderCustomersPage, renderAddCustomerPage } from './pages/customers.js';
import { renderOrderPage, renderCreateOrderPage } from './pages/orders.js';
import { renderAdminDashboard } from './pages/admin.js';
import { showLoading, hideLoading } from './utils/helpers.js';
import { setupNavigationEvents } from './components/navigation.js';

import { renderAdminSettingsPage } from './pages/admin-settings.js';
import { renderAdminEmployeesPage } from './pages/admin-employees.js';
import { renderAdminCatalogPage } from './pages/admin-catalog.js';
import { renderAdminOrdersPage } from './pages/admin-orders.js';
import { renderCatalogPage } from './pages/catalog.js';
import { renderHistoryPage } from './pages/history.js';
import { renderAdminHistoryPage } from './pages/admin-history.js';
import { renderTargetsPage } from './pages/targets.js';
import { renderAdminTargetsPage } from './pages/admin-targets.js';

// Security Configuration
const SECURITY_CONFIG = {
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  VISIBILITY_TIMEOUT: 5 * 60 * 1000, // 5 minutes when tab is hidden
};

// Security Manager
class SecurityManager {
  constructor() {
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.visibilityTimer = null;
    this.inactivityTimer = null;
    this.isTabVisible = true;
    this.wasAppClosed = false;
    
    this.init();
  }

  init() {
    // Check if app was properly closed (no session token)
    this.checkAppClosure();
    
    // Set up session tracking
    this.startSession();
    
    // Set up visibility change detection
    this.setupVisibilityTracking();
    
    // Set up activity tracking
    this.setupActivityTracking();
    
    // Set up beforeunload detection
    this.setupBeforeUnloadTracking();
    
    // Set up periodic security checks
    this.setupPeriodicChecks();
  }

  checkAppClosure() {
    const sessionToken = sessionStorage.getItem('app_session_active');
    const lastCloseTime = localStorage.getItem('app_last_close_time');
    
    if (!sessionToken) {
      this.wasAppClosed = true;
      console.log('🔒 App was closed - requiring login');
    } else if (lastCloseTime) {
      const timeSinceClosure = Date.now() - parseInt(lastCloseTime);
      if (timeSinceClosure > SECURITY_CONFIG.VISIBILITY_TIMEOUT) {
        this.wasAppClosed = true;
        console.log('🔒 App was closed for too long - requiring login');
      }
    }
  }

  startSession() {
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    sessionStorage.setItem('app_session_active', 'true');
    sessionStorage.setItem('app_session_start', this.sessionStartTime.toString());
    localStorage.removeItem('app_last_close_time');
  }

  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isTabVisible = false;
        this.onTabHidden();
      } else {
        this.isTabVisible = true;
        this.onTabVisible();
      }
    });
  }

  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity();
      }, { passive: true });
    });
  }

  setupBeforeUnloadTracking() {
    window.addEventListener('beforeunload', () => {
      // Mark app as being closed
      sessionStorage.removeItem('app_session_active');
      localStorage.setItem('app_last_close_time', Date.now().toString());
    });
  }

  setupPeriodicChecks() {
    // Check every minute for security violations
    setInterval(() => {
      this.performSecurityCheck();
    }, 60 * 1000);
  }

  updateActivity() {
    this.lastActivityTime = Date.now();
    
    // Clear inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    // Set new inactivity timer
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivity();
    }, SECURITY_CONFIG.INACTIVITY_TIMEOUT);
  }

  onTabHidden() {
    console.log('🔒 Tab hidden - starting visibility timer');
    
    // Start visibility timeout
    this.visibilityTimer = setTimeout(() => {
      console.log('🔒 Tab hidden too long - logging out');
      this.forceLogout('Tab was hidden for too long');
    }, SECURITY_CONFIG.VISIBILITY_TIMEOUT);
  }

  onTabVisible() {
    console.log('🔓 Tab visible again');
    
    // Clear visibility timer
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = null;
    }
    
    // Update activity
    this.updateActivity();
    
    // Perform security check
    this.performSecurityCheck();
  }

  performSecurityCheck() {
    const user = state.getState('user');
    const profile = state.getState('profile');
    
    if (!user) return;
    
    const now = Date.now();
    
    // Check session timeout
    if (now - this.sessionStartTime > SECURITY_CONFIG.SESSION_TIMEOUT) {
      this.forceLogout('Session expired');
      return;
    }
    
    // Check inactivity timeout
    if (now - this.lastActivityTime > SECURITY_CONFIG.INACTIVITY_TIMEOUT) {
      this.forceLogout('Inactive for too long');
      return;
    }
    
    // Check if user account is still active
    this.validateUserStatus();
  }

  async validateUserStatus() {
    const user = state.getState('user');
    if (!user) return;
    
    try {
      const { data: profile, error } = await db.getUserProfile(user.id);
      
      if (error || !profile) {
        this.forceLogout('User profile not found');
        return;
      }
      
      if (profile.status === 'inactive') {
        this.forceLogout('Account has been deactivated');
        return;
      }
      
      // Update profile if changed
      const currentProfile = state.getState('profile');
      if (currentProfile?.role !== profile.role) {
        state.updateState({ profile });
        
        // If role changed and user is on admin page, redirect
        const currentPath = window.location.hash.replace('#', '');
        if (currentPath.startsWith('admin') && !['admin', 'manager'].includes(profile.role)) {
          window.location.hash = '#dashboard';
        }
      }
      
    } catch (error) {
      console.error('Security check failed:', error);
      this.forceLogout('Security validation failed');
    }
  }

  handleInactivity() {
    console.log('🔒 User inactive - logging out');
    this.forceLogout('Inactive for too long');
  }

  async forceLogout(reason) {
    console.log(`🔒 Force logout: ${reason}`);
    
    // Clear all timers
    if (this.visibilityTimer) clearTimeout(this.visibilityTimer);
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    
    // Clear session data
    sessionStorage.clear();
    localStorage.removeItem('app_last_close_time');
    
    // Sign out from Supabase
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear application state
    state.reset();
    
    // Show notification and redirect
    if (reason !== 'Session expired') {
      alert(`🔒 Sesi berakhir: ${reason}. Silakan login kembali.`);
    }
    
    window.location.hash = '#login';
  }

  shouldRequireLogin() {
    return this.wasAppClosed;
  }

  clearClosureFlag() {
    this.wasAppClosed = false;
  }
}

// Initialize Security Manager
const securityManager = new SecurityManager();

// Expose security manager globally for login page
window.securityManager = securityManager;

// Define Routes (using hash routing for simplicity in SPA without specific server config)
const routes = {
  '': renderDashboardPage,
  'dashboard': renderDashboardPage,
  'login': renderLoginPage,
  'admin': renderAdminDashboard,
  'admin/settings': renderAdminSettingsPage,
  'admin/karyawan': renderAdminEmployeesPage,
  'admin/katalog': renderAdminCatalogPage,
  'admin/orders': renderAdminOrdersPage,
  'admin/histori': renderAdminHistoryPage,
  'check-in': renderCheckInPage,


  'pelanggan': renderCustomersPage,
  'pelanggan/tambah': renderAddCustomerPage,
  'order': renderOrderPage,
  'katalog': renderCatalogPage, // Halaman katalog untuk karyawan
  'order/baru': renderCreateOrderPage,
  'riwayat': renderHistoryPage,
  'targets': renderTargetsPage,
  'admin/targets': renderAdminTargetsPage,
};

// Expose routes globally for manual routing from login
window.appRoutes = routes;

// Router Helper
async function handleRouting() {
  const hash = window.location.hash.replace('#', '') || '';
  // Remove query params if any for basic matching
  const path = hash.split('?')[0];

  let user = state.getState('user');
  let profile = state.getState('profile');

  // Security Check: Force login if app was closed
  if (securityManager.shouldRequireLogin() && path !== 'login') {
    console.log('🔒 App was closed - forcing login');
    window.location.hash = '#login';
    return;
  }

  // Guard: Redirect to login if not authenticated
  if (!user && path !== 'login') {
    window.location.hash = '#login';
    return;
  }

  // Guard: Check if user is deactivated
  if (user && profile?.status === 'inactive' && path !== 'login') {
    console.warn('Account is deactivated.');
    alert('⚠️ Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi pusat bantuan.');
    await securityManager.forceLogout('Account deactivated');
    return;
  }

  // Double Check Security for Admin Routes (Real-time Validation)
  if (path.startsWith('admin')) {
    try {
      // Re-fetch profile to ensure role hasn't changed or account hasn't been blocked
      const { data: freshProfile, error } = await db.getUserProfile(user.id);
      if (error || !['admin', 'manager'].includes(freshProfile?.role)) {
        console.error('Security Breach or Role Change detected.');
        state.updateState({ profile: freshProfile || null });
        window.location.hash = '#dashboard'; // Kick back to dashboard
        return;
      }
      // Update local state with fresh data
      if (freshProfile.role !== profile?.role) {
        state.updateState({ profile: freshProfile });
      }
      profile = freshProfile;
    } catch (err) {
      window.location.hash = '#login';
      return;
    }
  }

  // Guard: Redirect logged in user away from login
  if (user && path === 'login') {
    // Clear closure flag when successfully accessing login
    securityManager.clearClosureFlag();
    
    if (profile?.role === 'admin' || profile?.role === 'manager') window.location.hash = '#admin';
    else window.location.hash = '#dashboard';
    return;
  }

  // Basic guard for other pages based on state
  if (path.startsWith('admin') && !['admin', 'manager'].includes(profile?.role)) {
    window.location.hash = '#dashboard';
    return;
  }

  // Find handler
  const handler = routes[path];
  if (handler) {
    // Clear closure flag when successfully navigating to authenticated pages
    if (user && path !== 'login') {
      securityManager.clearClosureFlag();
    }
    
    // Inject "Secure Area" indicator for admin
    if (path.startsWith('admin')) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }

    await handler();
    setupNavigationEvents(); // Re-attach global events
  } else {
    // 404 or default
    console.warn('Route not found:', path);
    if (user) window.location.hash = '#dashboard';
    else window.location.hash = '#login';
  }
}

// Initialization
async function init() {
  try {
    // Check for app updates
    versionManager.showUpdateNotification();
    
    // Check auth status only if app wasn't closed
    if (!securityManager.shouldRequireLogin()) {
      const user = await auth.getUser();

      if (user) {
        const { data: profile } = await db.getUserProfile(user.id);
        
        // Validate profile status
        if (profile?.status === 'inactive') {
          console.log('🔒 User account is inactive');
          await securityManager.forceLogout('Account is inactive');
          return;
        }
        
        state.updateState({
          user,
          profile,
          isAuthenticated: true
        });
        
        // Start security session
        securityManager.startSession();
      }
    }

    // Setup auth listener for real-time changes
    authChecker.setupAuthListener();

    // Start router
    window.addEventListener('hashchange', handleRouting);
    handleRouting(); // Initial load

  } catch (error) {
    console.error('Init error:', error);
    renderLoginPage();
  }
}

// Start App
init();

// Register Service Worker for PWA
// Register Service Worker for PWA with Update Notification
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false;

    // Listen for controller change (when new worker takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);

        // Check for updates periodically (every 15 minutes)
        setInterval(() => {
          console.log('Checking for PWA updates...');
          registration.update();
        }, 15 * 60 * 1000);

        // Check if there's already a waiting worker (update ready but waiting)
        if (registration.waiting) {
          showUpdateNotification(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available!
                showUpdateNotification(newWorker);
              } else {
                // Content cached for offline use.
                console.log('Content is cached for offline use.');
              }
            }
          });
        });
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

function showUpdateNotification(worker) {
  // Check if there's already a PWA update notification
  const existingToast = document.querySelector('.update-toast');
  if (existingToast) existingToast.remove();

  // Create a toast/notification
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>🔄 PWA Update tersedia</span>
            <button id="reload-btn" class="btn btn-small btn-primary" style="padding: 4px 10px; font-size: 0.8rem;">
               Update PWA
            </button>
            <button id="dismiss-pwa-btn" class="btn btn-small btn-outline" style="padding: 4px 8px; font-size: 0.8rem;">
               ✕
            </button>
        </div>
    `;

  // Inline styles for the toast
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--bg-card, #fff)',
    padding: '12px 20px',
    borderRadius: '50px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    zIndex: '10000',
    border: '1px solid var(--primary-light, #667eea)',
    animation: 'slideUp 0.3s ease-out'
  });

  document.body.appendChild(toast);

  document.getElementById('reload-btn').addEventListener('click', () => {
    // Send skipWaiting message to the new worker
    worker.postMessage({ action: 'skipWaiting' });
    toast.remove();
    showLoading && showLoading('Mengupdate PWA...');
  });

  document.getElementById('dismiss-pwa-btn').addEventListener('click', () => {
    toast.remove();
  });

  // Auto dismiss after 30 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 30000);
}

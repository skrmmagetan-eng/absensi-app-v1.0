import { auth, db } from './lib/supabase.js';
import { router, state } from './lib/router.js';
import { themeManager } from './utils/theme.js';
import { versionManager } from './utils/version.js';
import { updateNotificationManager } from './utils/update-notification.js';
import { deploymentNotificationManager } from './utils/deployment-notification.js';
import { notificationManager } from './utils/notification-manager.js';
import { authChecker } from './utils/auth-check.js';
import { roleSecurity } from './utils/role-security.js';
import { PWAUpdateManager, clearAppCache, checkForUpdates } from './utils/pwa-update-manager.js';

// Import new activity-based security system (non-invasive)
import './utils/security-init.js'; // Auto-initializes activity monitoring

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
import { renderAboutPage } from './pages/about.js';

// Security Configuration
const SECURITY_CONFIG = {
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  VISIBILITY_TIMEOUT: 5 * 60 * 1000, // 5 minutes when tab is hidden
};

// Security Manager
// Security Manager - DISABLED FOR BETTER USER EXPERIENCE
// All security monitoring functions are disabled to prevent intrusive notifications
class SecurityManager {
  constructor() {
    // All properties set to null/false - no active monitoring
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.visibilityTimer = null;
    this.inactivityTimer = null;
    this.isTabVisible = true;
    this.wasAppClosed = false;
    this.isActive = false; // Always false - security monitoring disabled
    
    console.log('🔓 Security monitoring is disabled for better UX');
  }

  // All security methods disabled - return immediately without action
  startSecurityMonitoring() { return; }
  stopSecurityMonitoring() { return; }
  startSession() { return; }
  clearClosureFlag() { return; }
  shouldRequireLogin() { return false; }
  async forceLogout(reason) { 
    console.log('🔓 Force logout disabled:', reason);
    return; 
  }
  init() { return; }
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
    this.visibilityHandler = () => {
      if (!this.isActive) return;
      
      if (document.hidden) {
        this.isTabVisible = false;
        this.onTabHidden();
      } else {
        this.isTabVisible = true;
        this.onTabVisible();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    this.activityHandler = () => {
      if (this.isActive) {
        this.updateActivity();
      }
    };
    
    events.forEach(event => {
      document.addEventListener(event, this.activityHandler, { passive: true });
    });
  }

  setupBeforeUnloadTracking() {
    this.beforeUnloadHandler = () => {
      if (this.isActive) {
        // Mark app as being closed
        sessionStorage.removeItem('app_session_active');
        localStorage.setItem('app_last_close_time', Date.now().toString());
      }
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  setupPeriodicChecks() {
    // Check every minute for security violations
    this.periodicCheckInterval = setInterval(() => {
      if (this.isActive) {
        this.performSecurityCheck();
      }
    }, 60 * 1000);
  }

  removeEventListeners() {
    // Remove activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this.activityHandler);
    });
    
    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    
    // Remove beforeunload listener
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
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
    if (!this.isActive) return;
    
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
        roleSecurity.log('PROFILE_FETCH_FAILED', { userId: user.id, error: error?.message });
        this.forceLogout('User profile not found');
        return;
      }
      
      // Use security utility to validate profile
      if (!roleSecurity.validateUserProfile(profile, user.id)) {
        this.forceLogout('Security validation failed');
        return;
      }
      
      // Check for role changes with security validation
      const currentProfile = state.getState('profile');
      if (!roleSecurity.validateRoleChange(currentProfile, profile, 'periodic_validation')) {
        this.forceLogout('Role change detected - please login again for security');
        return;
      }
      
    } catch (error) {
      roleSecurity.log('SECURITY_CHECK_ERROR', { userId: user.id, error: error.message });
      console.error('Security check failed:', error);
      this.forceLogout('Security validation failed');
    }
  }

  handleInactivity() {
    console.log('🔒 User inactive - logging out');
    this.forceLogout('Inactive for too long');
  }

  async forceLogout(reason) {
    if (!this.isActive) return; // Don't show notifications if security is not active
    
    console.log(`🔒 Force logout: ${reason}`);
    
    // Stop security monitoring
    this.stopSecurityMonitoring();
    
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
    
    // Show notification and redirect (only if user was actually logged in)
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
  'admin/pelanggan': renderCustomersPage, // Admin view for customers
  'check-in': renderCheckInPage,


  'pelanggan': renderCustomersPage,
  'pelanggan/tambah': renderAddCustomerPage,
  'order': renderOrderPage,
  'katalog': renderCatalogPage, // Halaman katalog untuk karyawan
  'order/baru': renderCreateOrderPage,
  'riwayat': renderHistoryPage,
  'targets': renderTargetsPage,
  'admin/targets': renderAdminTargetsPage,
  'tentang': renderAboutPage,
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

  // SECURITY CHECKS DISABLED - All security-related checks are commented out
  // This improves user experience by removing intrusive session monitoring
  
  // Security Check: DISABLED - no forced login
  // if (securityManager.shouldRequireLogin() && path !== 'login') {
  //   console.log('🔒 App was closed - forcing login');
  //   window.location.hash = '#login';
  //   return;
  // }

  // Guard: Redirect to login if not authenticated
  if (!user && path !== 'login') {
    window.location.hash = '#login';
    return;
  }

  // Guard: Check if user is deactivated
  if (user && profile?.status === 'inactive' && path !== 'login') {
    console.warn('Account is deactivated.');
    alert('⚠️ Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi pusat bantuan.');
    // await securityManager.forceLogout('Account deactivated'); // DISABLED
    await auth.logout(); // Use regular logout instead
    return;
  }

  // Double Check Security for Admin Routes (Real-time Validation)
  if (path.startsWith('admin')) {
    try {
      // Re-fetch profile to ensure role hasn't changed or account hasn't been blocked
      const { data: freshProfile, error } = await db.getUserProfile(user.id);
      if (error || !freshProfile) {
        roleSecurity.log('ADMIN_ROUTE_PROFILE_FETCH_FAILED', { 
          route: path, 
          userId: user.id, 
          error: error?.message 
        });
        window.location.hash = '#dashboard';
        return;
      }
      
      // Use security utility to validate profile and admin access
      if (!roleSecurity.validateUserProfile(freshProfile, user.id)) {
        window.location.hash = '#login';
        return;
      }
      
      if (!roleSecurity.checkAdminAccess(freshProfile, path)) {
        window.location.hash = '#dashboard';
        return;
      }
      
      // Update local state with fresh data only if validation passes
      const currentProfile = state.getState('profile');
      if (roleSecurity.validateRoleChange(currentProfile, freshProfile, 'admin_route_check')) {
        if (freshProfile.role !== currentProfile?.role) {
          roleSecurity.log('ADMIN_ROUTE_PROFILE_UPDATE', {
            route: path,
            userId: freshProfile.id,
            email: freshProfile.email,
            role: freshProfile.role
          });
          state.updateState({ profile: freshProfile });
        }
        profile = freshProfile;
      } else {
        // Security validation failed, force re-login
        window.location.hash = '#login';
        return;
      }
    } catch (err) {
      roleSecurity.log('ADMIN_ROUTE_SECURITY_ERROR', { 
        route: path, 
        error: err.message 
      });
      console.error('Admin route security check failed:', err);
      window.location.hash = '#login';
      return;
    }
  }

  // Guard: Redirect logged in user away from login
  if (user && path === 'login') {
    // Security manager calls disabled for better UX
    // securityManager.clearClosureFlag();
    
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
    // Security manager calls disabled for better UX
    // securityManager.clearClosureFlag();
    
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
    // Log deployment status
    deploymentNotificationManager.logDeploymentStatus();
    
    // Initialize notification manager
    console.log('🔔 Initializing notification system...');
    
    // Check for version updates (highest priority)
    const updateCheck = versionManager.checkForUpdate();
    if (updateCheck.hasUpdate && !versionManager.isUpdateDismissed() && versionManager.shouldShowNotification()) {
      console.log('📱 Showing version update notification');
      versionManager.showUpdateNotification();
    }
    // Check for deployment notifications (medium priority)
    else if (deploymentNotificationManager.shouldShowDeploymentNotification()) {
      console.log('🚀 Showing deployment notification');
      setTimeout(() => {
        deploymentNotificationManager.showDeploymentSuccess();
      }, 1500);
    }
    // Check for feature notifications (lowest priority)
    else if (updateNotificationManager.shouldShowQuickOrderIntro()) {
      console.log('✨ Queueing feature notification');
      setTimeout(() => {
        updateNotificationManager.showUpdateNotification();
      }, 3000);
    }
    // Auth status check - security monitoring disabled for better UX
    const user = await auth.getUser();

      if (user) {
        const { data: profile } = await db.getUserProfile(user.id);
        
        // Validate profile status
        if (profile?.status === 'inactive') {
          console.log('🔒 User account is inactive');
          // Use regular logout instead of security manager
          await auth.logout();
          return;
        }
        
        state.updateState({
          user,
          profile,
          isAuthenticated: true
        });
        // Security monitoring disabled for better user experience
        // securityManager.startSecurityMonitoring();
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
        console.log('✅ ServiceWorker registered:', registration.scope);

        // Enhanced update checking system
        const updateManager = new PWAUpdateManager(registration);
        updateManager.init();

        // Check for updates more frequently (every 5 minutes)
        setInterval(() => {
          console.log('🔍 Checking for PWA updates...');
          registration.update();
        }, 5 * 60 * 1000);

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATED') {
            updateManager.showUpdateAvailable();
          }
        });

        // Check if there's already a waiting worker (update ready but waiting)
        if (registration.waiting) {
          updateManager.showUpdateAvailable(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New service worker installing...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available!
                console.log('🎉 New update available!');
                updateManager.showUpdateAvailable(newWorker);
              } else {
                // Content cached for offline use.
                console.log('📦 Content is cached for offline use.');
              }
            }
          });
        });
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });

    // Make global functions available
    window.clearAppCache = clearAppCache;
    window.checkForUpdates = checkForUpdates;
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

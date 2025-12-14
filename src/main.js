import { auth, db } from './lib/supabase.js';
import { router, state } from './lib/router.js';
import { themeManager } from './utils/theme.js';

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

// Define Routes (using hash routing for simplicity in SPA without specific server config)
const routes = {
  '': renderDashboardPage,
  'dashboard': renderDashboardPage,
  'login': renderLoginPage,
  'admin': renderAdminDashboard,
  'admin/settings': renderAdminSettingsPage,
  'admin/karyawan': renderAdminEmployeesPage,
  'admin/katalog': renderAdminCatalogPage,
  'admin/orders': renderAdminOrdersPage, // New Route
  'check-in': renderCheckInPage,


  'pelanggan': renderCustomersPage,
  'pelanggan/tambah': renderAddCustomerPage,
  'order': renderOrderPage,
  'katalog': renderCatalogPage, // Halaman katalog untuk karyawan
  'order/baru': renderCreateOrderPage,
  'riwayat': renderHistoryPage,
};

// Router Helper
async function handleRouting() {
  const hash = window.location.hash.replace('#', '') || '';
  // Remove query params if any for basic matching
  const path = hash.split('?')[0];

  const user = state.getState('user');
  const profile = state.getState('profile');

  // Guard: Redirect to login if not authenticated
  if (!user && path !== 'login') {
    window.location.hash = '#login';
    return;
  }

  // Guard: Redirect logged in user away from login
  if (user && path === 'login') {
    if (profile?.role === 'admin') window.location.hash = '#admin';
    else window.location.hash = '#dashboard';
    return;
  }

  // Helper guard for admin pages
  if (path.startsWith('admin') && !['admin', 'manager'].includes(profile?.role)) {
    window.location.hash = '#dashboard';
    return;
  }

  // Find handler
  const handler = routes[path];
  if (handler) {
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
    // Check auth status
    const user = await auth.getUser();

    if (user) {
      const { data: profile } = await db.getUserProfile(user.id);
      state.updateState({
        user,
        profile,
        isAuthenticated: true
      });
    }

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

        // Check for updates periodically (optional)
        // setInterval(() => { registration.update(); }, 60 * 60 * 1000);

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
  // Create a toast/notification
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>🚀 Update baru tersedia!</span>
            <button id="reload-btn" class="btn btn-small btn-primary" style="padding: 4px 10px; font-size: 0.8rem;">
               Update
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
    showLoading && showLoading('Mengupdate aplikasi...');
  });
}

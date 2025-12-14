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
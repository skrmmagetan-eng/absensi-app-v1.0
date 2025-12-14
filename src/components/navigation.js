import { auth, db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { themeManager } from '../utils/theme.js';
import { showNotification, showLoading, hideLoading, geo } from '../utils/helpers.js';

export function renderNavbar() {
  const user = state.getState('user');
  const profile = state.getState('profile');
  const isAdmin = ['admin', 'manager'].includes(profile?.role);
  const currentThemeIcon = themeManager.getCurrentIcon();

  let roleLabel = 'Employee App';
  if (profile?.role === 'admin') roleLabel = 'Admin Panel';
  if (profile?.role === 'manager') roleLabel = 'Manager Panel';

  return `
    <nav class="navbar">
      <div class="container navbar-container">
        <a href="#" class="navbar-brand" onclick="event.preventDefault(); window.location.hash = '${isAdmin ? '#admin' : '#dashboard'}'">
          📍 SKRM
          <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">
            | ${roleLabel}
          </span>
        </a>

        <div class="navbar-menu">
          ${isAdmin ? getAdminLinks() : getEmployeeLinks()}
          <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 0.5rem;"></div>
          
          <button class="btn btn-outline btn-small btn-icon" id="theme-btn" title="Ganti Tema">
            ${currentThemeIcon}
          </button>
                      
          <button class="btn btn-outline btn-small" id="logout-btn">
            Logout
          </button>
        </div>

        <div class="mobile-menu-toggle d-none">
           <!-- Icon placeholder if needed later -->
        </div>
      </div>
    </nav>
  `;
}

export function renderBottomNav() {
  const profile = state.getState('profile');
  if (['admin', 'manager'].includes(profile?.role)) return ''; // Admin/Manager uses desktop nav

  const currentPath = window.location.hash.replace('#', '') || 'dashboard';

  return `
    <nav class="bottom-nav">
      <div class="bottom-nav-container">
        <div class="bottom-nav-item ${currentPath === 'dashboard' ? 'active' : ''}" onclick="window.location.hash='#dashboard'">
          <div class="bottom-nav-icon">🏠</div>
          <span class="bottom-nav-label">Home</span>
        </div>
        
        <div class="bottom-nav-item ${currentPath === 'check-in' ? 'active' : ''}" onclick="window.location.hash='#check-in'">
          <div class="bottom-nav-icon">📍</div>
          <span class="bottom-nav-label">Absen</span>
        </div>

        <div class="bottom-nav-item ${currentPath.includes('pelanggan') ? 'active' : ''}" onclick="window.location.hash='#pelanggan'">
          <div class="bottom-nav-icon">👥</div>
          <span class="bottom-nav-label">Pelanggan</span>
        </div>

        <div class="bottom-nav-item ${currentPath.includes('order') ? 'active' : ''}" onclick="window.location.hash='#order'">
          <div class="bottom-nav-icon">📦</div>
          <span class="bottom-nav-label">Order</span>
        </div>
      </div>
    </nav>
  `;
}

function getEmployeeLinks() {
  const currentPath = window.location.hash.replace('#', '');
  return `
    <a href="#dashboard" class="nav-link ${currentPath === 'dashboard' ? 'active' : ''}">Dashboard</a>
    <a href="#check-in" class="nav-link ${currentPath === 'check-in' ? 'active' : ''}">Check In</a>
    <a href="#pelanggan" class="nav-link ${currentPath.includes('pelanggan') ? 'active' : ''}">Pelanggan</a>
    <a href="#order" class="nav-link ${currentPath.includes('order') ? 'active' : ''}">Order</a>
    <a href="#riwayat" class="nav-link ${currentPath === 'riwayat' ? 'active' : ''}">Riwayat</a>
  `;
}

function getAdminLinks() {
  const currentPath = window.location.hash.replace('#', '');
  return `
    <a href="#admin" class="nav-link ${currentPath === 'admin' ? 'active' : ''}">Dashboard</a>
    <a href="#admin/karyawan" class="nav-link ${currentPath.includes('karyawan') ? 'active' : ''}">Karyawan</a>
    <a href="#admin/orders" class="nav-link ${currentPath.includes('orders') ? 'active' : ''}">📦 Order</a>
    <a href="#admin/katalog" class="nav-link ${currentPath.includes('katalog') ? 'active' : ''}">Katalog</a>
    <a href="#admin/settings" class="nav-link ${currentPath.includes('settings') ? 'active' : ''}">⚙️ Profil</a>
  `;
}

// Global Logout Handler (Intelligent Exit)
export function setupNavigationEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const user = state.getState('user');
      const profile = state.getState('profile');

      // 1. If employee (not admin/manager), check for active visits
      if (user && !['admin', 'manager'].includes(profile?.role)) {
        try {
          showLoading('Memeriksa status kunjungan...');
          const { data: todayVisits } = await db.getTodayAttendance(user.id);

          // Find active visit (checked in but NOT checked out)
          // status can be 'checked_in' or 'late', but check_out_time is null
          const activeVisit = todayVisits?.find(v => !v.check_out_time);

          if (activeVisit) {
            const proceed = confirm(`⚠️ Anda masih CHECK-IN di pelanggan "${activeVisit.customers?.name || 'Unknown'}".\n\nApakah Anda ingin CHECK-OUT OTOMATIS sekarang agar KPI tercatat?`);

            if (proceed) {
              // Auto Checkout logic
              try {
                const currentPos = await geo.getCurrentPosition(); // Try getting real GPS
                await db.checkOut(activeVisit.id, currentPos.latitude, currentPos.longitude);
                showNotification('✅ Otomatis Check-Out berhasil!', 'success');
              } catch (geoErr) {
                // Fallback if GPS fails (use 0,0 or last known)
                console.warn("GPS failed during auto-checkout, using Check-In location as fallback");
                await db.checkOut(activeVisit.id, activeVisit.check_in_latitude, activeVisit.check_in_longitude);
                showNotification('✅ Check-Out berhasil (GPS Fallback)', 'success');
              }
            } else {
              // User chose NOT to checkout? Warn them.
              if (!confirm("Jika logout tanpa Check-Out, durasi kunjungan hari ini tidak akan dihitung di KPI. Yakin mau lanjut logout?")) {
                hideLoading();
                return; // Cancel logout
              }
            }
          }
        } catch (err) {
          console.error("Smart logout error:", err);
          // Continue to logout if check fails
        }
      }

      // 2. Final Logout Process
      await auth.signOut();
      state.reset();
      window.location.href = '/';
      // window.location.reload(); handled by href change usually
    });
  }

  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      themeManager.cycleTheme();
      themeBtn.textContent = themeManager.getCurrentIcon();
    });
  }
}

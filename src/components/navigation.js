import { auth, db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { themeManager } from '../utils/theme.js';
import { showNotification, showLoading, hideLoading, geo, branding } from '../utils/helpers.js';

export function renderNavbar() {
  const user = state.getState('user');
  const profile = state.getState('profile');
  const isAdmin = ['admin', 'manager'].includes(profile?.role);
  const currentThemeIcon = themeManager.getCurrentIcon();

  // Dynamic Branding
  const brand = branding.getLocal();
  const brandName = brand.name || 'SKRM';
  const hasLogo = !!brand.logo;
  // Rule: If name is long (>15 chars) AND logo exists, hide text. Otherwise show text.
  const showText = !hasLogo || brandName.length <= 15;

  // Generate Navigation Links
  const linksHtml = isAdmin ? getAdminLinks() : getEmployeeLinks();

  return `
    <nav class="navbar">
      <div class="container navbar-container">
        <!-- Logo / Sidebar Toggle for Mobile -->
        <div class="navbar-brand" id="sidebar-toggle-btn" style="cursor: pointer; display: flex; align-items: center; gap: 12px;">
           <span style="font-size: 1.5rem; line-height: 1;">☰</span>
           
           <div class="flex items-center gap-2">
             ${hasLogo
      ? `<img src="${brand.logo}" alt="Logo" style="height: 32px; width: auto; object-fit: contain; border-radius: 4px;">`
      : `<span style="font-size: 1.5rem;">📍</span>`
    }
             
             ${showText
      ? `<div style="line-height: 1.2;">
                    <div style="font-weight: 700; font-size: 1.1rem;">${brandName}</div>
                    ${profile ? `<div style="font-size: 0.75rem; font-weight: normal; opacity: 0.8;">${profile.name?.split(' ')[0] || 'User'}</div>` : ''}
                  </div>`
      : ''
    }
           </div>
        </div>

        <!-- Desktop Menu (Hidden on Mobile via CSS) -->
        <div class="navbar-menu">
          ${linksHtml}
          <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 0.5rem;"></div>
          
          <button class="btn btn-outline btn-small btn-icon" id="theme-btn" title="Ganti Tema">
            ${currentThemeIcon}
          </button>
                      
          <button class="btn btn-outline btn-small" id="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Sidebar (Drawer) -->
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
         <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary-dark);">📍 Menu Utama</div>
         <button class="btn btn-outline btn-small btn-icon" id="sidebar-close-btn">✕</button>
      </div>
      
      <div class="sidebar-content">
         <!-- Profile Widget in Sidebar -->
         <div class="user-profile-widget">
            <div style="font-weight: 600;">${profile?.name || 'Guest'}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${profile?.email || ''}</div>
            <div class="badge badge-outline mt-xs" style="margin-top:0.5rem;">${profile?.role || 'User'}</div>
         </div>

         <div class="sidebar-links">
            ${linksHtml}
         </div>

         <div style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <button class="btn btn-outline w-full justify-start" id="sidebar-theme-btn">
               ${currentThemeIcon} Ganti Tema
            </button>
            <button class="btn btn-danger w-full justify-start" id="sidebar-logout-btn">
               🚪 Logout
            </button>
         </div>
      </div>
    </div>
  `;
}

export function renderBottomNav() {
  return ''; // Bottom nav disabled/replaced by sidebar
}

function getEmployeeLinks() {
  const currentPath = window.location.hash.replace('#', '');
  return `
    <a href="#dashboard" class="nav-link ${currentPath === 'dashboard' ? 'active' : ''}">
       <span style="width:24px;">🏠</span> Dashboard
    </a>
    <a href="#check-in" class="nav-link ${currentPath === 'check-in' ? 'active' : ''}">
       <span style="width:24px;">📍</span> Absen (Check-In)
    </a>
    <a href="#pelanggan" class="nav-link ${currentPath.includes('pelanggan') ? 'active' : ''}">
       <span style="width:24px;">👥</span> Pelanggan
    </a>
    <a href="#order" class="nav-link ${currentPath.includes('order') ? 'active' : ''}">
       <span style="width:24px;">📦</span> Omset
    </a>
    <a href="#katalog" class="nav-link ${currentPath.includes('katalog') ? 'active' : ''}">
       <span style="width:24px;">🛍️</span> Katalog
    </a>
    <a href="#riwayat" class="nav-link ${currentPath === 'riwayat' ? 'active' : ''}">
       <span style="width:24px;">📅</span> Riwayat
    </a>
    <a href="#targets" class="nav-link ${currentPath === 'targets' ? 'active' : ''}">
       <span style="width:24px;">🎯</span> Target Saya
    </a>
  `;
}

function getAdminLinks() {
  const currentPath = window.location.hash.replace('#', '');
  return `
    <a href="#admin" class="nav-link ${currentPath === 'admin' ? 'active' : ''}">
       <span style="width:24px;">📊</span> Dashboard
    </a>
    <a href="#admin/karyawan" class="nav-link ${currentPath.includes('karyawan') ? 'active' : ''}">
       <span style="width:24px;">👥</span> Karyawan
    </a>
    <a href="#admin/orders" class="nav-link ${currentPath.includes('orders') ? 'active' : ''}">
       <span style="width:24px;">📦</span> Omset Masuk
    </a>
    <a href="#admin/targets" class="nav-link ${currentPath.includes('targets') ? 'active' : ''}">
       <span style="width:24px;">🎯</span> Monitor Target
    </a>
    <a href="#admin/settings" class="nav-link ${currentPath.includes('settings') ? 'active' : ''}">
       <span style="width:24px;">⚙️</span> Pengaturan
    </a>
  `;
}

// Shared Logout Logic
async function handleSmartLogout() {
  const user = state.getState('user');
  const profile = state.getState('profile');

  // 1. If employee (not admin/manager), check for active visits
  if (user && !['admin', 'manager'].includes(profile?.role)) {
    try {
      showLoading('Memeriksa status kunjungan...');
      const { data: todayVisits } = await db.getTodayAttendance(user.id);

      // Find active visit (checked in but NOT checked out)
      const activeVisit = todayVisits?.find(v => !v.check_out_time);

      if (activeVisit) {
        const proceed = confirm(`⚠️ Anda masih CHECK-IN di pelanggan "${activeVisit.customers?.name || 'Unknown'}".\n\nApakah Anda ingin CHECK-OUT OTOMATIS sekarang agar KPI tercatat?`);

        if (proceed) {
          // Auto Checkout logic
          try {
            const currentPos = await geo.getCurrentPosition(); // Try getting real GPS
            await db.checkOut(activeVisit.id, {
              check_out_time: new Date().toISOString(),
              check_out_latitude: currentPos.latitude,
              check_out_longitude: currentPos.longitude
            });
            showNotification('✅ Otomatis Check-Out berhasil!', 'success');
          } catch (geoErr) {
            // Fallback if GPS fails
            console.warn("GPS failed during auto-checkout, using Check-In location as fallback");
            await db.checkOut(activeVisit.id, {
              check_out_time: new Date().toISOString(),
              check_out_latitude: activeVisit.latitude, // fallback
              check_out_longitude: activeVisit.longitude // fallback
            });
            showNotification('✅ Check-Out berhasil (GPS Fallback)', 'success');
          }
        } else {
          if (!confirm("Jika logout tanpa Check-Out, durasi kunjungan hari ini tidak akan dihitung di KPI. Yakin mau lanjut logout?")) {
            hideLoading();
            return; // Cancel logout
          }
        }
      }
    } catch (err) {
      console.error("Smart logout error:", err);
    }
  }

  // 2. Final Logout
  await auth.signOut();
  state.reset();
  window.location.href = '/';
}

export function setupNavigationEvents() {
  // Sidebar Logic
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const overlay = document.getElementById('sidebar-overlay');
  const sidebar = document.getElementById('sidebar');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
    // Only toggle if we are in mobile view logic, but basically always yes for the toggle btn
    e.preventDefault();
    openSidebar();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Close sidebar when clicking a link
  const sidebarLinks = document.querySelectorAll('.sidebar-links .nav-link');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(closeSidebar, 150);
    });
  });

  // Logout Handlers
  const logoutBtns = [document.getElementById('logout-btn'), document.getElementById('sidebar-logout-btn')];
  logoutBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', handleSmartLogout);
  });

  // Theme Handlers
  const themeBtns = [document.getElementById('theme-btn'), document.getElementById('sidebar-theme-btn')];
  themeBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      themeManager.cycleTheme();
      // Update all theme buttons text
      const icon = themeManager.getCurrentIcon();
      document.querySelectorAll('#theme-btn, #sidebar-theme-btn').forEach(b => {
        if (b.tagName === 'BUTTON') b.textContent = icon;
        else b.innerHTML = `${icon} Ganti Tema`;
      });
    });
  });
}

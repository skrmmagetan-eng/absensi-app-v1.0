import { db } from '../lib/supabase.js';
import { renderNavbar } from '../components/navigation.js';
import { formatCurrency, showLoading, hideLoading, getMonthDateRange } from '../utils/helpers.js';
import { state } from '../lib/router.js';

export async function renderAdminDashboard() {
  const app = document.getElementById('app');
  const profile = state.getState('profile');
  const isManager = profile?.role === 'manager';

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg flex justify-between items-center wrap-mobile">
          <div>
            <h1>${isManager ? 'Manager Dashboard' : 'Admin Dashboard'} 📊</h1>
            <p style="color: var(--text-muted);">Overview performa perusahaan & karyawan</p>
          </div>
          <div class="flex gap-sm items-center mt-sm-mobile">
             <label class="text-xs text-muted font-bold uppercase" style="letter-spacing: 1px;">Periode:</label>
             <input 
                type="month" 
                id="dashboard-period" 
                class="form-input py-1" 
                value="${new Date().toISOString().substring(0, 7)}" 
                onchange="window.reloadDashboardWithPeriod(this.value)"
                style="max-width: 160px; border-radius: 8px; font-weight: 600;"
             >
          </div>
        </div>

        <!-- Global Stats -->
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-header">
              <div class="stat-icon">👥</div>
              <div class="stat-details">
                <div class="stat-label">Total Karyawan</div>
                <div class="stat-value" id="stat-employees">-</div>
              </div>
            </div>
          </div>
          
          ${!isManager ? `
          <div class="stat-card success">
            <div class="stat-header">
              <div class="stat-icon">💰</div>
              <div class="stat-details">
                <div class="stat-label">Pendapatan Bulan Ini</div>
                <div class="stat-value" id="stat-revenue">-</div>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="stat-card warning" onclick="window.location.hash='#admin/pelanggan'" style="cursor: pointer;">
            <div class="stat-header">
              <div class="stat-icon">⚠️</div>
              <div class="stat-details">
                <div class="stat-label">New Customers</div>
                <div class="stat-value" id="stat-customers">-</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions for Admin -->
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">⚡ Aksi Cepat</h3>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
            <button class="btn btn-primary" onclick="window.location.hash='#admin/karyawan'">
              <span>👥</span>
              <span>Karyawan</span>
            </button>
            <button class="btn btn-success" onclick="window.location.hash='#admin/orders'">
              <span>📦</span>
              <span>Omset</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/katalog'">
              <span>🛍️</span>
              <span>Katalog</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/histori'">
              <span>📜</span>
              <span>Aktivitas</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/targets'">
              <span>🎯</span>
              <span>Target</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/settings'">
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <!-- Employee KPI Table -->
        <div class="card mb-lg">
          <div class="card-header flex justify-between items-center">
            <h3 class="card-title">Performa Karyawan (Bulan Ini)</h3>
            <button class="btn btn-outline btn-small" onclick="window.location.reload()">🔄 Refresh</button>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th class="text-center">Kunjungan</th>
                  <th class="text-center">Pelanggan Baru</th>
                  <th class="text-center">Omset</th>
                  <th>Skor KPI</th>
                </tr>
              </thead>
              <tbody id="kpi-table-body">
                <tr><td colspan="5" class="text-center p-3">Memuat data...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Activities / Omset -->
        <div class="flex flex-col gap-lg">
           <!-- Latest Omset -->
           <div class="card">
             <div class="card-header flex justify-between items-center">
               <h3 class="card-title" id="orders-widget-title">Omset Terbaru</h3>
               <span class="badge badge-outline" id="orders-filter-label" style="display:none;">Semua Staff</span>
             </div>
             <div id="latest-orders-list"></div>
           </div>

           <!-- Latest Visits (History) -->
           <div class="card">
             <div class="card-header flex justify-between items-center">
               <h3 class="card-title" id="visits-widget-title">Kunjungan Terbaru</h3>
               <span class="badge badge-outline" id="visits-filter-label" style="display:none;">Semua Staff</span>
             </div>
             <div id="latest-visits-list"></div>
           </div>
        </div>
      </div>
    </div>
  `;

  await loadAdminData();
}

async function loadAdminData(customStart = null, customEnd = null) {
  const { start: defaultStart, end: defaultEnd } = getMonthDateRange();
  const start = customStart || defaultStart;
  const end = customEnd || defaultEnd;

  showLoading('Memuat data Dashboard...');
  try {
    // 1. Load All Data in Parallel for maximum speed
    const [employeesRes, kpiRes, ordersRes, attendanceRes, customersRes] = await Promise.all([
      db.getAllEmployees(),
      db.getKPIStats(start + ' 00:00:00', end + ' 23:59:59'),
      db.getOrders(), // We need this for widgets too
      db.getAllAttendance(), // We need this for widgets too
      db.getCustomers() // Only needed if RPC fails, but fetching in parallel is usually faster than sequential fallback
    ]);

    const employees = employeesRes.data || [];
    document.getElementById('stat-employees').textContent = employees.length;

    let kpiStats = kpiRes.data || [];
    const allOrders = ordersRes.data || [];
    const allAttendance = attendanceRes.data || [];
    const allCustomers = customersRes.data || [];

    // 2. If RPC failed or returned empty (and we have employees to report on), use client-side fallback
    if (kpiRes.error || (kpiStats.length === 0 && employees.length > 0)) {
      if (kpiRes.error) console.warn('RPC failed, using fallback:', kpiRes.error.message);

      const startDt = new Date(start);
      const endDt = new Date(end);
      endDt.setHours(23, 59, 59, 999);

      // Filter data for the selected period
      const periodOrders = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= startDt && d <= endDt;
      });

      const periodCustomers = allCustomers.filter(c => {
        const d = new Date(c.created_at);
        return d >= startDt && d <= endDt;
      });

      const periodAttendance = allAttendance.filter(a => {
        const d = new Date(a.check_in_time);
        return d >= startDt && d <= endDt;
      });

      kpiStats = employees.map(emp => {
        const empOrders = periodOrders.filter(o => o.employee_id === emp.id);
        const orderCount = empOrders.length;
        const totalSales = empOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const newCustCount = periodCustomers.filter(c => c.employee_id === emp.id).length;
        const visitCount = periodAttendance.filter(a => a.employee_id === emp.id).length;

        return {
          user_id: emp.id,
          user_name: emp.name,
          visit_count: visitCount,
          new_customer_count: newCustCount,
          order_count: orderCount,
          total_sales: totalSales,
          score: Math.min(100, (visitCount * 2) + (newCustCount * 10) + (orderCount * 5))
        };
      });
    }

    // 3. Update Global Stats
    kpiStats.sort((a, b) => b.score - a.score);
    const totalRev = kpiStats.reduce((sum, k) => sum + (Number(k.total_sales) || 0), 0);
    const totalNewCust = kpiStats.reduce((sum, k) => sum + (Number(k.new_customer_count) || 0), 0);

    const elRevenue = document.getElementById('stat-revenue');
    if (elRevenue) elRevenue.textContent = formatCurrency(totalRev);
    document.getElementById('stat-customers').textContent = totalNewCust;

    renderKPITable(kpiStats);

    // 4. Update Widgets with pre-loaded data
    window._allRecentOrders = allOrders;
    window._allRecentVisits = allAttendance;

    renderLatestOrders(allOrders.slice(0, 10));
    renderLatestVisits(allAttendance.slice(0, 10));

    // Define helper functions in window
    setupGlobalFilters();

  } catch (error) {
    console.error('Admin Load Error:', error);
    document.getElementById('kpi-table-body').innerHTML = `<tr><td colspan="5" class="text-danger text-center">Gagal memuat Dashboard: ${error.message}</td></tr>`;
  } finally {
    hideLoading();
  }
}

function setupGlobalFilters() {
  window.reloadDashboardWithPeriod = (monthValue) => {
    if (!monthValue) return;
    const [year, month] = monthValue.split('-');
    const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
    loadAdminData(firstDay, lastDay);
  };

  window.filterDashboardByEmployee = (employeeId, employeeName) => {
    const orderLabel = document.getElementById('orders-filter-label');
    const visitLabel = document.getElementById('visits-filter-label');
    const tbody = document.getElementById('kpi-table-body');
    const rows = tbody.querySelectorAll('tr');

    if (employeeId === 'all') {
      tbody.classList.remove('table-has-selection');
      rows.forEach(r => r.classList.remove('selected'));
      orderLabel.style.display = 'none';
      visitLabel.style.display = 'none';
      renderLatestOrders(window._allRecentOrders.slice(0, 10));
      renderLatestVisits(window._allRecentVisits.slice(0, 10));
    } else {
      tbody.classList.add('table-has-selection');
      rows.forEach(r => {
        if (r.dataset.userId === employeeId) r.classList.add('selected');
        else r.classList.remove('selected');
      });

      orderLabel.style.display = 'inline-block';
      orderLabel.textContent = employeeName;
      visitLabel.style.display = 'inline-block';
      visitLabel.textContent = employeeName;

      const filteredOrders = window._allRecentOrders.filter(o => o.employee_id === employeeId);
      const filteredVisits = window._allRecentVisits.filter(v => v.employee_id === employeeId);

      renderLatestOrders(filteredOrders.slice(0, 10));
      renderLatestVisits(filteredVisits.slice(0, 10));
    }
    document.getElementById('latest-orders-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function renderKPITable(data) {
  const tbody = document.getElementById('kpi-table-body');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3">Belum ada aktivitas bulan ini.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr data-user-id="${row.user_id}" onclick="window.filterDashboardByEmployee('${row.user_id}', '${row.user_name}')" style="cursor: pointer;" title="Klik untuk filter histori & omset">
      <td>
        <strong>${row.user_name}</strong><br>
        <small class="text-muted">Total: ${formatCurrency(row.total_sales)}</small>
      </td>
      <td class="text-center">
         <span class="badge badge-outline">${row.visit_count}</span>
      </td>
      <td class="text-center">
         <span class="badge badge-outline">${row.new_customer_count}</span>
      </td>
      <td class="text-center">
         <span class="badge badge-outline">${row.order_count}</span>
      </td>
      <td>
        <div class="flex items-center gap-2">
          <strong style="color: ${getScoreColor(row.score)}">${Math.round(row.score)}%</strong>
          <div style="flex:1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div style="width: ${Math.min(row.score, 100)}%; height: 100%; background: ${getScoreColor(row.score)};"></div>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderLatestOrders(orders) {
  const container = document.getElementById('latest-orders-list');
  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="p-lg text-center text-muted">Belum ada data omset.</div>';
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="flex justify-between items-center p-md hover-bg" style="border-bottom: 1px solid var(--border-color);">
      <div>
        <div class="font-bold text-sm" style="color: var(--text-primary);">${o.customers?.name || 'Pelanggan'}</div>
        <div class="text-xs text-muted">oleh ${o.users?.name || 'User'} • ${o.status}</div>
      </div>
      <div class="text-right">
        <div class="font-bold text-primary">${formatCurrency(o.total_amount)}</div>
        <div class="text-xs text-muted">${new Date(o.created_at).toLocaleDateString('id-ID')}</div>
      </div>
    </div>
  `).join('');
}

function renderLatestVisits(visits) {
  const container = document.getElementById('latest-visits-list');
  if (!visits || visits.length === 0) {
    container.innerHTML = '<div class="p-lg text-center text-muted">Belum ada data kunjungan.</div>';
    return;
  }

  container.innerHTML = `
    <div class="flex flex-col gap-2">
      ${visits.map(v => `
        <div class="visit-card-expandable" onclick="this.classList.toggle('active')" data-visit-id="${v.id}">
          <div class="visit-main-row">
            <div class="visit-left-section">
              <div class="visit-customer-name">${v.customers?.name || 'Unknown'}</div>
              <div class="visit-customer-address">${v.customers?.address || '-'}</div>
            </div>
            <div class="visit-right-section">
              <span class="visit-status-badge ${v.check_out_time ? 'status-completed' : 'status-ongoing'}">
                ${v.check_out_time ? 'Selesai' : 'Berlangsung'}
              </span>
              <div class="visit-date">${new Date(v.check_in_time).toLocaleDateString('id-ID')}</div>
            </div>
          </div>
          
          <!-- Expanded Detail Section -->
          <div class="visit-expand-content">
            <div class="visit-detail-separator"></div>
            <div class="visit-time-grid">
              <div class="time-item">
                <div class="time-label">CHECK IN</div>
                <div class="time-value">${new Date(v.check_in_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</div>
              </div>
              <div class="time-item">
                <div class="time-label">CHECK OUT</div>
                <div class="time-value">${v.check_out_time ? new Date(v.check_out_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : 'Belum checkout'}</div>
              </div>
            </div>

            ${v.notes || v.photo_url || v.users?.name ? `
              <div class="visit-additional-info">
                ${v.users?.name ? `
                  <div class="visit-staff-info">
                    <div class="staff-label">👤 Staff yang melakukan kunjungan:</div>
                    <div class="staff-name">${v.users.name}</div>
                  </div>
                ` : ''}
                ${v.notes ? `
                  <div class="visit-notes">
                    <div class="notes-label">📝 Catatan Kunjungan:</div>
                    <div class="notes-content">"${v.notes}"</div>
                  </div>
                ` : ''}
                ${v.photo_url ? `
                  <div class="visit-photo">
                    <a href="${v.photo_url}" target="_blank" class="photo-link">
                      📸 Lihat Bukti Foto Kunjungan
                    </a>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <style>
      .visit-card-expandable {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      .visit-card-expandable:hover {
        border-color: var(--primary);
        box-shadow: var(--shadow-md);
      }
      
      .visit-main-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid transparent;
      }
      
      .visit-card-expandable.active .visit-main-row {
        border-bottom-color: var(--border-color);
      }
      
      .visit-left-section {
        flex: 1;
      }
      
      .visit-customer-name {
        font-weight: 600;
        font-size: 16px;
        color: var(--primary);
        margin-bottom: 4px;
      }
      
      .visit-customer-address {
        font-size: 14px;
        color: var(--text-muted);
      }
      
      .visit-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      
      .visit-status-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .status-completed {
        background: var(--success-light);
        color: var(--success-dark);
      }
      
      .status-ongoing {
        background: var(--warning-light);
        color: var(--warning-dark);
      }
      
      .visit-date {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .visit-expand-content {
        display: none;
        padding: 0 16px 16px 16px;
        animation: slideDown 0.3s ease-out;
      }
      
      .visit-card-expandable.active .visit-expand-content {
        display: block;
      }
      
      .visit-detail-separator {
        height: 1px;
        background: var(--border-color);
        margin-bottom: 16px;
      }
      
      .visit-time-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      
      .time-item {
        background: var(--bg-tertiary);
        padding: 12px;
        border-radius: 6px;
      }
      
      .time-label {
        font-size: 11px;
        color: var(--text-muted);
        font-weight: 500;
        margin-bottom: 4px;
      }
      
      .time-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .visit-additional-info {
        border-top: 1px solid var(--border-color);
        padding-top: 16px;
      }
      
      .visit-staff-info {
        margin-bottom: 12px;
        padding: 10px;
        background: var(--bg-tertiary);
        border-radius: 6px;
      }
      
      .staff-label {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      
      .staff-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--primary);
      }
      
      .visit-notes {
        margin-bottom: 12px;
      }
      
      .notes-label {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 6px;
      }
      
      .notes-content {
        background: var(--bg-secondary);
        padding: 10px;
        border-radius: 6px;
        font-size: 14px;
        color: var(--text-secondary);
        font-style: italic;
      }
      
      .photo-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--primary);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        padding: 8px 12px;
        background: var(--primary-light);
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .photo-link:hover {
        background: var(--primary-lighter);
      }
      
      @keyframes slideDown {
        from { opacity: 0; max-height: 0; }
        to { opacity: 1; max-height: 500px; }
      }
    </style>
  `;
}

function getScoreColor(score) {
  if (score >= 80) return '#00f2fe';
  if (score >= 60) return '#667eea';
  return '#fc6767';
}

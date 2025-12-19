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
        <div class="mb-lg">
          <h1>${isManager ? 'Manager Dashboard' : 'Admin Dashboard'} 📊</h1>
          <p style="color: var(--text-muted);">Overview performa perusahaan & karyawan</p>
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

async function loadAdminData() {
  try {
    // 1. Load Employees
    const { data: employees } = await db.getAllEmployees();
    document.getElementById('stat-employees').textContent = employees?.length || 0;

    // 2. Try Loading Real KPI Data via RPC
    const { start, end } = getMonthDateRange();
    let kpiStats = [];
    let rpcError = null;

    try {
      // Append time for full day coverage (UTC/Local considerations handled by DB usually, but manual string constraint is safe enough for dates)
      const { data, error } = await db.getKPIStats(start + ' 00:00:00', end + ' 23:59:59');
      if (error) throw error;
      kpiStats = data || [];
    } catch (e) {
      rpcError = e;
      console.warn('RPC getKPIStats failed, falling back to client-side calculation:', e.message);
    }

    // 3. Fallback Calculation if RPC failed OR if data is empty (and we want to be sure)
    // actually if RPC succeeds but returns empty, that's valid. Only if RPC FAILS (error).
    if (rpcError) {
      // FETCH RAW DATA for client-side aggregation
      const [ordersRes, customersRes, attendanceRes] = await Promise.all([
        db.getOrders(),
        db.getCustomers(),
        db.getAllAttendance()
      ]);

      const allOrders = ordersRes.data || [];
      const allCustomers = customersRes.data || [];
      const allAttendance = attendanceRes.data || [];

      // Filter for this month
      const startDt = new Date(start);
      const endDt = new Date(end);
      endDt.setHours(23, 59, 59, 999);

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

      // Map employees to KPI structure
      if (employees) {
        kpiStats = employees.map(emp => {
          const empOrders = periodOrders.filter(o => o.employee_id === emp.id);
          const empCust = periodCustomers.filter(c => c.employee_id === emp.id); // Assuming employee_id col exists based on createCustomer code

          const orderCount = empOrders.length;
          const totalSales = empOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          const newCustCount = empCust.length;

          const visitCount = periodAttendance.filter(a => a.employee_id === emp.id).length;

          // Calculate Score: (Visits * 2) + (New Cust * 10) + (Orders * 5)
          let score = Math.min(100, (visitCount * 2) + (newCustCount * 10) + (orderCount * 5));

          return {
            user_id: emp.id,
            user_name: emp.name,
            visit_count: visitCount,
            new_customer_count: newCustCount,
            order_count: orderCount,
            total_sales: totalSales,
            score: score
          };
        });
      }
    }

    // 4. Update UI with Stats (Source is either RPC or Fallback)
    // SORT BY SCORE DESCENDING
    kpiStats.sort((a, b) => b.score - a.score);

    const totalRev = kpiStats.reduce((sum, k) => sum + (Number(k.total_sales) || 0), 0);
    const totalNewCust = kpiStats.reduce((sum, k) => sum + (Number(k.new_customer_count) || 0), 0);

    const elRevenue = document.getElementById('stat-revenue');
    if (elRevenue) elRevenue.textContent = formatCurrency(totalRev);

    document.getElementById('stat-customers').textContent = totalNewCust;

    renderKPITable(kpiStats);

    // 5. Load Initial Data for Widgets
    const { data: recentOrders } = await db.getOrders();
    const { data: recentVisits } = await db.getAllAttendance();

    // Store in window for global access/filtering
    window._allRecentOrders = recentOrders || [];
    window._allRecentVisits = recentVisits || [];

    renderLatestOrders(window._allRecentOrders.slice(0, 10));
    renderLatestVisits(window._allRecentVisits.slice(0, 10));

    // Global filtering function
    window.filterDashboardByEmployee = (employeeId, employeeName) => {
      const orderLabel = document.getElementById('orders-filter-label');
      const visitLabel = document.getElementById('visits-filter-label');

      if (employeeId === 'all') {
        orderLabel.style.display = 'none';
        visitLabel.style.display = 'none';
        renderLatestOrders(window._allRecentOrders.slice(0, 10));
        renderLatestVisits(window._allRecentVisits.slice(0, 10));
      } else {
        orderLabel.style.display = 'inline-block';
        orderLabel.textContent = employeeName;
        visitLabel.style.display = 'inline-block';
        visitLabel.textContent = employeeName;

        const filteredOrders = window._allRecentOrders.filter(o => o.employee_id === employeeId);
        const filteredVisits = window._allRecentVisits.filter(v => v.employee_id === employeeId);

        renderLatestOrders(filteredOrders.slice(0, 10));
        renderLatestVisits(filteredVisits.slice(0, 10));
      }

      // Scroll to gadgets for better UX
      document.getElementById('latest-orders-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

  } catch (error) {
    console.error('Admin Load Error:', error);
    document.getElementById('kpi-table-body').innerHTML = `<tr><td colspan="5" class="text-danger text-center">Gagal memuat Dashboard: ${error.message}</td></tr>`;
  }
}

function renderKPITable(data) {
  const tbody = document.getElementById('kpi-table-body');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3">Belum ada aktivitas bulan ini.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr onclick="window.filterDashboardByEmployee('${row.user_id}', '${row.user_name}')" style="cursor: pointer;" title="Klik untuk filter histori & omset">
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

  container.innerHTML = visits.map(v => `
    <div class="flex justify-between items-center p-md hover-bg" style="border-bottom: 1px solid var(--border-color);">
      <div>
        <div class="font-bold text-sm" style="color: var(--text-primary);">${v.customers?.name || 'Pelanggan'}</div>
        <div class="text-xs text-muted">oleh ${v.users?.name || 'User'}</div>
      </div>
      <div class="text-right">
        <div class="badge ${v.check_out_time ? 'badge-success' : 'badge-warning'} badge-small">
            ${v.check_out_time ? 'Selesai' : 'Aktif'}
        </div>
        <div class="text-xs text-muted mt-1">${new Date(v.check_in_time).toLocaleDateString('id-ID')}</div>
      </div>
    </div>
  `).join('');
}

function getScoreColor(score) {
  if (score >= 80) return '#00f2fe';
  if (score >= 60) return '#667eea';
  return '#fc6767';
}

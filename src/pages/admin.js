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

          <div class="stat-card warning">
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
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
            <button class="btn btn-primary" onclick="window.location.hash='#admin/karyawan'">
              <span>👥</span>
              <span>Kelola Karyawan</span>
            </button>
            <button class="btn btn-success" onclick="window.location.hash='#admin/orders'">
              <span>📦</span>
              <span>Lihat Semua Omset</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/katalog'">
              <span>🛍️</span>
              <span>Kelola Katalog</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/histori'">
              <span>📜</span>
              <span>Riwayat Aktivitas</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/targets'">
              <span>🎯</span>
              <span>Target Tim</span>
            </button>
            <button class="btn btn-outline" onclick="window.location.hash='#admin/settings'">
              <span>⚙️</span>
              <span>Pengaturan</span>
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
           <!-- Latest Omset -->
           <div class="card">
             <div class="card-header">
               <h3 class="card-title">Omset Terbaru</h3>
             </div>
             <div id="latest-orders-list"></div>
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
      const [ordersRes, customersRes] = await Promise.all([
        db.getOrders(),
        db.getCustomers()
      ]);

      const allOrders = ordersRes.data || [];
      const allCustomers = customersRes.data || [];

      // Filter for this month
      const startDt = new Date(start);
      const endDt = new Date(end);
      // Adjust endDt to end of day
      endDt.setHours(23, 59, 59, 999);

      const periodOrders = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= startDt && d <= endDt;
      });

      const periodCustomers = allCustomers.filter(c => {
        const d = new Date(c.created_at);
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

          // Visit count is 0 if table missing/RPC failed
          const visitCount = 0;

          // Calculate Score
          // (Visits * 2) + (New Cust * 10) + (Orders * 5)
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

    // 5. Load Latest Orders for Widget
    // Just take the first 5 from the raw fetch if we did it, or fetch again. 
    // For simplicity, fetch is cheap or browser cache might help, but let's just call db.getOrders() if we didn't already.
    // Actually we can just call it independently.
    const { data: recentOrders } = await db.getOrders();
    renderLatestOrders(recentOrders ? recentOrders.slice(0, 5) : []);

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
    <tr onclick="window.location.hash='#admin/histori?user_id=${row.user_id}'" style="cursor: pointer;">
      <td>
        <strong>${row.user_name}</strong><br>
        <small class="text-muted">Sales: ${formatCurrency(row.total_sales)}</small>
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
  if (!orders.length) {
    container.innerHTML = '<p class="text-muted text-center">Belum ada order masuk.</p>';
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="flex justify-between items-center p-2 border-bottom">
      <div>
        <div style="font-weight: 500;">${o.customers?.name || 'Unknown'}</div>
        <small class="text-muted">by ${o.users?.name || 'Staff'}</small>
      </div>
      <div class="text-right">
        <div style="font-weight: 600;">${formatCurrency(o.total_amount)}</div>
        <span class="badge badge-small badge-outline">${o.status}</span>
      </div>
    </div>
  `).join('');
}

function getScoreColor(score) {
  if (score >= 80) return '#00f2fe';
  if (score >= 60) return '#667eea';
  return '#fc6767';
}

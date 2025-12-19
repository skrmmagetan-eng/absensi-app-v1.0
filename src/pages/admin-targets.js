import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { renderNavbar } from '../components/navigation.js';
import { showNotification, showLoading, hideLoading, formatDate, formatCurrency } from '../utils/helpers.js';

export async function renderAdminTargetsPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg">
          <h1>🎯 Monitoring Target Tim</h1>
          <p style="color: var(--text-muted);">Pantau perencanaan dan progres omset karyawan</p>
        </div>

        <div class="card p-0 mb-lg overflow-hidden">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Karyawan</th>
                            <th>Nama Target</th>
                            <th>Nilai Omset</th>
                            <th class="text-center">Status</th>
                            <th>Deadline</th>
                        </tr>
                    </thead>
                    <tbody id="admin-targets-table">
                        <tr><td colspan="5" class="text-center p-3">Memuat data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  `;

    await loadAllTargets();
}

async function loadAllTargets() {
    const tbody = document.getElementById('admin-targets-table');

    try {
        // We'll need a new method to get all plans
        const { data, error } = await db.getAllSalesPlans();
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3">Belum ada data target dari karyawan.</td></tr>';
            return;
        }

        const statusBadges = {
            planning: 'badge-outline',
            on_progress: 'badge-warning',
            goal: 'badge-success',
            failed: 'badge-danger'
        };

        const statusLabels = {
            planning: 'Perencanaan',
            on_progress: 'Proses',
            goal: 'GOAL',
            failed: 'Gagal'
        };

        tbody.innerHTML = data.map(t => `
            <tr>
                <td>
                    <strong>${t.users?.name || 'Unknown'}</strong>
                </td>
                <td>
                    <div>${t.target_name}</div>
                    <small class="text-muted">${t.notes || ''}</small>
                </td>
                <td class="font-bold text-primary">
                    ${formatCurrency(t.target_amount)}
                </td>
                <td class="text-center">
                    <span class="badge ${statusBadges[t.current_status]}">
                        ${statusLabels[t.current_status]}
                    </span>
                </td>
                <td>
                    <span class="${new Date(t.deadline) < new Date() && t.current_status !== 'goal' ? 'text-danger font-bold' : ''}">
                        ${t.deadline ? formatDate(t.deadline) : '-'}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-3 text-danger">Gagal memuat data: ${err.message}</td></tr>`;
    }
}

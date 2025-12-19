import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import { showNotification, showLoading, hideLoading, formatDate, formatCurrency } from '../utils/helpers.js';

let targetsCache = [];

export async function renderTargetsPage() {
    const app = document.getElementById('app');
    const profile = state.getState('profile');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="flex justify-between items-center mb-lg">
          <div>
            <h1>🎯 Target & Perencanaan</h1>
            <p style="color: var(--text-muted);">Kelola sasaran omset dan pelanggan Anda</p>
          </div>
          <button class="btn btn-primary" id="add-target-btn">
            <span>➕</span>
            <span>Tambah Target</span>
          </button>
        </div>

        <!-- Targets List -->
        <div id="targets-list" class="flex flex-col gap-md">
            <div class="text-center p-xl"><div class="spinner"></div></div>
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

    document.getElementById('add-target-btn').addEventListener('click', showAddTargetModal);

    await loadTargets();
}

async function loadTargets() {
    const user = state.getState('user');
    const container = document.getElementById('targets-list');

    try {
        const { data, error } = await db.getSalesPlans(user.id);
        if (error) throw error;

        targetsCache = data || [];

        if (targetsCache.length === 0) {
            container.innerHTML = `
                <div class="card text-center p-xl">
                    <div style="font-size: 3rem; opacity: 0.5;">🎯</div>
                    <p class="text-muted mt-sm">Belum ada perencanaan target. Mulai buat sekarang!</p>
                </div>
            `;
            return;
        }

        const statusIcons = {
            planning: '📝',
            on_progress: '⏳',
            goal: '✅',
            failed: '❌'
        };

        const statusLabels = {
            planning: 'Perencanaan',
            on_progress: 'Dalam Proses',
            goal: 'Berhasil (Goal)',
            failed: 'Gagal'
        };

        container.innerHTML = targetsCache.map(t => `
            <div class="card">
                <div class="flex justify-between items-start mb-sm">
                    <div>
                        <h3 class="card-title">${t.target_name}</h3>
                        <p class="text-sm text-muted">${t.notes || 'Tidak ada catatan'}</p>
                    </div>
                    <span class="badge ${t.current_status === 'goal' ? 'badge-success' : 'badge-outline'}">
                        ${statusIcons[t.current_status]} ${statusLabels[t.current_status]}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-md mt-md">
                    <div>
                        <small class="text-muted block text-xs">TARGET OMSET</small>
                        <div class="font-bold text-primary">${formatCurrency(t.target_amount)}</div>
                    </div>
                    <div class="text-right">
                        <small class="text-muted block text-xs">DEADLINE</small>
                        <div class="font-bold">${t.deadline ? formatDate(t.deadline) : '-'}</div>
                    </div>
                </div>

                <div class="mt-md pt-md border-top flex justify-between items-center">
                    <small class="text-xs text-muted">Dibuat: ${formatDate(t.created_at)}</small>
                    <div class="flex gap-2">
                        <button class="btn btn-ghost btn-small" onclick="window.editTargetStatus('${t.id}')">⚙️ Update Status</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Global functions for onclick
        window.editTargetStatus = editTargetStatus;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="alert alert-danger">Gagal memuat data: ${err.message}</div>`;
    }
}

async function showAddTargetModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">🆕 Tambah Perencanaan Target</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-target-form">
                    <div class="form-group">
                        <label class="form-label">Nama Target / Pelanggan</label>
                        <input type="text" id="target-name" class="form-input" placeholder="Contoh: Closing PT. ABC" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Target Nilai Omset (Rp)</label>
                        <input type="number" id="target-amount" class="form-input" placeholder="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Batas Waktu (Deadline)</label>
                        <input type="date" id="target-deadline" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Catatan Strategi</label>
                        <textarea id="target-notes" class="form-textarea" rows="3" placeholder="Bagaimana proses mencapainya?"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="btn-cancel">Batal</button>
                        <button type="submit" class="btn btn-primary">Simpan Target</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').onclick = close;
    overlay.querySelector('#btn-cancel').onclick = close;

    overlay.querySelector('#add-target-form').onsubmit = async (e) => {
        e.preventDefault();
        const user = state.getState('user');

        const data = {
            employee_id: user.id,
            target_name: document.getElementById('target-name').value,
            target_amount: Number(document.getElementById('target-amount').value),
            deadline: document.getElementById('target-deadline').value,
            notes: document.getElementById('target-notes').value,
            current_status: 'planning'
        };

        showLoading('Menyimpan target...');
        try {
            const { error } = await db.createSalesPlan(data);
            if (error) throw error;

            close();
            showNotification('Target berhasil disimpan! Semangat!', 'success');
            loadTargets();
        } catch (err) {
            showNotification('Gagal: ' + err.message, 'danger');
        } finally {
            hideLoading();
        }
    };
}

async function editTargetStatus(id) {
    const target = targetsCache.find(t => t.id === id);
    if (!target) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">⚙️ Update Status Target</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p class="mb-md">Update perkembangan untuk <strong>${target.target_name}</strong></p>
                <div class="grid grid-cols-1 gap-sm">
                    <button class="btn ${target.current_status === 'planning' ? 'btn-primary' : 'btn-outline'}" onclick="window.updateStatus('${id}', 'planning')">📝 Perencanaan</button>
                    <button class="btn ${target.current_status === 'on_progress' ? 'btn-primary' : 'btn-outline'}" onclick="window.updateStatus('${id}', 'on_progress')">⏳ Dalam Proses</button>
                    <button class="btn ${target.current_status === 'goal' ? 'btn-primary' : 'btn-outline'}" onclick="window.updateStatus('${id}', 'goal')">✅ Goal / Selesai</button>
                    <button class="btn ${target.current_status === 'failed' ? 'btn-primary' : 'btn-outline'}" onclick="window.updateStatus('${id}', 'failed')">❌ Gagal</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').onclick = close;

    window.updateStatus = async (targetId, newStatus) => {
        showLoading('Memperbarui status...');
        try {
            const { error } = await db.updateSalesPlan(targetId, {
                current_status: newStatus,
                updated_at: new Date().toISOString()
            });
            if (error) throw error;

            close();
            showNotification('Status target diperbarui!', 'success');
            loadTargets();
        } catch (err) {
            showNotification('Gagal: ' + err.message, 'danger');
        } finally {
            hideLoading();
        }
    };
}

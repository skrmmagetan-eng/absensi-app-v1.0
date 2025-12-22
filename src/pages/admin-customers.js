import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { renderNavbar } from '../components/navigation.js';
import { showLoading, hideLoading, showNotification, formatDate, createModal, geo } from '../utils/helpers.js';
import L from 'leaflet';

let allCustomers = [];
let employees = [];

export async function renderAdminCustomersPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg flex justify-between items-center">
          <div>
            <h1>👥 Database Pelanggan</h1>
            <p style="color: var(--text-muted);">Seluruh pelanggan yang terdaftar di sistem</p>
          </div>
          <button class="btn btn-outline" onclick="window.location.reload()">🔄 Refresh</button>
        </div>

        <!-- Search & Filter Bar -->
        <div class="card mb-lg p-md">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div class="form-group mb-0">
                    <label class="form-label">Cari Nama / Alamat</label>
                    <input type="text" id="cust-search" class="form-input" placeholder="🔍 Cari pelanggan...">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Filter Sales</label>
                    <select id="cust-filter-sales" class="form-input">
                        <option value="all">Semua Sales</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Customer Count -->
        <div class="mb-md text-sm text-muted">
            Menampilkan <span id="cust-count" class="font-bold text-primary">0</span> pelanggan
        </div>

        <!-- List Area -->
        <div id="admin-cust-list" class="flex flex-col gap-md">
            <div class="text-center p-xl"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
    `;

    // Event Listeners
    document.getElementById('cust-search').addEventListener('input', applyFilters);
    document.getElementById('cust-filter-sales').addEventListener('change', applyFilters);

    await Promise.all([
        loadSalesOptions(),
        loadAllCustomers()
    ]);
}

async function loadSalesOptions() {
    const select = document.getElementById('cust-filter-sales');
    try {
        const { data } = await db.getAllEmployees();
        employees = data || [];
        select.innerHTML = '<option value="all">Semua Sales</option>' +
            employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadAllCustomers() {
    const container = document.getElementById('admin-cust-list');
    try {
        const { data, error } = await db.getCustomers(); // Passing no ID should get all if handled in lib
        if (error) throw error;

        allCustomers = data || [];
        renderList(allCustomers);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Gagal memuat data: ${err.message}</div>`;
    }
}

function renderList(list) {
    const container = document.getElementById('admin-cust-list');
    document.getElementById('cust-count').textContent = list.length;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="card p-xl text-center">
                <div style="font-size: 3rem; opacity: 0.5;">👥</div>
                <p class="text-muted mt-sm">Data pelanggan tidak ditemukan.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(c => `
        <div class="card hover-bg">
            <div class="flex justify-between items-start">
                <div class="flex gap-md items-center">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--bg-tertiary); display:flex; align-items:center; justify-content:center; font-size: 1.25rem;">
                        🏢
                    </div>
                    <div>
                        <h4 class="mb-0 text-primary">${c.name}</h4>
                        <div class="text-sm text-muted">📍 ${c.address}</div>
                        <div class="flex gap-2 mt-xs">
                             <span class="badge badge-outline badge-small">👤 ${c.users?.name || 'Unknown'}</span>
                             <span class="text-xs text-muted" style="align-self:center;">Daftar: ${formatDate(c.created_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="text-right flex flex-col items-end gap-2">
                    <div class="text-sm font-bold">${c.phone || '-'}</div>
                    <div class="flex gap-2">
                        <button class="btn btn-primary btn-small" onclick="window.viewCustomerMap('${c.id}')">📍 Lokasi</button>
                        <button class="btn btn-outline btn-small" onclick="window.location.hash='#admin/histori?user_id=${c.employee_id}'">📊 Histori</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function applyFilters() {
    const query = document.getElementById('cust-search').value.toLowerCase();
    const salesId = document.getElementById('cust-filter-sales').value;

    const filtered = allCustomers.filter(c => {
        const matchesQuery = c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query);
        const matchesSales = salesId === 'all' || c.employee_id === salesId;
        return matchesQuery && matchesSales;
    });

    renderList(filtered);
}

window.viewCustomerMap = async (customerId) => {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
        showNotification('Pelanggan tidak ditemukan', 'danger');
        return;
    }

    showLoading('Memuat detail pelanggan...');

    try {
        // Get customer statistics
        console.log('📊 Loading visit statistics for admin view...');
        const { data: visitStats, error: visitError } = await db.supabase
            .from('attendance')
            .select('id, check_in_time, check_out_time, notes')
            .eq('customer_id', customerId)
            .order('check_in_time', { ascending: false })
            .limit(5);

        if (visitError) {
            console.warn('⚠️ Error loading visit stats:', visitError);
            // Don't throw error, just continue with empty stats
        }

        console.log('📈 Visit stats loaded:', visitStats);

        const totalVisits = visitStats?.length || 0;
        const thisMonthVisits = visitStats?.filter(v => {
            try {
                const visitDate = new Date(v.check_in_time);
                const now = new Date();
                return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
            } catch (e) {
                console.warn('Date parsing error:', e);
                return false;
            }
        }).length || 0;

        const lastVisit = visitStats?.[0];
        let lastVisitText = 'Belum pernah dikunjungi';
        
        if (lastVisit) {
            try {
                const lastVisitDate = new Date(lastVisit.check_in_time);
                const daysDiff = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
                lastVisitText = `${lastVisitDate.toLocaleDateString('id-ID')} (${daysDiff} hari lalu)`;
            } catch (e) {
                console.warn('Date calculation error:', e);
                lastVisitText = 'Data tidak valid';
            }
        }

        console.log('📊 Statistics calculated:', { totalVisits, thisMonthVisits, lastVisitText });

        hideLoading();

        const modalContent = `
            <div style="line-height: 1.6;">
              <!-- Customer Info -->
              <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                  <div>
                    <div style="color: #6c757d; font-size: 0.8rem;">📍 ALAMAT</div>
                    <div style="font-weight: 500; color: #212529;">${customer.address || 'Tidak ada alamat'}</div>
                  </div>
                  <div>
                    <div style="color: #6c757d; font-size: 0.8rem;">📞 TELEPON</div>
                    <div style="font-weight: 500; color: #212529;">${customer.phone || 'Tidak ada nomor'}</div>
                  </div>
                </div>
              </div>

              <!-- Location Info -->
              <div style="margin-bottom: 16px;">
                <div style="color: #6c757d; font-size: 0.8rem; margin-bottom: 0.5rem;">🗺️ KOORDINAT</div>
                <div style="font-family: monospace; background: #e9ecef; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; color: #495057;">
                  ${customer.latitude}, ${customer.longitude}
                </div>
              </div>

              <!-- Statistics -->
              <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1976d2;">📊 Statistik Kunjungan</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; text-align: center; font-size: 0.85rem;">
                  <div>
                    <div style="font-weight: 600; color: #1976d2; font-size: 1.2rem;">${totalVisits}</div>
                    <div style="color: #6c757d;">Total</div>
                  </div>
                  <div>
                    <div style="font-weight: 600; color: #388e3c; font-size: 1.2rem;">${thisMonthVisits}</div>
                    <div style="color: #6c757d;">Bulan Ini</div>
                  </div>
                  <div>
                    <div style="font-weight: 600; color: #f57c00; font-size: 0.9rem;">${lastVisitText.split('(')[0]}</div>
                    <div style="color: #6c757d;">Terakhir</div>
                  </div>
                </div>
              </div>

              <!-- Recent Visits -->
              ${visitStats && visitStats.length > 0 ? `
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1976d2;">📅 Riwayat Terakhir</div>
                  <div style="max-height: 120px; overflow-y: auto;">
                    ${visitStats.slice(0, 3).map(visit => {
                      try {
                        const checkInDate = new Date(visit.check_in_time);
                        const checkInTime = checkInDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
                        const checkOutTime = visit.check_out_time ? new Date(visit.check_out_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : '';
                        
                        return `
                          <div style="display: flex; justify-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #dee2e6; font-size: 0.85rem;">
                            <div>
                              <div style="font-weight: 500; color: #212529;">${checkInDate.toLocaleDateString('id-ID')}</div>
                              ${visit.notes ? `<div style="color: #6c757d; font-size: 0.8rem;">${visit.notes.substring(0, 30)}${visit.notes.length > 30 ? '...' : ''}</div>` : ''}
                            </div>
                            <div style="color: #6c757d; font-size: 0.8rem;">
                              ${checkInTime}${checkOutTime ? ` - ${checkOutTime}` : ''}
                            </div>
                          </div>
                        `;
                      } catch (e) {
                        console.warn('Visit rendering error:', e);
                        return '<div style="color: #dc3545; font-size: 0.8rem;">Data tidak valid</div>';
                      }
                    }).join('')}
                  </div>
                </div>
              ` : `
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1976d2;">📅 Riwayat Terakhir</div>
                  <div style="text-align: center; padding: 1rem; color: #6c757d; font-style: italic;">
                    Belum ada riwayat kunjungan
                  </div>
                </div>
              `}

              <!-- Notes -->
              ${customer.notes ? `
                <div style="margin-bottom: 16px;">
                  <div style="color: #6c757d; font-size: 0.8rem; margin-bottom: 0.5rem;">📝 CATATAN</div>
                  <div style="background: #f8f9fa; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; font-style: italic; color: #495057;">
                    "${customer.notes}"
                  </div>
                </div>
              ` : ''}

              <!-- Admin Info -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">👨‍💼 Panel Admin</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">
                  Data pelanggan dan statistik kunjungan untuk monitoring dan analisis.
                </div>
              </div>
            </div>
          `;

        console.log('🎨 Admin modal content prepared, showing modal...');

        const action = await createModal(
            `👤 ${customer.name}`,
            modalContent,
            [
                { label: 'Tutup', action: 'close', type: 'outline' },
                { label: '📞 Telepon', action: 'call', type: 'outline', hidden: !customer.phone },
                { label: '🗺️ Buka Maps', action: 'maps', type: 'outline' },
                { label: '📊 Lihat Histori', action: 'history', type: 'primary' }
            ].filter(btn => !btn.hidden)
        );

        console.log('👆 Admin action:', action);

        // Handle actions
        if (action === 'call' && customer.phone) {
            window.open(`tel:${customer.phone}`);
        } else if (action === 'maps') {
            const mapsUrl = `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`;
            window.open(mapsUrl, '_blank');
        } else if (action === 'history') {
            window.location.hash = `#admin/histori?user_id=${customer.employee_id}`;
        }

    } catch (error) {
        hideLoading();
        console.error('❌ Error in admin viewCustomerMap:', error);
        showNotification(error.message || 'Gagal memuat detail pelanggan', 'danger');
    }
};

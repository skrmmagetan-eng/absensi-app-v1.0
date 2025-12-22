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
                        <button class="btn btn-primary btn-small" onclick="window.showCustomerDetail('${c.id}')">📍 Detail</button>
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

// ===== FUNGSI BARU: VIEW CUSTOMER DETAIL =====
// Dibuat ulang dari awal untuk menghindari masalah cache dan kode lama

window.showCustomerDetail = async (customerId) => {
    console.log('🆕 NEW showCustomerDetail called with ID:', customerId);
    
    // Cari customer dari data yang sudah dimuat
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
        showNotification('Data pelanggan tidak ditemukan', 'danger');
        return;
    }

    showLoading('Memuat detail pelanggan...');

    try {
        // Ambil statistik kunjungan
        const { data: visitStats, error: visitError } = await db.supabase
            .from('attendance')
            .select('id, check_in_time, check_out_time, notes')
            .eq('customer_id', customerId)
            .order('check_in_time', { ascending: false })
            .limit(10);

        if (visitError) {
            console.warn('⚠️ Error loading visit stats:', visitError);
        }

        // Hitung statistik
        const totalVisits = visitStats?.length || 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const thisMonthVisits = visitStats?.filter(v => {
            const visitDate = new Date(v.check_in_time);
            return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear;
        }).length || 0;

        // Kunjungan terakhir
        const lastVisit = visitStats?.[0];
        let lastVisitInfo = 'Belum pernah dikunjungi';
        
        if (lastVisit) {
            const lastDate = new Date(lastVisit.check_in_time);
            const daysDiff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            lastVisitInfo = `${lastDate.toLocaleDateString('id-ID')} (${daysDiff} hari lalu)`;
        }

        hideLoading();

        // Buat konten modal yang bersih
        const modalHTML = `
            <div style="line-height: 1.6; font-family: 'Inter', sans-serif;">
              
              <!-- Info Kontak -->
              <div style="background: #f8f9fa; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <div style="color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">📍 Alamat</div>
                    <div style="font-weight: 500; color: #212529; font-size: 14px;">${customer.address || 'Tidak ada alamat'}</div>
                  </div>
                  <div>
                    <div style="color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">📞 Telepon</div>
                    <div style="font-weight: 500; color: #212529; font-size: 14px;">${customer.phone || 'Tidak ada nomor'}</div>
                  </div>
                </div>
              </div>

              <!-- Koordinat -->
              <div style="margin-bottom: 20px;">
                <div style="color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">🗺️ Koordinat GPS</div>
                <div style="font-family: 'Courier New', monospace; background: #e9ecef; padding: 12px; border-radius: 8px; font-size: 13px; color: #495057; border-left: 4px solid #007bff;">
                  ${customer.latitude}, ${customer.longitude}
                </div>
              </div>

              <!-- Statistik Kunjungan -->
              <div style="background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                <div style="font-weight: 700; margin-bottom: 12px; color: #1976d2; font-size: 16px;">📊 Statistik Kunjungan</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
                  <div>
                    <div style="font-weight: 700; color: #1976d2; font-size: 24px; margin-bottom: 4px;">${totalVisits}</div>
                    <div style="color: #6c757d; font-size: 12px; font-weight: 500;">Total Kunjungan</div>
                  </div>
                  <div>
                    <div style="font-weight: 700; color: #388e3c; font-size: 24px; margin-bottom: 4px;">${thisMonthVisits}</div>
                    <div style="color: #6c757d; font-size: 12px; font-weight: 500;">Bulan Ini</div>
                  </div>
                  <div>
                    <div style="font-weight: 700; color: #f57c00; font-size: 14px; margin-bottom: 4px;">${lastVisitInfo.split('(')[0]}</div>
                    <div style="color: #6c757d; font-size: 12px; font-weight: 500;">Terakhir</div>
                  </div>
                </div>
              </div>

              <!-- Riwayat Kunjungan -->
              ${visitStats && visitStats.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <div style="font-weight: 700; margin-bottom: 12px; color: #1976d2; font-size: 16px;">📅 Riwayat Kunjungan</div>
                  <div style="max-height: 150px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 8px;">
                    ${visitStats.slice(0, 5).map(visit => {
                      const checkInDate = new Date(visit.check_in_time);
                      const checkInTime = checkInDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
                      const checkOutTime = visit.check_out_time ? new Date(visit.check_out_time).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) : '';
                      
                      return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f8f9fa;">
                          <div>
                            <div style="font-weight: 600; color: #212529; font-size: 14px;">${checkInDate.toLocaleDateString('id-ID')}</div>
                            ${visit.notes ? `<div style="color: #6c757d; font-size: 12px; margin-top: 2px;">${visit.notes.substring(0, 40)}${visit.notes.length > 40 ? '...' : ''}</div>` : ''}
                          </div>
                          <div style="color: #6c757d; font-size: 12px; text-align: right;">
                            <div>${checkInTime}${checkOutTime ? ` - ${checkOutTime}` : ''}</div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : `
                <div style="margin-bottom: 20px;">
                  <div style="font-weight: 700; margin-bottom: 12px; color: #1976d2; font-size: 16px;">📅 Riwayat Kunjungan</div>
                  <div style="text-align: center; padding: 24px; color: #6c757d; font-style: italic; background: #f8f9fa; border-radius: 8px;">
                    Belum ada riwayat kunjungan
                  </div>
                </div>
              `}

              <!-- Catatan -->
              ${customer.notes ? `
                <div style="margin-bottom: 20px;">
                  <div style="color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">📝 Catatan</div>
                  <div style="background: #fff3cd; padding: 12px; border-radius: 8px; font-size: 14px; color: #856404; border-left: 4px solid #ffc107;">
                    "${customer.notes}"
                  </div>
                </div>
              ` : ''}

              <!-- Info Admin -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px;">
                <div style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">👨‍💼 Panel Administrator</div>
                <div style="font-size: 13px; opacity: 0.9; line-height: 1.4;">
                  Informasi lengkap pelanggan dan analisis kunjungan untuk keperluan monitoring dan evaluasi kinerja.
                </div>
              </div>
            </div>
        `;

        // Tampilkan modal baru
        const userAction = await createModal(
            `👤 ${customer.name}`,
            modalHTML,
            [
                { label: 'Tutup', action: 'close', type: 'outline' },
                { label: '📞 Telepon', action: 'call', type: 'outline', hidden: !customer.phone },
                { label: '🗺️ Buka Maps', action: 'maps', type: 'outline' },
                { label: '📊 Lihat Histori', action: 'history', type: 'primary' }
            ].filter(btn => !btn.hidden)
        );

        // Handle aksi user
        if (userAction === 'call' && customer.phone) {
            window.open(`tel:${customer.phone}`);
        } else if (userAction === 'maps') {
            const mapsUrl = `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`;
            window.open(mapsUrl, '_blank');
        } else if (userAction === 'history') {
            window.location.hash = `#admin/histori?user_id=${customer.employee_id}`;
        }

    } catch (error) {
        hideLoading();
        console.error('❌ Error in showCustomerDetail:', error);
        showNotification('Gagal memuat detail pelanggan: ' + error.message, 'danger');
    }
};

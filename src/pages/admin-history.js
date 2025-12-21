import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { formatTime, formatDate, formatCurrency, showLoading, hideLoading, getTodayDateString, formatOrderItems, showNotification } from '../utils/helpers.js';
import { renderNavbar } from '../components/navigation.js';

let employees = [];
let selectedEmployeeId = 'all';
let startDate = getTodayDateString();
let endDate = getTodayDateString();
let currentTab = 'visits'; // 'visits' or 'orders'

export async function renderAdminHistoryPage() {
    const app = document.getElementById('app');

    // Parse URL params for initial filters
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    selectedEmployeeId = params.get('user_id') || 'all';

    // Set default date range to today if not set
    if (!startDate) startDate = getTodayDateString();
    if (!endDate) endDate = getTodayDateString();

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="mb-lg">
          <h1>📋 Riwayat Seluruh User</h1>
          <p style="color: var(--text-muted);">Pantau aktivitas kunjungan dan omset tim Anda</p>
        </div>

        <!-- Filters Section -->
        <div class="card p-md mb-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div class="form-group mb-0">
                    <label class="form-label">Karyawan</label>
                    <select id="filter-user" class="form-input">
                        <option value="all">Semua Karyawan</option>
                        <!-- Options will be loaded dynamically -->
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Dari Tanggal</label>
                    <input type="date" id="filter-start-date" class="form-input" value="${startDate}">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Sampai Tanggal</label>
                    <input type="date" id="filter-end-date" class="form-input" value="${endDate}">
                </div>
            </div>
            <div class="mt-md flex justify-end">
                <button class="btn btn-primary" id="btn-apply-filters">
                    🔍 Terapkan Filter
                </button>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex justify-between items-center mb-md">
          <div class="card p-2 bg-tertiary flex gap-2" style="border-radius: var(--radius-full); display: inline-flex;">
              <button class="btn btn-small ${currentTab === 'visits' ? 'btn-primary' : 'btn-ghost'}" id="tab-visits">
                  📍 Kunjungan
              </button>
              <button class="btn btn-small ${currentTab === 'orders' ? 'btn-primary' : 'btn-ghost'}" id="tab-orders">
                  📦 Omset Barang
              </button>
          </div>
          
          <div class="flex gap-sm">
            <button class="btn btn-outline" id="import-visits-btn" style="display: ${currentTab === 'visits' ? 'block' : 'none'};">
              <span>📁</span>
              <span>Import Kunjungan CSV</span>
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div id="admin-history-content">
            <div class="text-center p-xl"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

    // Attach Events
    document.getElementById('tab-visits').addEventListener('click', () => switchTab('visits'));
    document.getElementById('tab-orders').addEventListener('click', () => switchTab('orders'));
    document.getElementById('btn-apply-filters').addEventListener('click', applyFilters);
    document.getElementById('import-visits-btn').addEventListener('click', showImportVisitsModal);

    // Load Workers & Initial Data
    await Promise.all([
        loadEmployeeOptions(),
        loadHistoryData()
    ]);
}

async function loadEmployeeOptions() {
    const select = document.getElementById('filter-user');
    try {
        const { data } = await db.getAllEmployees();
        employees = data || [];

        select.innerHTML = '<option value="all">Semua Karyawan</option>' +
            employees.map(emp => `<option value="${emp.id}" ${selectedEmployeeId === emp.id ? 'selected' : ''}>${emp.name}</option>`).join('');
    } catch (err) {
        console.error('Error loading employees:', err);
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-visits').className = `btn btn-small ${tab === 'visits' ? 'btn-primary' : 'btn-ghost'}`;
    document.getElementById('tab-orders').className = `btn btn-small ${tab === 'orders' ? 'btn-primary' : 'btn-ghost'}`;
    
    // Show/hide import button based on tab
    const importBtn = document.getElementById('import-visits-btn');
    importBtn.style.display = tab === 'visits' ? 'block' : 'none';
    
    loadHistoryData();
}

function applyFilters() {
    selectedEmployeeId = document.getElementById('filter-user').value;
    startDate = document.getElementById('filter-start-date').value;
    endDate = document.getElementById('filter-end-date').value;
    loadHistoryData();
}

async function loadHistoryData() {
    const container = document.getElementById('admin-history-content');
    container.innerHTML = '<div class="text-center p-xl"><div class="spinner"></div></div>';

    try {
        const startTimestamp = `${startDate}T00:00:00`;
        const endTimestamp = `${endDate}T23:59:59`;

        if (currentTab === 'visits') {
            let { data: visits, error } = await db.getAllAttendance(startTimestamp, endTimestamp);
            if (error) throw error;

            // Client side filter for user if needed (though we could add it to db.getAllAttendance)
            if (selectedEmployeeId !== 'all') {
                visits = visits.filter(v => v.employee_id === selectedEmployeeId);
            }

            renderVisitsList(visits, container);
        } else {
            let { data: orders, error } = await db.getOrders();
            if (error) throw error;

            // Filter by date and user
            const startDt = new Date(startDate);
            const endDt = new Date(endDate);
            endDt.setHours(23, 59, 59, 999);

            let filteredOrders = orders.filter(o => {
                const d = new Date(o.created_at);
                const matchUser = selectedEmployeeId === 'all' || o.employee_id === selectedEmployeeId;
                const matchDate = d >= startDt && d <= endDt;
                return matchUser && matchDate;
            });

            renderOrdersList(filteredOrders, container);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="card text-center p-xl border-danger">
                <p class="text-danger">Gagal memuat data: ${err.message}</p>
                <button class="btn btn-outline btn-small mt-sm" onclick="loadHistoryData()">Coba Lagi</button>
            </div>
        `;
    }
}

function renderVisitsList(visits, container) {
    if (!visits || visits.length === 0) {
        container.innerHTML = emptyState('Tidak ada riwayat kunjungan pada periode ini.');
        return;
    }

    container.innerHTML = `
        <div class="flex flex-col gap-md">
            ${visits.map(v => `
                <div class="card card-expandable" onclick="this.classList.toggle('active')">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="card-title text-primary mb-0">${v.customers?.name || 'Unknown'}</h3>
                            <small class="badge badge-outline mt-1">👤 ${v.users?.name || 'Unknown Staff'}</small>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <span class="badge ${v.check_out_time ? 'badge-success' : 'badge-warning'}">
                                ${v.check_out_time ? 'Selesai' : 'Berlangsung'}
                            </span>
                            <div class="text-xs text-muted mt-1 font-bold">${formatDate(v.check_in_time)}</div>
                            <span class="chevron-icon mt-2">▼</span>
                        </div>
                    </div>
                    
                    <!-- Hidden Detail -->
                    <div class="expand-content mt-md border-top pt-md">
                        <div class="grid grid-cols-2 gap-sm text-sm p-sm bg-tertiary rounded">
                            <div>
                                <div class="text-muted text-xs">CHECK IN</div>
                                <div>${formatTime(v.check_in_time)}</div>
                            </div>
                            <div>
                                <div class="text-muted text-xs">CHECK OUT</div>
                                <div>${v.check_out_time ? formatTime(v.check_out_time) : '-'}</div>
                            </div>
                        </div>

                        ${v.notes || v.photo_url ? `
                            <div class="mt-sm text-sm">
                                ${v.notes ? `<p class="mb-2 p-2 bg-secondary rounded">📝 "${v.notes}"</p>` : ''}
                                ${v.photo_url ? `<a href="${v.photo_url}" target="_blank" class="btn btn-outline btn-small w-full">📸 Lihat Bukti Foto</a>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderOrdersList(orders, container) {
    if (!orders || orders.length === 0) {
        container.innerHTML = emptyState('Tidak ada riwayat pesanan pada periode ini.');
        return;
    }

    const statusColors = {
        pending: 'warning',
        approved: 'primary',
        loading: 'primary',
        shipped: 'info',
        completed: 'success',
        cancelled: 'danger'
    };

    container.innerHTML = `
        <div class="flex flex-col gap-md">
            ${orders.map(o => `
                <div class="card card-expandable" onclick="this.classList.toggle('active')">
                     <div class="flex justify-between items-start">
                        <div>
                             <h3 class="card-title mb-0">${o.customers?.name || 'Unknown'}</h3>
                             <small class="badge badge-outline mt-1">👤 ${o.users?.name || 'Unknown Staff'}</small>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            <span class="badge badge-${statusColors[o.status] || 'outline'}">
                                ${o.status.toUpperCase()}
                            </span>
                            <div class="font-bold text-primary mt-1">${formatCurrency(o.total_amount)}</div>
                            <span class="chevron-icon mt-1">▼</span>
                        </div>
                    </div>

                    <!-- Hidden Detail -->
                    <div class="expand-content mt-md border-top pt-md">
                        <div class="text-sm mb-sm p-sm bg-tertiary rounded" style="white-space: pre-wrap;">
                            <div class="text-muted text-xs mb-1">DETAIL BARANG:</div>
                            ${o.items_summary || formatOrderItems(o.items)}
                            ${o.notes ? `<div class="mt-2 pt-2 border-top"><strong>Catatan:</strong><br>${o.notes}</div>` : ''}
                        </div>
                        <div class="flex justify-between items-center text-xs text-muted">
                            <span>ID: #${o.id.substring(0, 8)}</span>
                            <span>${formatDate(o.created_at)} ${formatTime(o.created_at)}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <style>
            .card-expandable { cursor: pointer; transition: all 0.3s ease; }
            .card-expandable:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
            .expand-content { display: none; overflow: hidden; animation: slideDown 0.3s ease-out; }
            .card-expandable.active .expand-content { display: block; }
            .chevron-icon { transition: transform 0.3s ease; opacity: 0.5; font-size: 0.75rem; }
            .card-expandable.active .chevron-icon { transform: rotate(180deg); opacity: 1; }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;
}

function emptyState(msg) {
    return `
        <div class="text-center py-5">
            <div style="font-size: 3rem; opacity: 0.5;">📜</div>
            <p class="text-muted mt-sm">${msg}</p>
        </div>
    `;
}

// Import Visits CSV Modal
function showImportVisitsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 700px;">
        <div class="modal-header">
          <h3 class="modal-title">📁 Import Data Kunjungan dari CSV</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="mb-md">
            <div class="flex justify-between items-center mb-sm">
              <h4>Format CSV yang Diperlukan:</h4>
              <button class="btn btn-outline btn-small" id="download-visits-template-btn">
                <span>⬇️</span>
                <span>Download Template</span>
              </button>
            </div>
            <div class="card" style="background: var(--bg-secondary); padding: var(--spacing-sm); margin: var(--spacing-sm) 0;">
              <code style="font-size: 11px; display: block; white-space: pre;">tanggal,nama,lokasi,catatan,foto,petugas,img_foto
2/5/2025 14:45,Pak Sukadi,"-7.668678,111.287454",Cek kandang eks broiler,https://drive.google.com/...,Purwanto,https://drive.google.com/uc?export=view&id=...
3/5/2025 15:05,Budi,"-7.633924,111.289592",Konsultasi kandang koloni,https://drive.google.com/...,Purwanto,https://drive.google.com/uc?export=view&id=...</code>
            </div>
            <p style="color: var(--text-muted); font-size: 14px;">
              <strong>Catatan:</strong> 
              • Kolom wajib: <code>tanggal</code>, <code>nama</code>, <code>petugas</code><br>
              • Format tanggal: <code>DD/MM/YYYY HH:MM</code><br>
              • Lokasi: <code>latitude,longitude</code> atau <code>latitude;longitude</code> (opsional)<br>
              • Petugas harus sudah terdaftar di sistem
            </p>
          </div>
          
          <div class="form-group">
            <label class="form-label">Pilih File CSV</label>
            <input type="file" id="visits-csv-file-input" class="form-input" accept=".csv" required>
          </div>
          
          <div id="visits-csv-preview" style="display: none;">
            <h4>Preview Data (5 baris pertama):</h4>
            <div class="table-container" style="max-height: 200px; overflow-y: auto;">
              <table class="table" id="visits-preview-table">
                <thead id="visits-preview-header"></thead>
                <tbody id="visits-preview-body"></tbody>
              </table>
            </div>
            <p id="visits-total-rows" style="color: var(--text-muted); margin-top: var(--spacing-sm);"></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-visits-import-cancel">Batal</button>
          <button class="btn btn-primary" id="btn-visits-import-process" disabled>Import Data</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event Handlers
    const close = () => { document.body.removeChild(overlay); };
    
    overlay.querySelector('.modal-close').onclick = close;
    overlay.querySelector('#btn-visits-import-cancel').onclick = close;
    
    // Download template handler
    overlay.querySelector('#download-visits-template-btn').onclick = () => {
        downloadVisitsCSVTemplate();
    };
    
    // File input handler
    const fileInput = overlay.querySelector('#visits-csv-file-input');
    const processBtn = overlay.querySelector('#btn-visits-import-process');
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await previewVisitsCSV(file);
            processBtn.disabled = false;
        }
    });
    
    // Process import
    processBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (file) {
            close();
            await processVisitsCSVImport(file);
        }
    };
}

// Download visits CSV template
function downloadVisitsCSVTemplate() {
    const csvContent = `tanggal,nama,lokasi,catatan,foto,petugas,img_foto
2/5/2025 14:45,Pak Sukadi,"-7.668678,111.287454",Cek kandang eks broiler,https://drive.google.com/file/d/1xoqJCBmDg9O4ca0JCg5wYbybzZB-sKYH/view,Purwanto,https://drive.google.com/uc?export=view&id=1xoqJCBmDg9O4ca0JCg5wYbybzZB-sKYH
3/5/2025 15:05,Budi,"-7.633924,111.289592",Konsultasi kandang koloni DOC,https://drive.google.com/file/d/1DduarB3YaQpVt40FyFjuwUa6lyIn4pM1/view,Purwanto,https://drive.google.com/uc?export=view&id=1DduarB3YaQpVt40FyFjuwUa6lyIn4pM1`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'template_kunjungan.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Preview visits CSV content
async function previewVisitsCSV(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                showNotification('File CSV harus memiliki minimal header dan 1 baris data', 'warning');
                return;
            }
            
            // Parse header
            const headers = parseCSVLine(lines[0]);
            
            // Parse preview data (first 5 rows)
            const previewData = lines.slice(1, 6).map(line => parseCSVLine(line));
            
            // Show preview
            const previewDiv = document.getElementById('visits-csv-preview');
            const headerElement = document.getElementById('visits-preview-header');
            const bodyElement = document.getElementById('visits-preview-body');
            const totalRowsElement = document.getElementById('visits-total-rows');
            
            // Build header
            headerElement.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
            
            // Build body
            bodyElement.innerHTML = previewData.map(row => 
                `<tr>${row.map(cell => `<td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${cell || '-'}</td>`).join('')}</tr>`
            ).join('');
            
            totalRowsElement.textContent = `Total: ${lines.length - 1} baris data`;
            previewDiv.style.display = 'block';
            
            resolve();
        };
        reader.readAsText(file);
    });
}

// Parse CSV line (simple parser)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Process visits CSV import
async function processVisitsCSVImport(file) {
    showLoading('Memproses import kunjungan...');
    
    try {
        const csv = await readFileAsText(file);
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('File CSV tidak valid');
        }
        
        // Parse header and data
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const dataRows = lines.slice(1).map(line => parseCSVLine(line));
        
        // Validate required columns
        const requiredColumns = ['tanggal', 'nama', 'petugas'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            throw new Error(`Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`);
        }
        
        // Get all employees for mapping
        const { data: allEmployees } = await db.getAllEmployees();
        const employeeMap = {};
        allEmployees.forEach(emp => {
            employeeMap[emp.name.toLowerCase()] = emp.id;
        });
        
        // Get all customers for mapping
        const { data: allCustomers } = await db.getCustomers();
        const customerMap = {};
        allCustomers.forEach(cust => {
            customerMap[cust.name.toLowerCase()] = cust.id;
        });
        
        // Process each row
        let successCount = 0;
        let errorCount = 0;
        let newCustomersCount = 0;
        const errors = [];
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowData = {};
            
            // Map row data to object
            headers.forEach((header, index) => {
                rowData[header] = row[index] || '';
            });
            
            // Skip empty rows
            if (!rowData.tanggal || !rowData.nama || !rowData.petugas) {
                continue;
            }
            
            try {
                await createVisitFromCSV(rowData, employeeMap, customerMap);
                successCount++;
                
                // Check if we created a new customer
                if (!customerMap[rowData.nama.toLowerCase()]) {
                    newCustomersCount++;
                    // Add to map for future rows
                    customerMap[rowData.nama.toLowerCase()] = 'new';
                }
            } catch (error) {
                errorCount++;
                errors.push(`Baris ${i + 2}: ${error.message}`);
            }
        }
        
        hideLoading();
        
        // Show results
        let message = `Import selesai: ${successCount} kunjungan berhasil`;
        if (newCustomersCount > 0) {
            message += `, ${newCustomersCount} pelanggan baru dibuat`;
        }
        if (errorCount > 0) {
            message += `, ${errorCount} gagal`;
        }
        
        showNotification(message, errorCount > 0 ? 'warning' : 'success');
        
        if (errors.length > 0 && errors.length <= 5) {
            console.log('Import errors:', errors);
            setTimeout(() => {
                alert('Beberapa data gagal diimport:\n\n' + errors.join('\n'));
            }, 1000);
        }
        
        // Reload history data
        loadHistoryData();
        
    } catch (error) {
        hideLoading();
        showNotification('Gagal import: ' + error.message, 'danger');
    }
}

// Create visit from CSV data
async function createVisitFromCSV(rowData, employeeMap, customerMap) {
    // Parse date
    const dateStr = rowData.tanggal;
    let visitDate;
    
    try {
        // Handle format: "2/5/2025 14:45" or "02/05/2025 14:45"
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute] = (timePart || '12:00').split(':');
        
        visitDate = new Date(
            parseInt(year),
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            parseInt(hour),
            parseInt(minute)
        );
        
        if (isNaN(visitDate.getTime())) {
            throw new Error('Format tanggal tidak valid');
        }
    } catch (e) {
        throw new Error(`Format tanggal tidak valid: ${dateStr}`);
    }
    
    // Find employee
    const employeeName = rowData.petugas.toLowerCase().trim();
    const employeeId = employeeMap[employeeName];
    
    if (!employeeId) {
        throw new Error(`Petugas tidak ditemukan: ${rowData.petugas}`);
    }
    
    // Find or create customer
    const customerName = rowData.nama.trim();
    let customerId = customerMap[customerName.toLowerCase()];
    
    if (!customerId) {
        // Create new customer
        const newCustomerData = {
            name: customerName,
            employee_id: employeeId,
            created_at: new Date().toISOString()
        };
        
        // Parse location if available
        if (rowData.lokasi && (rowData.lokasi.includes(',') || rowData.lokasi.includes(';'))) {
            // Handle both comma and semicolon separators
            const separator = rowData.lokasi.includes(',') ? ',' : ';';
            const [lat, lng] = rowData.lokasi.split(separator);
            if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                newCustomerData.latitude = parseFloat(lat);
                newCustomerData.longitude = parseFloat(lng);
            }
        }
        
        const { data: newCustomer, error: customerError } = await db.createCustomer(newCustomerData);
        if (customerError) throw new Error(`Gagal membuat pelanggan: ${customerError.message}`);
        
        customerId = newCustomer.id;
    }
    
    // Create attendance record
    const attendanceData = {
        employee_id: employeeId,
        customer_id: customerId,
        check_in_time: visitDate.toISOString(),
        check_out_time: visitDate.toISOString(), // Assume visit is completed
        notes: rowData.catatan || null,
        photo_url: rowData.img_foto || rowData.foto || null,
        created_at: visitDate.toISOString()
    };
    
    // Parse location for attendance if available
    if (rowData.lokasi && (rowData.lokasi.includes(',') || rowData.lokasi.includes(';'))) {
        // Handle both comma and semicolon separators
        const separator = rowData.lokasi.includes(',') ? ',' : ';';
        const [lat, lng] = rowData.lokasi.split(separator);
        if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            attendanceData.latitude = parseFloat(lat);
            attendanceData.longitude = parseFloat(lng);
        }
    }
    
    const { error: attendanceError } = await db.checkIn(attendanceData);
    if (attendanceError) throw new Error(`Gagal membuat kunjungan: ${attendanceError.message}`);
}

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

import { db, supabase } from '../lib/supabase.js'; // Import supabase main client for env vars
import { createClient } from '@supabase/supabase-js'; // Import factory for temp client
import { renderNavbar } from '../components/navigation.js';
import { showNotification, showLoading, hideLoading, createModal, formatDate } from '../utils/helpers.js';
import { customReset } from '../utils/custom-reset.js';

let employeesCache = [];

export async function renderAdminEmployeesPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container">
        <div class="flex justify-between items-center mb-lg">
          <div>
            <h1>👥 Manajemen Karyawan</h1>
            <p style="color: var(--text-muted);">Kelola data dan akses karyawan</p>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-outline" id="import-csv-btn">
              <span>📁</span>
              <span>Import CSV</span>
            </button>
            <button class="btn btn-primary" id="add-employee-btn">
              <span>➕</span>
              <span>Tambah Karyawan</span>
            </button>
          </div>
        </div>

        <!-- Employees List -->
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Lokasi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="employees-table-body">
                <tr><td colspan="4" class="text-center p-3">Memuat data...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Global handler
  window.editEmployee = (id) => {
    const emp = employeesCache.find(e => e.id === id);
    if (emp) showEditEmployeeModal(emp);
  };

  await loadEmployees();

  // Event Listener
  document.getElementById('add-employee-btn').addEventListener('click', showAddEmployeeModal);
  document.getElementById('import-csv-btn').addEventListener('click', showImportCSVModal);
}

async function loadEmployees() {
  const tbody = document.getElementById('employees-table-body');
  try {
    const { data: employees, error } = await db.getAllEmployees();

    if (error) throw error;

    if (!employees || employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center p-3">Belum ada karyawan.</td></tr>';
      return;
    }

    employeesCache = employees;

    tbody.innerHTML = employees.map(emp => `
      <tr>
        <td>
          <div class="flex items-center gap-sm">
            ${emp.avatar_url ? `<img src="${emp.avatar_url}" alt="${emp.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` : '👤'}
            <div>
              <strong>${emp.name}</strong><br>
              <span class="badge ${emp.role === 'admin' ? 'badge-primary' : (emp.role === 'manager' ? 'badge-warning' : 'badge-outline')} text-xs">
                ${emp.role.toUpperCase()}
              </span>
              ${emp.notes ? `<br><small style="color: var(--text-muted);">${emp.notes}</small>` : ''}
            </div>
          </div>
        </td>
        <td>${emp.email}</td>
        <td>${emp.location || '-'}</td>
        <td>
          <span class="badge ${emp.status === 'inactive' ? 'badge-danger' : 'badge-success'}">
            ${emp.status === 'inactive' ? 'Nonaktif' : 'Aktif'}
          </span>
        </td>
        <td>
          <div class="flex gap-xs">
            <button class="btn btn-outline btn-small" onclick="window.editEmployee('${emp.id}')" title="Edit Profil">✏️</button>
            <button class="btn btn-outline btn-small" onclick="window.resetEmployeePassword('${emp.email}')" title="Reset Password (Email)">📧</button>
            <button class="btn btn-outline btn-small" onclick="window.customResetPassword('${emp.email}', '${emp.phone}', '${emp.name}')" title="Reset Password (WhatsApp)">📱</button>
            <button class="btn btn-outline btn-small text-danger" onclick="window.deleteEmployee('${emp.id}', '${emp.name}')" title="Hapus Akun">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Global handlers
    window.customResetPassword = async (email, phone, name) => {
      if (!phone) {
        showNotification('Nomor telepon tidak tersedia untuk karyawan ini', 'warning');
        return;
      }

      const proceed = confirm(`🔐 RESET PASSWORD VIA WHATSAPP\n\nKirim kode reset password ke:\n📱 ${phone}\n👤 ${name}\n📧 ${email}\n\nKode akan berlaku selama 30 menit.\n\nLanjutkan?`);
      
      if (proceed) {
        showLoading('Membuat kode reset...');
        
        try {
          const result = await customReset.initiateCustomReset(email, phone, name);
          
          hideLoading();
          
          if (result.success) {
            // Show success modal with WhatsApp link
            const modal = createModal('Reset Password Berhasil', `
              <div class="text-center">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h3>Kode Reset Dibuat!</h3>
                <div class="bg-tertiary p-md rounded mb-md">
                  <div class="text-lg font-bold text-primary">${result.token}</div>
                  <div class="text-sm text-muted">Kode berlaku sampai ${new Date(result.expiresAt).toLocaleTimeString('id-ID')}</div>
                </div>
                
                <div class="flex flex-col gap-sm">
                  <a href="${result.whatsappLink}" target="_blank" class="btn btn-primary w-full">
                    📱 Kirim via WhatsApp
                  </a>
                  <button onclick="navigator.clipboard.writeText('${result.smsMessage}')" class="btn btn-outline w-full">
                    📋 Copy Pesan SMS
                  </button>
                  <button onclick="navigator.clipboard.writeText('${result.token}')" class="btn btn-ghost w-full">
                    🔑 Copy Kode Saja
                  </button>
                </div>
                
                <div class="mt-md text-sm text-muted">
                  <p>📝 Instruksi untuk karyawan:</p>
                  <p>1. Buka aplikasi absensi</p>
                  <p>2. Klik "Lupa Password?"</p>
                  <p>3. Masukkan kode reset</p>
                  <p>4. Buat password baru</p>
                </div>
              </div>
            `, 'Tutup');
            
            // Copy to clipboard notification
            document.addEventListener('click', function(e) {
              if (e.target.textContent.includes('Copy')) {
                showNotification('Disalin ke clipboard!', 'success');
              }
            });
            
          } else {
            showNotification(`Gagal membuat kode reset: ${result.error}`, 'danger');
          }
          
        } catch (error) {
          hideLoading();
          console.error('Custom reset error:', error);
          showNotification('Terjadi kesalahan sistem', 'danger');
        }
      }
    };

    window.resetEmployeePassword = async (email) => {
      const proceed = confirm(`Apakah Anda ingin mengirim email instruksi Reset Password ke ${email}?\n\nCatatan: Pastikan email template sudah dikonfigurasi di Supabase Dashboard.`);
      if (proceed) {
        showLoading('Mengirim permintaan reset...');
        
        try {
          const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '#login',
          });
          
          hideLoading();
          
          if (error) {
            console.error('Reset password error:', error);
            showNotification(`Gagal mengirim email reset: ${error.message}`, 'danger');
            
            // Show additional troubleshooting info
            if (error.message.includes('Email not confirmed')) {
              alert('⚠️ TROUBLESHOOTING:\n\n1. Email belum dikonfirmasi\n2. Cek folder spam/junk\n3. Pastikan email template aktif di Supabase\n4. Coba reset manual di Supabase Dashboard');
            } else if (error.message.includes('Invalid email')) {
              alert('⚠️ Email tidak valid atau tidak terdaftar di sistem');
            } else {
              alert(`⚠️ TROUBLESHOOTING:\n\nError: ${error.message}\n\n1. Cek konfigurasi SMTP di Supabase\n2. Pastikan email template "Reset Password" sudah diaktifkan\n3. Cek Authentication > Settings > Email Templates\n4. Verifikasi SMTP credentials`);
            }
          } else {
            console.log('Reset password success:', data);
            showNotification(`✅ Email reset password berhasil dikirim ke ${email}`, 'success');
            
            // Show additional info
            setTimeout(() => {
              alert(`📧 EMAIL TERKIRIM!\n\n✅ Instruksi reset password telah dikirim ke: ${email}\n\n📝 Instruksi untuk user:\n1. Cek inbox email (termasuk folder spam)\n2. Klik link "Reset Password" di email\n3. Masukkan password baru\n4. Login dengan password baru\n\n⏰ Link akan expired dalam 1 jam`);
            }, 1000);
          }
        } catch (err) {
          hideLoading();
          console.error('Unexpected error:', err);
          showNotification('Terjadi kesalahan sistem', 'danger');
          alert(`⚠️ SISTEM ERROR:\n\n${err.message}\n\nSilakan coba lagi atau reset manual di Supabase Dashboard`);
        }
      }
    };

    window.deleteEmployee = async (id, name) => {
      const proceed = confirm(`⚠️ PERINGATAN: Menghapus "${name}" akan menghilangkan datanya dari tabel staf.\n\nAkun login (Auth) harus dihapus secara manual di Dashboard Supabase demi alasan keamanan.\n\nApakah Anda yakin ingin menghapus data profil staf ini?`);
      if (proceed) {
        showLoading('Menghapus data...');
        const { error } = await db.deleteUser(id);
        hideLoading();
        if (error) showNotification('Gagal: ' + error.message, 'danger');
        else {
          showNotification('Data karyawan berhasil dihapus', 'success');
          loadEmployees();
        }
      }
    };

  } catch (error) {
    console.error('Load employees error:', error);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center p-3 text-danger">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

async function showAddEmployeeModal() {
  // Manual Modal Implementation to handle Form Data correctly
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">👤 Tambah Karyawan Baru</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="add-employee-form">
          <div class="form-group">
            <label class="form-label">Nama Lengkap</label>
            <input type="text" id="new-name" class="form-input" required placeholder="Contoh: Budi Santoso">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="new-email" class="form-input" required placeholder="email@karyawan.com">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="text" id="new-password" class="form-input" required placeholder="Minimal 6 karakter" value="123456">
            <small style="color: var(--text-muted);">Default password, minta karyawan segera menggantinya.</small>
          </div>
          <div class="form-group">
            <label class="form-label">Role / Jabatan</label>
            <select id="new-role" class="form-input">
               <option value="employee">Employee (Sales/Field)</option>
               <option value="manager">Manager (Supervisor)</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-cancel">Batal</button>
        <button class="btn btn-primary" id="btn-save">Simpan</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event Handlers
  const close = () => { document.body.removeChild(overlay); };

  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('#btn-cancel').onclick = close;

  overlay.querySelector('#btn-save').onclick = async () => {
    // Capture values properly
    const name = document.getElementById('new-name').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;

    if (!name || !email || !password) {
      showNotification('Mohon lengkapi semua data', 'warning');
      return;
    }

    // Close first, then process
    close();

    // Process
    await handleAddEmployee(name, email, password, role);
  };
}

// Edit Modal
function showEditEmployeeModal(emp) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Edit Karyawan</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="edit-employee-form">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input type="text" id="edit-name" class="form-input" required value="${emp.name}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" id="edit-email" class="form-input" disabled value="${emp.email}" style="background: var(--bg-tertiary); opacity: 0.7;">
              <small class="text-xs text-muted">Email tidak dapat diubah dari sini.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Lokasi</label>
              <input type="text" id="edit-location" class="form-input" value="${emp.location || ''}" placeholder="Contoh: Jakarta">
            </div>
            <div class="form-group">
              <label class="form-label">Catatan</label>
              <textarea id="edit-notes" class="form-input" rows="2" placeholder="Catatan tambahan">${emp.notes || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">URL Foto Profil</label>
              <input type="url" id="edit-avatar" class="form-input" value="${emp.avatar_url || ''}" placeholder="https://...">
            </div>
            <div class="form-group">
               <label class="form-label">Role / Jabatan</label>
               <select id="edit-role" class="form-input">
                  <option value="employee" ${emp.role === 'employee' ? 'selected' : ''}>Employee (Sales/Field)</option>
                  <option value="manager" ${emp.role === 'manager' ? 'selected' : ''}>Manager (Supervisor)</option>
               </select>
            </div>
            <div class="form-group">
               <label class="form-label">Status Akun</label>
               <select id="edit-status" class="form-input">
                  <option value="active" ${emp.status !== 'inactive' ? 'selected' : ''}>Aktif</option>
                  <option value="inactive" ${emp.status === 'inactive' ? 'selected' : ''}>Nonaktif (Blokir Akses)</option>
               </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-edit-cancel">Batal</button>
          <button class="btn btn-primary" id="btn-edit-save">Simpan Perubahan</button>
        </div>
      </div>
    `;

  document.body.appendChild(overlay);

  const close = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };

  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('#btn-edit-cancel').onclick = close;

  overlay.querySelector('#btn-edit-save').onclick = async () => {
    const newName = document.getElementById('edit-name').value;
    const newLocation = document.getElementById('edit-location').value;
    const newNotes = document.getElementById('edit-notes').value;
    const newAvatar = document.getElementById('edit-avatar').value;
    const newRole = document.getElementById('edit-role').value;
    const newStatus = document.getElementById('edit-status').value;

    if (!newName) {
      showNotification('Nama tidak boleh kosong', 'warning');
      return;
    }

    close();
    await handleEditEmployee(emp.id, {
      name: newName,
      location: newLocation,
      notes: newNotes,
      avatar_url: newAvatar,
      role: newRole,
      status: newStatus
    });
  };
}

async function handleEditEmployee(id, updates) {
  showLoading('Menyimpan perubahan...');
  try {
    const { error } = await db.updateUserProfile(id, updates);
    if (error) throw error;

    hideLoading();
    showNotification('Data karyawan diperbarui', 'success');
    loadEmployees(); // Refresh list
  } catch (e) {
    hideLoading();
    showNotification('Gagal update: ' + e.message, 'danger');
  }
}

async function handleAddEmployee(name, email, password, role) {
  showLoading('Mendaftarkan karyawan...');

  try {
    // TRICK: Create a temporary client to avoid logging out the admin
    // We grab the URL and Key from the main instance's environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Create a new client with no storage persistence (in-memory)
    // This ensures the main session in localStorage is NOT touched
    const tempClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Critical!
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // 1. Sign Up the user (this creates Auth user)
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('Gagal membuat user auth.');
    }

    const newUserId = authData.user.id;

    // 2. Insert into public.users (Profile) using the MAIN client (Admin session)
    // Admin has RLS rights to insert/update
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: newUserId,
        email: email,
        name: name,
        role: role,
        status: 'active',
        created_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    hideLoading();
    showNotification(`Karyawan ${name} berhasil didaftarkan!`, 'success');

    // Reload list
    loadEmployees();

  } catch (error) {
    hideLoading();
    console.error('Add Employee Error:', error);
    showNotification('Gagal: ' + error.message, 'danger');
  }
}

// Import CSV Modal
function showImportCSVModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">📁 Import Data Karyawan dari CSV</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="mb-md">
          <div class="flex justify-between items-center mb-sm">
            <h4>Format CSV yang Diperlukan:</h4>
            <button class="btn btn-outline btn-small" id="download-template-btn">
              <span>⬇️</span>
              <span>Download Template</span>
            </button>
          </div>
          <div class="card" style="background: var(--bg-secondary); padding: var(--spacing-sm); margin: var(--spacing-sm) 0;">
            <code style="font-size: 12px; display: block; white-space: pre;">nama,email,lokasi,catatan,foto,penjualan,link_foto
Adi Saputra,adi@example.com,Jakarta,Sales terbaik,foto1.jpg,5000000,https://...
Budi Santoso,budi@example.com,Bandung,Manager area,foto2.jpg,3000000,https://...</code>
          </div>
          <p style="color: var(--text-muted); font-size: 14px;">
            <strong>Catatan:</strong> Kolom yang wajib ada: <code>nama</code> dan <code>email</code>. 
            Password default akan diset ke <code>123456</code> untuk semua karyawan.
          </p>
        </div>
        
        <div class="form-group">
          <label class="form-label">Pilih File CSV</label>
          <input type="file" id="csv-file-input" class="form-input" accept=".csv" required>
        </div>
        
        <div id="csv-preview" style="display: none;">
          <h4>Preview Data (5 baris pertama):</h4>
          <div class="table-container" style="max-height: 200px; overflow-y: auto;">
            <table class="table" id="preview-table">
              <thead id="preview-header"></thead>
              <tbody id="preview-body"></tbody>
            </table>
          </div>
          <p id="total-rows" style="color: var(--text-muted); margin-top: var(--spacing-sm);"></p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" id="btn-import-cancel">Batal</button>
        <button class="btn btn-primary" id="btn-import-process" disabled>Import Data</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event Handlers
  const close = () => { document.body.removeChild(overlay); };
  
  overlay.querySelector('.modal-close').onclick = close;
  overlay.querySelector('#btn-import-cancel').onclick = close;
  
  // Download template handler
  overlay.querySelector('#download-template-btn').onclick = () => {
    downloadCSVTemplate();
  };
  
  // File input handler
  const fileInput = overlay.querySelector('#csv-file-input');
  const processBtn = overlay.querySelector('#btn-import-process');
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await previewCSV(file);
      processBtn.disabled = false;
    }
  });
  
  // Process import
  processBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (file) {
      close();
      await processCSVImport(file);
    }
  };
}

// Preview CSV content
async function previewCSV(file) {
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
      const previewDiv = document.getElementById('csv-preview');
      const headerElement = document.getElementById('preview-header');
      const bodyElement = document.getElementById('preview-body');
      const totalRowsElement = document.getElementById('total-rows');
      
      // Build header
      headerElement.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
      
      // Build body
      bodyElement.innerHTML = previewData.map(row => 
        `<tr>${row.map(cell => `<td>${cell || '-'}</td>`).join('')}</tr>`
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

// Process CSV import
async function processCSVImport(file) {
  showLoading('Memproses import CSV...');
  
  try {
    const csv = await readFileAsText(file);
    const lines = csv.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('File CSV tidak valid');
    }
    
    // Parse header and data
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    const dataRows = lines.slice(1).map(line => parseCSVLine(line));
    
    // Validate required columns
    const requiredColumns = ['nama', 'email'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}`);
    }
    
    // Process each row
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowData = {};
      
      // Map row data to object
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });
      
      // Skip empty rows
      if (!rowData.nama || !rowData.email) {
        continue;
      }
      
      try {
        await createEmployeeFromCSV(rowData);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(`Baris ${i + 2}: ${error.message}`);
      }
    }
    
    hideLoading();
    
    // Show results
    let message = `Import selesai: ${successCount} berhasil`;
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
    
    // Reload employees list
    loadEmployees();
    
  } catch (error) {
    hideLoading();
    showNotification('Gagal import: ' + error.message, 'danger');
  }
}

// Create employee from CSV data
async function createEmployeeFromCSV(rowData) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Create temp client
  const tempClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  
  // Default password
  const defaultPassword = '123456';
  
  // Create auth user
  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email: rowData.email,
    password: defaultPassword,
  });
  
  if (authError) {
    throw new Error(`Auth error: ${authError.message}`);
  }
  
  if (!authData.user) {
    throw new Error('Gagal membuat user auth');
  }
  
  // Create profile
  const profileData = {
    id: authData.user.id,
    email: rowData.email,
    name: rowData.nama,
    role: 'employee', // Default role
    status: 'active',
    created_at: new Date().toISOString()
  };
  
  // Add optional fields if available
  if (rowData.lokasi) profileData.location = rowData.lokasi;
  if (rowData.catatan) profileData.notes = rowData.catatan;
  if (rowData.link_foto) profileData.avatar_url = rowData.link_foto;
  if (rowData.penjualan) {
    // Convert penjualan to number, remove any non-numeric characters except dots
    const salesAmount = parseFloat(rowData.penjualan.toString().replace(/[^\d.]/g, ''));
    if (!isNaN(salesAmount)) {
      profileData.sales_amount = salesAmount;
    }
  }
  
  const { error: dbError } = await supabase
    .from('users')
    .upsert(profileData);
  
  if (dbError) {
    throw new Error(`Database error: ${dbError.message}`);
  }
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

// Download CSV template
function downloadCSVTemplate() {
  const csvContent = `nama,email,lokasi,catatan,foto,penjualan,link_foto
Adi Saputra,adi@example.com,Jakarta,Sales terbaik,foto1.jpg,5000000,https://drive.google.com/file/d/1234/view
Budi Santoso,budi@example.com,Bandung,Manager area,foto2.jpg,3000000,https://drive.google.com/file/d/5678/view
Citra Dewi,citra@example.com,Surabaya,Karyawan baru,foto3.jpg,1500000,https://drive.google.com/file/d/9012/view`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_karyawan.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

import { db, supabase } from '../lib/supabase.js'; // Import supabase main client for env vars
import { createClient } from '@supabase/supabase-js'; // Import factory for temp client
import { renderNavbar } from '../components/navigation.js';
import { showNotification, showLoading, hideLoading, createModal, formatDate } from '../utils/helpers.js';
import { simpleReset } from '../utils/simple-reset.js';

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
            <button class="btn btn-outline" id="export-report-btn">
              <span>📊</span>
              <span>Export Laporan</span>
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
  document.getElementById('export-report-btn').addEventListener('click', exportEmployeeReport);
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
            <button class="btn btn-outline btn-small" onclick="window.customResetPassword('${emp.email}', '${emp.phone}', '${emp.name}')" title="Reset Password">🔑</button>
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
          console.log('🔐 Testing custom reset for:', { email, phone, name });
          
          const result = await simpleReset.initiateReset(email, phone, name);
          
          hideLoading();
          
          if (result.success) {
            console.log('✅ Custom reset successful:', result);
            
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
            console.error('❌ Custom reset failed:', result.error);
            
            // Show detailed error with troubleshooting
            let errorMessage = `Gagal membuat kode reset: ${result.error}`;
            let troubleshooting = '';
            
            if (result.error.includes('password_reset_tokens')) {
              troubleshooting = `\n\n🔧 TROUBLESHOOTING:\n1. Buka Supabase Dashboard\n2. Pilih SQL Editor\n3. Jalankan script create_reset_tokens_table.sql\n4. Coba lagi setelah tabel dibuat`;
            } else if (result.error.includes('Permission denied')) {
              troubleshooting = `\n\n🔧 TROUBLESHOOTING:\n1. Pastikan Anda login sebagai admin\n2. Cek RLS policies di Supabase\n3. Verifikasi role user di database`;
            } else if (result.error.includes('User tidak ditemukan')) {
              troubleshooting = `\n\n🔧 TROUBLESHOOTING:\n1. Pastikan email karyawan terdaftar\n2. Cek tabel users di database\n3. Verifikasi data karyawan`;
            } else if (result.error.includes('Service role key')) {
              troubleshooting = `\n\n🔧 TROUBLESHOOTING:\n1. Tambahkan VITE_SUPABASE_SERVICE_KEY ke file .env\n2. Dapatkan service_role key dari Supabase Dashboard\n3. Restart aplikasi setelah update .env\n4. Baca file FIX_RESET_PASSWORD_WA.md untuk panduan lengkap`;
            } else if (result.error.includes('Nomor telepon tidak tersedia')) {
              troubleshooting = `\n\n🔧 TROUBLESHOOTING:\n1. Pastikan field 'phone' terisi di data karyawan\n2. Update data karyawan di halaman admin\n3. Format nomor: 08xxx atau +62xxx`;
            }
            
            showNotification(errorMessage, 'danger');
            
            if (troubleshooting) {
              setTimeout(() => {
                alert(errorMessage + troubleshooting);
              }, 1000);
            }
          }
          
        } catch (error) {
          hideLoading();
          console.error('❌ Unexpected error:', error);
          showNotification('Terjadi kesalahan sistem', 'danger');
          
          setTimeout(() => {
            alert(`⚠️ SISTEM ERROR:\n\n${error.message}\n\n🔧 LANGKAH DEBUG:\n1. Buka Developer Tools (F12)\n2. Lihat Console untuk error detail\n3. Pastikan tabel database sudah dibuat\n4. Cek koneksi internet`);
          }, 1000);
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
          <div class="form-group">
            <label class="form-label">Foto Profil Karyawan</label>
            <div class="photo-upload-container" style="border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 10px;">
              <div id="new-photo-preview" style="margin-bottom: 15px;">
                <div style="width: 100px; height: 100px; border-radius: 50%; background: #f8f9fa; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 2px dashed #ddd;">
                  <span style="font-size: 2rem;">👤</span>
                </div>
              </div>
              <input type="file" id="new-photo-upload" accept="image/*" style="display: none;">
              <button type="button" class="btn btn-outline btn-small" onclick="document.getElementById('new-photo-upload').click()">
                📷 Pilih Foto
              </button>
              <div style="margin-top: 10px; font-size: 0.875rem; color: #6c757d;">
                Format: JPG, PNG, GIF (Max: 2MB)
              </div>
            </div>
            <input type="url" id="new-avatar" class="form-input" placeholder="Atau masukkan URL foto langsung">
            <small class="text-muted">Upload foto atau masukkan URL foto profil (opsional)</small>
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

  // Photo upload handler for new employee
  const newPhotoUpload = document.getElementById('new-photo-upload');
  const newAvatarInput = document.getElementById('new-avatar');
  const newPhotoPreview = document.getElementById('new-photo-preview');
  
  newPhotoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      showNotification('File harus berupa gambar (JPG, PNG, GIF)', 'danger');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB
      showNotification('Ukuran file maksimal 2MB', 'danger');
      return;
    }
    
    try {
      showLoading('Mengupload foto...');
      
      // Use the centralized upload function
      const { data: photoUrl, error: uploadError } = await db.uploadEmployeePhoto(file);
      
      if (uploadError) throw uploadError;
      
      // Update preview and input
      newPhotoPreview.innerHTML = `<img src="${photoUrl}" alt="Foto Profil" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #007bff;">`;
      newAvatarInput.value = photoUrl;
      
      hideLoading();
      showNotification('Foto berhasil diupload!', 'success');
      
    } catch (error) {
      hideLoading();
      console.error('Upload error:', error);
      showNotification('Gagal mengupload foto: ' + error.message, 'danger');
    }
  });

  overlay.querySelector('#btn-save').onclick = async () => {
    // Capture values properly
    const name = document.getElementById('new-name').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;
    const avatarUrl = document.getElementById('new-avatar').value;

    if (!name || !email || !password) {
      showNotification('Mohon lengkapi semua data', 'warning');
      return;
    }

    // Close first, then process
    close();

    // Process with avatar URL
    await handleAddEmployee({ name, email, password, role, avatar_url: avatarUrl });
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
              <label class="form-label">Foto Profil Karyawan</label>
              <div class="photo-upload-container" style="border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 10px;">
                <div id="current-photo-preview" style="margin-bottom: 15px;">
                  ${emp.avatar_url ? `<img src="${emp.avatar_url}" alt="Foto Profil" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #007bff;">` : '<div style="width: 100px; height: 100px; border-radius: 50%; background: #f8f9fa; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 2px dashed #ddd;"><span style="font-size: 2rem;">👤</span></div>'}
                </div>
                <input type="file" id="photo-upload" accept="image/*" style="display: none;">
                <button type="button" class="btn btn-outline btn-small" onclick="document.getElementById('photo-upload').click()">
                  📷 Pilih Foto Baru
                </button>
                <div style="margin-top: 10px; font-size: 0.875rem; color: #6c757d;">
                  Format: JPG, PNG, GIF (Max: 2MB)
                </div>
              </div>
              <input type="url" id="edit-avatar" class="form-input" value="${emp.avatar_url || ''}" placeholder="Atau masukkan URL foto langsung">
              <small class="text-muted">Upload foto atau masukkan URL foto profil</small>
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

  // Photo upload handler
  const photoUpload = document.getElementById('photo-upload');
  const avatarInput = document.getElementById('edit-avatar');
  const photoPreview = document.getElementById('current-photo-preview');
  
  photoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      showNotification('File harus berupa gambar (JPG, PNG, GIF)', 'danger');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB
      showNotification('Ukuran file maksimal 2MB', 'danger');
      return;
    }
    
    try {
      showLoading('Mengupload foto...');
      
      // Use the centralized upload function
      const { data: photoUrl, error: uploadError } = await db.uploadEmployeePhoto(file);
      
      if (uploadError) throw uploadError;
      
      // Update preview and input
      photoPreview.innerHTML = `<img src="${photoUrl}" alt="Foto Profil" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #007bff;">`;
      avatarInput.value = photoUrl;
      
      hideLoading();
      showNotification('Foto berhasil diupload!', 'success');
      
    } catch (error) {
      hideLoading();
      console.error('Upload error:', error);
      showNotification('Gagal mengupload foto: ' + error.message, 'danger');
    }
  });

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

async function handleAddEmployee(employeeData) {
  const { name, email, password, role, avatar_url } = employeeData;
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
        avatar_url: avatar_url || null, // Include avatar URL
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

// Export Employee Report
async function exportEmployeeReport() {
  try {
    showLoading('Menyiapkan laporan...');
    
    // Get all employees data
    const employees = await loadEmployees();
    
    if (!employees || employees.length === 0) {
      hideLoading();
      showNotification('Tidak ada data karyawan untuk diekspor', 'warning');
      return;
    }

    // Prepare CSV data
    const headers = [
      'Nama',
      'Email', 
      'Lokasi',
      'Role',
      'Status',
      'Tanggal Bergabung',
      'Nomor Telepon',
      'Total Kunjungan',
      'Kunjungan Bulan Ini'
    ];

    // Get additional data for each employee
    const enrichedData = await Promise.all(employees.map(async (emp) => {
      try {
        // Get visit statistics
        const { data: totalVisits } = await db.supabase
          .from('attendance')
          .select('id')
          .eq('user_id', emp.id);

        const { data: monthlyVisits } = await db.supabase
          .from('attendance')
          .select('id')
          .eq('user_id', emp.id)
          .gte('check_in_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        return {
          nama: emp.name || '-',
          email: emp.email || '-',
          lokasi: emp.location || '-',
          role: emp.role || 'employee',
          status: emp.status === 'inactive' ? 'Nonaktif' : 'Aktif',
          tanggal_bergabung: emp.created_at ? formatDate(emp.created_at) : '-',
          nomor_telepon: emp.phone || '-',
          total_kunjungan: totalVisits?.length || 0,
          kunjungan_bulan_ini: monthlyVisits?.length || 0
        };
      } catch (error) {
        console.error('Error enriching employee data:', error);
        return {
          nama: emp.name || '-',
          email: emp.email || '-',
          lokasi: emp.location || '-',
          role: emp.role || 'employee',
          status: emp.status === 'inactive' ? 'Nonaktif' : 'Aktif',
          tanggal_bergabung: emp.created_at ? formatDate(emp.created_at) : '-',
          nomor_telepon: emp.phone || '-',
          total_kunjungan: 0,
          kunjungan_bulan_ini: 0
        };
      }
    }));

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...enrichedData.map(row => [
        `"${row.nama}"`,
        `"${row.email}"`,
        `"${row.lokasi}"`,
        `"${row.role}"`,
        `"${row.status}"`,
        `"${row.tanggal_bergabung}"`,
        `"${row.nomor_telepon}"`,
        row.total_kunjungan,
        row.kunjungan_bulan_ini
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      link.setAttribute('download', `laporan-karyawan-${dateStr}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    hideLoading();
    showNotification(`✅ Laporan berhasil diekspor (${enrichedData.length} karyawan)`, 'success');

  } catch (error) {
    hideLoading();
    console.error('Export error:', error);
    showNotification('Gagal mengekspor laporan: ' + error.message, 'danger');
  }
}

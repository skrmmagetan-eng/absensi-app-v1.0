import { db, supabase } from '../lib/supabase.js'; // Import supabase main client for env vars
import { createClient } from '@supabase/supabase-js'; // Import factory for temp client
import { renderNavbar } from '../components/navigation.js';
import { showNotification, showLoading, hideLoading, createModal, formatDate } from '../utils/helpers.js';

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
          <button class="btn btn-primary" id="add-employee-btn">
            <span>➕</span>
            <span>Tambah Karyawan</span>
          </button>
        </div>

        <!-- Employees List -->
        <div class="card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
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
}

async function loadEmployees() {
  const tbody = document.getElementById('employees-table-body');
  try {
    const { data: employees, error } = await db.getAllEmployees();

    if (error) throw error;

    if (!employees || employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center p-3">Belum ada karyawan.</td></tr>';
      return;
    }

    employeesCache = employees;

    tbody.innerHTML = employees.map(emp => `
      <tr>
        <td>
          <strong>${emp.name}</strong><br>
          <span class="badge badge-outline text-small">${emp.role}</span>
        </td>
        <td>${emp.email}</td>
        <td><span class="badge badge-success">Aktif</span></td>
        <td>
          <button class="btn btn-outline btn-small" onclick="window.editEmployee('${emp.id}')">✏️</button>
        </td>
      </tr>
    `).join('');

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

    if (!name || !email || !password) {
      showNotification('Mohon lengkapi semua data', 'warning');
      return;
    }

    // Close first, then process
    close();

    // Process
    await handleAddEmployee(name, email, password);
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
               <label class="form-label">Role / Jabatan</label>
               <input type="text" id="edit-role" class="form-input" value="${emp.role || 'employee'}">
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
    const newRole = document.getElementById('edit-role').value;

    if (!newName) {
      showNotification('Nama tidak boleh kosong', 'warning');
      return;
    }

    close();
    await handleEditEmployee(emp.id, newName, newRole);
  };
}

async function handleEditEmployee(id, name, role) {
  showLoading('Menyimpan perubahan...');
  try {
    const { error } = await db.updateUserProfile(id, { name, role });
    if (error) throw error;

    hideLoading();
    showNotification('Data karyawan diperbarui', 'success');
    loadEmployees(); // Refresh list
  } catch (e) {
    hideLoading();
    showNotification('Gagal update: ' + e.message, 'danger');
  }
}

async function handleAddEmployee(name, email, password) {
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
        role: 'employee',
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

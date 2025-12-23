import { state } from '../lib/router.js';
import { db } from '../lib/supabase.js';
import { roleSecurity } from '../utils/role-security.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';

export async function renderDebugSecurityPage() {
  const app = document.getElementById('app');
  
  const user = state.getState('user');
  const profile = state.getState('profile');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container" style="max-width: 800px;">
        <div class="mb-lg">
          <button class="btn btn-outline" onclick="window.history.back()">
            <span>←</span> Kembali
          </button>
        </div>

        <div class="card mb-lg">
          <div class="card-header">
            <h2 class="card-title">🔍 Debug Keamanan</h2>
            <p class="card-subtitle">Informasi status login dan keamanan akun</p>
          </div>

          <div class="mb-md">
            <h3>Status Login Saat Ini</h3>
            <div class="bg-tertiary p-md border-radius-md">
              <div class="mb-sm">
                <strong>User ID:</strong> ${user?.id || 'Tidak ada'}
              </div>
              <div class="mb-sm">
                <strong>Email:</strong> ${user?.email || 'Tidak ada'}
              </div>
              <div class="mb-sm">
                <strong>Role:</strong> 
                <span class="badge ${profile?.role === 'admin' ? 'badge-primary' : (profile?.role === 'manager' ? 'badge-warning' : 'badge-outline')}">
                  ${profile?.role || 'Tidak ada'}
                </span>
              </div>
              <div class="mb-sm">
                <strong>Nama:</strong> ${profile?.name || 'Tidak ada'}
              </div>
              <div class="mb-sm">
                <strong>Status:</strong> 
                <span class="badge ${profile?.status === 'active' ? 'badge-success' : 'badge-danger'}">
                  ${profile?.status || 'Tidak ada'}
                </span>
              </div>
            </div>
          </div>

          <div class="mb-md">
            <button class="btn btn-primary" id="check-database-btn">
              🔍 Periksa Database
            </button>
            <button class="btn btn-outline" id="check-security-log-btn">
              📋 Lihat Log Keamanan
            </button>
            <button class="btn btn-outline" id="export-log-btn">
              💾 Export Log
            </button>
          </div>

          <div id="database-check-result" class="hidden">
            <h3>Hasil Pemeriksaan Database</h3>
            <div id="database-info" class="bg-tertiary p-md border-radius-md mb-md">
              <!-- Database info will be loaded here -->
            </div>
          </div>

          <div id="security-log-result" class="hidden">
            <h3>Log Keamanan</h3>
            <div id="security-log-info" class="bg-tertiary p-md border-radius-md mb-md" style="max-height: 300px; overflow-y: auto;">
              <!-- Security log will be loaded here -->
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚠️ Jika Mengalami Masalah</h3>
          </div>
          
          <div class="mb-md">
            <p>Jika Anda mengalami masalah role berubah otomatis:</p>
            <ol>
              <li>Klik "Periksa Database" untuk melihat data asli</li>
              <li>Logout dan login kembali</li>
              <li>Jika masalah berlanjut, hubungi administrator</li>
              <li>Export log keamanan untuk analisis lebih lanjut</li>
            </ol>
          </div>

          <button class="btn btn-danger" id="force-logout-btn">
            🚪 Force Logout
          </button>
        </div>
      </div>
    </div>

    ${renderBottomNav()}
  `;

  // Event listeners
  document.getElementById('check-database-btn').addEventListener('click', checkDatabase);
  document.getElementById('check-security-log-btn').addEventListener('click', showSecurityLog);
  document.getElementById('export-log-btn').addEventListener('click', exportSecurityLog);
  document.getElementById('force-logout-btn').addEventListener('click', forceLogout);
}

async function checkDatabase() {
  const user = state.getState('user');
  const resultDiv = document.getElementById('database-check-result');
  const infoDiv = document.getElementById('database-info');
  
  if (!user) {
    infoDiv.innerHTML = '<div class="text-danger">❌ Tidak ada user yang login</div>';
    resultDiv.classList.remove('hidden');
    return;
  }

  try {
    infoDiv.innerHTML = '<div>🔄 Memeriksa database...</div>';
    resultDiv.classList.remove('hidden');

    // Check current user profile
    const { data: profile, error } = await db.getUserProfile(user.id);
    
    if (error) {
      infoDiv.innerHTML = `<div class="text-danger">❌ Error: ${error.message}</div>`;
      return;
    }

    // Check for duplicate users
    const { data: allUsers, error: allError } = await db.supabase
      .from('users')
      .select('*')
      .eq('email', user.email);

    let html = `
      <div class="mb-md">
        <h4>Profile dari Database:</h4>
        <div class="mb-sm"><strong>ID:</strong> ${profile.id}</div>
        <div class="mb-sm"><strong>Email:</strong> ${profile.email}</div>
        <div class="mb-sm"><strong>Role:</strong> ${profile.role}</div>
        <div class="mb-sm"><strong>Nama:</strong> ${profile.name}</div>
        <div class="mb-sm"><strong>Status:</strong> ${profile.status}</div>
        <div class="mb-sm"><strong>Created:</strong> ${new Date(profile.created_at).toLocaleString()}</div>
      </div>
    `;

    if (allError) {
      html += `<div class="text-warning">⚠️ Tidak bisa cek duplikat: ${allError.message}</div>`;
    } else if (allUsers.length > 1) {
      html += `
        <div class="text-danger mb-md">
          <h4>🚨 DITEMUKAN ${allUsers.length} USER DENGAN EMAIL SAMA!</h4>
          <p>Ini mungkin penyebab masalah role switching:</p>
        </div>
      `;
      
      allUsers.forEach((u, index) => {
        html += `
          <div class="mb-sm p-sm border-radius-sm ${u.id === user.id ? 'bg-success' : 'bg-warning'}">
            <strong>User ${index + 1} ${u.id === user.id ? '(CURRENT)' : ''}:</strong><br>
            ID: ${u.id}<br>
            Role: ${u.role}<br>
            Name: ${u.name}<br>
            Status: ${u.status}
          </div>
        `;
      });
    } else {
      html += '<div class="text-success">✅ Tidak ada duplikat user ditemukan</div>';
    }

    infoDiv.innerHTML = html;

  } catch (err) {
    infoDiv.innerHTML = `<div class="text-danger">❌ Error: ${err.message}</div>`;
  }
}

function showSecurityLog() {
  const resultDiv = document.getElementById('security-log-result');
  const infoDiv = document.getElementById('security-log-info');
  
  const log = roleSecurity.getSecurityLog();
  
  if (log.length === 0) {
    infoDiv.innerHTML = '<div>📝 Tidak ada log keamanan</div>';
  } else {
    let html = '';
    log.forEach(entry => {
      const time = new Date(entry.timestamp).toLocaleString();
      html += `
        <div class="mb-sm p-sm border-radius-sm bg-secondary">
          <div class="mb-xs"><strong>${entry.event}</strong> - ${time}</div>
          <div class="text-sm text-muted">${JSON.stringify(entry.details, null, 2)}</div>
        </div>
      `;
    });
    infoDiv.innerHTML = html;
  }
  
  resultDiv.classList.remove('hidden');
}

function exportSecurityLog() {
  roleSecurity.exportLog();
}

async function forceLogout() {
  if (confirm('Yakin ingin logout paksa? Ini akan menghapus semua data sesi.')) {
    // Clear all data
    sessionStorage.clear();
    localStorage.clear();
    
    // Sign out
    try {
      await auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    
    // Redirect to login
    window.location.hash = '#login';
    window.location.reload();
  }
}
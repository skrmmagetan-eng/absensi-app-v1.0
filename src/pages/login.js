import { auth, db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { showNotification, showLoading, hideLoading, validate } from '../utils/helpers.js';

export function renderLoginPage() {
  const app = document.getElementById('app');

  // Render structure immediately (Optimistic Render)
  app.innerHTML = `
    <div class="page flex items-center justify-center" style="min-height: 100vh; padding-bottom: 0;">
      <div class="container" style="max-width: 480px;">
        <div class="card-glass">
          <div class="text-center mb-lg">
            <!-- Logo Placeholder -->
            <div id="brand-logo-container">
              <div style="font-size: 4rem; margin-bottom: 1rem;">📍</div>
            </div>
            
            <!-- Title Placeholder -->
            <h1 id="brand-name" style="background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.5rem; font-size: 2rem;">
              SKRM Attendance
            </h1>
            <p style="color: var(--text-muted);">Sistem Absensi Karyawan Real-time</p>
          </div>

          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input type="email" id="email" class="form-input" placeholder="nama@perusahaan.com" required />
              <span class="form-error" id="email-error"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <input type="password" id="password" class="form-input" placeholder="Masukkan password" required />
              <span class="form-error" id="password-error"></span>
            </div>

            <button type="submit" class="btn btn-primary w-full" id="login-btn">
              <span>🔐</span>
              <span>Masuk</span>
            </button>
          </form>

          <div class="mt-md text-center">
            <p style="color: var(--text-muted); font-size: 0.875rem;">
              Belum punya akun? Hubungi administrator
            </p>
          </div>
          
          <div class="mt-lg" style="padding: 1rem; background: rgba(102, 126, 234, 0.1); border-radius: var(--radius-md); border-left: 4px solid var(--primary-light);">
            <p style="font-size: 0.875rem; margin: 0; color: var(--text-secondary);">
              <strong>Demo Login:</strong><br>
              Admin: admin@skrm.com / admin123<br>
              Karyawan: employee@skrm.com / emp123
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listener immediately
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validation
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  emailError.textContent = '';
  passwordError.textContent = '';

  let hasError = false;

  if (!validate.email(email)) {
    emailError.textContent = 'Email tidak valid';
    hasError = true;
  }

  if (!validate.minLength(password, 6)) {
    passwordError.textContent = 'Password minimal 6 karakter';
    hasError = true;
  }

  if (hasError) return;

  // Loading State
  const btnLogin = document.getElementById('login-btn');
  const originalText = btnLogin.innerHTML;
  btnLogin.disabled = true;
  btnLogin.innerHTML = `<span>⏳</span> <span>Memproses...</span>`;

  try {
    // Lakukan login dan pengambilan profil secara paralel untuk meningkatkan performa
    const [{ data, error }, profileData] = await Promise.all([
      auth.signIn(email, password),
      db.getUserProfileByEmail(email) // Fungsi baru untuk mengambil profil berdasarkan email
    ]);

    if (error) {
      // Reset Button
      btnLogin.disabled = false;
      btnLogin.innerHTML = originalText;

      showNotification(error.message || 'Login gagal', 'danger');
      return;
    }

    if (data.user) {
      state.updateState({
        user: data.user,
        profile: profileData.data || null,
        isAuthenticated: true,
      });

      showNotification('Login berhasil!', 'success');

      // Redirect based on role
      if (profileData?.data?.role === 'admin' || profileData?.data?.role === 'manager') {
        router.navigate('/admin');
      } else {
        router.navigate('/dashboard');
      }
    }
  } catch (err) {
    // Reset Button
    btnLogin.disabled = false;
    btnLogin.innerHTML = originalText;

    showNotification('Terjadi kesalahan sistem', 'danger');
    console.error('Login error:', err);
  }
}
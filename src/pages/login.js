import { auth, db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';
import { showNotification, showLoading, hideLoading, validate, branding } from '../utils/helpers.js';

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
              Absensi App
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
          
          <div class="mt-lg text-center" style="opacity: 0.7;">
            <p style="font-size: 0.75rem; margin: 0; color: var(--text-secondary); font-style: italic;">
              "Real-time workforce data for smarter business decisions."
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

  // Load Dynamic Branding (Logo & Name)
  loadDynamicBranding();
}

async function loadDynamicBranding() {
  // 1. Try Cache First (Instant Load)
  const cached = branding.getLocal();
  if (cached.name) document.getElementById('brand-name').textContent = cached.name;
  if (cached.logo) renderLogo(cached.logo);

  // 2. Fetch Fresh Data form DB (Background)
  try {
    const { data } = await db.getBusinessProfile();
    if (data) {
      if (data.business_name && data.business_name !== cached.name) {
        document.getElementById('brand-name').textContent = data.business_name;
      }
      if (data.logo_url && data.logo_url !== cached.logo) {
        renderLogo(data.logo_url);
      }
      // Update cache for next time
      branding.saveToLocal(data.logo_url, data.business_name);
    }
  } catch (err) {
    console.warn('Failed to load business profile:', err);
  }
}

function renderLogo(url) {
  const container = document.getElementById('brand-logo-container');
  if (container) {
    // Check if url is base64 or http
    container.innerHTML = `<img src="${url}" alt="Logo" style="height: 80px; width: auto; object-fit: contain; margin-bottom: 1rem; border-radius: var(--radius-md);">`;
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
    // 1. Login Authentication
    const { data: authData, error: authError } = await auth.signIn(email, password);

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User tidak ditemukan');
    }

    // 2. Fetch User Profile (SEQUENTIAL - ensuring auth token is present)
    // Using ID is more reliable than email for RLS policies
    const { data: profile, error: profileError } = await db.getUserProfile(authData.user.id);

    if (profileError) {
      // If profile fetch fails (rare), we might still want to proceed or handle it
      console.warn('Profile fetch error:', profileError);
    }

    // 3. Update State & Redirect
    state.updateState({
      user: authData.user,
      profile: profile || null,
      isAuthenticated: true,
    });

    showNotification('Login berhasil!', 'success');

    // Redirect based on role
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      router.navigate('/admin');
    } else {
      router.navigate('/dashboard');
    }

  } catch (err) {
    // Reset Button
    btnLogin.disabled = false;
    btnLogin.innerHTML = originalText;

    // Show friendly error
    let msg = 'Terjadi kesalahan sistem';
    if (err.message === 'Invalid login credentials') msg = 'Email atau password salah';
    else if (err.message) msg = err.message;

    showNotification(msg, 'danger');
    console.error('Login error:', err);
  }
}

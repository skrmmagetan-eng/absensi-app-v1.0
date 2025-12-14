import { db } from '../lib/supabase.js';
import { renderNavbar } from '../components/navigation.js';
import { showNotification, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderAdminSettingsPage() {
    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page">
      <div class="container" style="max-width: 800px;">
        <div class="mb-lg">
          <button class="btn btn-outline" onclick="window.history.back()">
            ← Kembali
          </button>
        </div>

        <div class="card-glass">
          <div class="card-header">
            <h2 class="card-title">🏢 Profil Usaha</h2>
            <p class="card-subtitle">Pengaturan informasi dan logo aplikasi</p>
          </div>

          <form id="settings-form">
            <!-- Current Logo Preview -->
            <div class="flex justify-center mb-lg">
              <div style="position: relative; width: 120px; height: 120px;">
                <img 
                  id="logo-preview" 
                  src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📍</text></svg>" 
                  style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 4px solid var(--primary-light); background: var(--bg-tertiary);"
                />
                <label for="logo-upload" style="position: absolute; bottom: 0; right: 0; background: var(--primary-gradient); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-md);">
                  📷
                </label>
                <input type="file" id="logo-upload" accept="image/*" style="display: none;">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="business-name">Nama Aplikasi / Usaha</label>
              <input
                type="text"
                id="business-name"
                class="form-input"
                placeholder="SKRM Attendance"
                required
              />
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; display: block;">
                Nama ini akan muncul di halaman Login, Navbar, dan Dashboard.
              </span>
            </div>

            <div class="form-group">
              <label class="form-label" for="address">Alamat Kantor Pusat</label>
              <textarea
                id="address"
                class="form-textarea"
                rows="3"
                placeholder="Jl. Merdeka No. 45, Jakarta"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="phone">Nomor Telepon Kantor</label>
              <input
                type="text"
                id="phone"
                class="form-input"
                placeholder="(021) 1234567"
              />
            </div>

            <div class="mt-lg flex justify-end">
              <button type="submit" class="btn btn-primary" style="min-width: 150px;">
                💾 Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

    await loadSettings();
    setupSettingsEvents();
}

async function loadSettings() {
    showLoading('Memuat pengaturan...');
    try {
        const { data: profile } = await db.getBusinessProfile();
        hideLoading();

        if (profile) {
            document.getElementById('business-name').value = profile.name || '';
            document.getElementById('address').value = profile.address || '';
            document.getElementById('phone').value = profile.phone || '';

            if (profile.logo_url) {
                document.getElementById('logo-preview').src = profile.logo_url;
            }
        }
    } catch (error) {
        hideLoading();
        // Ignore error if profile not found (it will use defaults)
        console.log('Profile fetch error or empty:', error);
    }
}

function setupSettingsEvents() {
    // Logo Preview
    const logoInput = document.getElementById('logo-upload');
    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                showNotification('Ukuran file maksimal 2MB', 'warning');
                logoInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('logo-preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Form Submit
    document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
}

async function handleSaveSettings(e) {
    e.preventDefault();

    const name = document.getElementById('business-name').value;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const logoFile = document.getElementById('logo-upload').files[0];

    showLoading('Menyimpan pengaturan...');

    try {
        let logo_url = null;

        // 1. Upload Logo if changed
        if (logoFile) {
            const { data: url, error: uploadError } = await db.uploadLogo(logoFile);
            if (uploadError) throw uploadError;
            logo_url = url;
        }

        // 2. Update Profile
        const updates = {
            name,
            address,
            phone,
        };

        if (logo_url) {
            updates.logo_url = logo_url;
        }

        const { error } = await db.updateBusinessProfile(updates);
        if (error) throw error;

        hideLoading();
        showNotification('Profil usaha berhasil diperbarui! 🎉', 'success');

        // Refresh app to reflect changes (simple reload)
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        hideLoading();
        console.error('Settings error:', error);
        showNotification('Gagal menyimpan: ' + error.message, 'danger');
    }
}

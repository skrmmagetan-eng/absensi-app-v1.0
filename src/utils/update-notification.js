// Update Notification System for Quick Order Feature
// This system provides comprehensive notifications about new features and updates

export class UpdateNotificationManager {
  constructor() {
    this.NOTIFICATION_KEY = 'quick_order_notification_shown';
    this.FEATURE_INTRO_KEY = 'quick_order_intro_completed';
    this.UPDATE_VERSION = '2.2.0';
  }

  // Check if user should see the Quick Order introduction
  shouldShowQuickOrderIntro() {
    // Disabled: User can access info from "Tentang Aplikasi" menu instead
    return false;
    
    // Original logic (commented out):
    // const hasSeenNotification = localStorage.getItem(this.NOTIFICATION_KEY);
    // const hasCompletedIntro = localStorage.getItem(this.FEATURE_INTRO_KEY);
    // return !hasSeenNotification || !hasCompletedIntro;
  }

  // Show comprehensive update notification with feature highlights
  showUpdateNotification() {
    if (!this.shouldShowQuickOrderIntro()) return;

    this.createUpdateModal();
  }

  createUpdateModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('update-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'update-modal';
    modal.innerHTML = `
      <div class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      ">
        <div class="modal-content" style="
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.4s ease-out;
          position: relative;
        ">
          <!-- Header -->
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            border-radius: 16px 16px 0 0;
            text-align: center;
            position: relative;
          ">
            <div style="font-size: 3rem; margin-bottom: 8px;">🚀</div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Fitur Baru!</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">SKRM v${this.UPDATE_VERSION}</p>
            <button id="close-modal" style="
              position: absolute;
              top: 16px;
              right: 16px;
              background: rgba(255, 255, 255, 0.2);
              border: none;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              cursor: pointer;
              font-size: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
          </div>

          <!-- Content -->
          <div style="padding: 24px;">
            <!-- Quick Order Feature -->
            <div style="margin-bottom: 24px;">
              <div style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                padding: 12px;
                background: #f8f9ff;
                border-radius: 8px;
                border-left: 4px solid #667eea;
              ">
                <span style="font-size: 2rem;">🛒</span>
                <div>
                  <h3 style="margin: 0; color: #333; font-size: 18px;">Quick Order dari Katalog</h3>
                  <p style="margin: 4px 0 0 0; color: #666; font-size: 13px;">Buat pesanan langsung dari katalog produk</p>
                </div>
              </div>
              
              <div style="margin-left: 16px;">
                <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #22c55e;">✓</span>
                  <span style="font-size: 14px;">Keranjang belanja interaktif</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #22c55e;">✓</span>
                  <span style="font-size: 14px;">Pilih pelanggan otomatis dari kunjungan</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #22c55e;">✓</span>
                  <span style="font-size: 14px;">Optimasi mobile & offline support</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="color: #22c55e;">✓</span>
                  <span style="font-size: 14px;">Validasi keamanan & error handling</span>
                </div>
              </div>
            </div>

            <!-- How to Use -->
            <div style="
              background: #fff7ed;
              border: 1px solid #fed7aa;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 20px;
            ">
              <h4 style="margin: 0 0 12px 0; color: #ea580c; display: flex; align-items: center; gap: 8px;">
                <span>💡</span> Cara Menggunakan
              </h4>
              <ol style="margin: 0; padding-left: 20px; color: #7c2d12;">
                <li style="margin-bottom: 4px;">Buka halaman <strong>Katalog</strong></li>
                <li style="margin-bottom: 4px;">Klik tombol <strong>🛒 Quick Order</strong></li>
                <li style="margin-bottom: 4px;">Tambahkan produk ke keranjang</li>
                <li style="margin-bottom: 4px;">Pilih pelanggan dan buat pesanan</li>
              </ol>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="try-now-btn" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
              ">
                🚀 Coba Sekarang
              </button>
              <button id="later-btn" style="
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
              ">
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(30px) scale(0.95); }
        }
      </style>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeModal = () => {
      modal.style.animation = 'fadeOut 0.3s ease-in forwards';
      setTimeout(() => modal.remove(), 300);
      localStorage.setItem(this.NOTIFICATION_KEY, 'true');
    };

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('later-btn').addEventListener('click', closeModal);

    document.getElementById('try-now-btn').addEventListener('click', () => {
      localStorage.setItem(this.NOTIFICATION_KEY, 'true');
      localStorage.setItem(this.FEATURE_INTRO_KEY, 'true');
      closeModal();
      
      // Navigate to catalog page
      setTimeout(() => {
        window.location.hash = '#katalog';
      }, 300);
    });

    // Close on overlay click
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.modal-overlay')) {
        closeModal();
      }
    });

    // Auto close after 45 seconds
    setTimeout(() => {
      if (document.getElementById('update-modal')) {
        closeModal();
      }
    }, 45000);
  }

  // Show feature spotlight on catalog page
  showCatalogSpotlight() {
    if (localStorage.getItem(this.FEATURE_INTRO_KEY)) return;

    setTimeout(() => {
      this.createCatalogSpotlight();
    }, 1000);
  }

  createCatalogSpotlight() {
    const quickOrderBtn = document.querySelector('[data-quick-order-btn]');
    if (!quickOrderBtn) return;

    const spotlight = document.createElement('div');
    spotlight.id = 'catalog-spotlight';
    spotlight.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      ">
        <div style="
          position: absolute;
          background: white;
          padding: 20px;
          border-radius: 12px;
          max-width: 300px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          animation: pulse 2s infinite;
        ">
          <div style="font-size: 2rem; margin-bottom: 12px;">🎯</div>
          <h3 style="margin: 0 0 8px 0; color: #333;">Fitur Quick Order</h3>
          <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
            Klik tombol Quick Order untuk mulai berbelanja!
          </p>
          <button id="got-it-btn" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">
            Mengerti!
          </button>
        </div>
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
    `;

    document.body.appendChild(spotlight);

    document.getElementById('got-it-btn').addEventListener('click', () => {
      spotlight.remove();
      localStorage.setItem(this.FEATURE_INTRO_KEY, 'true');
    });

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      if (document.getElementById('catalog-spotlight')) {
        spotlight.remove();
        localStorage.setItem(this.FEATURE_INTRO_KEY, 'true');
      }
    }, 10000);
  }

  // Reset notifications (for testing)
  resetNotifications() {
    localStorage.removeItem(this.NOTIFICATION_KEY);
    localStorage.removeItem(this.FEATURE_INTRO_KEY);
  }
}

// Create global instance
export const updateNotificationManager = new UpdateNotificationManager();
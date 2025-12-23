/**
 * 🔒 SECURITY CONFIGURATION
 * Konfigurasi untuk activity-based session management
 * Dapat disesuaikan sesuai kebutuhan bisnis
 */

export const SECURITY_CONFIG = {
  // Activity-based timeouts (dalam milidetik)
  INACTIVITY_TIMEOUT: 30 * 60 * 1000,    // 30 menit tidak ada aktivitas = logout
  WARNING_TIME: 25 * 60 * 1000,          // 25 menit = tampilkan peringatan
  CHECK_INTERVAL: 60 * 1000,             // Cek setiap 1 menit
  
  // Events yang dianggap sebagai aktivitas user
  ACTIVITY_EVENTS: [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'click', 'focus', 'blur'
  ],
  
  // Throttling untuk mengurangi beban CPU
  ACTIVITY_THROTTLE: 1000,               // Minimum 1 detik antara activity detection
  
  // Debug mode
  DEBUG_MODE: false,                     // Set true untuk debugging
  
  // Notification settings
  SHOW_INIT_NOTIFICATION: true,         // Tampilkan notifikasi saat security aktif
  SHOW_WARNING_MODAL: true,             // Tampilkan modal peringatan
  SHOW_ACTIVITY_RESUME: true,           // Tampilkan notifikasi saat aktivitas kembali
  
  // Fallback settings
  FALLBACK_TO_OLD_SYSTEM: true,         // Jika error, kembali ke sistem lama
  MAX_INIT_ATTEMPTS: 10,                // Maksimal percobaan inisialisasi
  
  // Custom messages
  MESSAGES: {
    INIT: '🔒 Keamanan sesi aktif: Auto-logout setelah 30 menit tidak aktif',
    WARNING: '⚠️ Peringatan: Sesi akan berakhir dalam 5 menit jika tidak ada aktivitas. Gerakkan mouse untuk melanjutkan.',
    LOGOUT: '🔒 Sesi berakhir: Tidak ada aktivitas selama 30 menit. Silakan login kembali.',
    ACTIVITY_RESUME: '✅ Aktivitas terdeteksi. Sesi dilanjutkan.',
    SECURING_DATA: '🔒 Sesi berakhir: Tidak ada aktivitas selama 30 menit. Mengamankan data...',
    DATA_SECURED: '✅ Data berhasil diamankan. Silakan login kembali.'
  }
};

/**
 * Update konfigurasi security
 * @param {Object} newConfig - Konfigurasi baru
 */
export function updateSecurityConfig(newConfig) {
  Object.assign(SECURITY_CONFIG, newConfig);
  
  // Update activity monitor jika sudah diinisialisasi
  if (typeof window !== 'undefined' && window.activityMonitor) {
    window.activityMonitor.updateConfig({
      inactivityTimeout: SECURITY_CONFIG.INACTIVITY_TIMEOUT,
      warningTime: SECURITY_CONFIG.WARNING_TIME,
      checkInterval: SECURITY_CONFIG.CHECK_INTERVAL,
      debugMode: SECURITY_CONFIG.DEBUG_MODE
    });
  }
  
  console.log('Security configuration updated:', newConfig);
}

/**
 * Preset konfigurasi untuk berbagai skenario
 */
export const SECURITY_PRESETS = {
  // Untuk testing/development
  DEVELOPMENT: {
    INACTIVITY_TIMEOUT: 5 * 60 * 1000,   // 5 menit
    WARNING_TIME: 4 * 60 * 1000,         // 4 menit
    DEBUG_MODE: true,
    SHOW_INIT_NOTIFICATION: true
  },
  
  // Untuk kantor (keamanan normal)
  OFFICE: {
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,  // 30 menit
    WARNING_TIME: 25 * 60 * 1000,        // 25 menit
    DEBUG_MODE: false,
    SHOW_INIT_NOTIFICATION: true
  },
  
  // Untuk area publik (keamanan tinggi)
  PUBLIC: {
    INACTIVITY_TIMEOUT: 10 * 60 * 1000,  // 10 menit
    WARNING_TIME: 8 * 60 * 1000,         // 8 menit
    DEBUG_MODE: false,
    SHOW_INIT_NOTIFICATION: true
  },
  
  // Untuk admin (keamanan ekstra)
  ADMIN: {
    INACTIVITY_TIMEOUT: 15 * 60 * 1000,  // 15 menit
    WARNING_TIME: 12 * 60 * 1000,        // 12 menit
    DEBUG_MODE: false,
    SHOW_INIT_NOTIFICATION: true
  }
};

/**
 * Apply preset konfigurasi
 * @param {string} presetName - Nama preset (DEVELOPMENT, OFFICE, PUBLIC, ADMIN)
 */
export function applySecurityPreset(presetName) {
  const preset = SECURITY_PRESETS[presetName];
  if (!preset) {
    console.error('Unknown security preset:', presetName);
    return;
  }
  
  updateSecurityConfig(preset);
  console.log(`Applied security preset: ${presetName}`);
}

/**
 * Get current configuration
 */
export function getSecurityConfig() {
  return { ...SECURITY_CONFIG };
}

/**
 * Reset to default configuration
 */
export function resetSecurityConfig() {
  updateSecurityConfig({
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,
    WARNING_TIME: 25 * 60 * 1000,
    CHECK_INTERVAL: 60 * 1000,
    DEBUG_MODE: false,
    SHOW_INIT_NOTIFICATION: true,
    SHOW_WARNING_MODAL: true,
    SHOW_ACTIVITY_RESUME: true
  });
  
  console.log('Security configuration reset to defaults');
}

// Export untuk debugging
if (typeof window !== 'undefined') {
  window.securityConfig = {
    get: getSecurityConfig,
    update: updateSecurityConfig,
    preset: applySecurityPreset,
    reset: resetSecurityConfig,
    presets: SECURITY_PRESETS
  };
}
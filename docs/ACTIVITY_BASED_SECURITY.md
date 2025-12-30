# 🔒 Activity-Based Session Security

## 📋 Overview

Sistem keamanan sesi yang lebih smart berdasarkan aktivitas user, menggantikan sistem lama yang hanya berdasarkan tab visibility. Sistem ini **non-invasive** dan tidak mengubah core authentication yang sudah stabil.

## ✨ Fitur Utama

### 🎯 Smart Activity Detection
- **Mouse Movement** - Deteksi gerakan mouse
- **Keyboard Input** - Deteksi input keyboard
- **Scroll Activity** - Deteksi scroll halaman
- **Click Events** - Deteksi klik dan touch
- **Focus Events** - Deteksi focus/blur window

### ⏰ Intelligent Timing
- **30 Menit Inactivity** - Auto logout jika tidak ada aktivitas
- **25 Menit Warning** - Peringatan 5 menit sebelum logout
- **Real-time Reset** - Timer reset setiap ada aktivitas
- **Throttled Detection** - Optimized untuk performance

### 🛡️ Security Features
- **Data Protection** - Clear cached data saat logout
- **Session Cleanup** - Proper session termination
- **Fallback Safety** - Kembali ke sistem lama jika error
- **Non-invasive** - Tidak mengubah auth system yang ada

## 🚀 Implementasi

### File Structure
```
src/utils/
├── activity-monitor.js      # Core activity detection
├── session-security.js     # Integration dengan auth system
├── security-init.js        # Auto-initialization
└── security-config.js      # Configuration management
```

### Auto-Integration
Sistem akan otomatis aktif setelah user login berhasil:

1. **Login Detection** - Monitor state changes untuk detect login
2. **Auto-Initialize** - Mulai monitoring aktivitas otomatis
3. **Smart Cleanup** - Cleanup otomatis saat logout

## 🔧 Configuration

### Default Settings
```javascript
{
  INACTIVITY_TIMEOUT: 30 * 60 * 1000,    // 30 menit
  WARNING_TIME: 25 * 60 * 1000,          // 25 menit
  CHECK_INTERVAL: 60 * 1000,             // 1 menit
  DEBUG_MODE: false                      // Production mode
}
```

### Preset Configurations
```javascript
// Development (5 menit timeout)
window.securityConfig.preset('DEVELOPMENT');

// Office (30 menit timeout)
window.securityConfig.preset('OFFICE');

// Public Area (10 menit timeout)
window.securityConfig.preset('PUBLIC');

// Admin (15 menit timeout)
window.securityConfig.preset('ADMIN');
```

### Custom Configuration
```javascript
// Update specific settings
window.securityConfig.update({
  INACTIVITY_TIMEOUT: 45 * 60 * 1000,  // 45 menit
  DEBUG_MODE: true                      // Enable debugging
});
```

## 🧪 Testing & Debugging

### Debug Mode
```javascript
// Enable debug mode
window.securityConfig.update({ DEBUG_MODE: true });

// Check status
console.log(window.activityMonitor.getStatus());
console.log(window.sessionSecurity.getStatus());
console.log(window.securityInitializer.getStatus());
```

### Manual Testing
```javascript
// Force extend session
window.sessionSecurity.extendSession();

// Force initialize (if not auto-initialized)
window.securityInitializer.forceInit();

// Check activity monitor status
window.activityMonitor.getStatus();
```

### Test Scenarios

#### 1. Normal Activity Test
1. Login ke aplikasi
2. Pastikan notifikasi "Keamanan sesi aktif" muncul
3. Gunakan aplikasi normal (klik, scroll, ketik)
4. Pastikan tidak ada logout otomatis

#### 2. Inactivity Warning Test
1. Login ke aplikasi
2. Set debug mode: `window.securityConfig.preset('DEVELOPMENT')`
3. Tunggu 4 menit tanpa aktivitas
4. Pastikan modal peringatan muncul
5. Gerakkan mouse, pastikan modal hilang

#### 3. Auto Logout Test
1. Login ke aplikasi
2. Set debug mode: `window.securityConfig.preset('DEVELOPMENT')`
3. Tunggu 5 menit tanpa aktivitas
4. Pastikan auto logout terjadi
5. Pastikan redirect ke login page

#### 4. Tab Switch Test
1. Login ke aplikasi
2. Switch ke tab lain selama 2 menit
3. Kembali ke tab aplikasi
4. Pastikan session masih aktif (tidak logout)

## 📊 Monitoring & Analytics

### Status Monitoring
```javascript
// Get comprehensive status
const status = {
  activityMonitor: window.activityMonitor.getStatus(),
  sessionSecurity: window.sessionSecurity.getStatus(),
  securityInitializer: window.securityInitializer.getStatus()
};

console.table(status);
```

### Performance Metrics
- **Activity Detection Frequency** - Throttled to 1 second
- **Memory Usage** - Minimal overhead
- **CPU Impact** - Negligible with throttling
- **Battery Impact** - Optimized for mobile devices

## 🔄 Migration dari Sistem Lama

### Perbedaan Utama

| Aspek | Sistem Lama | Sistem Baru |
|-------|-------------|-------------|
| **Trigger** | Tab hidden | User inactivity |
| **Timer Start** | Saat tab di-hide | Saat tidak ada aktivitas |
| **User Experience** | Logout tiba-tiba | Warning + countdown |
| **Multitasking** | Tidak friendly | Mendukung multitasking |
| **Performance** | Timer terus jalan | Activity-based |

### Backward Compatibility
- ✅ Sistem lama tetap berjalan sebagai fallback
- ✅ Tidak ada breaking changes
- ✅ Gradual migration tanpa downtime
- ✅ Rollback capability jika diperlukan

## ⚠️ Troubleshooting

### Common Issues

#### 1. Security Tidak Auto-Initialize
```javascript
// Check status
window.securityInitializer.getStatus();

// Force initialize
window.securityInitializer.forceInit();
```

#### 2. Warning Modal Tidak Muncul
```javascript
// Check configuration
window.securityConfig.get();

// Enable warning modal
window.securityConfig.update({ SHOW_WARNING_MODAL: true });
```

#### 3. Logout Terlalu Cepat
```javascript
// Extend timeout
window.securityConfig.update({
  INACTIVITY_TIMEOUT: 60 * 60 * 1000  // 1 jam
});
```

#### 4. Debug Information
```javascript
// Enable debug mode
window.securityConfig.update({ DEBUG_MODE: true });

// Check console for detailed logs
// Look for "[ActivityMonitor]" messages
```

### Error Recovery
Jika sistem baru bermasalah, sistem lama akan otomatis mengambil alih:
- Fallback ke tab visibility detection
- Maintain existing security level
- No data loss atau security breach

## 🎯 Benefits

### User Experience
- ✅ **No Surprise Logouts** - Warning sebelum logout
- ✅ **Multitasking Friendly** - Tidak logout saat switch tab
- ✅ **Activity Aware** - Hanya logout jika benar-benar idle
- ✅ **Visual Feedback** - Countdown timer dan notifications

### Security
- ✅ **Same Security Level** - Keamanan tetap terjaga
- ✅ **Data Protection** - Proper data cleanup
- ✅ **Session Management** - Robust session handling
- ✅ **Audit Trail** - Detailed logging untuk debugging

### Performance
- ✅ **Optimized Detection** - Throttled activity detection
- ✅ **Memory Efficient** - Minimal memory footprint
- ✅ **Battery Friendly** - Mobile device optimized
- ✅ **CPU Light** - Low CPU usage

## 📞 Support

### Debug Commands
```javascript
// Status check
window.activityMonitor.getStatus()
window.sessionSecurity.getStatus()
window.securityInitializer.getStatus()

// Configuration
window.securityConfig.get()
window.securityConfig.preset('DEVELOPMENT')

// Manual actions
window.sessionSecurity.extendSession()
window.securityInitializer.forceInit()
```

### Log Analysis
Look for these log patterns in console:
- `[ActivityMonitor]` - Activity detection logs
- `🔒 Security initializer` - Initialization logs
- `🔒 User login detected` - Login detection logs
- `Activity detected` - User activity logs

---

**🎉 Sistem Activity-Based Security siap digunakan!**

Sistem ini memberikan user experience yang lebih baik sambil mempertahankan tingkat keamanan yang sama dengan sistem sebelumnya.
// Geolocation utilities
export const geo = {
    async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation tidak didukung oleh browser Anda'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                    });
                },
                (error) => {
                    let message = 'Gagal mendapatkan lokasi';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Izin akses lokasi ditolak';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Informasi lokasi tidak tersedia';
                            break;
                        case error.TIMEOUT:
                            message = 'Waktu permintaan lokasi habis';
                            break;
                    }
                    reject(new Error(message));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius bumi dalam km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance; // dalam km
    },

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    formatCoordinates(lat, lng) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    },
};

// Date utilities
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
};

export const formatTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
};

export const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} tahun lalu`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} bulan lalu`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} hari lalu`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} jam lalu`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} menit lalu`;

    return 'Baru saja';
};

export const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

export const getMonthDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0],
    };
};

// Currency utilities
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

// Validation utilities
export const validate = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    phone(phone) {
        const re = /^(?:\+62|62|0)[2-9]\d{7,11}$/;
        return re.test(phone.replace(/[\s-]/g, ''));
    },

    required(value) {
        return value !== null && value !== undefined && value !== '';
    },

    minLength(value, min) {
        return value && value.length >= min;
    },

    maxLength(value, max) {
        return value && value.length <= max;
    },
};

// Storage utilities
export const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
    },

    // Credentials local storage (Remember Me) - Safely handle UTF-8
    saveCredentials(email, password) {
        try {
            // Encode to base64 safely for UTF-8 characters (like emojis/special chars)
            const json = JSON.stringify({ email, password });
            const data = btoa(unescape(encodeURIComponent(json)));
            localStorage.setItem('auth_cache', data);
        } catch (e) { console.error('Storage error', e); }
    },

    getCredentials() {
        try {
            const data = localStorage.getItem('auth_cache');
            if (!data) return null;
            return JSON.parse(decodeURIComponent(escape(atob(data))));
        } catch (e) { return null; }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Error clearing localStorage:', e);
            return false;
        }
    },
};

// UI utilities
export const showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container') || createNotificationContainer();

    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    z-index: 9999;
    animation: slideInRight 0.3s ease-out;
  `;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
};

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
}

export const showLoading = (message = 'Loading...') => {
    const existing = document.getElementById('loading-overlay');
    if (existing) {
        // Update message if already showing
        const textEl = existing.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
    <div class="spinner-container">
      <div class="spinner"></div>
    </div>
    <div class="loading-text">${message}</div>
  `;
    document.body.appendChild(overlay);
};

export const hideLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        // Mengurangi durasi animasi untuk membuat transisi lebih cepat
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.1s ease-out'; // Dari 0.2s menjadi 0.1s
        setTimeout(() => {
            if (overlay.parentElement) overlay.remove();
        }, 100); // Dari 200ms menjadi 100ms
    }
};


// Modal utilities
export const createModal = (title, content, buttons = []) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-action="close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${buttons.length > 0
            ? `
          <div class="modal-footer">
            ${buttons
                .map(
                    (btn) =>
                        `<button class="btn btn-${btn.type || 'primary'}" data-action="${btn.action}">${btn.label}</button>`
                )
                .join('')}
          </div>
        `
            : ''
        }
    </div>
  `;

    return new Promise((resolve) => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.dataset.action === 'close') {
                overlay.remove();
                resolve(null);
            } else if (e.target.dataset.action) {
                overlay.remove();
                resolve(e.target.dataset.action);
            }
        });

        document.body.appendChild(overlay);
    });
};

// Debounce utility
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Export CSV utility
export const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map((row) =>
            headers.map((header) => JSON.stringify(row[header] || '')).join(',')
        ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Data berhasil diekspor', 'success');
};

// Image Compression Utility
import imageCompression from 'browser-image-compression';

export const compressImage = async (file) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    const options = {
        maxSizeMB: 0.8,          // Target < 800KB
        maxWidthOrHeight: 1280,  // Resolusi 720p/HD+
        useWebWorker: true,
        fileType: 'image/jpeg'
    };

    try {
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        return new File([compressedFile], file.name, { type: compressedFile.type });
    } catch (error) {
        console.error('Image compression failed:', error);
        return file;
    }
};

// Branding Cache Utility (Logo to LocalStorage)
export const branding = {
    async saveToLocal(logoUrl, name) {
        if (name) localStorage.setItem('cached_biz_name', name);

        if (!logoUrl) return;

        try {
            // Convert Image URL to Base64 String to store locally
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
                // Save the base64 string (The actual image data)
                localStorage.setItem('cached_biz_logo', reader.result);
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.warn('Gagal cache logo lokal:', e);
        }
    },

    getLocal() {
        return {
            logo: localStorage.getItem('cached_biz_logo'),
            name: localStorage.getItem('cached_biz_name')
        };
    }
};

// Order items formatting
export const formatOrderItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return 'Detail pesanan tidak tersedia';
    }
    return items.map(item => `📦 ${item.name} (${item.qty}x)`).join('\n');
};

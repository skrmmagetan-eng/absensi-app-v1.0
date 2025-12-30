// Image Handler Utility - Safe image loading with fallbacks
// Menangani error loading gambar dan menyediakan fallback

export const imageHandler = {
  // Default placeholder untuk berbagai jenis gambar
  placeholders: {
    avatar: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👤</text></svg>',
    product: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📦</text></svg>',
    photo: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📸</text></svg>',
    logo: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏢</text></svg>'
  },

  // Buat img element yang aman dengan error handling
  createSafeImage(src, alt, type = 'photo', styles = {}) {
    const img = document.createElement('img');
    img.src = src || this.placeholders[type];
    img.alt = alt || 'Image';
    
    // Apply styles
    Object.assign(img.style, styles);
    
    // Error handling - ganti dengan placeholder jika gagal load
    img.onerror = () => {
      if (img.src !== this.placeholders[type]) {
        console.warn(`Failed to load image: ${src}, using ${type} placeholder`);
        img.src = this.placeholders[type];
      }
    };
    
    // Loading state
    img.onload = () => {
      img.classList.add('loaded');
    };
    
    return img;
  },

  // Generate HTML string untuk gambar yang aman
  safeImageHTML(src, alt, type = 'photo', styles = '', className = '') {
    const placeholder = this.placeholders[type];
    const safeSrc = src || placeholder;
    
    return `
      <img 
        src="${safeSrc}" 
        alt="${alt || 'Image'}" 
        class="${className}"
        style="${styles}"
        onerror="this.onerror=null; this.src='${placeholder}'; console.warn('Image load failed, using placeholder');"
        onload="this.classList.add('loaded')"
      />
    `;
  },

  // Untuk avatar karyawan
  avatarHTML(avatarUrl, name, size = '32px') {
    if (!avatarUrl) {
      return `<div style="width: ${size}; height: ${size}; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: calc(${size} * 0.6);">👤</div>`;
    }
    
    return this.safeImageHTML(
      avatarUrl, 
      `Foto ${name}`, 
      'avatar',
      `width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover;`
    );
  },

  // Untuk gambar produk
  productImageHTML(imageUrl, productName, aspectRatio = '1/1') {
    const styles = `width: 100%; height: 100%; object-fit: cover; aspect-ratio: ${aspectRatio};`;
    
    if (!imageUrl) {
      return `<div style="width: 100%; aspect-ratio: ${aspectRatio}; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
        <div style="text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
          <div style="font-size: 0.875rem;">No Image</div>
        </div>
      </div>`;
    }
    
    return this.safeImageHTML(imageUrl, productName, 'product', styles);
  },

  // Untuk foto bukti kunjungan
  visitPhotoHTML(photoUrl, description = 'Foto bukti kunjungan') {
    if (!photoUrl) {
      return `<div style="padding: 1rem; text-align: center; color: var(--text-muted); background: var(--bg-tertiary); border-radius: var(--radius-md);">
        📸 Tidak ada foto
      </div>`;
    }
    
    return `
      <div class="visit-photo-container" style="cursor: pointer;" onclick="imageHandler.openPhotoModal('${photoUrl}', '${description}')">
        ${this.safeImageHTML(
          photoUrl, 
          description, 
          'photo',
          'width: 100%; height: auto; border-radius: var(--radius-md); transition: transform 0.2s;'
        )}
      </div>
    `;
  },

  // Modal untuk melihat foto full size
  openPhotoModal(photoUrl, description = 'Foto') {
    const modalId = 'photo-modal-' + Date.now();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;
    modal.innerHTML = `
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">${description}</h3>
          <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
        </div>
        <div class="modal-body" style="text-align: center; padding: 0;">
          ${this.safeImageHTML(
            photoUrl, 
            description, 
            'photo',
            'max-width: 100%; height: auto; border-radius: var(--radius-md);'
          )}
        </div>
        <div class="modal-footer">
          <a href="${photoUrl}" target="_blank" class="btn btn-outline">🔗 Buka di Tab Baru</a>
          <button class="btn btn-primary" onclick="document.getElementById('${modalId}').remove()">Tutup</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  },

  // Lazy loading untuk gambar
  enableLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  },

  // Preload gambar penting
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  // Validasi URL gambar
  isValidImageUrl(url) {
    if (!url) return false;
    
    // Check if it's a data URL
    if (url.startsWith('data:image/')) return true;
    
    // Check if it's a valid HTTP/HTTPS URL
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  },

  // Compress dan resize gambar sebelum upload
  async processImageForUpload(file, maxWidth = 1280, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
};

// Auto-enable lazy loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    imageHandler.enableLazyLoading();
  });
} else {
  imageHandler.enableLazyLoading();
}

// Make it globally available
window.imageHandler = imageHandler;
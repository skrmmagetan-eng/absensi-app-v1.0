import { formatCurrency } from './helpers.js';

// Global function to show product detail modal
window.showProductDetail = (productId) => {
    const product = window.catalogProducts?.find(p => p.id === productId);
    if (!product) return;

    const modalId = 'product-detail-modal';

    // Remove existing modal if any
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.style.zIndex = '10000';

    overlay.innerHTML = `
        <div class="modal" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3 class="modal-title">📦 Detail Produk</h3>
                <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                ${product.image_url
            ? `<div style="width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #000; margin-bottom: 1.5rem;">
                         <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: contain;">
                       </div>`
            : `<div style="width: 100%; aspect-ratio: 16/9; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;">
                         <span style="font-size: 3rem; opacity: 0.3;">📦</span>
                       </div>`
        }
                
                <div style="padding: 0 1.5rem 1.5rem;">
                    <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--text-primary);">${product.name}</h2>
                    
                    <div style="display: inline-block; background: var(--primary-gradient); color: white; padding: 0.5rem 1rem; border-radius: var(--radius-md); font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">
                        ${formatCurrency(product.price)}
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
                        <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-secondary);">Deskripsi Produk</h4>
                        <p style="color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">
                            ${product.description || 'Tidak ada deskripsi untuk produk ini.'}
                        </p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Tutup</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
};

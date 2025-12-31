import { db } from '../lib/supabase.js';
import { renderNavbar, renderBottomNav } from '../components/navigation.js';
import { formatCurrency, showLoading, hideLoading } from '../utils/helpers.js';
import { quickOrderManager } from '../services/QuickOrderManager.js';
import { securityValidator } from '../utils/security-validator.js';
import { sessionManager } from '../utils/session-manager.js';
import { accessibilityManager } from '../utils/accessibility-manager.js';
import { onboardingManager } from '../utils/onboarding-manager.js';
import { imageHandler } from '../utils/image-handler.js';
import { mobileOptimizer } from '../utils/mobile-optimizations.js';
import { mobilePerformanceOptimizer } from '../utils/mobile-performance.js';
import { offlineManager } from '../utils/offline-manager.js';
import { analyticsTracker } from '../utils/analytics-tracker.js';
import '../utils/product-detail.js';

export async function renderCatalogPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="page pb-nav">
      <div class="container">
        <h1 class="mb-lg">🛍️ Katalog Produk</h1>
        
        <!-- Search/Filter (Future Improvement) -->
        <!-- <div class="form-group mb-lg">
          <input type="text" class="form-input" placeholder="Cari produk...">
        </div> -->

        <div id="catalog-grid" class="grid-2-col">
           <!-- Products loaded here -->
        </div>
      </div>
    </div>

    <!-- Floating Cart Summary -->
    <div class="floating-cart" id="floating-cart" data-quick-order-btn>
      <div class="floating-cart-content" onclick="openCartModal()">
        <div class="cart-icon">🛒</div>
        <div class="cart-info">
          <div class="cart-count">0 items</div>
          <div class="cart-total">Rp 0</div>
        </div>
      </div>
    </div>

    <!-- Cart Modal -->
    <div class="modal" id="cart-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>🛒 Keranjang Belanja</h3>
          <button class="modal-close" onclick="closeCartModal()">&times;</button>
        </div>
        <div class="modal-body" id="cart-modal-body">
          <!-- Cart items loaded here -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="clearCart()">Kosongkan</button>
          <button class="btn btn-primary" onclick="proceedToCheckout()" id="checkout-btn" disabled>
            Buat Order
          </button>
        </div>
      </div>
    </div>

    <!-- Customer Selection Modal -->
    <div class="modal" id="customer-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>👤 Pilih Pelanggan</h3>
          <button class="modal-close" onclick="closeCustomerModal()">&times;</button>
        </div>
        <div class="modal-body" id="customer-modal-body">
          <!-- Customer selection loaded here -->
        </div>
      </div>
    </div>

    ${renderBottomNav('katalog')}
  `;

  await loadCatalog();
  setupQuickOrderEvents();
  setupMobileOptimizations();
  setupOfflineSupport();
  setupAnalyticsTracking();
  
  // Show Quick Order spotlight for new users (only if no priority notifications)
  import('../utils/update-notification.js').then(({ updateNotificationManager }) => {
    import('../utils/notification-manager.js').then(({ notificationManager }) => {
      // Only show spotlight if no priority notifications are active
      if (!notificationManager.hasPriorityNotification()) {
        updateNotificationManager.showCatalogSpotlight();
      } else {
        console.log('⏳ Catalog spotlight skipped - priority notification active');
      }
    });
  }).catch(err => console.log('Spotlight notification not available:', err));
}

async function loadCatalog() {
  const grid = document.getElementById('catalog-grid');
  showLoading('Memuat katalog...');

  try {
    const { data: products, error } = await db.getProducts();
    hideLoading();

    if (error) throw error;

    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-2 text-center py-xl">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
          <p style="color: var(--text-muted);">Belum ada produk di katalog.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(product => `
      <div class="card p-0 overflow-hidden h-full flex flex-col" data-product-id="${product.id}" style="cursor: pointer; position: relative;">
        <!-- Cart Indicator -->
        <div class="cart-indicator">
          <span class="cart-badge">0</span>
        </div>
        
        <div style="aspect-ratio: 1/1; background: #000; overflow: hidden; position: relative;" onclick="window.showProductDetail('${product.id}')">
          ${product.image_url
        ? `<img src="${imageHandler.getOptimizedImageUrl(product.image_url, { width: 400, height: 400, quality: 80 })}" 
               alt="${product.name}" 
               style="width: 100%; height: 100%; object-fit: cover;"
               loading="lazy"
               onerror="imageHandler.handleImageError(this, '${product.name}')">`
        : `<div class="flex items-center justify-center h-full text-muted">No Image</div>`
      }
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 20px 10px 10px;">
            <span style="color: #4ade80; font-weight: bold; font-size: 1.1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
              ${formatCurrency(product.price)}
            </span>
          </div>
        </div>
        <div class="p-3 flex-grow">
          <h3 style="font-size: 1rem; margin-bottom: 0.5rem; line-height: 1.3;" onclick="window.showProductDetail('${product.id}')">${product.name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;" onclick="window.showProductDetail('${product.id}')">
            ${product.description || '-'}
          </p>
          
          <!-- Quick Order Controls -->
          <div class="quick-order-controls mt-2">
            <div class="quantity-selector" style="display: none;">
              <button class="qty-btn qty-minus" onclick="updateQuantity('${product.id}', -1)">-</button>
              <span class="qty-display">1</span>
              <button class="qty-btn qty-plus" onclick="updateQuantity('${product.id}', 1)">+</button>
            </div>
            <button class="btn btn-primary btn-small add-to-cart-btn" onclick="addToCart('${product.id}')">
              <span>🛒</span>
              <span>Tambah</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Store products globally for detail view
    window.catalogProducts = products;

    // Add CSS for Grid
    if (!document.getElementById('catalog-style')) {
      const style = document.createElement('style');
      style.id = 'catalog-style';
      style.textContent = `
        .grid-2-col {
          display: grid;
          grid-template-columns: repeat(2, 1fr); /* Default 2 kolom di HP */
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .grid-2-col {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          }
        }

        /* Cart Indicator */
        .cart-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s ease;
        }
        .cart-indicator.visible {
          opacity: 1;
          transform: scale(1);
        }
        .cart-badge {
          background: var(--primary-gradient);
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        /* Quick Order Controls */
        .quick-order-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .quantity-selector {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 0.25rem;
        }
        .qty-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: var(--primary-gradient);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .qty-btn:hover {
          transform: scale(1.1);
        }
        .qty-btn:active {
          transform: scale(0.95);
        }
        .qty-display {
          min-width: 32px;
          text-align: center;
          font-weight: bold;
          color: var(--text-primary);
        }
        .add-to-cart-btn {
          flex: 1;
          min-width: 80px;
        }

        /* Floating Cart */
        .floating-cart {
          position: fixed;
          bottom: 80px;
          right: 16px;
          z-index: 1000;
          opacity: 0;
          transform: translateY(100px);
          transition: all 0.3s ease;
          pointer-events: none;
        }
        .floating-cart.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .floating-cart-content {
          background: var(--primary-gradient);
          color: white;
          padding: 12px 16px;
          border-radius: 25px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        .floating-cart-content:hover {
          transform: scale(1.05);
        }
        .cart-icon {
          font-size: 1.2rem;
        }
        .cart-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }
        .cart-count {
          font-size: 0.75rem;
          opacity: 0.9;
        }
        .cart-total {
          font-size: 0.9rem;
          font-weight: bold;
        }

        /* Modal Styles */
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal.active {
          display: flex;
        }
        .modal-content {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: between;
          align-items: center;
        }
        .modal-header h3 {
          margin: 0;
          flex: 1;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-muted);
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 12px;
        }
        .modal-footer .btn {
          flex: 1;
        }

        /* Cart Item Styles */
        .cart-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .cart-item:last-child {
          border-bottom: none;
        }
        .cart-item-image {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          overflow: hidden;
          flex-shrink: 0;
        }
        .cart-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cart-item-info {
          flex: 1;
          min-width: 0;
        }
        .cart-item-name {
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .cart-item-price {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .cart-item-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cart-item-total {
          font-weight: bold;
          color: var(--text-accent);
          min-width: 80px;
          text-align: right;
        }

        /* Empty Cart */
        .empty-cart {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }
        .empty-cart-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        /* Customer Selection */
        .customer-option {
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .customer-option:hover {
          border-color: var(--primary-color);
          background: var(--bg-secondary);
        }
        .customer-option.suggested {
          border-color: var(--primary-color);
          background: rgba(102, 126, 234, 0.1);
        }
        .customer-name {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .customer-address {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .customer-badge {
          display: inline-block;
          background: var(--primary-gradient);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Error Handling */
        .retry-container {
          animation: slideIn 0.3s ease;
        }
        .error-message {
          animation: fadeIn 0.3s ease;
        }
        .spinner {
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top: 2px solid white;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Network Status Indicator */
        .network-status {
          position: fixed;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-danger);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          z-index: 1500;
          opacity: 0;
          transition: all 0.3s ease;
        }
        .network-status.visible {
          opacity: 1;
        }
        .network-status.online {
          background: var(--bg-success);
        }

        /* Mobile-specific optimizations */
        @media (max-width: 768px) {
          /* Improved grid for mobile */
          .grid-2-col {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          /* Better product card spacing */
          .card {
            margin-bottom: 12px;
          }
          
          /* Larger floating cart for easier tapping */
          .floating-cart-content {
            padding: 16px 20px;
            border-radius: 30px;
            min-width: 140px;
          }
          
          .cart-icon {
            font-size: 1.4rem;
          }
          
          .cart-info {
            font-size: 0.9rem;
          }
          
          /* Modal improvements for mobile */
          .modal-content {
            margin: 8px;
            border-radius: var(--radius-lg);
            max-height: calc(100vh - 16px);
          }
          
          .modal-header {
            padding: 16px 20px;
            position: sticky;
            top: 0;
            background: var(--bg-card);
            z-index: 10;
          }
          
          .modal-footer {
            padding: 16px 20px;
            position: sticky;
            bottom: 0;
            background: var(--bg-card);
            z-index: 10;
          }
          
          /* Cart item mobile optimizations */
          .cart-item {
            padding: 16px 0;
            position: relative;
          }
          
          .cart-item-image {
            width: 70px;
            height: 70px;
          }
          
          .cart-item-controls .quantity-selector {
            background: var(--bg-tertiary);
            border-radius: 20px;
            padding: 6px;
          }
          
          /* Customer selection mobile improvements */
          .customer-option {
            padding: 16px;
            border-radius: var(--radius-lg);
            margin-bottom: 12px;
            position: relative;
            overflow: hidden;
          }
          
          .customer-option::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: left 0.5s;
          }
          
          .customer-option:active::before {
            left: 100%;
          }
          
          /* Swipe hint animation */
          .cart-item.swipe-hint {
            animation: swipeHint 2s ease-in-out;
          }
          
          @keyframes swipeHint {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(10px); }
            75% { transform: translateX(-10px); }
          }
        }
        
        /* Touch device specific styles */
        @media (hover: none) and (pointer: coarse) {
          /* Remove hover effects on touch devices */
          .btn:hover,
          .card:hover,
          .customer-option:hover {
            transform: none;
            box-shadow: none;
          }
          
          /* Add active states instead */
          .btn:active {
            transform: scale(0.98);
          }
          
          .card:active {
            transform: scale(0.99);
          }
          
          .customer-option:active {
            background: var(--bg-tertiary);
          }
        }
        
        /* High DPI display optimizations */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .cart-badge,
          .qty-btn {
            border-width: 0.5px;
          }
          
          .modal-content {
            border-width: 0.5px;
          }
        }
        
        /* Landscape orientation adjustments */
        @media (orientation: landscape) and (max-height: 500px) {
          .modal-content {
            max-height: 90vh;
          }
          
          .floating-cart {
            bottom: 60px;
          }
        }
        
        /* Dark mode mobile adjustments */
        @media (prefers-color-scheme: dark) {
          .touch-feedback::after {
            background: rgba(255, 255, 255, 0.2);
          }
          
          .swipe-indicator {
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px;
            border-radius: 50%;
          }
        }
      `;
      document.head.appendChild(style);
    }

  } catch (error) {
    hideLoading();
    console.error('Catalog error:', error);
    grid.innerHTML = `<div class="col-span-2 text-danger text-center">Gagal memuat: ${error.message}</div>`;
  }
}

// Setup Quick Order Event Listeners
function setupQuickOrderEvents() {
  // Listen for cart updates
  document.addEventListener('quickOrderCartUpdate', (event) => {
    updateCartUI(event.detail);
  });

  // Initialize cart UI
  updateCartUI(quickOrderManager.getCartState());
}

// Add product to cart
window.addToCart = async function(productId) {
  const button = document.querySelector(`[data-product-id="${productId}"] .add-to-cart-btn`);
  const originalContent = button?.innerHTML;
  
  try {
    // Show loading state
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>';
    }
    
    const result = await quickOrderManager.addProductToCart(productId, 1);
    
    if (result.success) {
      // Update product card UI
      updateProductCardUI(productId);
    } else {
      // Show retry option for retryable errors
      if (result.retryable) {
        showRetryOption(productId, result.userMessage);
      }
    }
  } catch (error) {
    console.error('Error in addToCart:', error);
    showNotification('Gagal menambahkan produk ke keranjang', 'danger');
  } finally {
    // Restore button state
    if (button && originalContent) {
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  }
};

// Show retry option for failed operations
function showRetryOption(productId, errorMessage) {
  const productCard = document.querySelector(`[data-product-id="${productId}"]`);
  if (!productCard) return;
  
  // Remove existing retry elements
  const existingRetry = productCard.querySelector('.retry-container');
  if (existingRetry) existingRetry.remove();
  
  const retryContainer = document.createElement('div');
  retryContainer.className = 'retry-container';
  retryContainer.innerHTML = `
    <div class="error-message" style="background: rgba(245, 87, 108, 0.1); border: 1px solid rgba(245, 87, 108, 0.3); border-radius: 4px; padding: 8px; margin-top: 8px; font-size: 0.8rem;">
      <div style="color: var(--text-danger); margin-bottom: 4px;">❌ ${errorMessage}</div>
      <div style="display: flex; gap: 4px;">
        <button class="btn btn-outline btn-small" onclick="retryAddToCart('${productId}')" style="font-size: 0.7rem; padding: 4px 8px;">
          🔄 Coba Lagi
        </button>
        <button class="btn btn-outline btn-small" onclick="dismissError('${productId}')" style="font-size: 0.7rem; padding: 4px 8px;">
          ✕ Tutup
        </button>
      </div>
    </div>
  `;
  
  productCard.appendChild(retryContainer);
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (retryContainer.parentNode) {
      retryContainer.remove();
    }
  }, 10000);
}

// Retry add to cart
window.retryAddToCart = function(productId) {
  dismissError(productId);
  addToCart(productId);
};

// Dismiss error message
window.dismissError = function(productId) {
  const productCard = document.querySelector(`[data-product-id="${productId}"]`);
  const retryContainer = productCard?.querySelector('.retry-container');
  if (retryContainer) {
    retryContainer.remove();
  }
};

// Update quantity in cart
window.updateQuantity = function(productId, change) {
  const currentQty = quickOrderManager.getProductQuantityInCart(productId);
  const newQty = Math.max(0, currentQty + change);
  
  if (newQty === 0) {
    quickOrderManager.cart.removeItem(productId);
  } else {
    quickOrderManager.cart.updateQuantity(productId, newQty);
  }
  
  updateProductCardUI(productId);
};

// Update product card UI based on cart state
function updateProductCardUI(productId) {
  const productCard = document.querySelector(`[data-product-id="${productId}"]`);
  if (!productCard) return;

  const quantity = quickOrderManager.getProductQuantityInCart(productId);
  const isInCart = quantity > 0;

  const indicator = productCard.querySelector('.cart-indicator');
  const badge = productCard.querySelector('.cart-badge');
  const quantitySelector = productCard.querySelector('.quantity-selector');
  const addButton = productCard.querySelector('.add-to-cart-btn');
  const qtyDisplay = productCard.querySelector('.qty-display');

  // Update indicator
  indicator.classList.toggle('visible', isInCart);
  if (badge) badge.textContent = quantity;

  // Update controls
  if (isInCart) {
    quantitySelector.style.display = 'flex';
    addButton.style.display = 'none';
    if (qtyDisplay) qtyDisplay.textContent = quantity;
  } else {
    quantitySelector.style.display = 'none';
    addButton.style.display = 'flex';
  }
}

// Update cart UI
function updateCartUI(cartState) {
  const floatingCart = document.getElementById('floating-cart');
  const isVisible = !cartState.isEmpty;
  
  floatingCart.classList.toggle('visible', isVisible);
  
  if (isVisible) {
    const countElement = floatingCart.querySelector('.cart-count');
    const totalElement = floatingCart.querySelector('.cart-total');
    
    if (countElement) {
      countElement.textContent = `${cartState.itemCount} item${cartState.itemCount > 1 ? 's' : ''}`;
    }
    
    if (totalElement) {
      totalElement.textContent = formatCurrency(cartState.total);
    }
  }

  // Update all product cards
  cartState.items.forEach(item => {
    updateProductCardUI(item.id);
  });

  // Clear indicators for products not in cart
  document.querySelectorAll('.cart-indicator.visible').forEach(indicator => {
    const productCard = indicator.closest('[data-product-id]');
    if (productCard) {
      const productId = productCard.dataset.productId;
      const inCart = cartState.items.some(item => item.id === productId);
      
      if (!inCart) {
        updateProductCardUI(productId);
      }
    }
  });
}

// Open cart modal
window.openCartModal = function() {
  const modal = document.getElementById('cart-modal');
  const cartState = quickOrderManager.getCartState();
  
  renderCartModal(cartState);
  modal.classList.add('active');
};

// Close cart modal
window.closeCartModal = function() {
  const modal = document.getElementById('cart-modal');
  modal.classList.remove('active');
};

// Render cart modal content
function renderCartModal(cartState) {
  const modalBody = document.getElementById('cart-modal-body');
  const checkoutBtn = document.getElementById('checkout-btn');
  
  if (cartState.isEmpty) {
    modalBody.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🛒</div>
        <p>Keranjang belanja kosong</p>
        <p style="font-size: 0.9rem; color: var(--text-muted);">Tambahkan produk dari katalog untuk mulai berbelanja</p>
      </div>
    `;
    checkoutBtn.disabled = true;
    return;
  }

  modalBody.innerHTML = `
    <div class="cart-items">
      ${cartState.items.map(item => `
        <div class="cart-item">
          <div class="cart-item-image">
            ${item.image_url 
              ? `<img src="${item.image_url}" alt="${item.name}">`
              : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 0.8rem;">No Image</div>`
            }
          </div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${formatCurrency(item.price)} / item</div>
          </div>
          <div class="cart-item-controls">
            <div class="quantity-selector">
              <button class="qty-btn qty-minus" onclick="updateCartItemQuantity('${item.id}', -1)">-</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn qty-plus" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
            </div>
          </div>
          <div class="cart-item-total">
            ${formatCurrency(item.price * item.quantity)}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div style="border-top: 2px solid var(--border-color); margin-top: 20px; padding-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; font-weight: bold;">
        <span>Total:</span>
        <span style="color: var(--text-accent);">${formatCurrency(cartState.total)}</span>
      </div>
    </div>
  `;
  
  checkoutBtn.disabled = false;
}

// Update cart item quantity from modal
window.updateCartItemQuantity = function(productId, change) {
  const currentQty = quickOrderManager.getProductQuantityInCart(productId);
  const newQty = Math.max(0, currentQty + change);
  
  if (newQty === 0) {
    quickOrderManager.cart.removeItem(productId);
  } else {
    quickOrderManager.cart.updateQuantity(productId, newQty);
  }
  
  // Re-render modal
  const cartState = quickOrderManager.getCartState();
  renderCartModal(cartState);
};

// Clear cart
window.clearCart = function() {
  if (confirm('Yakin ingin mengosongkan keranjang?')) {
    quickOrderManager.clearCart();
    closeCartModal();
  }
};

// Proceed to checkout
window.proceedToCheckout = async function() {
  closeCartModal();
  
  // Get order context
  const orderContext = await quickOrderManager.getOrderContext();
  
  if (!orderContext.canCreateOrder) {
    return;
  }
  
  // Show customer selection modal
  showCustomerSelectionModal(orderContext);
};

// Show customer selection modal
async function showCustomerSelectionModal(orderContext) {
  const modal = document.getElementById('customer-modal');
  const modalBody = document.getElementById('customer-modal-body');
  
  modalBody.innerHTML = '<div style="text-align: center; padding: 20px;">Memuat pelanggan...</div>';
  modal.classList.add('active');
  
  try {
    const customers = await quickOrderManager.getAllCustomers();
    const suggestedCustomer = orderContext.suggestedCustomer;
    
    if (customers.length === 0) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 2rem; margin-bottom: 16px;">👥</div>
          <p>Belum ada pelanggan tersedia</p>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px;">Tambahkan pelanggan terlebih dahulu untuk membuat order</p>
          <button class="btn btn-primary" onclick="closeCustomerModal(); window.location.hash='#customers';">
            Kelola Pelanggan
          </button>
        </div>
      `;
      return;
    }
    
    modalBody.innerHTML = `
      <div style="margin-bottom: 20px;">
        <p style="color: var(--text-muted); margin-bottom: 16px;">Pilih pelanggan untuk order ini:</p>
        
        ${suggestedCustomer ? `
          <div class="customer-option suggested" onclick="selectCustomer('${suggestedCustomer.customer.id}')">
            <div class="customer-name">${suggestedCustomer.customer.name}</div>
            <div class="customer-address">${suggestedCustomer.customer.address}</div>
            <span class="customer-badge">
              ${suggestedCustomer.source === 'active_visit' ? '🔄 Sedang Dikunjungi' : '📍 Terakhir Dikunjungi'}
            </span>
          </div>
          
          <div style="text-align: center; margin: 16px 0; color: var(--text-muted); font-size: 0.9rem;">
            atau pilih pelanggan lain:
          </div>
        ` : ''}
        
        <div style="max-height: 300px; overflow-y: auto;">
          ${customers
            .filter(c => !suggestedCustomer || c.id !== suggestedCustomer.customer.id)
            .map(customer => `
              <div class="customer-option" onclick="selectCustomer('${customer.id}')">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-address">${customer.address}</div>
                ${customer.livestock_type ? `<div style="font-size: 0.8rem; color: var(--text-muted);">🐄 ${customer.livestock_type}</div>` : ''}
              </div>
            `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-danger);">
        <div style="font-size: 2rem; margin-bottom: 16px;">❌</div>
        <p>Gagal memuat pelanggan</p>
        <p style="font-size: 0.9rem; margin-bottom: 20px;">${error.message}</p>
        <button class="btn btn-outline" onclick="closeCustomerModal()">Tutup</button>
      </div>
    `;
  }
}

// Select customer and create order
window.selectCustomer = async function(customerId) {
  closeCustomerModal();
  
  // Show loading state
  const floatingCart = document.getElementById('floating-cart');
  const originalContent = floatingCart.innerHTML;
  
  floatingCart.innerHTML = `
    <div class="floating-cart-content">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
        <span>Membuat order...</span>
      </div>
    </div>
  `;
  
  try {
    const result = await quickOrderManager.completeOrder(customerId, '');
    
    if (result.success) {
      // Order created successfully, cart is already cleared
      // Floating cart will hide automatically due to empty cart
      setTimeout(() => {
        if (confirm('Order berhasil dibuat! Lihat daftar order?')) {
          window.location.hash = '#orders';
        }
      }, 1000);
    } else {
      // Handle error with retry option
      floatingCart.innerHTML = originalContent;
      
      if (result.retryable) {
        showOrderRetryOption(customerId, result.userMessage);
      } else {
        showNotification(result.userMessage || 'Gagal membuat order', 'danger');
      }
    }
  } catch (error) {
    console.error('Error in selectCustomer:', error);
    floatingCart.innerHTML = originalContent;
    showNotification('Terjadi kesalahan saat membuat order', 'danger');
  }
};

// Show retry option for failed order creation
function showOrderRetryOption(customerId, errorMessage) {
  const retryModal = document.createElement('div');
  retryModal.className = 'modal active';
  retryModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h3>❌ Order Gagal</h3>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 16px;">${errorMessage}</p>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-outline" onclick="closeRetryModal()" style="flex: 1;">
            Batal
          </button>
          <button class="btn btn-primary" onclick="retryOrderCreation('${customerId}')" style="flex: 1;">
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(retryModal);
  
  // Auto-close after 30 seconds
  setTimeout(() => {
    if (retryModal.parentNode) {
      retryModal.remove();
    }
  }, 30000);
}

// Retry order creation
window.retryOrderCreation = function(customerId) {
  closeRetryModal();
  selectCustomer(customerId);
};

// Close retry modal
window.closeRetryModal = function() {
  const retryModal = document.querySelector('.modal.active');
  if (retryModal) {
    retryModal.remove();
  }
};

// Close customer modal
window.closeCustomerModal = function() {
  const modal = document.getElementById('customer-modal');
  modal.classList.remove('active');
};

// Close modals when clicking outside
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});
// Network status monitoring
function setupNetworkMonitoring() {
  // Create network status indicator
  const networkStatus = document.createElement('div');
  networkStatus.className = 'network-status';
  networkStatus.id = 'network-status';
  document.body.appendChild(networkStatus);
  
  // Monitor online/offline status
  function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    networkStatus.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
    networkStatus.className = `network-status ${isOnline ? 'online' : 'offline'}`;
    
    if (!isOnline) {
      networkStatus.classList.add('visible');
      // Auto-hide after 5 seconds when back online
    } else {
      setTimeout(() => {
        networkStatus.classList.remove('visible');
      }, 2000);
    }
  }
  
  // Listen for network changes
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  
  // Initial check
  if (!navigator.onLine) {
    updateNetworkStatus();
  }
}

// Enhanced cart error recovery
function setupCartErrorRecovery() {
  // Listen for cart errors
  document.addEventListener('quickOrderCartUpdate', (event) => {
    const cartEvent = event.detail;
    
    if (cartEvent.type === 'storage_error' || cartEvent.type === 'storage_load_error') {
      showCartRecoveryOption();
    }
  });
}

// Show cart recovery option
function showCartRecoveryOption() {
  const recoveryNotification = document.createElement('div');
  recoveryNotification.className = 'alert alert-warning';
  recoveryNotification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 16px;
    right: 16px;
    z-index: 1500;
    animation: slideIn 0.3s ease;
  `;
  
  recoveryNotification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div>
        <strong>⚠️ Masalah Keranjang</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.9rem;">Keranjang mengalami masalah. Pulihkan data?</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-outline btn-small" onclick="recoverCart()">
          🔄 Pulihkan
        </button>
        <button class="btn btn-outline btn-small" onclick="dismissRecovery()">
          ✕ Tutup
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(recoveryNotification);
  
  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (recoveryNotification.parentNode) {
      recoveryNotification.remove();
    }
  }, 15000);
  
  // Store reference for manual dismissal
  window.currentRecoveryNotification = recoveryNotification;
}

// Recover cart function
window.recoverCart = function() {
  try {
    const success = quickOrderManager.cart.recoverFromCorruption();
    
    if (success) {
      showNotification('Keranjang berhasil dipulihkan! 🎉', 'success');
    } else {
      showNotification('Gagal memulihkan keranjang. Mulai dengan keranjang kosong.', 'warning');
    }
    
    // Update UI
    updateCartUI(quickOrderManager.getCartState());
    
    dismissRecovery();
  } catch (error) {
    console.error('Error recovering cart:', error);
    showNotification('Gagal memulihkan keranjang', 'danger');
  }
};

// Dismiss recovery notification
window.dismissRecovery = function() {
  if (window.currentRecoveryNotification) {
    window.currentRecoveryNotification.remove();
    window.currentRecoveryNotification = null;
  }
};

// Performance monitoring
function setupPerformanceMonitoring() {
  // Monitor cart operation performance
  const originalAddToCart = window.addToCart;
  window.addToCart = async function(productId) {
    const startTime = performance.now();
    
    try {
      const result = await originalAddToCart(productId);
      
      const duration = performance.now() - startTime;
      
      // Log slow operations
      if (duration > 1000) { // 1 second threshold
        console.warn(`Slow cart operation: ${duration}ms for product ${productId}`);
        
        // Track slow operations
        quickOrderManager.trackCartEvent({
          type: 'slow_operation',
          operation: 'add_to_cart',
          duration: duration,
          productId: productId
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track failed operations
      quickOrderManager.trackCartEvent({
        type: 'operation_failed',
        operation: 'add_to_cart',
        duration: duration,
        productId: productId,
        error: error.message
      });
      
      throw error;
    }
  };
}

// Initialize error handling and monitoring
function initializeErrorHandling() {
  setupNetworkMonitoring();
  setupCartErrorRecovery();
  setupPerformanceMonitoring();
  
  // Global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Track unhandled errors
    quickOrderManager.trackCartEvent({
      type: 'unhandled_error',
      error: event.reason?.message || 'Unknown error',
      stack: event.reason?.stack
    });
    
    // Show user-friendly message for critical errors
    if (event.reason?.message?.includes('cart') || 
        event.reason?.message?.includes('order')) {
      showNotification('Terjadi kesalahan sistem. Silakan refresh halaman.', 'danger');
    }
  });
  
  // Monitor page visibility for cart sync
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible, check cart health
      const health = quickOrderManager.cart.getHealthStatus();
      
      if (!health.isHealthy) {
        console.warn('Cart health check failed:', health.errors);
        showCartRecoveryOption();
      }
    }
  });
}

// Call initialization when page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeErrorHandling();
});
// Development testing functions (only available in development)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
  
  // Add test button to catalog for development
  function addTestButton() {
    const container = document.querySelector('.container');
    if (container && !document.getElementById('test-button')) {
      const testButton = document.createElement('button');
      testButton.id = 'test-button';
      testButton.className = 'btn btn-outline btn-small';
      testButton.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 16px;
        z-index: 1000;
        font-size: 0.8rem;
        padding: 8px 12px;
        background: rgba(0,0,0,0.8);
        color: white;
        border: 1px solid #333;
      `;
      testButton.innerHTML = '🧪 Test';
      testButton.onclick = runQuickTests;
      
      document.body.appendChild(testButton);
    }
  }
  
  // Run quick tests
  async function runQuickTests() {
    try {
      // Import test utility
      const { quickOrderTester } = await import('../utils/quick-order-test.js');
      
      // Show test modal
      showTestModal();
      
      // Run health check first
      const healthCheck = await quickOrderTester.quickHealthCheck();
      updateTestModal('Health Check', healthCheck.healthy ? 'PASSED' : 'FAILED', healthCheck.score + '%');
      
      if (confirm('Health check complete. Run full test suite? (This may take a few seconds)')) {
        updateTestModal('Full Test Suite', 'RUNNING', 'Please wait...');
        
        // Run full tests
        await quickOrderTester.runAllTests();
        
        // Get results
        const report = quickOrderTester.getLastTestReport();
        if (report) {
          updateTestModal('Full Test Suite', 
            report.summary.successRate >= 90 ? 'PASSED' : 'FAILED', 
            `${report.summary.passedTests}/${report.summary.totalTests} (${report.summary.successRate}%)`
          );
          
          // Show detailed results
          setTimeout(() => {
            showTestResults(report);
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('Test execution failed:', error);
      alert('Test execution failed: ' + error.message);
    }
  }
  
  // Show test modal
  function showTestModal() {
    // Remove existing modal
    const existing = document.getElementById('test-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'test-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>🧪 Quick Order Tests</h3>
          <button class="modal-close" onclick="closeTestModal()">&times;</button>
        </div>
        <div class="modal-body" id="test-modal-body">
          <div class="test-status">
            <div class="test-item">
              <span class="test-name">Initializing...</span>
              <span class="test-result">PENDING</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles
    if (!document.getElementById('test-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'test-modal-styles';
      style.textContent = `
        .test-status {
          font-family: monospace;
          font-size: 0.9rem;
        }
        .test-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .test-item:last-child {
          border-bottom: none;
        }
        .test-name {
          flex: 1;
        }
        .test-result {
          font-weight: bold;
          min-width: 80px;
          text-align: right;
        }
        .test-result.PASSED {
          color: var(--success-color, #22c55e);
        }
        .test-result.FAILED {
          color: var(--danger-color, #ef4444);
        }
        .test-result.RUNNING {
          color: var(--warning-color, #f59e0b);
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Update test modal
  function updateTestModal(testName, status, details) {
    const body = document.getElementById('test-modal-body');
    if (!body) return;
    
    const statusDiv = body.querySelector('.test-status');
    if (!statusDiv) return;
    
    // Find existing test item or create new one
    let testItem = Array.from(statusDiv.children).find(item => 
      item.querySelector('.test-name').textContent === testName
    );
    
    if (!testItem) {
      testItem = document.createElement('div');
      testItem.className = 'test-item';
      testItem.innerHTML = `
        <span class="test-name">${testName}</span>
        <span class="test-result">${status}</span>
      `;
      statusDiv.appendChild(testItem);
    }
    
    const resultSpan = testItem.querySelector('.test-result');
    resultSpan.textContent = status;
    resultSpan.className = `test-result ${status}`;
    
    if (details) {
      resultSpan.title = details;
    }
  }
  
  // Show detailed test results
  function showTestResults(report) {
    const modal = document.getElementById('test-modal');
    if (!modal) return;
    
    const body = document.getElementById('test-modal-body');
    body.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h4>Test Summary</h4>
        <div class="test-summary">
          <div>Total Tests: ${report.summary.totalTests}</div>
          <div>Passed: <span style="color: var(--success-color, #22c55e);">${report.summary.passedTests}</span></div>
          <div>Failed: <span style="color: var(--danger-color, #ef4444);">${report.summary.failedTests}</span></div>
          <div>Success Rate: <strong>${report.summary.successRate}%</strong></div>
        </div>
      </div>
      
      <div style="max-height: 300px; overflow-y: auto;">
        <h4>Detailed Results</h4>
        ${Object.keys(report.categories).map(category => {
          const cat = report.categories[category];
          return `
            <div style="margin-bottom: 12px;">
              <strong>${category}</strong> (${cat.passed}/${cat.passed + cat.failed})
              ${cat.tests.map(test => `
                <div class="test-item">
                  <span class="test-name">${test.name.replace(category + ' - ', '')}</span>
                  <span class="test-result ${test.passed ? 'PASSED' : 'FAILED'}">${test.passed ? 'PASS' : 'FAIL'}</span>
                </div>
                ${!test.passed ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-left: 16px;">${test.details}</div>` : ''}
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <button class="btn btn-outline btn-small" onclick="copyTestReport()">📋 Copy Report</button>
        <button class="btn btn-outline btn-small" onclick="closeTestModal()">Close</button>
      </div>
    `;
  }
  
  // Close test modal
  window.closeTestModal = function() {
    const modal = document.getElementById('test-modal');
    if (modal) modal.remove();
  };
  
  // Copy test report to clipboard
  window.copyTestReport = function() {
    try {
      const report = JSON.parse(localStorage.getItem('quick_order_test_report'));
      if (report) {
        const text = `Quick Order Test Report
Generated: ${new Date(report.timestamp).toLocaleString()}

Summary:
- Total Tests: ${report.summary.totalTests}
- Passed: ${report.summary.passedTests}
- Failed: ${report.summary.failedTests}
- Success Rate: ${report.summary.successRate}%

Failed Tests:
${report.results.filter(r => !r.passed).map(r => `- ${r.name}: ${r.details}`).join('\n')}
`;
        
        navigator.clipboard.writeText(text).then(() => {
          alert('Test report copied to clipboard!');
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Test report copied to clipboard!');
        });
      }
    } catch (error) {
      alert('Failed to copy report: ' + error.message);
    }
  };
  
  // Add test button when page loads
  setTimeout(addTestButton, 1000);
}
// Setup mobile optimizations
function setupMobileOptimizations() {
  // Initialize mobile optimizer
  const status = mobileOptimizer.getOptimizationStatus();
  const perfStatus = mobilePerformanceOptimizer.getPerformanceStatus();
  
  console.log('📱 Mobile optimization status:', status);
  console.log('📊 Performance optimization status:', perfStatus);
  
  // Add mobile-specific event listeners
  setupMobileCartInteractions();
  setupMobileGestures();
  setupMobileKeyboardHandling();
  
  // Add mobile CSS classes for conditional styling
  if (status.isMobile) {
    document.body.classList.add('mobile-device');
  }
  
  if (status.isTouch) {
    document.body.classList.add('touch-device');
  }
  
  if (perfStatus.isLowEndDevice) {
    document.body.classList.add('low-end-device');
  }
  
  document.body.classList.add(`connection-${perfStatus.connectionType}`);
  document.body.classList.add(`performance-${perfStatus.performanceMode}`);
  
  // Setup responsive image loading
  setupResponsiveImages();
  
  // Setup mobile-specific cart features
  setupMobileCartFeatures();
  
  // Log optimization summary
  console.log(`📱 Mobile optimizations active: Touch=${status.features.touchFeedback}, Gestures=${status.features.swipeGestures}, Haptics=${status.features.hapticFeedback}`);
  console.log(`📊 Performance mode: ${perfStatus.performanceMode} (${perfStatus.connectionType} connection)`);
}

// Setup mobile cart interactions
function setupMobileCartInteractions() {
  // Enhanced touch feedback for cart operations
  const originalAddToCart = window.addToCart;
  window.addToCart = async function(productId) {
    // Trigger haptic feedback
    mobileOptimizer.triggerHapticFeedback('light');
    
    // Add visual feedback
    const button = document.querySelector(`[data-product-id="${productId}"] .add-to-cart-btn`);
    if (button) {
      button.classList.add('adding');
      setTimeout(() => button.classList.remove('adding'), 300);
    }
    
    return originalAddToCart(productId);
  };
  
  // Enhanced quantity updates with haptic feedback
  const originalUpdateQuantity = window.updateQuantity;
  window.updateQuantity = function(productId, change) {
    mobileOptimizer.triggerHapticFeedback('light');
    return originalUpdateQuantity(productId, change);
  };
  
  // Enhanced cart modal interactions
  const originalOpenCartModal = window.openCartModal;
  window.openCartModal = function() {
    mobileOptimizer.triggerHapticFeedback('medium');
    
    const result = originalOpenCartModal();
    
    // Add swipe hint for first-time users
    setTimeout(() => {
      showSwipeHintIfNeeded();
    }, 1000);
    
    return result;
  };
}

// Setup mobile gestures
function setupMobileGestures() {
  // Double-tap to add multiple items
  let lastTap = 0;
  
  document.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      // Double tap detected
      const productCard = e.target.closest('[data-product-id]');
      if (productCard && !productCard.querySelector('.quantity-selector').style.display !== 'none') {
        const productId = productCard.dataset.productId;
        handleDoubleTapAdd(productId);
      }
    }
    
    lastTap = currentTime;
  });
  
  // Pinch to zoom on product images (disabled to prevent conflicts)
  document.addEventListener('gesturestart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
}

// Handle double-tap add
function handleDoubleTapAdd(productId) {
  mobileOptimizer.triggerHapticFeedback('success');
  
  // Show quick add animation
  const productCard = document.querySelector(`[data-product-id="${productId}"]`);
  if (productCard) {
    const animation = document.createElement('div');
    animation.className = 'double-tap-animation';
    animation.textContent = '+5';
    animation.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2rem;
      font-weight: bold;
      color: var(--primary-color);
      pointer-events: none;
      z-index: 100;
      animation: doubleTapPulse 1s ease-out forwards;
    `;
    
    productCard.style.position = 'relative';
    productCard.appendChild(animation);
    
    // Add animation CSS if not exists
    if (!document.getElementById('double-tap-animation')) {
      const style = document.createElement('style');
      style.id = 'double-tap-animation';
      style.textContent = `
        @keyframes doubleTapPulse {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.5) translateY(-20px);
          }
        }
        .adding {
          animation: buttonPulse 0.3s ease;
        }
        @keyframes buttonPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove animation after completion
    setTimeout(() => {
      if (animation.parentNode) {
        animation.remove();
      }
    }, 1000);
    
    // Add 5 items
    addToCart(productId);
    setTimeout(() => addToCart(productId), 100);
    setTimeout(() => addToCart(productId), 200);
    setTimeout(() => addToCart(productId), 300);
    setTimeout(() => addToCart(productId), 400);
  }
}

// Setup mobile keyboard handling
function setupMobileKeyboardHandling() {
  // Handle virtual keyboard appearance
  let initialViewportHeight = window.visualViewport?.height || window.innerHeight;
  
  const handleViewportChange = () => {
    const currentHeight = window.visualViewport?.height || window.innerHeight;
    const heightDiff = initialViewportHeight - currentHeight;
    const keyboardOpen = heightDiff > 150;
    
    // Adjust modals when keyboard is open
    document.querySelectorAll('.modal.active').forEach(modal => {
      if (keyboardOpen) {
        modal.style.paddingBottom = `${heightDiff}px`;
      } else {
        modal.style.paddingBottom = '';
      }
    });
    
    // Adjust floating cart
    const floatingCart = document.getElementById('floating-cart');
    if (floatingCart) {
      if (keyboardOpen) {
        floatingCart.style.bottom = `${Math.max(80, heightDiff + 20)}px`;
      } else {
        floatingCart.style.bottom = '80px';
      }
    }
  };
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange);
  } else {
    window.addEventListener('resize', handleViewportChange);
  }
}

// Setup responsive images
function setupResponsiveImages() {
  // Lazy loading for product images
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px'
  });
  
  // Observe existing images
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
  
  // Observe new images
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const images = node.querySelectorAll?.('img[data-src]') || [];
          images.forEach(img => imageObserver.observe(img));
        }
      });
    });
  });
  
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// Setup mobile cart features
function setupMobileCartFeatures() {
  // Add pull-to-refresh for cart modal (custom implementation)
  let startY = 0;
  let pullDistance = 0;
  let isPulling = false;
  
  document.addEventListener('touchstart', (e) => {
    const cartModal = document.getElementById('cart-modal');
    if (cartModal && cartModal.classList.contains('active')) {
      const modalBody = cartModal.querySelector('.modal-body');
      if (modalBody && modalBody.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    pullDistance = Math.max(0, currentY - startY);
    
    if (pullDistance > 10) {
      e.preventDefault();
      
      const cartModal = document.getElementById('cart-modal');
      const modalContent = cartModal?.querySelector('.modal-content');
      
      if (modalContent) {
        const scale = Math.min(1, 1 - pullDistance / 1000);
        const translateY = Math.min(50, pullDistance / 4);
        
        modalContent.style.transform = `translateY(${translateY}px) scale(${scale})`;
        
        // Show refresh indicator
        if (pullDistance > 80 && !document.querySelector('.pull-refresh-indicator')) {
          showPullRefreshIndicator();
        }
      }
    }
  }, { passive: false });
  
  document.addEventListener('touchend', () => {
    if (!isPulling) return;
    
    const cartModal = document.getElementById('cart-modal');
    const modalContent = cartModal?.querySelector('.modal-content');
    
    if (modalContent) {
      modalContent.style.transform = '';
    }
    
    if (pullDistance > 80) {
      // Trigger refresh
      refreshCartModal();
    }
    
    hidePullRefreshIndicator();
    isPulling = false;
    pullDistance = 0;
  }, { passive: true });
}

// Show pull refresh indicator
function showPullRefreshIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'pull-refresh-indicator';
  indicator.innerHTML = '🔄 Release to refresh';
  indicator.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-card);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 2100;
    animation: pullIndicatorIn 0.3s ease;
  `;
  
  document.body.appendChild(indicator);
  
  // Add animation if not exists
  if (!document.getElementById('pull-refresh-animation')) {
    const style = document.createElement('style');
    style.id = 'pull-refresh-animation';
    style.textContent = `
      @keyframes pullIndicatorIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Hide pull refresh indicator
function hidePullRefreshIndicator() {
  const indicator = document.querySelector('.pull-refresh-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Refresh cart modal
function refreshCartModal() {
  mobileOptimizer.triggerHapticFeedback('success');
  
  // Re-render cart modal with current state
  const cartState = quickOrderManager.getCartState();
  renderCartModal(cartState);
  
  // Show success feedback
  const indicator = document.querySelector('.pull-refresh-indicator');
  if (indicator) {
    indicator.innerHTML = '✅ Refreshed';
    indicator.style.background = 'var(--success-color)';
    indicator.style.color = 'white';
  }
}

// Show swipe hint for first-time users
function showSwipeHintIfNeeded() {
  const hasSeenHint = localStorage.getItem('cart_swipe_hint_shown');
  if (hasSeenHint) return;
  
  const cartItems = document.querySelectorAll('.cart-item');
  if (cartItems.length === 0) return;
  
  // Show hint on first cart item
  const firstItem = cartItems[0];
  firstItem.classList.add('swipe-hint');
  
  // Show tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'swipe-hint-tooltip';
  tooltip.innerHTML = '👆 Swipe left/right to adjust quantity';
  tooltip.style.cssText = `
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-primary);
    color: white;
    padding: 8px 12px;
    border-radius: 16px;
    font-size: 0.8rem;
    white-space: nowrap;
    z-index: 100;
    animation: tooltipBounce 2s ease-in-out;
  `;
  
  firstItem.style.position = 'relative';
  firstItem.appendChild(tooltip);
  
  // Add bounce animation
  if (!document.getElementById('tooltip-animation')) {
    const style = document.createElement('style');
    style.id = 'tooltip-animation';
    style.textContent = `
      @keyframes tooltipBounce {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Remove hint after 3 seconds
  setTimeout(() => {
    firstItem.classList.remove('swipe-hint');
    if (tooltip.parentNode) {
      tooltip.remove();
    }
  }, 3000);
  
  // Mark as shown
  localStorage.setItem('cart_swipe_hint_shown', 'true');
}

// Enhanced cart item quantity update for mobile
window.updateCartItemQuantity = function(productId, change) {
  // Add haptic feedback
  mobileOptimizer.triggerHapticFeedback('light');
  
  const currentQty = quickOrderManager.getProductQuantityInCart(productId);
  const newQty = Math.max(0, currentQty + change);
  
  // Add visual feedback
  const cartItem = document.querySelector(`.cart-item`);
  if (cartItem) {
    cartItem.style.transform = change > 0 ? 'scale(1.02)' : 'scale(0.98)';
    setTimeout(() => {
      cartItem.style.transform = '';
    }, 150);
  }
  
  if (newQty === 0) {
    // Add removal animation
    if (cartItem) {
      cartItem.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        quickOrderManager.cart.removeItem(productId);
        const cartState = quickOrderManager.getCartState();
        renderCartModal(cartState);
      }, 300);
    } else {
      quickOrderManager.cart.removeItem(productId);
    }
  } else {
    quickOrderManager.cart.updateQuantity(productId, newQty);
  }
  
  // Re-render modal
  setTimeout(() => {
    const cartState = quickOrderManager.getCartState();
    renderCartModal(cartState);
  }, 100);
};

// Add slide out animation
if (!document.getElementById('mobile-animations')) {
  const style = document.createElement('style');
  style.id = 'mobile-animations';
  style.textContent = `
    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
  `;
  document.head.appendChild(style);
}
// Setup offline support
function setupOfflineSupport() {
  const offlineStatus = offlineManager.getOfflineStatus();
  console.log('📴 Offline support status:', offlineStatus);
  
  // Setup offline event listeners
  setupOfflineEventListeners();
  
  // Cache current product data for offline use
  cacheProductDataForOffline();
  
  // Setup offline cart operations
  setupOfflineCartOperations();
  
  // Setup offline order handling
  setupOfflineOrderHandling();
  
  // Show offline indicators if needed
  updateOfflineUI();
}

// Setup offline event listeners
function setupOfflineEventListeners() {
  // Listen for network status changes
  document.addEventListener('networkStatusChange', (event) => {
    const { isOnline } = event.detail;
    updateOfflineUI();
    
    if (isOnline) {
      // Connection restored - attempt sync
      showOfflineSyncNotification();
    } else {
      // Connection lost - show offline mode
      showOfflineModeNotification();
    }
  });
  
  // Listen for service worker messages
  navigator.serviceWorker?.addEventListener('message', (event) => {
    const { type, message } = event.data;
    
    if (type === 'SYNC_OFFLINE_DATA') {
      handleOfflineDataSync();
    } else if (type === 'SW_UPDATED') {
      showNotification(message, 'info');
    }
  });
  
  // Listen for cart events to queue offline operations
  document.addEventListener('quickOrderCartUpdate', (event) => {
    const cartEvent = event.detail;
    
    if (!offlineManager.isOnline) {
      // Queue cart operation for sync
      offlineManager.addToSyncQueue('cart_operation', {
        type: cartEvent.type,
        data: cartEvent.data,
        cart_state: cartEvent.cart,
        timestamp: cartEvent.timestamp
      });
    }
  });
}

// Cache product data for offline use
async function cacheProductDataForOffline() {
  try {
    if (window.catalogProducts && window.catalogProducts.length > 0) {
      // Cache in offline manager
      offlineManager.cacheData('products', window.catalogProducts, 24 * 60 * 60 * 1000); // 24 hours
      
      // Cache in service worker
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          action: 'cacheProductData',
          data: window.catalogProducts
        });
      }
      
      console.log('📴 Product data cached for offline use');
    }
  } catch (error) {
    console.error('Failed to cache product data:', error);
  }
}

// Setup offline cart operations
function setupOfflineCartOperations() {
  // Override cart operations to work offline
  const originalAddToCart = window.addToCart;
  window.addToCart = async function(productId) {
    if (!offlineManager.isOnline) {
      return handleOfflineAddToCart(productId);
    }
    
    return originalAddToCart(productId);
  };
  
  // Override quantity updates
  const originalUpdateQuantity = window.updateQuantity;
  window.updateQuantity = function(productId, change) {
    if (!offlineManager.isOnline) {
      return handleOfflineQuantityUpdate(productId, change);
    }
    
    return originalUpdateQuantity(productId, change);
  };
}

// Handle offline add to cart
async function handleOfflineAddToCart(productId) {
  try {
    // Get product from cache
    const cachedProducts = offlineManager.getCachedData('products');
    const product = cachedProducts?.find(p => p.id === productId);
    
    if (!product) {
      showNotification('❌ Produk tidak tersedia saat offline', 'danger');
      return { success: false, error: 'Product not available offline' };
    }
    
    // Add to cart locally
    const total = quickOrderManager.cart.addItem(product, 1);
    
    // Queue for sync
    offlineManager.performOfflineCartOperation('add_to_cart', {
      productId: productId,
      quantity: 1,
      timestamp: new Date().toISOString()
    });
    
    // Update UI
    updateProductCardUI(productId);
    
    // Show offline notification
    showNotification(`📴 ${product.name} ditambahkan (offline)`, 'warning');
    
    return {
      success: true,
      total: total,
      itemCount: quickOrderManager.cart.getItemCount(),
      product: product,
      quantity: 1,
      offline: true
    };
  } catch (error) {
    console.error('Offline add to cart failed:', error);
    showNotification('❌ Gagal menambahkan produk saat offline', 'danger');
    return { success: false, error: error.message };
  }
}

// Handle offline quantity update
function handleOfflineQuantityUpdate(productId, change) {
  try {
    const currentQty = quickOrderManager.getProductQuantityInCart(productId);
    const newQty = Math.max(0, currentQty + change);
    
    if (newQty === 0) {
      quickOrderManager.cart.removeItem(productId);
    } else {
      quickOrderManager.cart.updateQuantity(productId, newQty);
    }
    
    // Queue for sync
    offlineManager.performOfflineCartOperation('update_quantity', {
      productId: productId,
      change: change,
      newQuantity: newQty,
      timestamp: new Date().toISOString()
    });
    
    // Update UI
    updateProductCardUI(productId);
    
    return newQty;
  } catch (error) {
    console.error('Offline quantity update failed:', error);
    showNotification('❌ Gagal mengubah jumlah saat offline', 'danger');
    return currentQty;
  }
}

// Setup offline order handling
function setupOfflineOrderHandling() {
  // Override order creation for offline support
  const originalCompleteOrder = quickOrderManager.completeOrder;
  quickOrderManager.completeOrder = async function(customerId, notes = '') {
    if (!offlineManager.isOnline) {
      return handleOfflineOrderCreation(customerId, notes);
    }
    
    return originalCompleteOrder.call(this, customerId, notes);
  };
}

// Handle offline order creation
async function handleOfflineOrderCreation(customerId, notes) {
  try {
    // Validate cart
    const cartValidation = quickOrderManager.cart.validate();
    if (!cartValidation.isValid) {
      throw new Error('Cart tidak valid: ' + cartValidation.errors.join(', '));
    }
    
    // Get customer from cache
    const cachedCustomers = offlineManager.getCachedData('customers');
    const customer = cachedCustomers?.find(c => c.id === customerId);
    
    if (!customer) {
      throw new Error('Data pelanggan tidak tersedia saat offline');
    }
    
    // Build order data
    const orderData = await quickOrderManager.buildOrderDataWithValidation(customerId, notes);
    
    // Queue order for offline submission
    const offlineOrder = offlineManager.queueOfflineOrder(orderData);
    
    // Clear cart
    quickOrderManager.cart.clear();
    
    // Show success message
    showNotification('📴 Order disimpan untuk dikirim saat online', 'warning');
    
    return {
      success: true,
      order: offlineOrder,
      customer: customer,
      orderData: orderData,
      offline: true
    };
  } catch (error) {
    console.error('Offline order creation failed:', error);
    showNotification('❌ Gagal membuat order offline: ' + error.message, 'danger');
    
    return {
      success: false,
      error: error.message,
      offline: true
    };
  }
}

// Handle offline data sync
async function handleOfflineDataSync() {
  try {
    const success = await offlineManager.forceSync();
    
    if (success) {
      showNotification('✅ Data berhasil disinkronkan', 'success');
      
      // Refresh UI if needed
      const cartState = quickOrderManager.getCartState();
      updateCartUI(cartState);
    }
  } catch (error) {
    console.error('Offline sync failed:', error);
    showNotification('❌ Sinkronisasi gagal', 'danger');
  }
}

// Update offline UI indicators
function updateOfflineUI() {
  const isOnline = offlineManager.isOnline;
  const offlineStatus = offlineManager.getOfflineStatus();
  
  // Update body class
  document.body.classList.toggle('offline-mode', !isOnline);
  
  // Update floating cart with offline indicator
  const floatingCart = document.getElementById('floating-cart');
  if (floatingCart && !isOnline) {
    const offlineIndicator = floatingCart.querySelector('.offline-indicator');
    if (!offlineIndicator) {
      const indicator = document.createElement('div');
      indicator.className = 'offline-indicator';
      indicator.innerHTML = '📴';
      indicator.title = 'Mode Offline';
      indicator.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: #f59e0b;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        border: 2px solid white;
      `;
      floatingCart.appendChild(indicator);
    }
  } else if (floatingCart && isOnline) {
    const offlineIndicator = floatingCart.querySelector('.offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.remove();
    }
  }
  
  // Show sync queue status if there are pending items
  if (offlineStatus.syncQueueLength > 0 || offlineStatus.offlineOrdersCount > 0) {
    showOfflineQueueStatus(offlineStatus);
  }
}

// Show offline mode notification
function showOfflineModeNotification() {
  showNotification('📴 Mode offline aktif - fitur terbatas tersedia', 'warning');
  
  // Show offline capabilities
  setTimeout(() => {
    showNotification('💡 Anda masih bisa menambah produk ke keranjang', 'info');
  }, 2000);
}

// Show offline sync notification
function showOfflineSyncNotification() {
  const offlineStatus = offlineManager.getOfflineStatus();
  
  if (offlineStatus.syncQueueLength > 0 || offlineStatus.offlineOrdersCount > 0) {
    showNotification('🔄 Menyinkronkan data offline...', 'info');
  } else {
    showNotification('🌐 Kembali online', 'success');
  }
}

// Show offline queue status
function showOfflineQueueStatus(status) {
  const totalPending = status.syncQueueLength + status.offlineOrdersCount;
  
  if (totalPending > 0) {
    const statusElement = document.getElementById('offline-queue-status');
    
    if (!statusElement) {
      const element = document.createElement('div');
      element.id = 'offline-queue-status';
      element.className = 'offline-queue-status';
      element.style.cssText = `
        position: fixed;
        bottom: 140px;
        right: 16px;
        background: rgba(245, 158, 11, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        z-index: 1000;
        backdrop-filter: blur(10px);
        cursor: pointer;
      `;
      
      element.onclick = () => showOfflineQueueDetails(status);
      document.body.appendChild(element);
    }
    
    document.getElementById('offline-queue-status').innerHTML = 
      `📤 ${totalPending} item menunggu sync`;
  }
}

// Show offline queue details
function showOfflineQueueDetails(status) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h3>📴 Status Offline</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <strong>Data menunggu sinkronisasi:</strong>
        </div>
        
        <div class="offline-status-item">
          <span>🛒 Operasi keranjang:</span>
          <span>${status.syncQueueLength}</span>
        </div>
        
        <div class="offline-status-item">
          <span>📦 Order offline:</span>
          <span>${status.offlineOrdersCount}</span>
        </div>
        
        <div class="offline-status-item">
          <span>💾 Data tersimpan:</span>
          <span>${status.cachedDataCount}</span>
        </div>
        
        ${status.lastSyncAttempt ? `
          <div style="margin-top: 16px; font-size: 0.9rem; color: var(--text-muted);">
            Terakhir sync: ${new Date(status.lastSyncAttempt).toLocaleString()}
          </div>
        ` : ''}
        
        <div style="margin-top: 20px;">
          <button class="btn btn-primary w-full" onclick="forceOfflineSync()" ${!status.isOnline ? 'disabled' : ''}>
            ${status.isOnline ? '🔄 Sync Sekarang' : '📴 Menunggu Koneksi'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  if (!document.getElementById('offline-status-styles')) {
    const style = document.createElement('style');
    style.id = 'offline-status-styles';
    style.textContent = `
      .offline-status-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-color);
      }
      .offline-status-item:last-child {
        border-bottom: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(modal);
}

// Force offline sync
window.forceOfflineSync = async function() {
  try {
    const success = await offlineManager.forceSync();
    
    if (success) {
      showNotification('✅ Sinkronisasi dimulai', 'success');
      
      // Close modal
      document.querySelector('.modal.active')?.remove();
      
      // Update queue status
      setTimeout(() => {
        const newStatus = offlineManager.getOfflineStatus();
        updateOfflineUI();
      }, 1000);
    }
  } catch (error) {
    showNotification('❌ Gagal memulai sinkronisasi', 'danger');
  }
};

// Cache customer data when available
async function cacheCustomerDataForOffline() {
  try {
    if (window.customersData && window.customersData.length > 0) {
      // Cache in offline manager
      offlineManager.cacheData('customers', window.customersData, 24 * 60 * 60 * 1000); // 24 hours
      
      // Cache in service worker
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          action: 'cacheCustomerData',
          data: window.customersData
        });
      }
      
      console.log('📴 Customer data cached for offline use');
    }
  } catch (error) {
    console.error('Failed to cache customer data:', error);
  }
}

// Initialize offline support when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Cache customer data if available
  if (window.customersData) {
    cacheCustomerDataForOffline();
  }
  
  // Setup periodic cache refresh
  setInterval(() => {
    if (offlineManager.isOnline) {
      cacheProductDataForOffline();
      if (window.customersData) {
        cacheCustomerDataForOffline();
      }
    }
  }, 30 * 60 * 1000); // Every 30 minutes
});
// Setup analytics tracking
function setupAnalyticsTracking() {
  console.log('📊 Setting up analytics tracking for Quick Order');
  
  // Track page view
  analyticsTracker.trackEvent('page_view', {
    page: 'catalog',
    url: window.location.href,
    referrer: document.referrer
  });
  
  // Track user journey step
  analyticsTracker.trackUserJourney('catalog_viewed', {
    products_count: window.catalogProducts?.length || 0,
    timestamp: Date.now()
  });
  
  // Setup product interaction tracking
  setupProductAnalytics();
  
  // Setup cart analytics
  setupCartAnalytics();
  
  // Setup performance analytics
  setupPerformanceAnalytics();
  
  // Setup user behavior analytics
  setupBehaviorAnalytics();
  
  // Track feature usage
  analyticsTracker.trackFeatureUsage('quick_order', 'catalog_loaded', {
    products_available: window.catalogProducts?.length || 0,
    mobile_device: mobileOptimizer.getOptimizationStatus().isMobile,
    offline_capable: offlineManager.getOfflineStatus().isOnline
  });
}

// Setup product interaction analytics
function setupProductAnalytics() {
  // Track product views (when product detail is opened)
  const originalShowProductDetail = window.showProductDetail;
  if (originalShowProductDetail) {
    window.showProductDetail = function(productId) {
      const product = window.catalogProducts?.find(p => p.id === productId);
      
      analyticsTracker.trackEvent('product_viewed', {
        product_id: productId,
        product_name: product?.name,
        product_price: product?.price,
        view_method: 'catalog_click'
      });
      
      analyticsTracker.trackUserJourney('product_detail_viewed', {
        product_id: productId,
        product_name: product?.name
      });
      
      return originalShowProductDetail(productId);
    };
  }
  
  // Track product card interactions
  document.addEventListener('click', (e) => {
    const productCard = e.target.closest('[data-product-id]');
    if (productCard) {
      const productId = productCard.dataset.productId;
      const product = window.catalogProducts?.find(p => p.id === productId);
      
      // Determine interaction type
      let interactionType = 'card_click';
      if (e.target.closest('.add-to-cart-btn')) {
        interactionType = 'add_button_click';
      } else if (e.target.closest('.qty-btn')) {
        interactionType = 'quantity_button_click';
      }
      
      analyticsTracker.trackEvent('product_interaction', {
        product_id: productId,
        product_name: product?.name,
        product_price: product?.price,
        interaction_type: interactionType,
        element_clicked: e.target.tagName
      });
    }
  });
}

// Setup cart analytics
function setupCartAnalytics() {
  // Track cart events
  document.addEventListener('quickOrderCartUpdate', (event) => {
    const cartEvent = event.detail;
    
    // Track different cart events
    switch (cartEvent.type) {
      case 'item_added':
        analyticsTracker.trackEvent('cart_item_added', {
          product_id: cartEvent.data.product?.id,
          product_name: cartEvent.data.product?.name,
          quantity: cartEvent.data.quantity,
          cart_total: cartEvent.cart.total,
          cart_items: cartEvent.cart.itemCount
        });
        
        analyticsTracker.trackUserJourney('item_added_to_cart', {
          product_id: cartEvent.data.product?.id,
          cart_value: cartEvent.cart.total
        });
        break;
        
      case 'item_removed':
        analyticsTracker.trackEvent('cart_item_removed', {
          product_id: cartEvent.data.productId,
          cart_total: cartEvent.cart.total,
          cart_items: cartEvent.cart.itemCount
        });
        break;
        
      case 'quantity_updated':
        analyticsTracker.trackEvent('cart_quantity_updated', {
          product_id: cartEvent.data.productId,
          old_quantity: cartEvent.data.oldQuantity,
          new_quantity: cartEvent.data.newQuantity,
          cart_total: cartEvent.cart.total
        });
        break;
        
      case 'cart_cleared':
        analyticsTracker.trackEvent('cart_cleared', {
          previous_total: cartEvent.cart.total,
          previous_items: cartEvent.cart.itemCount
        });
        
        analyticsTracker.trackEvent('cart_abandoned', {
          cart_session_id: quickOrderManager.cart.sessionId,
          abandonment_reason: 'manual_clear',
          cart_value: cartEvent.cart.total,
          items_count: cartEvent.cart.itemCount
        });
        break;
    }
  });
  
  // Track cart modal interactions
  const originalOpenCartModal = window.openCartModal;
  if (originalOpenCartModal) {
    window.openCartModal = function() {
      analyticsTracker.trackEvent('cart_modal_opened', {
        cart_items: quickOrderManager.cart.getItemCount(),
        cart_total: quickOrderManager.cart.getTotal(),
        trigger: 'floating_cart_click'
      });
      
      analyticsTracker.trackUserJourney('cart_modal_opened', {
        cart_value: quickOrderManager.cart.getTotal()
      });
      
      return originalOpenCartModal();
    };
  }
  
  // Track checkout initiation
  const originalProceedToCheckout = window.proceedToCheckout;
  if (originalProceedToCheckout) {
    window.proceedToCheckout = function() {
      analyticsTracker.trackEvent('checkout_initiated', {
        cart_items: quickOrderManager.cart.getItemCount(),
        cart_total: quickOrderManager.cart.getTotal(),
        checkout_method: 'cart_modal'
      });
      
      analyticsTracker.trackFunnelStep('quick_order', 'checkout_initiated', {
        cart_value: quickOrderManager.cart.getTotal(),
        items_count: quickOrderManager.cart.getItemCount()
      });
      
      analyticsTracker.trackUserJourney('checkout_initiated', {
        cart_value: quickOrderManager.cart.getTotal()
      });
      
      return originalProceedToCheckout();
    };
  }
}

// Setup performance analytics
function setupPerformanceAnalytics() {
  // Track catalog load performance
  const catalogLoadStart = performance.now();
  
  // Track when catalog is fully loaded
  const observer = new MutationObserver((mutations) => {
    const catalogGrid = document.getElementById('catalog-grid');
    if (catalogGrid && catalogGrid.children.length > 0) {
      const catalogLoadEnd = performance.now();
      
      analyticsTracker.trackPerformance('catalog_load', catalogLoadStart, catalogLoadEnd, {
        products_count: catalogGrid.children.length,
        load_method: 'initial_page_load'
      });
      
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Track cart operation performance
  const originalAddToCart = window.addToCart;
  if (originalAddToCart) {
    window.addToCart = async function(productId) {
      const startTime = performance.now();
      
      try {
        const result = await originalAddToCart(productId);
        const endTime = performance.now();
        
        analyticsTracker.trackPerformance('add_to_cart_ui', startTime, endTime, {
          product_id: productId,
          success: result?.success || false,
          cart_items: quickOrderManager.cart.getItemCount()
        });
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        
        analyticsTracker.trackPerformance('add_to_cart_ui', startTime, endTime, {
          product_id: productId,
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };
  }
  
  // Track scroll performance
  let scrollStartTime = null;
  let scrollTimeout = null;
  
  window.addEventListener('scroll', () => {
    if (!scrollStartTime) {
      scrollStartTime = performance.now();
    }
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (scrollStartTime) {
        const scrollEndTime = performance.now();
        const scrollDuration = scrollEndTime - scrollStartTime;
        
        if (scrollDuration > 100) { // Only track significant scroll sessions
          analyticsTracker.trackPerformance('scroll_session', scrollStartTime, scrollEndTime, {
            scroll_duration: scrollDuration,
            final_scroll_position: window.scrollY,
            page_height: document.body.scrollHeight
          });
        }
        
        scrollStartTime = null;
      }
    }, 500);
  });
}

// Setup user behavior analytics
function setupBehaviorAnalytics() {
  // Track time spent on page
  let pageStartTime = Date.now();
  let isPageVisible = !document.hidden;
  
  document.addEventListener('visibilitychange', () => {
    const now = Date.now();
    
    if (document.hidden && isPageVisible) {
      // Page became hidden
      const timeSpent = now - pageStartTime;
      
      analyticsTracker.trackEvent('page_time_spent', {
        page: 'catalog',
        time_spent: timeSpent,
        engagement_type: 'page_hidden'
      });
      
      isPageVisible = false;
    } else if (!document.hidden && !isPageVisible) {
      // Page became visible
      pageStartTime = now;
      isPageVisible = true;
      
      analyticsTracker.trackEvent('page_resumed', {
        page: 'catalog'
      });
    }
  });
  
  // Track search behavior (if search is implemented)
  const searchInput = document.querySelector('input[placeholder*="Cari"]');
  if (searchInput) {
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      
      searchTimeout = setTimeout(() => {
        if (e.target.value.length > 2) {
          analyticsTracker.trackEvent('catalog_search', {
            search_query: e.target.value,
            query_length: e.target.value.length,
            products_available: window.catalogProducts?.length || 0
          });
        }
      }, 500);
    });
  }
  
  // Track mobile gestures (if mobile optimizations are active)
  if (mobileOptimizer.getOptimizationStatus().isTouch) {
    let touchStartTime;
    let touchStartPosition;
    
    document.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    });
    
    document.addEventListener('touchend', (e) => {
      if (touchStartTime && touchStartPosition) {
        const touchDuration = Date.now() - touchStartTime;
        const touchEndPosition = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY
        };
        
        const distance = Math.sqrt(
          Math.pow(touchEndPosition.x - touchStartPosition.x, 2) +
          Math.pow(touchEndPosition.y - touchStartPosition.y, 2)
        );
        
        // Track significant gestures
        if (touchDuration > 500 || distance > 50) {
          analyticsTracker.trackEvent('mobile_gesture', {
            gesture_type: touchDuration > 500 ? 'long_press' : 'swipe',
            duration: touchDuration,
            distance: distance,
            target_element: e.target.tagName
          });
        }
      }
    });
  }
  
  // Track offline behavior
  document.addEventListener('networkStatusChange', (event) => {
    const { isOnline } = event.detail;
    
    analyticsTracker.trackEvent('network_status_change', {
      is_online: isOnline,
      previous_status: !isOnline,
      page: 'catalog'
    });
    
    if (!isOnline) {
      analyticsTracker.trackUserJourney('went_offline', {
        cart_items: quickOrderManager.cart.getItemCount(),
        cart_value: quickOrderManager.cart.getTotal()
      });
    } else {
      analyticsTracker.trackUserJourney('came_online', {
        offline_queue: offlineManager.getOfflineStatus().syncQueueLength
      });
    }
  });
}

// Track popular products
function trackProductPopularity() {
  // This would typically be called periodically or on page unload
  const productViews = {};
  const productAdditions = {};
  
  // Collect data from analytics events
  const events = analyticsTracker.events || [];
  
  events.forEach(event => {
    if (event.type === 'product_viewed' && event.data.product_id) {
      productViews[event.data.product_id] = (productViews[event.data.product_id] || 0) + 1;
    }
    
    if (event.type === 'cart_item_added' && event.data.product_id) {
      productAdditions[event.data.product_id] = (productAdditions[event.data.product_id] || 0) + 1;
    }
  });
  
  // Track popularity metrics
  analyticsTracker.trackEvent('product_popularity_summary', {
    most_viewed: Object.entries(productViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ product_id: id, views: count })),
    
    most_added: Object.entries(productAdditions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ product_id: id, additions: count })),
    
    total_products_viewed: Object.keys(productViews).length,
    total_products_added: Object.keys(productAdditions).length
  });
}

// Track cart abandonment rate
function trackCartAbandonmentRate() {
  const cartEvents = analyticsTracker.events?.filter(e => 
    e.type.startsWith('cart_') || e.type.includes('order_')
  ) || [];
  
  const cartSessions = new Set();
  const completedOrders = new Set();
  
  cartEvents.forEach(event => {
    if (event.type === 'cart_item_added') {
      cartSessions.add(event.data.cart_session_id || event.session_id);
    }
    
    if (event.type === 'order_created') {
      completedOrders.add(event.data.cart_session_id || event.session_id);
    }
  });
  
  const abandonmentRate = cartSessions.size > 0 ? 
    ((cartSessions.size - completedOrders.size) / cartSessions.size) * 100 : 0;
  
  analyticsTracker.trackEvent('cart_abandonment_rate', {
    total_cart_sessions: cartSessions.size,
    completed_orders: completedOrders.size,
    abandoned_carts: cartSessions.size - completedOrders.size,
    abandonment_rate: abandonmentRate
  });
}

// Setup periodic analytics reporting
function setupPeriodicReporting() {
  // Track product popularity every 5 minutes
  setInterval(trackProductPopularity, 5 * 60 * 1000);
  
  // Track cart abandonment rate every 10 minutes
  setInterval(trackCartAbandonmentRate, 10 * 60 * 1000);
  
  // Generate analytics summary every 15 minutes
  setInterval(() => {
    const summary = analyticsTracker.getAnalyticsSummary();
    
    analyticsTracker.trackEvent('analytics_summary', {
      session_duration: summary.session_duration,
      events_count: summary.events_count,
      top_events: summary.top_events,
      performance_metrics: summary.performance_metrics
    });
  }, 15 * 60 * 1000);
}

// Initialize periodic reporting
document.addEventListener('DOMContentLoaded', () => {
  setupPeriodicReporting();
  
  // Track initial page load completion
  analyticsTracker.trackEvent('page_load_complete', {
    page: 'catalog',
    load_time: performance.now(),
    products_count: window.catalogProducts?.length || 0
  });
});
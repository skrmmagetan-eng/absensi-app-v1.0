// Mobile Optimizations for Quick Order System
// Provides touch-friendly controls, gestures, and responsive enhancements

export class MobileOptimizer {
  constructor() {
    this.isTouch = 'ontouchstart' in window;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.viewport = this.getViewportInfo();
    this.gestureHandlers = new Map();
    
    this.init();
  }

  // Initialize mobile optimizations
  init() {
    this.setupViewportManagement();
    this.setupTouchOptimizations();
    this.setupGestureHandlers();
    this.setupHapticFeedback();
    this.setupKeyboardHandling();
    this.optimizeScrolling();
    
    console.log('📱 Mobile optimizations initialized');
  }

  // Get viewport information
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: window.orientation || 0,
      pixelRatio: window.devicePixelRatio || 1,
      isPortrait: window.innerHeight > window.innerWidth
    };
  }

  // Setup viewport management for keyboard interactions
  setupViewportManagement() {
    // Handle viewport changes (keyboard show/hide)
    let initialViewportHeight = window.innerHeight;
    
    const handleViewportChange = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;
      
      // Keyboard is likely open if height decreased significantly
      const keyboardOpen = heightDiff > 150;
      
      document.body.classList.toggle('keyboard-open', keyboardOpen);
      
      // Adjust floating elements when keyboard is open
      const floatingCart = document.getElementById('floating-cart');
      if (floatingCart) {
        if (keyboardOpen) {
          floatingCart.style.bottom = `${heightDiff + 20}px`;
        } else {
          floatingCart.style.bottom = '80px';
        }
      }
      
      // Scroll active input into view
      if (keyboardOpen) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        initialViewportHeight = window.innerHeight;
        this.viewport = this.getViewportInfo();
        handleViewportChange();
      }, 500);
    });
  }

  // Setup touch-friendly optimizations
  setupTouchOptimizations() {
    // Increase touch targets for small elements
    const style = document.createElement('style');
    style.id = 'mobile-touch-optimizations';
    style.textContent = `
      /* Touch-friendly button sizes */
      @media (max-width: 768px) {
        .qty-btn {
          min-width: 44px !important;
          min-height: 44px !important;
          width: 44px !important;
          height: 44px !important;
          font-size: 1.2rem !important;
        }
        
        .btn-small {
          min-height: 44px !important;
          padding: 12px 16px !important;
          font-size: 0.9rem !important;
        }
        
        .modal-close {
          min-width: 44px !important;
          min-height: 44px !important;
          font-size: 1.5rem !important;
        }
        
        /* Larger tap targets for product cards */
        .card {
          margin-bottom: 16px !important;
        }
        
        .add-to-cart-btn {
          min-height: 44px !important;
          font-size: 0.9rem !important;
        }
        
        /* Improved spacing for touch */
        .quick-order-controls {
          gap: 12px !important;
          margin-top: 12px !important;
        }
        
        .quantity-selector {
          padding: 8px !important;
          gap: 8px !important;
        }
        
        /* Better modal sizing on mobile */
        .modal-content {
          margin: 16px !important;
          max-height: calc(100vh - 32px) !important;
        }
        
        /* Floating cart optimizations */
        .floating-cart-content {
          padding: 16px 20px !important;
          min-height: 60px !important;
        }
        
        /* Cart modal improvements */
        .cart-item {
          padding: 16px 0 !important;
        }
        
        .cart-item-image {
          width: 80px !important;
          height: 80px !important;
        }
        
        /* Customer selection improvements */
        .customer-option {
          padding: 20px !important;
          margin-bottom: 16px !important;
          min-height: 80px !important;
        }
      }
      
      /* Keyboard open adjustments */
      body.keyboard-open {
        position: fixed;
        width: 100%;
      }
      
      body.keyboard-open .modal {
        padding-bottom: 0 !important;
      }
      
      body.keyboard-open .modal-content {
        max-height: 70vh !important;
      }
      
      /* Touch feedback */
      .touch-feedback {
        position: relative;
        overflow: hidden;
      }
      
      .touch-feedback::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s;
        pointer-events: none;
      }
      
      .touch-feedback.active::after {
        width: 200px;
        height: 200px;
      }
      
      /* Swipe indicators */
      .swipe-indicator {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.5rem;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
        z-index: 10;
      }
      
      .swipe-indicator.left {
        left: 10px;
      }
      
      .swipe-indicator.right {
        right: 10px;
      }
      
      .swipe-indicator.visible {
        opacity: 0.7;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add touch feedback to buttons
    this.addTouchFeedback();
  }

  // Add touch feedback to interactive elements
  addTouchFeedback() {
    const addFeedbackToElement = (element) => {
      if (element.classList.contains('touch-feedback')) return;
      
      element.classList.add('touch-feedback');
      
      const handleTouchStart = (e) => {
        element.classList.add('active');
        
        // Haptic feedback
        this.triggerHapticFeedback('light');
        
        setTimeout(() => {
          element.classList.remove('active');
        }, 300);
      };
      
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
    };
    
    // Add feedback to existing buttons
    document.querySelectorAll('.btn, .qty-btn, .modal-close, .customer-option').forEach(addFeedbackToElement);
    
    // Observer for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.matches('.btn, .qty-btn, .modal-close, .customer-option')) {
              addFeedbackToElement(node);
            }
            
            // Check children
            node.querySelectorAll?.('.btn, .qty-btn, .modal-close, .customer-option').forEach(addFeedbackToElement);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Setup gesture handlers
  setupGestureHandlers() {
    // Swipe gestures for cart management
    this.setupSwipeGestures();
    
    // Pull-to-refresh (disabled to prevent conflicts)
    this.disablePullToRefresh();
    
    // Long press gestures
    this.setupLongPressGestures();
  }

  // Setup swipe gestures for cart items
  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let swipeTarget = null;
    
    const handleTouchStart = (e) => {
      const cartItem = e.target.closest('.cart-item');
      if (!cartItem) return;
      
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swipeTarget = cartItem;
      isDragging = false;
      
      // Add swipe indicators
      this.showSwipeIndicators(cartItem);
    };
    
    const handleTouchMove = (e) => {
      if (!swipeTarget) return;
      
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging = true;
        e.preventDefault();
        
        // Apply transform to show swipe
        const maxSwipe = 100;
        const clampedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
        swipeTarget.style.transform = `translateX(${clampedDelta}px)`;
        
        // Update indicators
        this.updateSwipeIndicators(swipeTarget, deltaX);
      }
    };
    
    const handleTouchEnd = (e) => {
      if (!swipeTarget || !isDragging) {
        this.hideSwipeIndicators();
        return;
      }
      
      const deltaX = currentX - startX;
      const threshold = 80;
      
      // Reset transform
      swipeTarget.style.transform = '';
      
      // Handle swipe actions
      if (Math.abs(deltaX) > threshold) {
        const productId = this.getProductIdFromCartItem(swipeTarget);
        
        if (deltaX > 0) {
          // Swipe right - increase quantity
          this.handleSwipeAction('increase', productId);
        } else {
          // Swipe left - decrease quantity
          this.handleSwipeAction('decrease', productId);
        }
      }
      
      this.hideSwipeIndicators();
      swipeTarget = null;
      isDragging = false;
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  // Show swipe indicators
  showSwipeIndicators(cartItem) {
    // Remove existing indicators
    this.hideSwipeIndicators();
    
    const leftIndicator = document.createElement('div');
    leftIndicator.className = 'swipe-indicator left';
    leftIndicator.textContent = '➕';
    leftIndicator.title = 'Swipe right to increase quantity';
    
    const rightIndicator = document.createElement('div');
    rightIndicator.className = 'swipe-indicator right';
    rightIndicator.textContent = '➖';
    rightIndicator.title = 'Swipe left to decrease quantity';
    
    cartItem.style.position = 'relative';
    cartItem.appendChild(leftIndicator);
    cartItem.appendChild(rightIndicator);
    
    // Show indicators
    setTimeout(() => {
      leftIndicator.classList.add('visible');
      rightIndicator.classList.add('visible');
    }, 50);
  }

  // Update swipe indicators based on swipe direction
  updateSwipeIndicators(cartItem, deltaX) {
    const leftIndicator = cartItem.querySelector('.swipe-indicator.left');
    const rightIndicator = cartItem.querySelector('.swipe-indicator.right');
    
    if (deltaX > 0) {
      leftIndicator?.classList.add('visible');
      rightIndicator?.classList.remove('visible');
    } else {
      leftIndicator?.classList.remove('visible');
      rightIndicator?.classList.add('visible');
    }
  }

  // Hide swipe indicators
  hideSwipeIndicators() {
    document.querySelectorAll('.swipe-indicator').forEach(indicator => {
      indicator.remove();
    });
  }

  // Get product ID from cart item element
  getProductIdFromCartItem(cartItem) {
    // Look for product ID in data attributes or extract from controls
    const qtyBtn = cartItem.querySelector('.qty-btn');
    if (qtyBtn && qtyBtn.onclick) {
      const onclickStr = qtyBtn.onclick.toString();
      const match = onclickStr.match(/'([^']+)'/);
      return match ? match[1] : null;
    }
    return null;
  }

  // Handle swipe actions
  handleSwipeAction(action, productId) {
    if (!productId) return;
    
    this.triggerHapticFeedback('medium');
    
    if (action === 'increase') {
      window.updateCartItemQuantity?.(productId, 1);
    } else if (action === 'decrease') {
      window.updateCartItemQuantity?.(productId, -1);
    }
  }

  // Disable pull-to-refresh to prevent conflicts
  disablePullToRefresh() {
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // Prevent pull-to-refresh when at top of page
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  // Setup long press gestures
  setupLongPressGestures() {
    let longPressTimer = null;
    let longPressTarget = null;
    
    const handleTouchStart = (e) => {
      const target = e.target.closest('.cart-item, .add-to-cart-btn');
      if (!target) return;
      
      longPressTarget = target;
      longPressTimer = setTimeout(() => {
        this.handleLongPress(target);
      }, 800); // 800ms for long press
    };
    
    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressTarget = null;
    };
    
    const handleTouchMove = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
  }

  // Handle long press actions
  handleLongPress(target) {
    this.triggerHapticFeedback('heavy');
    
    if (target.classList.contains('cart-item')) {
      // Long press on cart item - show quick actions
      this.showCartItemQuickActions(target);
    } else if (target.classList.contains('add-to-cart-btn')) {
      // Long press on add button - quick add multiple
      this.showQuickAddOptions(target);
    }
  }

  // Show quick actions for cart items
  showCartItemQuickActions(cartItem) {
    const productId = this.getProductIdFromCartItem(cartItem);
    if (!productId) return;
    
    const quickActions = document.createElement('div');
    quickActions.className = 'quick-actions-popup';
    quickActions.innerHTML = `
      <div class="quick-actions-content">
        <button class="btn btn-outline btn-small" onclick="this.closest('.quick-actions-popup').remove(); window.updateCartItemQuantity?.('${productId}', -999);">
          🗑️ Remove
        </button>
        <button class="btn btn-outline btn-small" onclick="this.closest('.quick-actions-popup').remove(); window.updateCartItemQuantity?.('${productId}', 5 - window.quickOrderManager?.getProductQuantityInCart?.('${productId}') || 0);">
          5️⃣ Set to 5
        </button>
        <button class="btn btn-outline btn-small" onclick="this.closest('.quick-actions-popup').remove(); window.updateCartItemQuantity?.('${productId}', 10 - window.quickOrderManager?.getProductQuantityInCart?.('${productId}') || 0);">
          🔟 Set to 10
        </button>
        <button class="btn btn-outline btn-small" onclick="this.closest('.quick-actions-popup').remove();">
          ✕ Cancel
        </button>
      </div>
    `;
    
    // Style the popup
    quickActions.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 2000;
      animation: popupIn 0.3s ease;
    `;
    
    // Add animation
    if (!document.getElementById('popup-animations')) {
      const style = document.createElement('style');
      style.id = 'popup-animations';
      style.textContent = `
        @keyframes popupIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .quick-actions-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 200px;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(quickActions);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (quickActions.parentNode) {
        quickActions.remove();
      }
    }, 5000);
  }

  // Show quick add options
  showQuickAddOptions(button) {
    const productCard = button.closest('[data-product-id]');
    const productId = productCard?.dataset.productId;
    if (!productId) return;
    
    const quickAdd = document.createElement('div');
    quickAdd.className = 'quick-add-popup';
    quickAdd.innerHTML = `
      <div class="quick-add-content">
        <div style="text-align: center; margin-bottom: 16px; font-weight: bold;">Quick Add</div>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="btn btn-primary btn-small" onclick="this.closest('.quick-add-popup').remove(); window.addToCart?.('${productId}', 1);">
            1️⃣ Add 1
          </button>
          <button class="btn btn-primary btn-small" onclick="this.closest('.quick-add-popup').remove(); window.addToCart?.('${productId}', 5);">
            5️⃣ Add 5
          </button>
          <button class="btn btn-primary btn-small" onclick="this.closest('.quick-add-popup').remove(); window.addToCart?.('${productId}', 10);">
            🔟 Add 10
          </button>
        </div>
        <button class="btn btn-outline btn-small" onclick="this.closest('.quick-add-popup').remove();" style="width: 100%; margin-top: 12px;">
          ✕ Cancel
        </button>
      </div>
    `;
    
    // Position near the button
    const rect = button.getBoundingClientRect();
    quickAdd.style.cssText = `
      position: fixed;
      top: ${rect.top - 120}px;
      left: ${rect.left}px;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 2000;
      animation: popupIn 0.3s ease;
      min-width: 250px;
    `;
    
    document.body.appendChild(quickAdd);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (quickAdd.parentNode) {
        quickAdd.remove();
      }
    }, 5000);
  }

  // Setup haptic feedback
  setupHapticFeedback() {
    // Check if haptic feedback is available
    this.hasHaptics = 'vibrate' in navigator;
    
    if (this.hasHaptics) {
      console.log('📳 Haptic feedback available');
    }
  }

  // Trigger haptic feedback
  triggerHapticFeedback(intensity = 'light') {
    if (!this.hasHaptics) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      success: [10, 50, 10],
      error: [100, 50, 100],
      warning: [50, 25, 50]
    };
    
    const pattern = patterns[intensity] || patterns.light;
    navigator.vibrate(pattern);
  }

  // Setup keyboard handling for mobile
  setupKeyboardHandling() {
    // Handle virtual keyboard
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        // Scroll input into view when focused
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });
      
      // Handle enter key on mobile
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.type !== 'textarea') {
          e.preventDefault();
          input.blur();
          
          // Find next input or submit button
          const form = input.closest('form');
          if (form) {
            const nextInput = form.querySelector(`input:not([type="hidden"]):not([disabled])`);
            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
            
            if (nextInput && nextInput !== input) {
              nextInput.focus();
            } else if (submitBtn) {
              submitBtn.click();
            }
          }
        }
      });
    });
  }

  // Optimize scrolling performance
  optimizeScrolling() {
    // Use passive event listeners for better performance
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Update floating cart position based on scroll
          const floatingCart = document.getElementById('floating-cart');
          if (floatingCart) {
            const scrollY = window.scrollY;
            const opacity = Math.max(0.7, 1 - scrollY / 500);
            floatingCart.style.opacity = opacity;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Smooth scrolling for iOS
    document.documentElement.style.webkitOverflowScrolling = 'touch';
  }

  // Get mobile optimization status
  getOptimizationStatus() {
    return {
      isTouch: this.isTouch,
      isMobile: this.isMobile,
      hasHaptics: this.hasHaptics,
      viewport: this.viewport,
      optimizationsActive: true,
      features: {
        touchFeedback: true,
        swipeGestures: true,
        longPress: true,
        hapticFeedback: this.hasHaptics,
        keyboardHandling: true,
        viewportManagement: true
      }
    };
  }

  // Update optimizations when viewport changes
  updateOptimizations() {
    this.viewport = this.getViewportInfo();
    
    // Re-apply optimizations based on new viewport
    if (this.viewport.width < 768) {
      document.body.classList.add('mobile-optimized');
    } else {
      document.body.classList.remove('mobile-optimized');
    }
  }
}

// Create global instance
export const mobileOptimizer = new MobileOptimizer();

// Export for global access
if (typeof window !== 'undefined') {
  window.mobileOptimizer = mobileOptimizer;
}
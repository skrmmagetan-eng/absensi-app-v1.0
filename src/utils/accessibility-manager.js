// Accessibility Manager - Comprehensive accessibility features for Quick Order
// Implements WCAG 2.1 AA compliance and keyboard navigation

export class AccessibilityManager {
  constructor() {
    this.focusableElements = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    this.keyboardShortcuts = new Map();
    this.announcements = [];
    this.focusHistory = [];
    this.isHighContrastMode = false;
    this.isReducedMotionMode = false;
    
    this.initializeAccessibility();
  }

  // Initialize accessibility features
  initializeAccessibility() {
    // Setup keyboard navigation
    this.setupKeyboardNavigation();
    
    // Setup screen reader support
    this.setupScreenReaderSupport();
    
    // Setup focus management
    this.setupFocusManagement();
    
    // Setup high contrast mode
    this.setupHighContrastMode();
    
    // Setup reduced motion support
    this.setupReducedMotionSupport();
    
    // Setup ARIA live regions
    this.setupLiveRegions();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    console.log('♿ Accessibility manager initialized');
  }

  // Setup keyboard navigation
  setupKeyboardNavigation() {
    // Global keyboard event handler
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Tab trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
    });

    // Escape key handler for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey(e);
      }
    });

    // Arrow key navigation for grids
    document.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
    });
  }

  // Handle keyboard navigation
  handleKeyboardNavigation(e) {
    const activeElement = document.activeElement;
    
    // Skip navigation if user is typing in input
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      return;
    }

    // Handle keyboard shortcuts
    if (this.keyboardShortcuts.has(e.key.toLowerCase())) {
      const shortcut = this.keyboardShortcuts.get(e.key.toLowerCase());
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        shortcut.action();
        this.announceToScreenReader(shortcut.description);
      }
    }

    // Handle Enter and Space for custom buttons
    if ((e.key === 'Enter' || e.key === ' ') && activeElement.getAttribute('role') === 'button') {
      e.preventDefault();
      activeElement.click();
    }
  }

  // Handle tab navigation with modal trapping
  handleTabNavigation(e) {
    const activeModal = document.querySelector('.modal.active');
    
    if (activeModal) {
      const focusableElements = this.getFocusableElements(activeModal);
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  // Handle escape key for modals
  handleEscapeKey(e) {
    const activeModal = document.querySelector('.modal.active');
    
    if (activeModal) {
      e.preventDefault();
      
      // Find and trigger close button
      const closeButton = activeModal.querySelector('.modal-close') || 
                         activeModal.querySelector('[data-dismiss="modal"]');
      
      if (closeButton) {
        closeButton.click();
      } else {
        // Fallback: remove active class
        activeModal.classList.remove('active');
      }
      
      // Restore focus to trigger element
      this.restoreFocus();
      
      this.announceToScreenReader('Modal closed');
    }
  }

  // Handle arrow key navigation for product grid
  handleArrowNavigation(e) {
    const catalogGrid = document.getElementById('catalog-grid');
    if (!catalogGrid || !catalogGrid.contains(document.activeElement)) {
      return;
    }

    const productCards = Array.from(catalogGrid.querySelectorAll('[data-product-id]'));
    const currentIndex = productCards.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    const gridColumns = this.getGridColumns(catalogGrid);

    switch (e.key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, productCards.length - 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + gridColumns, productCards.length - 1);
        break;
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - gridColumns, 0);
        break;
    }

    if (newIndex !== currentIndex) {
      e.preventDefault();
      productCards[newIndex].focus();
      
      // Announce product name
      const productName = productCards[newIndex].querySelector('h3')?.textContent;
      if (productName) {
        this.announceToScreenReader(`Product: ${productName}`);
      }
    }
  }

  // Setup screen reader support
  setupScreenReaderSupport() {
    // Add ARIA labels to interactive elements
    this.addAriaLabels();
    
    // Setup dynamic content announcements
    this.setupDynamicAnnouncements();
    
    // Add role attributes
    this.addRoleAttributes();
    
    // Setup form validation announcements
    this.setupFormValidationAnnouncements();
  }

  // Add ARIA labels to elements
  addAriaLabels() {
    // Product cards
    document.querySelectorAll('[data-product-id]').forEach(card => {
      const productName = card.querySelector('h3')?.textContent;
      const productPrice = card.querySelector('.price')?.textContent;
      
      if (productName) {
        card.setAttribute('aria-label', `Product: ${productName}${productPrice ? `, Price: ${productPrice}` : ''}`);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
      }
    });

    // Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      const productCard = btn.closest('[data-product-id]');
      const productName = productCard?.querySelector('h3')?.textContent;
      
      if (productName) {
        btn.setAttribute('aria-label', `Add ${productName} to cart`);
      }
    });

    // Quantity controls
    document.querySelectorAll('.qty-btn').forEach(btn => {
      const isPlus = btn.classList.contains('qty-plus');
      const productCard = btn.closest('[data-product-id]');
      const productName = productCard?.querySelector('h3')?.textContent;
      
      if (productName) {
        btn.setAttribute('aria-label', 
          `${isPlus ? 'Increase' : 'Decrease'} quantity for ${productName}`);
      }
    });

    // Floating cart
    const floatingCart = document.getElementById('floating-cart');
    if (floatingCart) {
      floatingCart.setAttribute('aria-label', 'Open shopping cart');
      floatingCart.setAttribute('role', 'button');
      floatingCart.setAttribute('tabindex', '0');
    }
  }

  // Add role attributes
  addRoleAttributes() {
    // Product grid
    const catalogGrid = document.getElementById('catalog-grid');
    if (catalogGrid) {
      catalogGrid.setAttribute('role', 'grid');
      catalogGrid.setAttribute('aria-label', 'Product catalog');
    }

    // Modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      
      const title = modal.querySelector('.modal-header h3');
      if (title) {
        const titleId = 'modal-title-' + Math.random().toString(36).substring(7);
        title.id = titleId;
        modal.setAttribute('aria-labelledby', titleId);
      }
    });

    // Navigation
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.setAttribute('role', 'navigation');
      navbar.setAttribute('aria-label', 'Main navigation');
    }

    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      bottomNav.setAttribute('role', 'navigation');
      bottomNav.setAttribute('aria-label', 'Bottom navigation');
    }
  }

  // Setup dynamic content announcements
  setupDynamicAnnouncements() {
    // Listen for cart updates
    document.addEventListener('quickOrderCartUpdate', (event) => {
      const cartEvent = event.detail;
      
      switch (cartEvent.type) {
        case 'item_added':
          const productName = cartEvent.data.product?.name;
          const quantity = cartEvent.data.quantity;
          this.announceToScreenReader(`Added ${quantity} ${productName} to cart. Cart total: ${cartEvent.cart.itemCount} items`);
          break;
          
        case 'item_removed':
          this.announceToScreenReader(`Item removed from cart. Cart total: ${cartEvent.cart.itemCount} items`);
          break;
          
        case 'quantity_updated':
          this.announceToScreenReader(`Quantity updated. Cart total: ${cartEvent.cart.itemCount} items`);
          break;
          
        case 'cart_cleared':
          this.announceToScreenReader('Cart cleared. Cart is now empty');
          break;
      }
    });

    // Listen for notifications
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList?.contains('notification')) {
            const message = node.textContent;
            if (message) {
              this.announceToScreenReader(message);
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Setup form validation announcements
  setupFormValidationAnnouncements() {
    document.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const errorElement = document.querySelector(`[data-error-for="${e.target.id}"]`);
        
        if (errorElement && errorElement.textContent) {
          // Announce validation errors
          setTimeout(() => {
            this.announceToScreenReader(`Validation error: ${errorElement.textContent}`);
          }, 500);
        }
      }
    });
  }

  // Setup focus management
  setupFocusManagement() {
    // Track focus for restoration
    document.addEventListener('focusin', (e) => {
      this.focusHistory.push(e.target);
      
      // Keep only last 10 focus elements
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    });

    // Focus visible elements when they become visible
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList?.contains('modal')) {
            // Focus first focusable element in modal
            setTimeout(() => {
              const firstFocusable = this.getFocusableElements(node)[0];
              if (firstFocusable) {
                firstFocusable.focus();
              }
            }, 100);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Setup high contrast mode
  setupHighContrastMode() {
    // Detect system preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    if (prefersHighContrast) {
      this.enableHighContrastMode();
    }

    // Listen for preference changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      if (e.matches) {
        this.enableHighContrastMode();
      } else {
        this.disableHighContrastMode();
      }
    });

    // Manual toggle
    this.keyboardShortcuts.set('h', {
      action: () => this.toggleHighContrastMode(),
      description: 'Toggle high contrast mode'
    });
  }

  // Setup reduced motion support
  setupReducedMotionSupport() {
    // Detect system preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      this.enableReducedMotionMode();
    }

    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) {
        this.enableReducedMotionMode();
      } else {
        this.disableReducedMotionMode();
      }
    });
  }

  // Setup ARIA live regions
  setupLiveRegions() {
    // Create announcement region
    const announceRegion = document.createElement('div');
    announceRegion.id = 'aria-live-announcements';
    announceRegion.setAttribute('aria-live', 'polite');
    announceRegion.setAttribute('aria-atomic', 'true');
    announceRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announceRegion);

    // Create alert region
    const alertRegion = document.createElement('div');
    alertRegion.id = 'aria-live-alerts';
    alertRegion.setAttribute('aria-live', 'assertive');
    alertRegion.setAttribute('aria-atomic', 'true');
    alertRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(alertRegion);
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    // Cart shortcuts
    this.keyboardShortcuts.set('c', {
      action: () => {
        if (window.openCartModal) {
          window.openCartModal();
        }
      },
      description: 'Open cart modal'
    });

    // Search shortcut
    this.keyboardShortcuts.set('s', {
      action: () => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Cari"]');
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus search input'
    });

    // Help shortcut
    this.keyboardShortcuts.set('?', {
      action: () => this.showKeyboardShortcuts(),
      description: 'Show keyboard shortcuts help'
    });

    // Skip to main content
    this.keyboardShortcuts.set('m', {
      action: () => {
        const mainContent = document.getElementById('catalog-grid') || 
                           document.querySelector('main') ||
                           document.querySelector('.container');
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView();
        }
      },
      description: 'Skip to main content'
    });
  }

  // Get focusable elements within container
  getFocusableElements(container = document) {
    const selector = this.focusableElements.join(', ');
    return Array.from(container.querySelectorAll(selector))
      .filter(el => !el.disabled && el.offsetParent !== null);
  }

  // Get grid columns for arrow navigation
  getGridColumns(grid) {
    const computedStyle = window.getComputedStyle(grid);
    const gridTemplateColumns = computedStyle.gridTemplateColumns;
    
    if (gridTemplateColumns && gridTemplateColumns !== 'none') {
      return gridTemplateColumns.split(' ').length;
    }
    
    // Fallback: estimate based on width
    const gridWidth = grid.offsetWidth;
    const cardWidth = 200; // Approximate card width
    return Math.floor(gridWidth / cardWidth) || 2;
  }

  // Announce to screen reader
  announceToScreenReader(message, isAlert = false) {
    const regionId = isAlert ? 'aria-live-alerts' : 'aria-live-announcements';
    const region = document.getElementById(regionId);
    
    if (region) {
      // Clear previous message
      region.textContent = '';
      
      // Add new message after a brief delay
      setTimeout(() => {
        region.textContent = message;
      }, 100);
      
      // Clear message after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 5000);
    }

    // Store announcement for history
    this.announcements.push({
      message: message,
      timestamp: Date.now(),
      isAlert: isAlert
    });

    // Keep only last 20 announcements
    if (this.announcements.length > 20) {
      this.announcements.shift();
    }
  }

  // Restore focus to previous element
  restoreFocus() {
    if (this.focusHistory.length > 1) {
      // Get previous focus (skip current)
      const previousFocus = this.focusHistory[this.focusHistory.length - 2];
      
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    }
  }

  // Enable high contrast mode
  enableHighContrastMode() {
    this.isHighContrastMode = true;
    document.body.classList.add('high-contrast');
    
    // Add high contrast styles
    if (!document.getElementById('high-contrast-styles')) {
      const style = document.createElement('style');
      style.id = 'high-contrast-styles';
      style.textContent = `
        .high-contrast {
          --bg-primary: #000000;
          --bg-secondary: #1a1a1a;
          --bg-card: #000000;
          --text-primary: #ffffff;
          --text-secondary: #ffffff;
          --text-muted: #cccccc;
          --border-color: #ffffff;
          --primary-color: #ffff00;
          --success-color: #00ff00;
          --danger-color: #ff0000;
          --warning-color: #ffaa00;
        }
        
        .high-contrast .card {
          border: 2px solid #ffffff;
        }
        
        .high-contrast .btn {
          border: 2px solid #ffffff;
          font-weight: bold;
        }
        
        .high-contrast .modal-content {
          border: 3px solid #ffffff;
        }
        
        .high-contrast img {
          filter: contrast(1.5) brightness(1.2);
        }
      `;
      document.head.appendChild(style);
    }
    
    this.announceToScreenReader('High contrast mode enabled');
  }

  // Disable high contrast mode
  disableHighContrastMode() {
    this.isHighContrastMode = false;
    document.body.classList.remove('high-contrast');
    this.announceToScreenReader('High contrast mode disabled');
  }

  // Toggle high contrast mode
  toggleHighContrastMode() {
    if (this.isHighContrastMode) {
      this.disableHighContrastMode();
    } else {
      this.enableHighContrastMode();
    }
  }

  // Enable reduced motion mode
  enableReducedMotionMode() {
    this.isReducedMotionMode = true;
    document.body.classList.add('reduced-motion');
    
    // Add reduced motion styles
    if (!document.getElementById('reduced-motion-styles')) {
      const style = document.createElement('style');
      style.id = 'reduced-motion-styles';
      style.textContent = `
        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        
        .reduced-motion .floating-cart {
          transition: none !important;
        }
        
        .reduced-motion .modal {
          animation: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Disable reduced motion mode
  disableReducedMotionMode() {
    this.isReducedMotionMode = false;
    document.body.classList.remove('reduced-motion');
  }

  // Show keyboard shortcuts help
  showKeyboardShortcuts() {
    const shortcuts = Array.from(this.keyboardShortcuts.entries());
    
    const helpModal = document.createElement('div');
    helpModal.className = 'modal active';
    helpModal.setAttribute('role', 'dialog');
    helpModal.setAttribute('aria-labelledby', 'shortcuts-title');
    
    helpModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Close shortcuts help">&times;</button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            ${shortcuts.map(([key, shortcut]) => `
              <div class="shortcut-item">
                <kbd>${key.toUpperCase()}</kbd>
                <span>${shortcut.description}</span>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <h4>Navigation Tips:</h4>
            <ul>
              <li>Use Tab to navigate between interactive elements</li>
              <li>Use Arrow keys to navigate the product grid</li>
              <li>Use Enter or Space to activate buttons</li>
              <li>Use Escape to close modals</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    if (!document.getElementById('shortcuts-styles')) {
      const style = document.createElement('style');
      style.id = 'shortcuts-styles';
      style.textContent = `
        .shortcuts-list {
          display: grid;
          gap: 12px;
        }
        .shortcut-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .shortcut-item kbd {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 4px 8px;
          font-family: monospace;
          font-size: 0.9rem;
          min-width: 32px;
          text-align: center;
        }
        .shortcut-item span {
          flex: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(helpModal);
    
    // Focus first focusable element
    const firstFocusable = this.getFocusableElements(helpModal)[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  // Get accessibility status
  getAccessibilityStatus() {
    return {
      high_contrast_mode: this.isHighContrastMode,
      reduced_motion_mode: this.isReducedMotionMode,
      keyboard_shortcuts_count: this.keyboardShortcuts.size,
      recent_announcements: this.announcements.slice(-5),
      focus_history_length: this.focusHistory.length,
      live_regions_available: !!(document.getElementById('aria-live-announcements') && 
                                 document.getElementById('aria-live-alerts'))
    };
  }

  // Test accessibility features
  testAccessibilityFeatures() {
    console.log('♿ Testing accessibility features...');
    
    const tests = [
      {
        name: 'ARIA Live Regions',
        test: () => !!(document.getElementById('aria-live-announcements') && 
                      document.getElementById('aria-live-alerts'))
      },
      {
        name: 'Keyboard Navigation',
        test: () => this.keyboardShortcuts.size > 0
      },
      {
        name: 'Focus Management',
        test: () => this.focusHistory.length >= 0
      },
      {
        name: 'Screen Reader Support',
        test: () => document.querySelectorAll('[aria-label]').length > 0
      },
      {
        name: 'High Contrast Support',
        test: () => document.getElementById('high-contrast-styles') !== null || 
                   window.matchMedia('(prefers-contrast: high)').matches
      }
    ];
    
    tests.forEach(test => {
      const result = test.test();
      const status = result ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${result ? 'Available' : 'Not Available'}`);
    });
    
    return tests.map(test => ({ name: test.name, passed: test.test() }));
  }
}

// Create global instance
export const accessibilityManager = new AccessibilityManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.accessibilityManager = accessibilityManager;
}
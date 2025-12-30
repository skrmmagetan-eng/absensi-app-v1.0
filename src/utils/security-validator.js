// Security Validator - Comprehensive security and data validation for Quick Order
// Implements client-side security measures while respecting auth system protection

export class SecurityValidator {
  constructor() {
    this.validationRules = {
      cart: {
        maxItems: 20,
        maxQuantityPerItem: 100,
        maxTotalQuantity: 500,
        maxTotalValue: 100000000, // 100 million IDR
        maxItemNameLength: 200,
        maxNotesLength: 1000
      },
      session: {
        maxIdleTime: 30 * 60 * 1000, // 30 minutes
        cartExpiryTime: 24 * 60 * 60 * 1000, // 24 hours
        maxSessionAge: 8 * 60 * 60 * 1000 // 8 hours
      },
      user: {
        allowedRoles: ['employee', 'admin'],
        requiredPermissions: ['create_order', 'view_catalog']
      }
    };
    
    this.securityEvents = [];
    this.lastActivity = Date.now();
    this.csrfToken = this.generateCSRFToken();
    
    this.initializeSecurity();
  }

  // Initialize security monitoring
  initializeSecurity() {
    // Monitor user activity for session management
    this.setupActivityMonitoring();
    
    // Setup CSRF protection
    this.setupCSRFProtection();
    
    // Setup input sanitization
    this.setupInputSanitization();
    
    // Setup price integrity monitoring
    this.setupPriceIntegrityChecks();
    
    console.log('🔒 Security validator initialized');
  }

  // Validate cart operation security
  validateCartOperation(operation, data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      securityLevel: 'normal'
    };

    try {
      // Check user authentication and permissions
      const authValidation = this.validateUserAuthentication();
      if (!authValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...authValidation.errors);
        validation.securityLevel = 'critical';
        this.logSecurityEvent('auth_validation_failed', { operation, errors: authValidation.errors });
        return validation;
      }

      // Check session validity
      const sessionValidation = this.validateSession();
      if (!sessionValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...sessionValidation.errors);
        validation.securityLevel = 'high';
        this.logSecurityEvent('session_validation_failed', { operation, errors: sessionValidation.errors });
        return validation;
      }

      // Validate operation-specific data
      switch (operation) {
        case 'add_item':
          this.validateAddItemOperation(data, validation);
          break;
        case 'update_quantity':
          this.validateUpdateQuantityOperation(data, validation);
          break;
        case 'remove_item':
          this.validateRemoveItemOperation(data, validation);
          break;
        case 'clear_cart':
          this.validateClearCartOperation(data, validation);
          break;
        case 'create_order':
          this.validateCreateOrderOperation(data, validation);
          break;
        default:
          validation.warnings.push(`Unknown operation: ${operation}`);
      }

      // Check cart limits
      if (operation !== 'clear_cart' && operation !== 'remove_item') {
        this.validateCartLimits(data, validation);
      }

      // Update activity timestamp
      this.updateActivity();

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Security validation error: ${error.message}`);
      validation.securityLevel = 'critical';
      this.logSecurityEvent('validation_exception', { operation, error: error.message });
    }

    return validation;
  }

  // Validate user authentication (respects auth system protection)
  validateUserAuthentication() {
    const validation = { isValid: true, errors: [] };

    try {
      // Get user from existing auth system (read-only access)
      const user = window.state?.getState('user');
      
      if (!user) {
        validation.isValid = false;
        validation.errors.push('User not authenticated');
        return validation;
      }

      if (!user.id) {
        validation.isValid = false;
        validation.errors.push('Invalid user session - missing user ID');
        return validation;
      }

      // Check user role
      if (!this.validationRules.user.allowedRoles.includes(user.role)) {
        validation.isValid = false;
        validation.errors.push(`User role '${user.role}' not authorized for Quick Order operations`);
        return validation;
      }

      // Check user status
      if (user.status === 'inactive') {
        validation.isValid = false;
        validation.errors.push('User account is inactive');
        return validation;
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Authentication check failed: ${error.message}`);
    }

    return validation;
  }

  // Validate session
  validateSession() {
    const validation = { isValid: true, errors: [] };

    try {
      // Check session age
      const sessionData = localStorage.getItem('user_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const sessionAge = Date.now() - (session.created_at || 0);
        
        if (sessionAge > this.validationRules.session.maxSessionAge) {
          validation.isValid = false;
          validation.errors.push('Session expired - please login again');
          return validation;
        }
      }

      // Check idle time
      const idleTime = Date.now() - this.lastActivity;
      if (idleTime > this.validationRules.session.maxIdleTime) {
        validation.isValid = false;
        validation.errors.push('Session idle timeout - please refresh and try again');
        return validation;
      }

      // Check cart expiry
      const cartData = localStorage.getItem('quick_order_cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        const cartAge = Date.now() - new Date(cart.lastUpdated).getTime();
        
        if (cartAge > this.validationRules.session.cartExpiryTime) {
          validation.warnings = ['Cart data is old and may be cleared'];
        }
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Session validation failed: ${error.message}`);
    }

    return validation;
  }

  // Validate add item operation
  validateAddItemOperation(data, validation) {
    if (!data.product) {
      validation.isValid = false;
      validation.errors.push('Product data is required');
      return;
    }

    // Validate product data integrity
    const productValidation = this.validateProductData(data.product);
    if (!productValidation.isValid) {
      validation.isValid = false;
      validation.errors.push(...productValidation.errors);
    }

    // Validate quantity
    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
      validation.isValid = false;
      validation.errors.push('Quantity must be a positive integer');
    }

    if (data.quantity > this.validationRules.cart.maxQuantityPerItem) {
      validation.isValid = false;
      validation.errors.push(`Quantity exceeds maximum allowed (${this.validationRules.cart.maxQuantityPerItem})`);
    }

    // Check for price manipulation
    const priceIntegrityCheck = this.validatePriceIntegrity(data.product);
    if (!priceIntegrityCheck.isValid) {
      validation.isValid = false;
      validation.errors.push(...priceIntegrityCheck.errors);
      validation.securityLevel = 'high';
    }
  }

  // Validate update quantity operation
  validateUpdateQuantityOperation(data, validation) {
    if (!data.productId) {
      validation.isValid = false;
      validation.errors.push('Product ID is required');
      return;
    }

    if (!Number.isInteger(data.quantity) || data.quantity < 0) {
      validation.isValid = false;
      validation.errors.push('Quantity must be a non-negative integer');
    }

    if (data.quantity > this.validationRules.cart.maxQuantityPerItem) {
      validation.isValid = false;
      validation.errors.push(`Quantity exceeds maximum allowed (${this.validationRules.cart.maxQuantityPerItem})`);
    }
  }

  // Validate remove item operation
  validateRemoveItemOperation(data, validation) {
    if (!data.productId) {
      validation.isValid = false;
      validation.errors.push('Product ID is required for removal');
    }

    // Sanitize product ID
    if (typeof data.productId !== 'string' || data.productId.length === 0) {
      validation.isValid = false;
      validation.errors.push('Invalid product ID format');
    }
  }

  // Validate clear cart operation
  validateClearCartOperation(data, validation) {
    // No specific validation needed for clear cart
    // Just log the action for security monitoring
    this.logSecurityEvent('cart_cleared', { timestamp: Date.now() });
  }

  // Validate create order operation
  validateCreateOrderOperation(data, validation) {
    if (!data.customerId) {
      validation.isValid = false;
      validation.errors.push('Customer ID is required');
    }

    if (!data.cartItems || !Array.isArray(data.cartItems) || data.cartItems.length === 0) {
      validation.isValid = false;
      validation.errors.push('Cart items are required');
    }

    // Validate notes length
    if (data.notes && data.notes.length > this.validationRules.cart.maxNotesLength) {
      validation.isValid = false;
      validation.errors.push(`Notes exceed maximum length (${this.validationRules.cart.maxNotesLength})`);
    }

    // Validate each cart item
    if (data.cartItems) {
      data.cartItems.forEach((item, index) => {
        const itemValidation = this.validateCartItem(item, index);
        if (!itemValidation.isValid) {
          validation.isValid = false;
          validation.errors.push(...itemValidation.errors);
        }
      });
    }

    // Check for duplicate order prevention
    const duplicateCheck = this.checkDuplicateOrder(data);
    if (!duplicateCheck.isValid) {
      validation.isValid = false;
      validation.errors.push(...duplicateCheck.errors);
      validation.securityLevel = 'medium';
    }
  }

  // Validate product data
  validateProductData(product) {
    const validation = { isValid: true, errors: [] };

    if (!product.id || typeof product.id !== 'string') {
      validation.isValid = false;
      validation.errors.push('Invalid product ID');
    }

    if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
      validation.isValid = false;
      validation.errors.push('Invalid product name');
    }

    if (product.name && product.name.length > this.validationRules.cart.maxItemNameLength) {
      validation.isValid = false;
      validation.errors.push(`Product name too long (max ${this.validationRules.cart.maxItemNameLength} characters)`);
    }

    if (typeof product.price !== 'number' || product.price < 0 || !isFinite(product.price)) {
      validation.isValid = false;
      validation.errors.push('Invalid product price');
    }

    if (product.price > 10000000) { // 10 million IDR per item
      validation.isValid = false;
      validation.errors.push('Product price exceeds maximum allowed amount');
    }

    // Sanitize product name
    if (product.name) {
      const sanitized = this.sanitizeInput(product.name);
      if (sanitized !== product.name) {
        validation.warnings = validation.warnings || [];
        validation.warnings.push('Product name contains potentially unsafe characters');
      }
    }

    return validation;
  }

  // Validate cart limits
  validateCartLimits(data, validation) {
    // Get current cart state
    const cart = window.quickOrderManager?.cart;
    if (!cart) return;

    const currentItems = cart.getItems();
    const currentTotal = cart.getTotal();
    const currentItemCount = cart.getItemCount();

    // Check item count limit
    if (currentItems.length >= this.validationRules.cart.maxItems) {
      validation.isValid = false;
      validation.errors.push(`Cart cannot exceed ${this.validationRules.cart.maxItems} different products`);
    }

    // Check total quantity limit
    if (currentItemCount >= this.validationRules.cart.maxTotalQuantity) {
      validation.isValid = false;
      validation.errors.push(`Cart cannot exceed ${this.validationRules.cart.maxTotalQuantity} total items`);
    }

    // Check total value limit
    if (currentTotal >= this.validationRules.cart.maxTotalValue) {
      validation.isValid = false;
      validation.errors.push(`Cart total cannot exceed ${this.formatCurrency(this.validationRules.cart.maxTotalValue)}`);
    }
  }

  // Validate cart item
  validateCartItem(item, index) {
    const validation = { isValid: true, errors: [] };

    if (!item.id) {
      validation.isValid = false;
      validation.errors.push(`Item ${index + 1}: Missing product ID`);
    }

    if (!item.name || typeof item.name !== 'string') {
      validation.isValid = false;
      validation.errors.push(`Item ${index + 1}: Invalid product name`);
    }

    if (typeof item.price !== 'number' || item.price < 0) {
      validation.isValid = false;
      validation.errors.push(`Item ${index + 1}: Invalid price`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      validation.isValid = false;
      validation.errors.push(`Item ${index + 1}: Invalid quantity`);
    }

    return validation;
  }

  // Validate price integrity against catalog
  validatePriceIntegrity(product) {
    const validation = { isValid: true, errors: [] };

    try {
      // Get current catalog products
      const catalogProducts = window.catalogProducts;
      if (!catalogProducts) {
        validation.warnings = ['Cannot verify price integrity - catalog not available'];
        return validation;
      }

      // Find product in catalog
      const catalogProduct = catalogProducts.find(p => p.id === product.id);
      if (!catalogProduct) {
        validation.isValid = false;
        validation.errors.push('Product not found in current catalog');
        return validation;
      }

      // Check price match
      if (Math.abs(catalogProduct.price - product.price) > 0.01) { // Allow for floating point precision
        validation.isValid = false;
        validation.errors.push(`Price mismatch detected - catalog: ${this.formatCurrency(catalogProduct.price)}, provided: ${this.formatCurrency(product.price)}`);
        
        // Log potential price manipulation attempt
        this.logSecurityEvent('price_manipulation_detected', {
          product_id: product.id,
          catalog_price: catalogProduct.price,
          provided_price: product.price,
          difference: Math.abs(catalogProduct.price - product.price)
        });
      }

    } catch (error) {
      validation.warnings = [`Price integrity check failed: ${error.message}`];
    }

    return validation;
  }

  // Check for duplicate orders
  checkDuplicateOrder(orderData) {
    const validation = { isValid: true, errors: [] };

    try {
      // Check recent orders in localStorage
      const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

      const duplicateOrder = recentOrders.find(order => {
        return order.customer_id === orderData.customerId &&
               order.total_amount === orderData.totalAmount &&
               new Date(order.created_at).getTime() > fiveMinutesAgo &&
               this.compareOrderItems(order.items, orderData.cartItems);
      });

      if (duplicateOrder) {
        validation.isValid = false;
        validation.errors.push('Duplicate order detected - similar order was created recently');
        
        this.logSecurityEvent('duplicate_order_prevented', {
          customer_id: orderData.customerId,
          total_amount: orderData.totalAmount,
          time_since_last: Date.now() - new Date(duplicateOrder.created_at).getTime()
        });
      }

    } catch (error) {
      validation.warnings = [`Duplicate order check failed: ${error.message}`];
    }

    return validation;
  }

  // Compare order items for duplicate detection
  compareOrderItems(items1, items2) {
    if (items1.length !== items2.length) return false;

    const sorted1 = items1.sort((a, b) => a.id?.localeCompare(b.id));
    const sorted2 = items2.sort((a, b) => a.id?.localeCompare(b.id));

    return sorted1.every((item1, index) => {
      const item2 = sorted2[index];
      return item1.id === item2.id && 
             item1.quantity === item2.quantity &&
             Math.abs(item1.price - item2.price) < 0.01;
    });
  }

  // Setup activity monitoring
  setupActivityMonitoring() {
    // Monitor user interactions
    const events = ['click', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.updateActivity();
      }, { passive: true });
    });

    // Monitor page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateActivity();
      }
    });
  }

  // Setup CSRF protection
  setupCSRFProtection() {
    // Add CSRF token to all Quick Order requests
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
      // Only add CSRF token to our API requests
      if (url.includes('/api/') || url.includes('quick-order')) {
        options.headers = options.headers || {};
        options.headers['X-CSRF-Token'] = window.securityValidator.csrfToken;
      }
      
      return originalFetch(url, options);
    };

    // Regenerate CSRF token periodically
    setInterval(() => {
      this.csrfToken = this.generateCSRFToken();
    }, 30 * 60 * 1000); // Every 30 minutes
  }

  // Setup input sanitization
  setupInputSanitization() {
    // Monitor form inputs for XSS attempts
    document.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const sanitized = this.sanitizeInput(e.target.value);
        
        if (sanitized !== e.target.value) {
          this.logSecurityEvent('xss_attempt_detected', {
            element: e.target.tagName,
            original: e.target.value,
            sanitized: sanitized
          });
          
          // Don't automatically change the value, just log it
          console.warn('🔒 Potentially unsafe input detected and logged');
        }
      }
    });
  }

  // Setup price integrity monitoring
  setupPriceIntegrityChecks() {
    // Monitor for price changes in catalog
    let lastCatalogHash = null;
    
    const checkCatalogIntegrity = () => {
      if (window.catalogProducts) {
        const currentHash = this.generateCatalogHash(window.catalogProducts);
        
        if (lastCatalogHash && lastCatalogHash !== currentHash) {
          this.logSecurityEvent('catalog_changed', {
            previous_hash: lastCatalogHash,
            current_hash: currentHash,
            timestamp: Date.now()
          });
          
          // Clear cart if catalog changed significantly
          if (window.quickOrderManager?.cart) {
            const cartItems = window.quickOrderManager.cart.getItems();
            if (cartItems.length > 0) {
              console.warn('🔒 Catalog changed - cart may need validation');
            }
          }
        }
        
        lastCatalogHash = currentHash;
      }
    };

    // Check catalog integrity every 5 minutes
    setInterval(checkCatalogIntegrity, 5 * 60 * 1000);
    
    // Initial check
    setTimeout(checkCatalogIntegrity, 1000);
  }

  // Update activity timestamp
  updateActivity() {
    this.lastActivity = Date.now();
  }

  // Generate CSRF token
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Sanitize input to prevent XSS
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/script/gi, '') // Remove script tags
      .trim();
  }

  // Generate catalog hash for integrity checking
  generateCatalogHash(products) {
    const hashData = products.map(p => `${p.id}:${p.price}:${p.name}`).join('|');
    
    // Simple hash function (in production, use a proper hash function)
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  // Log security event
  logSecurityEvent(eventType, data) {
    const event = {
      type: eventType,
      data: data,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      url: window.location.href,
      user_id: window.state?.getState('user')?.id || 'unknown'
    };

    this.securityEvents.push(event);
    
    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents.shift();
    }

    // Store security events
    try {
      const stored = JSON.parse(localStorage.getItem('security_events') || '[]');
      stored.push(event);
      
      // Keep only last 50 events in storage
      if (stored.length > 50) {
        stored.splice(0, stored.length - 50);
      }
      
      localStorage.setItem('security_events', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store security event:', error);
    }

    // Log to console for development
    console.warn(`🔒 Security Event: ${eventType}`, data);
  }

  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Get security status
  getSecurityStatus() {
    const authValidation = this.validateUserAuthentication();
    const sessionValidation = this.validateSession();
    
    return {
      authenticated: authValidation.isValid,
      session_valid: sessionValidation.isValid,
      last_activity: this.lastActivity,
      idle_time: Date.now() - this.lastActivity,
      csrf_token: this.csrfToken,
      security_events_count: this.securityEvents.length,
      recent_events: this.securityEvents.slice(-5)
    };
  }

  // Get security events
  getSecurityEvents(eventType = null) {
    if (eventType) {
      return this.securityEvents.filter(event => event.type === eventType);
    }
    return [...this.securityEvents];
  }

  // Clear security events
  clearSecurityEvents() {
    this.securityEvents = [];
    localStorage.removeItem('security_events');
    console.log('🔒 Security events cleared');
  }

  // Force session validation
  forceSessionValidation() {
    const validation = this.validateSession();
    
    if (!validation.isValid) {
      // Clear cart and redirect to login
      if (window.quickOrderManager?.cart) {
        window.quickOrderManager.cart.clear();
      }
      
      this.logSecurityEvent('forced_logout', {
        reason: validation.errors.join(', ')
      });
      
      // Redirect to login (respecting auth system)
      window.location.hash = '#login';
    }
    
    return validation;
  }
}

// Create global instance
export const securityValidator = new SecurityValidator();

// Export for global access
if (typeof window !== 'undefined') {
  window.securityValidator = securityValidator;
}
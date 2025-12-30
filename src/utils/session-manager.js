// Session Manager - Manages Quick Order sessions while respecting auth system
// Provides session validation and cart expiry without modifying core auth

export class SessionManager {
  constructor() {
    this.sessionConfig = {
      cartExpiryTime: 24 * 60 * 60 * 1000, // 24 hours
      maxIdleTime: 30 * 60 * 1000, // 30 minutes
      warningTime: 5 * 60 * 1000, // 5 minutes before expiry
      checkInterval: 60 * 1000, // Check every minute
      maxSessionExtensions: 3 // Max times session can be extended
    };
    
    this.sessionState = {
      lastActivity: Date.now(),
      sessionExtensions: 0,
      warningShown: false,
      isActive: true
    };
    
    this.sessionTimer = null;
    this.warningTimer = null;
    
    this.initializeSessionManagement();
  }

  // Initialize session management
  initializeSessionManagement() {
    // Start session monitoring
    this.startSessionMonitoring();
    
    // Setup activity tracking
    this.setupActivityTracking();
    
    // Setup cart expiry management
    this.setupCartExpiryManagement();
    
    // Setup page visibility handling
    this.setupVisibilityHandling();
    
    console.log('⏰ Session manager initialized');
  }

  // Start session monitoring
  startSessionMonitoring() {
    this.sessionTimer = setInterval(() => {
      this.checkSessionStatus();
    }, this.sessionConfig.checkInterval);
    
    // Initial check
    setTimeout(() => this.checkSessionStatus(), 1000);
  }

  // Check session status
  checkSessionStatus() {
    try {
      // Check if user is still authenticated (read-only check)
      const user = window.state?.getState('user');
      if (!user || !user.id) {
        this.handleSessionExpiry('authentication_lost');
        return;
      }

      // Check idle time
      const idleTime = Date.now() - this.sessionState.lastActivity;
      
      if (idleTime > this.sessionConfig.maxIdleTime) {
        this.handleSessionExpiry('idle_timeout');
        return;
      }

      // Show warning if approaching expiry
      const timeToExpiry = this.sessionConfig.maxIdleTime - idleTime;
      if (timeToExpiry <= this.sessionConfig.warningTime && !this.sessionState.warningShown) {
        this.showSessionWarning(timeToExpiry);
      }

      // Check cart expiry
      this.checkCartExpiry();

    } catch (error) {
      console.error('Session check failed:', error);
      this.logSessionEvent('session_check_error', { error: error.message });
    }
  }

  // Setup activity tracking
  setupActivityTracking() {
    const activityEvents = [
      'click', 'keypress', 'scroll', 'touchstart', 'mousemove'
    ];
    
    const updateActivity = () => {
      this.updateActivity();
    };
    
    activityEvents.forEach(eventType => {
      document.addEventListener(eventType, updateActivity, { 
        passive: true,
        capture: false 
      });
    });

    // Track Quick Order specific activities
    document.addEventListener('quickOrderCartUpdate', () => {
      this.updateActivity();
    });

    // Track navigation
    window.addEventListener('hashchange', () => {
      this.updateActivity();
    });
  }

  // Setup cart expiry management
  setupCartExpiryManagement() {
    // Check cart expiry on page load
    this.checkCartExpiry();
    
    // Monitor cart changes
    document.addEventListener('quickOrderCartUpdate', (event) => {
      if (event.detail.type === 'item_added' || 
          event.detail.type === 'quantity_updated') {
        this.updateCartTimestamp();
      }
    });
  }

  // Setup page visibility handling
  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible - update activity and check session
        this.updateActivity();
        this.checkSessionStatus();
        
        // Clear any existing warnings
        this.clearSessionWarning();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.logSessionEvent('page_unload', {
        session_duration: Date.now() - this.sessionState.lastActivity,
        cart_items: window.quickOrderManager?.cart?.getItemCount() || 0
      });
    });
  }

  // Update activity timestamp
  updateActivity() {
    this.sessionState.lastActivity = Date.now();
    this.sessionState.warningShown = false;
    
    // Clear warning if shown
    this.clearSessionWarning();
    
    // Log activity for analytics
    this.logSessionEvent('user_activity', {
      timestamp: this.sessionState.lastActivity
    });
  }

  // Check cart expiry
  checkCartExpiry() {
    try {
      const cartData = localStorage.getItem('quick_order_cart');
      if (!cartData) return;

      const cart = JSON.parse(cartData);
      const cartAge = Date.now() - new Date(cart.lastUpdated).getTime();

      if (cartAge > this.sessionConfig.cartExpiryTime) {
        this.handleCartExpiry();
      } else if (cartAge > this.sessionConfig.cartExpiryTime - this.sessionConfig.warningTime) {
        // Show cart expiry warning
        const timeToExpiry = this.sessionConfig.cartExpiryTime - cartAge;
        this.showCartExpiryWarning(timeToExpiry);
      }

    } catch (error) {
      console.error('Cart expiry check failed:', error);
    }
  }

  // Handle session expiry
  handleSessionExpiry(reason) {
    this.sessionState.isActive = false;
    
    this.logSessionEvent('session_expired', {
      reason: reason,
      idle_time: Date.now() - this.sessionState.lastActivity,
      cart_items: window.quickOrderManager?.cart?.getItemCount() || 0
    });

    // Clear timers
    this.clearTimers();

    // Show expiry notification
    this.showSessionExpiredNotification(reason);

    // Clear cart if idle timeout
    if (reason === 'idle_timeout') {
      this.clearExpiredCart();
    }

    // Redirect to appropriate page
    setTimeout(() => {
      if (reason === 'authentication_lost') {
        window.location.hash = '#login';
      } else {
        window.location.reload();
      }
    }, 3000);
  }

  // Handle cart expiry
  handleCartExpiry() {
    this.logSessionEvent('cart_expired', {
      cart_age: this.getCartAge(),
      cart_items: window.quickOrderManager?.cart?.getItemCount() || 0
    });

    // Clear expired cart
    this.clearExpiredCart();

    // Show notification
    this.showCartExpiredNotification();
  }

  // Show session warning
  showSessionWarning(timeToExpiry) {
    this.sessionState.warningShown = true;
    
    const minutes = Math.ceil(timeToExpiry / 60000);
    
    const warningElement = this.createWarningElement(
      '⏰ Sesi Akan Berakhir',
      `Sesi Anda akan berakhir dalam ${minutes} menit. Klik untuk memperpanjang.`,
      () => this.extendSession(),
      'session-warning'
    );

    document.body.appendChild(warningElement);

    // Auto-hide warning after 30 seconds if no action
    this.warningTimer = setTimeout(() => {
      this.clearSessionWarning();
    }, 30000);
  }

  // Show cart expiry warning
  showCartExpiryWarning(timeToExpiry) {
    const hours = Math.ceil(timeToExpiry / (60 * 60 * 1000));
    
    const warningElement = this.createWarningElement(
      '🛒 Keranjang Akan Kedaluwarsa',
      `Keranjang Anda akan kedaluwarsa dalam ${hours} jam. Buat order sekarang untuk menyimpan.`,
      () => {
        if (window.openCartModal) {
          window.openCartModal();
        }
        this.clearCartWarning();
      },
      'cart-warning'
    );

    document.body.appendChild(warningElement);
  }

  // Show session expired notification
  showSessionExpiredNotification(reason) {
    let message = 'Sesi Anda telah berakhir.';
    
    switch (reason) {
      case 'idle_timeout':
        message = 'Sesi berakhir karena tidak ada aktivitas. Halaman akan dimuat ulang.';
        break;
      case 'authentication_lost':
        message = 'Sesi autentikasi hilang. Anda akan diarahkan ke halaman login.';
        break;
    }

    const notification = this.createNotificationElement(
      '🔒 Sesi Berakhir',
      message,
      'session-expired'
    );

    document.body.appendChild(notification);
  }

  // Show cart expired notification
  showCartExpiredNotification() {
    const notification = this.createNotificationElement(
      '🛒 Keranjang Kedaluwarsa',
      'Keranjang Anda telah kedaluwarsa dan dikosongkan. Mulai berbelanja lagi.',
      'cart-expired'
    );

    document.body.appendChild(notification);
  }

  // Create warning element
  createWarningElement(title, message, action, className) {
    const element = document.createElement('div');
    element.className = `session-warning ${className}`;
    element.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
      cursor: pointer;
      animation: slideInRight 0.3s ease;
    `;

    element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">${title}</div>
      <div style="font-size: 0.9rem; line-height: 1.4;">${message}</div>
      <div style="margin-top: 12px; text-align: right;">
        <button style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
          Perpanjang Sesi
        </button>
      </div>
    `;

    element.addEventListener('click', action);

    // Add animation styles if not exists
    if (!document.getElementById('session-warning-styles')) {
      const style = document.createElement('style');
      style.id = 'session-warning-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .session-warning:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease;
        }
      `;
      document.head.appendChild(style);
    }

    return element;
  }

  // Create notification element
  createNotificationElement(title, message, className) {
    const element = document.createElement('div');
    element.className = `session-notification ${className}`;
    element.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1f2937;
      color: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 10001;
      max-width: 400px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;

    element.innerHTML = `
      <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 12px;">${title}</div>
      <div style="line-height: 1.5; color: #d1d5db;">${message}</div>
    `;

    // Add fade in animation
    if (!document.getElementById('session-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'session-notification-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (element.parentNode) {
        element.remove();
      }
    }, 5000);

    return element;
  }

  // Extend session
  extendSession() {
    if (this.sessionState.sessionExtensions >= this.sessionConfig.maxSessionExtensions) {
      this.showMaxExtensionsReached();
      return;
    }

    this.sessionState.sessionExtensions++;
    this.updateActivity();
    this.clearSessionWarning();

    this.logSessionEvent('session_extended', {
      extension_count: this.sessionState.sessionExtensions,
      remaining_extensions: this.sessionConfig.maxSessionExtensions - this.sessionState.sessionExtensions
    });

    // Show success message
    const successElement = this.createNotificationElement(
      '✅ Sesi Diperpanjang',
      `Sesi berhasil diperpanjang. Sisa perpanjangan: ${this.sessionConfig.maxSessionExtensions - this.sessionState.sessionExtensions}`,
      'session-extended'
    );

    document.body.appendChild(successElement);
  }

  // Show max extensions reached
  showMaxExtensionsReached() {
    const notification = this.createNotificationElement(
      '⚠️ Batas Perpanjangan',
      'Anda telah mencapai batas maksimum perpanjangan sesi. Silakan login ulang.',
      'max-extensions'
    );

    document.body.appendChild(notification);

    // Force logout after showing message
    setTimeout(() => {
      this.handleSessionExpiry('max_extensions_reached');
    }, 3000);
  }

  // Clear session warning
  clearSessionWarning() {
    const warnings = document.querySelectorAll('.session-warning');
    warnings.forEach(warning => warning.remove());
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // Clear cart warning
  clearCartWarning() {
    const warnings = document.querySelectorAll('.cart-warning');
    warnings.forEach(warning => warning.remove());
  }

  // Clear expired cart
  clearExpiredCart() {
    if (window.quickOrderManager?.cart) {
      window.quickOrderManager.cart.clear();
    }
    
    // Also clear localStorage directly
    localStorage.removeItem('quick_order_cart');
    localStorage.removeItem('quick_order_cart_fallback');
  }

  // Update cart timestamp
  updateCartTimestamp() {
    try {
      const cartData = localStorage.getItem('quick_order_cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        cart.lastUpdated = new Date().toISOString();
        localStorage.setItem('quick_order_cart', JSON.stringify(cart));
      }
    } catch (error) {
      console.error('Failed to update cart timestamp:', error);
    }
  }

  // Get cart age
  getCartAge() {
    try {
      const cartData = localStorage.getItem('quick_order_cart');
      if (!cartData) return 0;

      const cart = JSON.parse(cartData);
      return Date.now() - new Date(cart.lastUpdated).getTime();
    } catch (error) {
      return 0;
    }
  }

  // Clear timers
  clearTimers() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // Log session event
  logSessionEvent(eventType, data) {
    const event = {
      type: eventType,
      data: data,
      timestamp: Date.now(),
      user_id: window.state?.getState('user')?.id || 'unknown',
      session_id: this.getSessionId()
    };

    try {
      const stored = JSON.parse(localStorage.getItem('session_events') || '[]');
      stored.push(event);
      
      // Keep only last 50 events
      if (stored.length > 50) {
        stored.splice(0, stored.length - 50);
      }
      
      localStorage.setItem('session_events', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store session event:', error);
    }

    console.log(`⏰ Session Event: ${eventType}`, data);
  }

  // Get session ID
  getSessionId() {
    let sessionId = localStorage.getItem('quick_order_session_id');
    
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      localStorage.setItem('quick_order_session_id', sessionId);
    }
    
    return sessionId;
  }

  // Get session status
  getSessionStatus() {
    const idleTime = Date.now() - this.sessionState.lastActivity;
    const cartAge = this.getCartAge();
    
    return {
      is_active: this.sessionState.isActive,
      last_activity: this.sessionState.lastActivity,
      idle_time: idleTime,
      idle_minutes: Math.floor(idleTime / 60000),
      time_to_expiry: Math.max(0, this.sessionConfig.maxIdleTime - idleTime),
      session_extensions: this.sessionState.sessionExtensions,
      remaining_extensions: this.sessionConfig.maxSessionExtensions - this.sessionState.sessionExtensions,
      cart_age: cartAge,
      cart_hours_remaining: Math.max(0, Math.floor((this.sessionConfig.cartExpiryTime - cartAge) / (60 * 60 * 1000))),
      session_id: this.getSessionId()
    };
  }

  // Force session refresh
  forceSessionRefresh() {
    this.updateActivity();
    this.sessionState.warningShown = false;
    this.clearSessionWarning();
    
    this.logSessionEvent('session_refreshed', {
      manual_refresh: true
    });
    
    console.log('⏰ Session manually refreshed');
  }

  // Destroy session manager
  destroy() {
    this.clearTimers();
    this.clearSessionWarning();
    this.clearCartWarning();
    
    // Remove event listeners (simplified - in production, track and remove properly)
    console.log('⏰ Session manager destroyed');
  }
}

// Create global instance
export const sessionManager = new SessionManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.sessionManager = sessionManager;
}
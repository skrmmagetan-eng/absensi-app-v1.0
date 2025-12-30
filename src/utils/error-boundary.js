// Error Boundary - Comprehensive error handling and recovery for Quick Order
// Provides graceful error handling, user feedback, and automatic recovery

export class ErrorBoundary {
  constructor() {
    this.errorHandlers = new Map();
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.isRecovering = false;
    this.maxErrorHistory = 50;
    
    this.initializeErrorBoundary();
  }

  // Initialize error boundary system
  initializeErrorBoundary() {
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
    
    // Setup component error boundaries
    this.setupComponentErrorBoundaries();
    
    // Setup recovery strategies
    this.setupRecoveryStrategies();
    
    // Setup error reporting
    this.setupErrorReporting();
    
    // Setup user feedback system
    this.setupUserFeedbackSystem();
    
    console.log('🛡️ Error boundary initialized');
  }

  // Setup global error handlers
  setupGlobalErrorHandlers() {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Network errors
    window.addEventListener('offline', () => {
      this.handleError({
        type: 'network_error',
        message: 'Network connection lost',
        recoverable: true
      });
    });

    // Resource loading errors
    document.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          type: 'resource_error',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          src: event.target.src || event.target.href,
          recoverable: true
        });
      }
    }, true);
  }

  // Setup component error boundaries
  setupComponentErrorBoundaries() {
    // Cart operations error boundary
    this.addErrorBoundary('cart', {
      selector: '#catalog-grid, #cart-modal, #floating-cart',
      fallback: this.createCartErrorFallback.bind(this),
      recovery: 'cart_recovery'
    });

    // Modal error boundary
    this.addErrorBoundary('modal', {
      selector: '.modal',
      fallback: this.createModalErrorFallback.bind(this),
      recovery: 'modal_recovery'
    });

    // Product grid error boundary
    this.addErrorBoundary('product_grid', {
      selector: '#catalog-grid',
      fallback: this.createProductGridErrorFallback.bind(this),
      recovery: 'product_grid_recovery'
    });

    // Navigation error boundary
    this.addErrorBoundary('navigation', {
      selector: '.navbar, .bottom-nav',
      fallback: this.createNavigationErrorFallback.bind(this),
      recovery: 'navigation_recovery'
    });
  }

  // Add error boundary for component
  addErrorBoundary(name, config) {
    this.errorHandlers.set(name, config);
    
    // Monitor component for errors
    const elements = document.querySelectorAll(config.selector);
    elements.forEach(element => {
      this.wrapElementWithErrorBoundary(element, name, config);
    });
  }

  // Wrap element with error boundary
  wrapElementWithErrorBoundary(element, boundaryName, config) {
    // Store original content
    const originalContent = element.innerHTML;
    
    // Add error boundary data
    element.setAttribute('data-error-boundary', boundaryName);
    element.setAttribute('data-original-content', originalContent);
    
    // Monitor for errors in this element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        // Check for error indicators
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.classList?.contains('error-indicator')) {
              this.handleComponentError(boundaryName, element, config);
            }
          });
        }
      });
    });
    
    observer.observe(element, { childList: true, subtree: true });
  }

  // Handle component error
  handleComponentError(boundaryName, element, config) {
    console.error(`Component error in ${boundaryName}:`, element);
    
    // Create fallback UI
    const fallbackContent = config.fallback(element);
    
    // Replace content with fallback
    element.innerHTML = fallbackContent;
    element.classList.add('error-boundary-active');
    
    // Log error
    this.handleError({
      type: 'component_error',
      component: boundaryName,
      message: `Error in ${boundaryName} component`,
      element: element,
      recoverable: true
    });
    
    // Attempt recovery
    if (config.recovery) {
      setTimeout(() => {
        this.attemptRecovery(config.recovery, element);
      }, 2000);
    }
  }

  // Setup recovery strategies
  setupRecoveryStrategies() {
    // Cart recovery
    this.recoveryStrategies.set('cart_recovery', async (element) => {
      try {
        // Clear cart state
        if (window.quickOrderManager?.cart) {
          window.quickOrderManager.cart.clear();
        }
        
        // Restore original content
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
          element.innerHTML = originalContent;
          element.classList.remove('error-boundary-active');
        }
        
        // Reinitialize cart events
        if (window.setupQuickOrderEvents) {
          window.setupQuickOrderEvents();
        }
        
        return true;
      } catch (error) {
        console.error('Cart recovery failed:', error);
        return false;
      }
    });

    // Modal recovery
    this.recoveryStrategies.set('modal_recovery', async (element) => {
      try {
        // Close all modals
        document.querySelectorAll('.modal.active').forEach(modal => {
          modal.classList.remove('active');
        });
        
        // Restore original content
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
          element.innerHTML = originalContent;
          element.classList.remove('error-boundary-active');
        }
        
        return true;
      } catch (error) {
        console.error('Modal recovery failed:', error);
        return false;
      }
    });

    // Product grid recovery
    this.recoveryStrategies.set('product_grid_recovery', async (element) => {
      try {
        // Reload catalog
        if (window.loadCatalog) {
          await window.loadCatalog();
        }
        
        element.classList.remove('error-boundary-active');
        return true;
      } catch (error) {
        console.error('Product grid recovery failed:', error);
        return false;
      }
    });

    // Navigation recovery
    this.recoveryStrategies.set('navigation_recovery', async (element) => {
      try {
        // Restore original content
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
          element.innerHTML = originalContent;
          element.classList.remove('error-boundary-active');
        }
        
        return true;
      } catch (error) {
        console.error('Navigation recovery failed:', error);
        return false;
      }
    });

    // Generic page recovery
    this.recoveryStrategies.set('page_recovery', async () => {
      try {
        // Clear all error states
        document.querySelectorAll('.error-boundary-active').forEach(element => {
          element.classList.remove('error-boundary-active');
        });
        
        // Reload page as last resort
        window.location.reload();
        return true;
      } catch (error) {
        console.error('Page recovery failed:', error);
        return false;
      }
    });
  }

  // Handle error
  handleError(errorInfo) {
    // Add timestamp and ID
    const error = {
      ...errorInfo,
      id: this.generateErrorId(),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      user_id: window.state?.getState('user')?.id || 'unknown'
    };

    // Add to error history
    this.errorHistory.push(error);
    
    // Keep only recent errors
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }

    // Log error
    console.error('Error boundary caught error:', error);

    // Determine error severity
    const severity = this.determineErrorSeverity(error);
    
    // Show user feedback based on severity
    this.showUserFeedback(error, severity);
    
    // Report error
    this.reportError(error);
    
    // Attempt automatic recovery for recoverable errors
    if (error.recoverable && !this.isRecovering) {
      this.attemptAutomaticRecovery(error);
    }
    
    // Track error analytics
    this.trackErrorAnalytics(error);
  }

  // Determine error severity
  determineErrorSeverity(error) {
    // Critical errors that break core functionality
    if (error.type === 'javascript_error' && 
        (error.message?.includes('cart') || 
         error.message?.includes('order') ||
         error.message?.includes('auth'))) {
      return 'critical';
    }
    
    // High severity errors
    if (error.type === 'unhandled_promise_rejection' ||
        error.type === 'component_error') {
      return 'high';
    }
    
    // Medium severity errors
    if (error.type === 'network_error' ||
        error.type === 'resource_error') {
      return 'medium';
    }
    
    // Low severity errors
    return 'low';
  }

  // Show user feedback
  showUserFeedback(error, severity) {
    let message, type, actions;
    
    switch (severity) {
      case 'critical':
        message = 'Terjadi kesalahan sistem yang serius. Halaman akan dimuat ulang.';
        type = 'error';
        actions = [
          {
            text: 'Muat Ulang',
            action: () => window.location.reload()
          }
        ];
        break;
        
      case 'high':
        message = 'Terjadi kesalahan. Sistem sedang mencoba memulihkan...';
        type = 'warning';
        actions = [
          {
            text: 'Coba Lagi',
            action: () => this.attemptManualRecovery(error)
          }
        ];
        break;
        
      case 'medium':
        message = error.type === 'network_error' ? 
          'Koneksi internet bermasalah. Beberapa fitur mungkin terbatas.' :
          'Gagal memuat beberapa resource. Fungsi utama tetap berjalan.';
        type = 'info';
        actions = [];
        break;
        
      case 'low':
        // Don't show feedback for low severity errors
        return;
    }
    
    this.createErrorNotification(message, type, actions, error.id);
  }

  // Create error notification
  createErrorNotification(message, type, actions, errorId) {
    // Remove existing error notifications
    document.querySelectorAll('.error-notification').forEach(notification => {
      notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `error-notification error-${type}`;
    notification.setAttribute('data-error-id', errorId);
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#dbeafe'};
      color: ${type === 'error' ? '#991b1b' : type === 'warning' ? '#92400e' : '#1e40af'};
      border: 1px solid ${type === 'error' ? '#fecaca' : type === 'warning' ? '#fde68a' : '#93c5fd'};
      border-radius: 8px;
      padding: 16px;
      max-width: 400px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 1.2rem;">
          ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 8px;">
            ${type === 'error' ? 'Kesalahan Sistem' : type === 'warning' ? 'Peringatan' : 'Informasi'}
          </div>
          <div style="margin-bottom: ${actions.length > 0 ? '12px' : '0'};">
            ${message}
          </div>
          ${actions.length > 0 ? `
            <div style="display: flex; gap: 8px;">
              ${actions.map(action => `
                <button onclick="this.closest('.error-notification').remove(); (${action.action})()" 
                        style="background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb'}; 
                               color: white; border: none; padding: 6px 12px; border-radius: 4px; 
                               cursor: pointer; font-size: 0.8rem;">
                  ${action.text}
                </button>
              `).join('')}
              <button onclick="this.closest('.error-notification').remove()" 
                      style="background: transparent; color: currentColor; border: 1px solid currentColor; 
                             padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                Tutup
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after delay (longer for critical errors)
    const delay = type === 'error' ? 10000 : type === 'warning' ? 7000 : 5000;
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, delay);
    
    // Add animation styles if not exists
    if (!document.getElementById('error-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'error-notification-styles';
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
      `;
      document.head.appendChild(style);
    }
  }

  // Attempt automatic recovery
  async attemptAutomaticRecovery(error) {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    
    try {
      let recoverySuccess = false;
      
      // Try component-specific recovery first
      if (error.component) {
        const element = document.querySelector(`[data-error-boundary="${error.component}"]`);
        if (element) {
          const config = this.errorHandlers.get(error.component);
          if (config?.recovery) {
            recoverySuccess = await this.attemptRecovery(config.recovery, element);
          }
        }
      }
      
      // Try generic recovery strategies
      if (!recoverySuccess) {
        if (error.type === 'network_error') {
          recoverySuccess = await this.attemptNetworkRecovery();
        } else if (error.type === 'resource_error') {
          recoverySuccess = await this.attemptResourceRecovery(error);
        }
      }
      
      if (recoverySuccess) {
        this.showRecoverySuccess();
      } else {
        this.showRecoveryFailure(error);
      }
      
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      this.showRecoveryFailure(error);
    } finally {
      this.isRecovering = false;
    }
  }

  // Attempt recovery
  async attemptRecovery(strategyName, element) {
    const strategy = this.recoveryStrategies.get(strategyName);
    
    if (!strategy) {
      console.error(`Recovery strategy not found: ${strategyName}`);
      return false;
    }
    
    try {
      return await strategy(element);
    } catch (error) {
      console.error(`Recovery strategy ${strategyName} failed:`, error);
      return false;
    }
  }

  // Attempt network recovery
  async attemptNetworkRecovery() {
    try {
      // Wait for network to come back online
      if (!navigator.onLine) {
        return false;
      }
      
      // Test network connectivity
      const response = await fetch(window.location.href, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Attempt resource recovery
  async attemptResourceRecovery(error) {
    try {
      if (error.element === 'IMG' && error.src) {
        // Try to reload failed image
        const img = new Image();
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = error.src;
        });
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Show recovery success
  showRecoverySuccess() {
    this.createErrorNotification(
      'Sistem berhasil dipulihkan! 🎉',
      'info',
      [],
      'recovery_success'
    );
  }

  // Show recovery failure
  showRecoveryFailure(error) {
    this.createErrorNotification(
      'Pemulihan otomatis gagal. Silakan muat ulang halaman.',
      'error',
      [
        {
          text: 'Muat Ulang',
          action: () => window.location.reload()
        }
      ],
      'recovery_failure'
    );
  }

  // Create fallback UIs
  createCartErrorFallback(element) {
    return `
      <div class="error-fallback">
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🛒</div>
          <h3>Keranjang Bermasalah</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">
            Terjadi kesalahan pada keranjang belanja. Sistem sedang mencoba memulihkan...
          </p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    `;
  }

  createModalErrorFallback(element) {
    return `
      <div class="modal-content">
        <div class="modal-header">
          <h3>❌ Kesalahan</h3>
          <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 20px;">
            <p>Terjadi kesalahan pada dialog ini.</p>
            <button class="btn btn-outline" onclick="this.closest('.modal').classList.remove('active')">
              Tutup
            </button>
          </div>
        </div>
      </div>
    `;
  }

  createProductGridErrorFallback(element) {
    return `
      <div class="error-fallback col-span-2">
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">📦</div>
          <h3>Gagal Memuat Produk</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">
            Terjadi kesalahan saat memuat katalog produk.
          </p>
          <button class="btn btn-primary" onclick="window.loadCatalog?.()">
            Coba Lagi
          </button>
        </div>
      </div>
    `;
  }

  createNavigationErrorFallback(element) {
    return `
      <div class="error-fallback">
        <div style="padding: 10px; text-align: center; background: var(--bg-danger); color: white;">
          ⚠️ Navigasi bermasalah - <a href="#" onclick="window.location.reload()" style="color: white; text-decoration: underline;">Muat ulang</a>
        </div>
      </div>
    `;
  }

  // Setup error reporting
  setupErrorReporting() {
    // Report errors to analytics
    this.reportError = (error) => {
      try {
        if (window.analyticsTracker) {
          window.analyticsTracker.trackError(new Error(error.message), {
            error_boundary: true,
            error_type: error.type,
            error_severity: this.determineErrorSeverity(error),
            component: error.component,
            recoverable: error.recoverable
          });
        }
      } catch (reportingError) {
        console.error('Error reporting failed:', reportingError);
      }
    };
  }

  // Setup user feedback system
  setupUserFeedbackSystem() {
    // Allow users to report errors
    window.reportErrorToSupport = (errorId) => {
      const error = this.errorHistory.find(e => e.id === errorId);
      if (error) {
        this.createErrorReportModal(error);
      }
    };
  }

  // Create error report modal
  createErrorReportModal(error) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>📝 Laporkan Kesalahan</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p>Bantu kami memperbaiki masalah ini dengan memberikan informasi tambahan:</p>
          <textarea placeholder="Jelaskan apa yang sedang Anda lakukan saat kesalahan terjadi..." 
                    style="width: 100%; height: 100px; margin: 10px 0; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;"></textarea>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">
            ID Kesalahan: ${error.id}<br>
            Waktu: ${new Date(error.timestamp).toLocaleString()}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Batal</button>
          <button class="btn btn-primary" onclick="alert('Laporan terkirim! Terima kasih.'); this.closest('.modal').remove();">Kirim Laporan</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  // Track error analytics
  trackErrorAnalytics(error) {
    try {
      const errorData = {
        error_id: error.id,
        error_type: error.type,
        error_message: error.message,
        error_severity: this.determineErrorSeverity(error),
        component: error.component,
        recoverable: error.recoverable,
        timestamp: error.timestamp,
        url: error.url,
        user_agent: error.userAgent
      };
      
      // Store in localStorage for later sync
      const stored = JSON.parse(localStorage.getItem('error_reports') || '[]');
      stored.push(errorData);
      
      // Keep only last 20 errors
      if (stored.length > 20) {
        stored.splice(0, stored.length - 20);
      }
      
      localStorage.setItem('error_reports', JSON.stringify(stored));
    } catch (trackingError) {
      console.error('Error tracking failed:', trackingError);
    }
  }

  // Generate error ID
  generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  }

  // Get error boundary status
  getErrorBoundaryStatus() {
    return {
      active_boundaries: this.errorHandlers.size,
      error_history_count: this.errorHistory.length,
      is_recovering: this.isRecovering,
      recent_errors: this.errorHistory.slice(-5),
      recovery_strategies: Array.from(this.recoveryStrategies.keys())
    };
  }

  // Clear error history
  clearErrorHistory() {
    this.errorHistory = [];
    localStorage.removeItem('error_reports');
    console.log('🛡️ Error history cleared');
  }

  // Test error boundary
  testErrorBoundary(errorType = 'test') {
    console.log('🧪 Testing error boundary...');
    
    const testError = new Error('Test error for error boundary');
    
    this.handleError({
      type: errorType,
      message: 'Test error for error boundary',
      error: testError,
      recoverable: true,
      test: true
    });
  }
}

// Create global instance
export const errorBoundary = new ErrorBoundary();

// Export for global access
if (typeof window !== 'undefined') {
  window.errorBoundary = errorBoundary;
}
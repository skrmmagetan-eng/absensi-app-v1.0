// Onboarding Manager - User onboarding and help system for Quick Order
// Provides guided tours, tooltips, and contextual help

export class OnboardingManager {
  constructor() {
    this.onboardingSteps = [
      {
        id: 'welcome',
        target: '.container h1',
        title: '🛍️ Selamat Datang di Quick Order',
        content: 'Fitur Quick Order memungkinkan Anda menambahkan produk ke keranjang dengan cepat dan membuat order langsung dari katalog.',
        position: 'bottom'
      },
      {
        id: 'product-grid',
        target: '#catalog-grid',
        title: '📦 Katalog Produk',
        content: 'Klik produk untuk melihat detail, atau gunakan tombol "Tambah" untuk langsung menambahkan ke keranjang.',
        position: 'top'
      },
      {
        id: 'add-to-cart',
        target: '.add-to-cart-btn',
        title: '🛒 Tambah ke Keranjang',
        content: 'Klik tombol ini untuk menambahkan produk ke keranjang. Setelah ditambahkan, Anda dapat mengatur jumlahnya.',
        position: 'top'
      },
      {
        id: 'floating-cart',
        target: '#floating-cart',
        title: '💰 Keranjang Belanja',
        content: 'Keranjang akan muncul di sini setelah Anda menambahkan produk. Klik untuk melihat detail dan membuat order.',
        position: 'left'
      },
      {
        id: 'keyboard-shortcuts',
        target: 'body',
        title: '⌨️ Pintasan Keyboard',
        content: 'Gunakan pintasan keyboard: C untuk buka keranjang, S untuk pencarian, ? untuk bantuan, dan panah untuk navigasi produk.',
        position: 'center'
      }
    ];
    
    this.tooltips = new Map();
    this.currentStep = 0;
    this.isOnboardingActive = false;
    this.hasCompletedOnboarding = false;
    
    this.initializeOnboarding();
  }

  // Initialize onboarding system
  initializeOnboarding() {
    // Check if user has completed onboarding
    this.checkOnboardingStatus();
    
    // Setup contextual help
    this.setupContextualHelp();
    
    // Setup help triggers
    this.setupHelpTriggers();
    
    // Setup tooltips
    this.setupTooltips();
    
    // Auto-start onboarding for new users
    if (!this.hasCompletedOnboarding) {
      setTimeout(() => {
        this.startOnboarding();
      }, 2000);
    }
    
    console.log('🎓 Onboarding manager initialized');
  }

  // Check onboarding status
  checkOnboardingStatus() {
    try {
      const completed = localStorage.getItem('quick_order_onboarding_completed');
      this.hasCompletedOnboarding = completed === 'true';
      
      const lastVersion = localStorage.getItem('quick_order_onboarding_version');
      const currentVersion = '1.0';
      
      // Reset onboarding if version changed
      if (lastVersion !== currentVersion) {
        this.hasCompletedOnboarding = false;
        localStorage.setItem('quick_order_onboarding_version', currentVersion);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }

  // Start onboarding tour
  startOnboarding() {
    if (this.isOnboardingActive) return;
    
    this.isOnboardingActive = true;
    this.currentStep = 0;
    
    // Create onboarding overlay
    this.createOnboardingOverlay();
    
    // Show first step
    this.showStep(0);
    
    // Track onboarding start
    this.trackOnboardingEvent('onboarding_started');
  }

  // Show specific onboarding step
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.onboardingSteps.length) {
      this.completeOnboarding();
      return;
    }
    
    this.currentStep = stepIndex;
    const step = this.onboardingSteps[stepIndex];
    
    // Find target element
    const targetElement = document.querySelector(step.target);
    
    if (!targetElement && step.target !== 'body') {
      // Skip step if target not found
      this.showStep(stepIndex + 1);
      return;
    }
    
    // Create step tooltip
    this.createStepTooltip(step, targetElement);
    
    // Highlight target element
    this.highlightElement(targetElement);
    
    // Scroll to element if needed
    if (targetElement && targetElement !== document.body) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
    
    // Track step view
    this.trackOnboardingEvent('step_viewed', { step_id: step.id, step_index: stepIndex });
  }

  // Create onboarding overlay
  createOnboardingOverlay() {
    // Remove existing overlay
    const existingOverlay = document.getElementById('onboarding-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9999;
      pointer-events: none;
    `;
    
    document.body.appendChild(overlay);
    
    // Add styles
    if (!document.getElementById('onboarding-styles')) {
      const style = document.createElement('style');
      style.id = 'onboarding-styles';
      style.textContent = `
        .onboarding-highlight {
          position: relative;
          z-index: 10000;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.8), 0 0 20px rgba(102, 126, 234, 0.4);
          border-radius: 8px;
          animation: onboardingPulse 2s infinite;
        }
        
        @keyframes onboardingPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.8), 0 0 20px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.6), 0 0 30px rgba(102, 126, 234, 0.6); }
        }
        
        .onboarding-tooltip {
          position: absolute;
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 320px;
          z-index: 10001;
          animation: onboardingSlideIn 0.3s ease;
        }
        
        @keyframes onboardingSlideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .onboarding-tooltip::before {
          content: '';
          position: absolute;
          width: 0;
          height: 0;
          border: 8px solid transparent;
        }
        
        .onboarding-tooltip.position-top::before {
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: white;
        }
        
        .onboarding-tooltip.position-bottom::before {
          top: -16px;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: white;
        }
        
        .onboarding-tooltip.position-left::before {
          right: -16px;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: white;
        }
        
        .onboarding-tooltip.position-right::before {
          left: -16px;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: white;
        }
        
        .onboarding-tooltip.position-center {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .onboarding-tooltip-title {
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #1f2937;
        }
        
        .onboarding-tooltip-content {
          color: #4b5563;
          line-height: 1.5;
          margin-bottom: 16px;
        }
        
        .onboarding-tooltip-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        
        .onboarding-progress {
          font-size: 0.8rem;
          color: #6b7280;
        }
        
        .onboarding-buttons {
          display: flex;
          gap: 8px;
        }
        
        .onboarding-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        
        .onboarding-btn-primary {
          background: #667eea;
          color: white;
        }
        
        .onboarding-btn-primary:hover {
          background: #5a67d8;
        }
        
        .onboarding-btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }
        
        .onboarding-btn-secondary:hover {
          background: #d1d5db;
        }
        
        .onboarding-btn-skip {
          background: transparent;
          color: #6b7280;
          text-decoration: underline;
          border: none;
          padding: 4px 8px;
        }
        
        .help-trigger {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .help-trigger:hover {
          transform: scale(1.1);
          background: #5a67d8;
        }
        
        .contextual-tooltip {
          position: absolute;
          background: #1f2937;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        
        .contextual-tooltip.visible {
          opacity: 1;
        }
        
        .contextual-tooltip::before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border: 4px solid transparent;
          border-top-color: #1f2937;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Create step tooltip
  createStepTooltip(step, targetElement) {
    // Remove existing tooltip
    const existingTooltip = document.getElementById('onboarding-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    const tooltip = document.createElement('div');
    tooltip.id = 'onboarding-tooltip';
    tooltip.className = `onboarding-tooltip position-${step.position}`;
    
    tooltip.innerHTML = `
      <div class="onboarding-tooltip-title">${step.title}</div>
      <div class="onboarding-tooltip-content">${step.content}</div>
      <div class="onboarding-tooltip-actions">
        <div class="onboarding-progress">
          ${this.currentStep + 1} dari ${this.onboardingSteps.length}
        </div>
        <div class="onboarding-buttons">
          <button class="onboarding-btn onboarding-btn-skip" onclick="window.onboardingManager.skipOnboarding()">
            Lewati
          </button>
          ${this.currentStep > 0 ? `
            <button class="onboarding-btn onboarding-btn-secondary" onclick="window.onboardingManager.previousStep()">
              Sebelumnya
            </button>
          ` : ''}
          <button class="onboarding-btn onboarding-btn-primary" onclick="window.onboardingManager.nextStep()">
            ${this.currentStep === this.onboardingSteps.length - 1 ? 'Selesai' : 'Selanjutnya'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    this.positionTooltip(tooltip, targetElement, step.position);
  }

  // Position tooltip relative to target
  positionTooltip(tooltip, targetElement, position) {
    if (!targetElement || targetElement === document.body) {
      // Center position for body target
      return;
    }
    
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top, left;
    
    switch (position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 20;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + 20;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - 20;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 20;
        break;
      default:
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 20;
    }
    
    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 10) left = 10;
    if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }
    
    if (top < 10) top = 10;
    if (top + tooltipRect.height > viewportHeight - 10) {
      top = viewportHeight - tooltipRect.height - 10;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  // Highlight target element
  highlightElement(element) {
    // Remove existing highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
    
    if (element && element !== document.body) {
      element.classList.add('onboarding-highlight');
    }
  }

  // Next step
  nextStep() {
    this.showStep(this.currentStep + 1);
  }

  // Previous step
  previousStep() {
    this.showStep(this.currentStep - 1);
  }

  // Skip onboarding
  skipOnboarding() {
    this.trackOnboardingEvent('onboarding_skipped', { step_index: this.currentStep });
    this.completeOnboarding();
  }

  // Complete onboarding
  completeOnboarding() {
    this.isOnboardingActive = false;
    this.hasCompletedOnboarding = true;
    
    // Remove overlay and tooltip
    const overlay = document.getElementById('onboarding-overlay');
    const tooltip = document.getElementById('onboarding-tooltip');
    
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();
    
    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
    
    // Save completion status
    localStorage.setItem('quick_order_onboarding_completed', 'true');
    
    // Show completion message
    this.showCompletionMessage();
    
    // Track completion
    this.trackOnboardingEvent('onboarding_completed');
  }

  // Show completion message
  showCompletionMessage() {
    const message = document.createElement('div');
    message.className = 'onboarding-completion';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      text-align: center;
      z-index: 10001;
      animation: onboardingSlideIn 0.3s ease;
    `;
    
    message.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 12px;">🎉</div>
      <h3 style="margin: 0 0 8px 0; color: #1f2937;">Selamat!</h3>
      <p style="margin: 0 0 16px 0; color: #4b5563;">Anda telah menyelesaikan tour Quick Order.</p>
      <button class="onboarding-btn onboarding-btn-primary" onclick="this.parentElement.remove()">
        Mulai Berbelanja
      </button>
    `;
    
    document.body.appendChild(message);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 5000);
  }

  // Setup contextual help
  setupContextualHelp() {
    // Add help triggers to key elements
    this.addHelpTrigger('.add-to-cart-btn', 'Klik untuk menambahkan produk ke keranjang');
    this.addHelpTrigger('.qty-btn', 'Gunakan untuk mengatur jumlah produk');
    this.addHelpTrigger('#floating-cart', 'Klik untuk melihat keranjang dan membuat order');
    
    // Add contextual tooltips on hover
    document.addEventListener('mouseenter', (e) => {
      if (e.target.hasAttribute('data-help')) {
        this.showContextualTooltip(e.target, e.target.getAttribute('data-help'));
      }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
      if (e.target.hasAttribute('data-help')) {
        this.hideContextualTooltip();
      }
    }, true);
  }

  // Add help trigger to element
  addHelpTrigger(selector, helpText) {
    document.querySelectorAll(selector).forEach(element => {
      element.setAttribute('data-help', helpText);
    });
  }

  // Show contextual tooltip
  showContextualTooltip(element, text) {
    // Remove existing tooltip
    this.hideContextualTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'contextual-tooltip';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    const top = elementRect.top - tooltipRect.height - 10;
    const left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
    
    tooltip.style.top = `${Math.max(10, top)}px`;
    tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10))}px`;
    
    // Show tooltip
    setTimeout(() => {
      tooltip.classList.add('visible');
    }, 100);
  }

  // Hide contextual tooltip
  hideContextualTooltip() {
    const tooltip = document.querySelector('.contextual-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  // Setup help triggers
  setupHelpTriggers() {
    // Create floating help button
    const helpButton = document.createElement('button');
    helpButton.className = 'help-trigger';
    helpButton.innerHTML = '?';
    helpButton.title = 'Bantuan Quick Order';
    helpButton.setAttribute('aria-label', 'Open help menu');
    
    helpButton.onclick = () => this.showHelpMenu();
    
    document.body.appendChild(helpButton);
  }

  // Show help menu
  showHelpMenu() {
    const helpMenu = document.createElement('div');
    helpMenu.className = 'modal active';
    helpMenu.setAttribute('role', 'dialog');
    helpMenu.setAttribute('aria-labelledby', 'help-title');
    
    helpMenu.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="help-title">🎓 Bantuan Quick Order</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()" aria-label="Close help">&times;</button>
        </div>
        <div class="modal-body">
          <div class="help-sections">
            <div class="help-section">
              <h4>🛒 Cara Berbelanja</h4>
              <ol>
                <li>Pilih produk dari katalog</li>
                <li>Klik "Tambah" untuk menambahkan ke keranjang</li>
                <li>Atur jumlah dengan tombol +/-</li>
                <li>Klik keranjang untuk membuat order</li>
                <li>Pilih pelanggan dan konfirmasi order</li>
              </ol>
            </div>
            
            <div class="help-section">
              <h4>⌨️ Pintasan Keyboard</h4>
              <ul>
                <li><kbd>C</kbd> - Buka keranjang</li>
                <li><kbd>S</kbd> - Fokus pencarian</li>
                <li><kbd>M</kbd> - Ke konten utama</li>
                <li><kbd>?</kbd> - Bantuan ini</li>
                <li><kbd>H</kbd> - Mode kontras tinggi</li>
              </ul>
            </div>
            
            <div class="help-section">
              <h4>📱 Tips Mobile</h4>
              <ul>
                <li>Ketuk dua kali produk untuk menambah 5 item sekaligus</li>
                <li>Geser untuk navigasi cepat</li>
                <li>Gunakan mode offline saat koneksi lemah</li>
              </ul>
            </div>
          </div>
          
          <div class="help-actions" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <button class="btn btn-outline" onclick="window.onboardingManager.restartOnboarding()">
              🔄 Ulangi Tour
            </button>
            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
              Mengerti
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(helpMenu);
    
    // Track help menu open
    this.trackOnboardingEvent('help_menu_opened');
  }

  // Setup tooltips
  setupTooltips() {
    // Add tooltips to key elements when they're added to DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // Add help attributes to new elements
            const addButtons = node.querySelectorAll?.('.add-to-cart-btn') || [];
            addButtons.forEach(btn => {
              btn.setAttribute('data-help', 'Klik untuk menambahkan produk ke keranjang');
            });
            
            const qtyButtons = node.querySelectorAll?.('.qty-btn') || [];
            qtyButtons.forEach(btn => {
              const isPlus = btn.classList.contains('qty-plus');
              btn.setAttribute('data-help', `${isPlus ? 'Tambah' : 'Kurangi'} jumlah produk`);
            });
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Restart onboarding
  restartOnboarding() {
    // Close help menu
    const helpMenu = document.querySelector('.modal.active');
    if (helpMenu) {
      helpMenu.remove();
    }
    
    // Reset onboarding status
    this.hasCompletedOnboarding = false;
    this.isOnboardingActive = false;
    
    // Start onboarding
    setTimeout(() => {
      this.startOnboarding();
    }, 500);
    
    this.trackOnboardingEvent('onboarding_restarted');
  }

  // Track onboarding events
  trackOnboardingEvent(eventType, data = {}) {
    try {
      const event = {
        type: eventType,
        data: data,
        timestamp: Date.now(),
        user_id: window.state?.getState('user')?.id || 'unknown'
      };
      
      const stored = JSON.parse(localStorage.getItem('onboarding_events') || '[]');
      stored.push(event);
      
      // Keep only last 50 events
      if (stored.length > 50) {
        stored.splice(0, stored.length - 50);
      }
      
      localStorage.setItem('onboarding_events', JSON.stringify(stored));
      
      console.log(`🎓 Onboarding Event: ${eventType}`, data);
    } catch (error) {
      console.error('Error tracking onboarding event:', error);
    }
  }

  // Get onboarding status
  getOnboardingStatus() {
    return {
      completed: this.hasCompletedOnboarding,
      active: this.isOnboardingActive,
      current_step: this.currentStep,
      total_steps: this.onboardingSteps.length,
      events_count: this.getOnboardingEvents().length
    };
  }

  // Get onboarding events
  getOnboardingEvents() {
    try {
      return JSON.parse(localStorage.getItem('onboarding_events') || '[]');
    } catch (error) {
      return [];
    }
  }

  // Reset onboarding
  resetOnboarding() {
    localStorage.removeItem('quick_order_onboarding_completed');
    localStorage.removeItem('quick_order_onboarding_version');
    localStorage.removeItem('onboarding_events');
    
    this.hasCompletedOnboarding = false;
    this.isOnboardingActive = false;
    this.currentStep = 0;
    
    console.log('🎓 Onboarding reset');
  }
}

// Create global instance
export const onboardingManager = new OnboardingManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.onboardingManager = onboardingManager;
}
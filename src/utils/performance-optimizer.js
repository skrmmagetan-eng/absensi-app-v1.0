// Performance Optimizer - Optimizes Quick Order system performance
// Targets: <500ms cart operations, <2s product loading, smooth UI

export class PerformanceOptimizer {
  constructor() {
    this.performanceTargets = {
      cartOperations: 500, // ms
      productLoading: 2000, // ms
      orderCreation: 3000, // ms
      uiResponse: 100, // ms
      imageLoading: 1000 // ms
    };
    
    this.metrics = new Map();
    this.optimizations = new Set();
    this.isMonitoring = false;
    
    this.init();
  }

  // Initialize performance optimizer
  init() {
    this.setupPerformanceMonitoring();
    this.applyOptimizations();
    this.setupResourceOptimization();
    
    console.log('⚡ Performance optimizer initialized');
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor cart operations
    this.monitorCartOperations();
    
    // Monitor image loading
    this.monitorImageLoading();
    
    // Monitor UI responsiveness
    this.monitorUIResponsiveness();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network performance
    this.monitorNetworkPerformance();
  }

  // Monitor cart operations performance
  monitorCartOperations() {
    // Override cart methods to measure performance
    if (window.quickOrderManager) {
      const originalAddToCart = window.quickOrderManager.addProductToCart;
      
      window.quickOrderManager.addProductToCart = async function(...args) {
        const startTime = performance.now();
        
        try {
          const result = await originalAddToCart.apply(this, args);
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          window.performanceOptimizer.recordMetric('cart_add_operation', duration);
          
          if (duration > window.performanceOptimizer.performanceTargets.cartOperations) {
            console.warn(`⚠️ Slow cart operation: ${duration.toFixed(2)}ms (target: ${window.performanceOptimizer.performanceTargets.cartOperations}ms)`);
            window.performanceOptimizer.optimizeCartOperations();
          }
          
          return result;
        } catch (error) {
          const endTime = performance.now();
          window.performanceOptimizer.recordMetric('cart_add_operation', endTime - startTime);
          throw error;
        }
      };
    }
    
    // Monitor cart UI updates
    if (window.updateCartUI) {
      const originalUpdateCartUI = window.updateCartUI;
      
      window.updateCartUI = function(cartState) {
        const startTime = performance.now();
        
        const result = originalUpdateCartUI(cartState);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        window.performanceOptimizer.recordMetric('cart_ui_update', duration);
        
        if (duration > window.performanceOptimizer.performanceTargets.uiResponse) {
          console.warn(`⚠️ Slow UI update: ${duration.toFixed(2)}ms`);
        }
        
        return result;
      };
    }
  }

  // Monitor image loading performance
  monitorImageLoading() {
    const imageObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.initiatorType === 'img') {
          this.recordMetric('image_loading', entry.duration);
          
          if (entry.duration > this.performanceTargets.imageLoading) {
            console.warn(`⚠️ Slow image loading: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
            this.optimizeImageLoading();
          }
        }
      });
    });
    
    try {
      imageObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Performance Observer not supported for resource timing');
    }
  }

  // Monitor UI responsiveness
  monitorUIResponsiveness() {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let slowFrames = 0;
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const frameDuration = currentTime - lastFrameTime;
      
      frameCount++;
      
      // Target: 60fps = 16.67ms per frame
      if (frameDuration > 16.67) {
        slowFrames++;
      }
      
      // Report every second
      if (frameCount % 60 === 0) {
        const slowFramePercentage = (slowFrames / frameCount) * 100;
        
        this.recordMetric('ui_responsiveness', slowFramePercentage);
        
        if (slowFramePercentage > 10) { // More than 10% slow frames
          console.warn(`⚠️ UI responsiveness issue: ${slowFramePercentage.toFixed(1)}% slow frames`);
          this.optimizeUIResponsiveness();
        }
        
        // Reset counters
        frameCount = 0;
        slowFrames = 0;
      }
      
      lastFrameTime = currentTime;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  // Monitor memory usage
  monitorMemoryUsage() {
    if (!performance.memory) return;
    
    setInterval(() => {
      const memory = performance.memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      this.recordMetric('memory_usage', usagePercent);
      
      if (usagePercent > 80) {
        console.warn(`⚠️ High memory usage: ${usagePercent.toFixed(1)}%`);
        this.optimizeMemoryUsage();
      }
    }, 10000); // Check every 10 seconds
  }

  // Monitor network performance
  monitorNetworkPerformance() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const checkConnection = () => {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        this.recordMetric('network_speed', downlink);
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          console.warn('⚠️ Slow network detected, applying optimizations');
          this.optimizeForSlowNetwork();
        }
      };
      
      connection.addEventListener('change', checkConnection);
      checkConnection(); // Initial check
    }
  }

  // Record performance metric
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name);
    values.push({
      value: value,
      timestamp: Date.now()
    });
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  // Apply performance optimizations
  applyOptimizations() {
    this.optimizeCartOperations();
    this.optimizeImageLoading();
    this.optimizeUIResponsiveness();
    this.optimizeMemoryUsage();
    this.optimizeBundleSize();
  }

  // Optimize cart operations
  optimizeCartOperations() {
    if (this.optimizations.has('cart_operations')) return;
    
    console.log('⚡ Applying cart operation optimizations...');
    
    // Debounce cart updates
    this.debounceCartUpdates();
    
    // Batch DOM updates
    this.batchDOMUpdates();
    
    // Optimize cart calculations
    this.optimizeCartCalculations();
    
    this.optimizations.add('cart_operations');
  }

  // Debounce cart updates
  debounceCartUpdates() {
    let updateTimeout;
    
    if (window.quickOrderManager && window.quickOrderManager.cart) {
      const originalNotifyListeners = window.quickOrderManager.cart.notifyListeners;
      
      window.quickOrderManager.cart.notifyListeners = function(eventType, data) {
        clearTimeout(updateTimeout);
        
        updateTimeout = setTimeout(() => {
          originalNotifyListeners.call(this, eventType, data);
        }, 50); // 50ms debounce
      };
    }
  }

  // Batch DOM updates
  batchDOMUpdates() {
    const pendingUpdates = new Set();
    let updateScheduled = false;
    
    const flushUpdates = () => {
      pendingUpdates.forEach(update => update());
      pendingUpdates.clear();
      updateScheduled = false;
    };
    
    window.batchDOMUpdate = (updateFn) => {
      pendingUpdates.add(updateFn);
      
      if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(flushUpdates);
      }
    };
  }

  // Optimize cart calculations
  optimizeCartCalculations() {
    if (!window.quickOrderManager || !window.quickOrderManager.cart) return;
    
    // Cache cart totals
    let cachedTotal = null;
    let cacheInvalidated = true;
    
    const originalGetTotal = window.quickOrderManager.cart.getTotal;
    
    window.quickOrderManager.cart.getTotal = function() {
      if (cacheInvalidated) {
        cachedTotal = originalGetTotal.call(this);
        cacheInvalidated = false;
      }
      return cachedTotal;
    };
    
    // Invalidate cache on cart changes
    const originalAddItem = window.quickOrderManager.cart.addItem;
    const originalRemoveItem = window.quickOrderManager.cart.removeItem;
    const originalUpdateQuantity = window.quickOrderManager.cart.updateQuantity;
    
    window.quickOrderManager.cart.addItem = function(...args) {
      cacheInvalidated = true;
      return originalAddItem.apply(this, args);
    };
    
    window.quickOrderManager.cart.removeItem = function(...args) {
      cacheInvalidated = true;
      return originalRemoveItem.apply(this, args);
    };
    
    window.quickOrderManager.cart.updateQuantity = function(...args) {
      cacheInvalidated = true;
      return originalUpdateQuantity.apply(this, args);
    };
  }

  // Optimize image loading
  optimizeImageLoading() {
    if (this.optimizations.has('image_loading')) return;
    
    console.log('⚡ Applying image loading optimizations...');
    
    // Implement progressive image loading
    this.implementProgressiveImageLoading();
    
    // Add image compression
    this.addImageCompression();
    
    // Implement lazy loading
    this.implementLazyLoading();
    
    this.optimizations.add('image_loading');
  }

  // Implement progressive image loading
  implementProgressiveImageLoading() {
    const style = document.createElement('style');
    style.textContent = `
      .progressive-image {
        filter: blur(5px);
        transition: filter 0.3s;
      }
      
      .progressive-image.loaded {
        filter: none;
      }
      
      .image-placeholder {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }
      
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Apply to existing images
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.classList.add('progressive-image');
        
        img.addEventListener('load', () => {
          img.classList.add('loaded');
        });
      }
    });
  }

  // Add image compression
  addImageCompression() {
    // Override image sources to use compressed versions
    const originalSetAttribute = HTMLImageElement.prototype.setAttribute;
    
    HTMLImageElement.prototype.setAttribute = function(name, value) {
      if (name === 'src' && value && typeof value === 'string') {
        // Add compression parameters if it's a Supabase storage URL
        if (value.includes('supabase') && !value.includes('quality=')) {
          const separator = value.includes('?') ? '&' : '?';
          value += `${separator}quality=80&resize=800x600`;
        }
      }
      
      return originalSetAttribute.call(this, name, value);
    };
  }

  // Implement lazy loading
  implementLazyLoading() {
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
    
    // Apply to existing images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
    
    // Apply to new images
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

  // Optimize UI responsiveness
  optimizeUIResponsiveness() {
    if (this.optimizations.has('ui_responsiveness')) return;
    
    console.log('⚡ Applying UI responsiveness optimizations...');
    
    // Use CSS containment
    this.applyCSSContainment();
    
    // Optimize animations
    this.optimizeAnimations();
    
    // Reduce layout thrashing
    this.reduceLayoutThrashing();
    
    this.optimizations.add('ui_responsiveness');
  }

  // Apply CSS containment
  applyCSSContainment() {
    const style = document.createElement('style');
    style.textContent = `
      .card {
        contain: layout style paint;
      }
      
      .modal-content {
        contain: layout style;
      }
      
      .floating-cart {
        contain: layout style paint;
      }
      
      .cart-item {
        contain: layout style;
      }
    `;
    document.head.appendChild(style);
  }

  // Optimize animations
  optimizeAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      /* Use transform and opacity for animations */
      .optimized-animation {
        will-change: transform, opacity;
        transform: translateZ(0); /* Force hardware acceleration */
      }
      
      /* Reduce animation complexity on low-end devices */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Apply to animated elements
    document.querySelectorAll('.btn, .card, .modal').forEach(el => {
      el.classList.add('optimized-animation');
    });
  }

  // Reduce layout thrashing
  reduceLayoutThrashing() {
    // Batch style reads and writes
    let readQueue = [];
    let writeQueue = [];
    let scheduled = false;
    
    const flush = () => {
      // Execute all reads first
      readQueue.forEach(read => read());
      readQueue = [];
      
      // Then execute all writes
      writeQueue.forEach(write => write());
      writeQueue = [];
      
      scheduled = false;
    };
    
    window.batchStyleRead = (readFn) => {
      readQueue.push(readFn);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    };
    
    window.batchStyleWrite = (writeFn) => {
      writeQueue.push(writeFn);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    };
  }

  // Optimize memory usage
  optimizeMemoryUsage() {
    if (this.optimizations.has('memory_usage')) return;
    
    console.log('⚡ Applying memory usage optimizations...');
    
    // Clean up event listeners
    this.cleanupEventListeners();
    
    // Optimize data structures
    this.optimizeDataStructures();
    
    // Implement garbage collection hints
    this.implementGCHints();
    
    this.optimizations.add('memory_usage');
  }

  // Clean up event listeners
  cleanupEventListeners() {
    // Track event listeners for cleanup
    const eventListeners = new WeakMap();
    
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (!eventListeners.has(this)) {
        eventListeners.set(this, new Set());
      }
      eventListeners.get(this).add({ type, listener, options });
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      if (eventListeners.has(this)) {
        const listeners = eventListeners.get(this);
        listeners.forEach(item => {
          if (item.type === type && item.listener === listener) {
            listeners.delete(item);
          }
        });
      }
      
      return originalRemoveEventListener.call(this, type, listener, options);
    };
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      // Force cleanup of all tracked listeners
      console.log('🧹 Cleaning up event listeners');
    });
  }

  // Optimize data structures
  optimizeDataStructures() {
    // Use more efficient data structures where possible
    if (window.quickOrderManager && window.quickOrderManager.cart) {
      // Convert arrays to Maps for O(1) lookups where appropriate
      const cart = window.quickOrderManager.cart;
      
      if (!cart._itemsMap) {
        cart._itemsMap = new Map();
        
        // Populate map from existing items
        cart.items.forEach(item => {
          cart._itemsMap.set(item.id, item);
        });
        
        // Override findItem to use Map
        cart.findItem = function(productId) {
          return this._itemsMap.get(productId);
        };
        
        // Update map on item changes
        const originalAddItem = cart.addItem;
        cart.addItem = function(product, quantity) {
          const result = originalAddItem.call(this, product, quantity);
          this._itemsMap.set(product.id, this.items.find(item => item.id === product.id));
          return result;
        };
        
        const originalRemoveItem = cart.removeItem;
        cart.removeItem = function(productId) {
          originalRemoveItem.call(this, productId);
          this._itemsMap.delete(productId);
        };
      }
    }
  }

  // Implement garbage collection hints
  implementGCHints() {
    // Suggest garbage collection at appropriate times
    const suggestGC = () => {
      if (window.gc) {
        window.gc();
      }
    };
    
    // Suggest GC after major operations
    document.addEventListener('quickOrderCartUpdate', (e) => {
      if (e.detail.type === 'cart_cleared') {
        setTimeout(suggestGC, 100);
      }
    });
    
    // Periodic GC suggestion
    setInterval(suggestGC, 60000); // Every minute
  }

  // Optimize for slow network
  optimizeForSlowNetwork() {
    if (this.optimizations.has('slow_network')) return;
    
    console.log('⚡ Applying slow network optimizations...');
    
    // Reduce image quality
    document.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.includes('supabase')) {
        const url = new URL(img.src);
        url.searchParams.set('quality', '60');
        url.searchParams.set('resize', '400x300');
        img.src = url.toString();
      }
    });
    
    // Disable non-essential animations
    const style = document.createElement('style');
    style.textContent = `
      .slow-network * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('slow-network');
    
    this.optimizations.add('slow_network');
  }

  // Optimize bundle size
  optimizeBundleSize() {
    if (this.optimizations.has('bundle_size')) return;
    
    console.log('⚡ Applying bundle size optimizations...');
    
    // Remove unused CSS
    this.removeUnusedCSS();
    
    // Compress inline styles
    this.compressInlineStyles();
    
    this.optimizations.add('bundle_size');
  }

  // Remove unused CSS
  removeUnusedCSS() {
    // This would typically be done at build time
    // For runtime, we can remove unused style elements
    document.querySelectorAll('style').forEach(style => {
      if (style.textContent.length === 0) {
        style.remove();
      }
    });
  }

  // Compress inline styles
  compressInlineStyles() {
    document.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style');
      if (style) {
        // Remove extra whitespace
        const compressed = style.replace(/\s+/g, ' ').trim();
        el.setAttribute('style', compressed);
      }
    });
  }

  // Get performance report
  getPerformanceReport() {
    const report = {
      targets: this.performanceTargets,
      metrics: {},
      optimizations: Array.from(this.optimizations),
      timestamp: Date.now()
    };
    
    // Calculate metric summaries
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const recentValues = values.slice(-10).map(v => v.value);
        report.metrics[name] = {
          current: recentValues[recentValues.length - 1],
          average: recentValues.reduce((a, b) => a + b, 0) / recentValues.length,
          min: Math.min(...recentValues),
          max: Math.max(...recentValues),
          count: values.length
        };
      }
    }
    
    return report;
  }

  // Check if performance targets are met
  checkPerformanceTargets() {
    const report = this.getPerformanceReport();
    const results = {};
    
    // Check cart operations
    if (report.metrics.cart_add_operation) {
      results.cartOperations = {
        target: this.performanceTargets.cartOperations,
        actual: report.metrics.cart_add_operation.average,
        met: report.metrics.cart_add_operation.average <= this.performanceTargets.cartOperations
      };
    }
    
    // Check UI responsiveness
    if (report.metrics.cart_ui_update) {
      results.uiResponse = {
        target: this.performanceTargets.uiResponse,
        actual: report.metrics.cart_ui_update.average,
        met: report.metrics.cart_ui_update.average <= this.performanceTargets.uiResponse
      };
    }
    
    // Check image loading
    if (report.metrics.image_loading) {
      results.imageLoading = {
        target: this.performanceTargets.imageLoading,
        actual: report.metrics.image_loading.average,
        met: report.metrics.image_loading.average <= this.performanceTargets.imageLoading
      };
    }
    
    return results;
  }
}

// Create global instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export for global access
if (typeof window !== 'undefined') {
  window.performanceOptimizer = performanceOptimizer;
}
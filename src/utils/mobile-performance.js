// Mobile Performance Optimizations
// Provides performance enhancements specifically for mobile devices

export class MobilePerformanceOptimizer {
  constructor() {
    this.isLowEndDevice = this.detectLowEndDevice();
    this.connectionType = this.getConnectionType();
    this.performanceMode = this.determinePerformanceMode();
    
    this.init();
  }

  // Initialize performance optimizations
  init() {
    this.optimizeRendering();
    this.optimizeAnimations();
    this.optimizeImages();
    this.optimizeNetworking();
    this.setupPerformanceMonitoring();
    
    console.log(`📊 Mobile performance mode: ${this.performanceMode}`);
  }

  // Detect low-end devices
  detectLowEndDevice() {
    // Check various indicators of device performance
    const indicators = {
      // Memory (if available)
      lowMemory: navigator.deviceMemory && navigator.deviceMemory <= 2,
      
      // CPU cores (if available)
      lowCores: navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2,
      
      // User agent patterns for known low-end devices
      lowEndUA: /Android.*(?:Go|Lite|Mini)|Nokia|KAIOS/i.test(navigator.userAgent),
      
      // Slow connection
      slowConnection: this.getConnectionType() === 'slow',
      
      // Low pixel ratio (often indicates budget device)
      lowPixelRatio: window.devicePixelRatio && window.devicePixelRatio < 1.5
    };
    
    // Count indicators
    const lowEndCount = Object.values(indicators).filter(Boolean).length;
    
    return lowEndCount >= 2;
  }

  // Get connection type
  getConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) return 'unknown';
    
    const slowTypes = ['slow-2g', '2g'];
    const mediumTypes = ['3g'];
    const fastTypes = ['4g', '5g'];
    
    if (slowTypes.includes(connection.effectiveType)) return 'slow';
    if (mediumTypes.includes(connection.effectiveType)) return 'medium';
    if (fastTypes.includes(connection.effectiveType)) return 'fast';
    
    // Fallback based on downlink speed
    if (connection.downlink) {
      if (connection.downlink < 1) return 'slow';
      if (connection.downlink < 5) return 'medium';
      return 'fast';
    }
    
    return 'unknown';
  }

  // Determine performance mode
  determinePerformanceMode() {
    if (this.isLowEndDevice || this.connectionType === 'slow') {
      return 'battery'; // Maximum battery/performance savings
    } else if (this.connectionType === 'medium') {
      return 'balanced'; // Balanced performance
    } else {
      return 'performance'; // Full performance
    }
  }

  // Optimize rendering performance
  optimizeRendering() {
    const style = document.createElement('style');
    style.id = 'mobile-performance-optimizations';
    
    let css = `
      /* Base optimizations for all devices */
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      
      /* Optimize transforms and animations */
      .floating-cart,
      .modal,
      .cart-indicator,
      .qty-btn {
        will-change: transform, opacity;
        transform: translateZ(0); /* Force hardware acceleration */
      }
      
      /* Optimize scrolling */
      .modal-body {
        -webkit-overflow-scrolling: touch;
        overflow-scrolling: touch;
      }
    `;
    
    // Performance mode specific optimizations
    if (this.performanceMode === 'battery') {
      css += `
        /* Battery mode - reduce animations and effects */
        * {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }
        
        .touch-feedback::after {
          display: none;
        }
        
        .card:hover,
        .btn:hover {
          transform: none !important;
        }
        
        /* Reduce box shadows */
        .card,
        .modal-content,
        .floating-cart-content {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        /* Disable expensive filters */
        .blur,
        .backdrop-blur {
          backdrop-filter: none !important;
          filter: none !important;
        }
      `;
    } else if (this.performanceMode === 'balanced') {
      css += `
        /* Balanced mode - moderate optimizations */
        .animation-heavy {
          animation-duration: 0.2s;
        }
        
        /* Reduce complex shadows */
        .floating-cart-content {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
      `;
    }
    
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Optimize animations based on device capability
  optimizeAnimations() {
    // Reduce motion for low-end devices or user preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (this.performanceMode === 'battery' || prefersReducedMotion) {
      // Disable most animations
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.style.setProperty('--transition-duration', '0.1s');
      
      // Add class for CSS targeting
      document.body.classList.add('reduced-motion');
    } else if (this.performanceMode === 'balanced') {
      // Reduce animation duration
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
      document.documentElement.style.setProperty('--transition-duration', '0.2s');
    }
  }

  // Optimize image loading and processing
  optimizeImages() {
    // Implement progressive image loading
    this.setupProgressiveImageLoading();
    
    // Optimize image quality based on connection
    this.optimizeImageQuality();
    
    // Setup image compression for uploads
    this.setupImageCompression();
  }

  // Setup progressive image loading
  setupProgressiveImageLoading() {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImageProgressively(img);
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: this.performanceMode === 'battery' ? '10px' : '50px'
    });
    
    // Observe all images
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        imageObserver.observe(img);
      }
    });
    
    // Observe new images
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const images = node.querySelectorAll?.('img') || [];
            images.forEach(img => {
              if (!img.complete) {
                imageObserver.observe(img);
              }
            });
          }
        });
      });
    });
    
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Load image progressively
  loadImageProgressively(img) {
    if (!img.src && img.dataset.src) {
      // Show placeholder first
      if (this.performanceMode !== 'battery') {
        img.style.filter = 'blur(5px)';
        img.style.transition = 'filter 0.3s';
      }
      
      // Load actual image
      const actualImg = new Image();
      actualImg.onload = () => {
        img.src = actualImg.src;
        if (this.performanceMode !== 'battery') {
          img.style.filter = 'none';
        }
      };
      actualImg.src = img.dataset.src;
    }
  }

  // Optimize image quality based on connection
  optimizeImageQuality() {
    const quality = {
      slow: 0.6,
      medium: 0.8,
      fast: 1.0,
      unknown: 0.8
    }[this.connectionType];
    
    // Store quality setting for image processing
    window.imageQuality = quality;
  }

  // Setup image compression for uploads
  setupImageCompression() {
    // Override file input handling to compress images
    document.addEventListener('change', (e) => {
      if (e.target.type === 'file' && e.target.accept?.includes('image')) {
        this.compressImageFile(e.target);
      }
    });
  }

  // Compress image file
  async compressImageFile(input) {
    const file = input.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal size based on performance mode
        const maxSize = {
          battery: 800,
          balanced: 1200,
          performance: 1600
        }[this.performanceMode];
        
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob with appropriate quality
        const quality = window.imageQuality || 0.8;
        canvas.toBlob((blob) => {
          // Replace file with compressed version
          const dt = new DataTransfer();
          dt.items.add(new File([blob], file.name, { type: file.type }));
          input.files = dt.files;
        }, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.warn('Image compression failed:', error);
    }
  }

  // Optimize networking
  optimizeNetworking() {
    // Implement request batching for slow connections
    if (this.connectionType === 'slow') {
      this.setupRequestBatching();
    }
    
    // Setup connection monitoring
    this.setupConnectionMonitoring();
    
    // Implement smart caching
    this.setupSmartCaching();
  }

  // Setup request batching
  setupRequestBatching() {
    const requestQueue = [];
    let batchTimer = null;
    
    // Override fetch to batch requests
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      return new Promise((resolve, reject) => {
        requestQueue.push({ args, resolve, reject });
        
        if (batchTimer) clearTimeout(batchTimer);
        
        batchTimer = setTimeout(() => {
          this.processBatchedRequests(requestQueue.splice(0));
        }, 100); // 100ms batching window
      });
    };
  }

  // Process batched requests
  async processBatchedRequests(requests) {
    // Group requests by domain
    const groups = {};
    requests.forEach(req => {
      const url = new URL(req.args[0], window.location.origin);
      const domain = url.origin;
      
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(req);
    });
    
    // Process each group
    for (const [domain, groupRequests] of Object.entries(groups)) {
      // Limit concurrent requests per domain
      const maxConcurrent = this.connectionType === 'slow' ? 2 : 4;
      
      for (let i = 0; i < groupRequests.length; i += maxConcurrent) {
        const batch = groupRequests.slice(i, i + maxConcurrent);
        
        await Promise.allSettled(
          batch.map(async req => {
            try {
              const response = await originalFetch(...req.args);
              req.resolve(response);
            } catch (error) {
              req.reject(error);
            }
          })
        );
        
        // Add delay between batches for slow connections
        if (this.connectionType === 'slow' && i + maxConcurrent < groupRequests.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  }

  // Setup connection monitoring
  setupConnectionMonitoring() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', () => {
        const newConnectionType = this.getConnectionType();
        
        if (newConnectionType !== this.connectionType) {
          this.connectionType = newConnectionType;
          this.performanceMode = this.determinePerformanceMode();
          
          // Re-apply optimizations
          this.optimizeRendering();
          this.optimizeAnimations();
          
          console.log(`📊 Connection changed to ${newConnectionType}, performance mode: ${this.performanceMode}`);
        }
      });
    }
  }

  // Setup smart caching
  setupSmartCaching() {
    // Cache frequently accessed data
    const cache = new Map();
    const maxCacheSize = this.performanceMode === 'battery' ? 50 : 100;
    
    // Override common data fetching functions
    if (window.quickOrderManager) {
      const originalGetProductDetails = window.quickOrderManager.getProductDetails;
      
      window.quickOrderManager.getProductDetails = async function(productId) {
        const cacheKey = `product_${productId}`;
        
        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }
        
        const result = await originalGetProductDetails.call(this, productId);
        
        // Add to cache
        if (cache.size >= maxCacheSize) {
          // Remove oldest entry
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        
        cache.set(cacheKey, result);
        return result;
      };
    }
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Adjust performance mode if FPS is consistently low
        if (fps < 30 && this.performanceMode !== 'battery') {
          console.warn(`📊 Low FPS detected (${fps}), switching to battery mode`);
          this.performanceMode = 'battery';
          this.optimizeRendering();
          this.optimizeAnimations();
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
    
    // Monitor memory usage (if available)
    if (performance.memory) {
      setInterval(() => {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        
        if (memoryUsage > 0.8) {
          console.warn('📊 High memory usage detected, triggering cleanup');
          this.performMemoryCleanup();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Perform memory cleanup
  performMemoryCleanup() {
    // Clear old analytics events
    try {
      const analytics = JSON.parse(localStorage.getItem('quick_order_analytics') || '[]');
      if (analytics.length > 50) {
        localStorage.setItem('quick_order_analytics', JSON.stringify(analytics.slice(-50)));
      }
    } catch (error) {
      console.warn('Analytics cleanup failed:', error);
    }
    
    // Clear old error logs
    try {
      const errors = JSON.parse(localStorage.getItem('quick_order_errors') || '[]');
      if (errors.length > 20) {
        localStorage.setItem('quick_order_errors', JSON.stringify(errors.slice(-20)));
      }
    } catch (error) {
      console.warn('Error log cleanup failed:', error);
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  // Get performance status
  getPerformanceStatus() {
    return {
      isLowEndDevice: this.isLowEndDevice,
      connectionType: this.connectionType,
      performanceMode: this.performanceMode,
      optimizations: {
        rendering: true,
        animations: this.performanceMode !== 'battery',
        images: true,
        networking: true,
        caching: true
      }
    };
  }
}

// Create global instance
export const mobilePerformanceOptimizer = new MobilePerformanceOptimizer();

// Export for global access
if (typeof window !== 'undefined') {
  window.mobilePerformanceOptimizer = mobilePerformanceOptimizer;
}
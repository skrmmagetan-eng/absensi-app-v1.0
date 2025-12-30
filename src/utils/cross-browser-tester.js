// Cross-Browser Compatibility Tester
// Tests Quick Order functionality across different browsers and devices

export class CrossBrowserTester {
  constructor() {
    this.browserInfo = this.detectBrowser();
    this.deviceInfo = this.detectDevice();
    this.compatibilityIssues = [];
    this.testResults = [];
  }

  // Detect browser information
  detectBrowser() {
    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor;
    
    let browser = 'Unknown';
    let version = 'Unknown';
    
    // Chrome
    if (userAgent.includes('Chrome') && vendor.includes('Google')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    // Firefox
    else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    // Safari
    else if (userAgent.includes('Safari') && vendor.includes('Apple')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    // Edge
    else if (userAgent.includes('Edg')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    // Internet Explorer
    else if (userAgent.includes('Trident') || userAgent.includes('MSIE')) {
      browser = 'Internet Explorer';
      const match = userAgent.match(/(?:MSIE |rv:)(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    return {
      name: browser,
      version: version,
      userAgent: userAgent,
      vendor: vendor
    };
  }

  // Detect device information
  detectDevice() {
    const userAgent = navigator.userAgent;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    return {
      type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      os: os,
      isMobile: isMobile,
      isTablet: isTablet,
      isDesktop: isDesktop,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  // Run comprehensive browser compatibility tests
  async runCompatibilityTests() {
    console.log('🌐 Running Cross-Browser Compatibility Tests...');
    console.log(`Browser: ${this.browserInfo.name} ${this.browserInfo.version}`);
    console.log(`Device: ${this.deviceInfo.type} (${this.deviceInfo.os})`);
    
    this.testResults = [];
    this.compatibilityIssues = [];
    
    // Test core web APIs
    await this.testWebAPIs();
    
    // Test CSS features
    await this.testCSSFeatures();
    
    // Test JavaScript features
    await this.testJavaScriptFeatures();
    
    // Test Quick Order specific functionality
    await this.testQuickOrderFeatures();
    
    // Test mobile-specific features
    if (this.deviceInfo.isMobile) {
      await this.testMobileFeatures();
    }
    
    // Test performance on current browser
    await this.testBrowserPerformance();
    
    // Generate compatibility report
    this.generateCompatibilityReport();
    
    return {
      browser: this.browserInfo,
      device: this.deviceInfo,
      results: this.testResults,
      issues: this.compatibilityIssues,
      compatible: this.compatibilityIssues.length === 0
    };
  }

  // Test web APIs compatibility
  async testWebAPIs() {
    console.log('🔧 Testing Web APIs...');
    
    // Local Storage
    this.testAPI('localStorage', () => {
      localStorage.setItem('test', 'value');
      const value = localStorage.getItem('test');
      localStorage.removeItem('test');
      return value === 'value';
    });
    
    // Session Storage
    this.testAPI('sessionStorage', () => {
      sessionStorage.setItem('test', 'value');
      const value = sessionStorage.getItem('test');
      sessionStorage.removeItem('test');
      return value === 'value';
    });
    
    // Fetch API
    this.testAPI('fetch', () => {
      return typeof fetch === 'function';
    });
    
    // Service Worker
    this.testAPI('serviceWorker', () => {
      return 'serviceWorker' in navigator;
    });
    
    // Cache API
    this.testAPI('caches', () => {
      return 'caches' in window;
    });
    
    // Intersection Observer
    this.testAPI('IntersectionObserver', () => {
      return 'IntersectionObserver' in window;
    });
    
    // Performance API
    this.testAPI('performance', () => {
      return 'performance' in window && 'now' in performance;
    });
    
    // Geolocation
    this.testAPI('geolocation', () => {
      return 'geolocation' in navigator;
    });
    
    // Notification API
    this.testAPI('notifications', () => {
      return 'Notification' in window;
    });
    
    // Vibration API (mobile)
    if (this.deviceInfo.isMobile) {
      this.testAPI('vibration', () => {
        return 'vibrate' in navigator;
      });
    }
  }

  // Test CSS features
  async testCSSFeatures() {
    console.log('🎨 Testing CSS Features...');
    
    // CSS Grid
    this.testCSS('CSS Grid', () => {
      return CSS.supports('display', 'grid');
    });
    
    // CSS Flexbox
    this.testCSS('CSS Flexbox', () => {
      return CSS.supports('display', 'flex');
    });
    
    // CSS Custom Properties (Variables)
    this.testCSS('CSS Variables', () => {
      return CSS.supports('--test', 'value');
    });
    
    // CSS Transforms
    this.testCSS('CSS Transforms', () => {
      return CSS.supports('transform', 'translateX(10px)');
    });
    
    // CSS Transitions
    this.testCSS('CSS Transitions', () => {
      return CSS.supports('transition', 'all 0.3s ease');
    });
    
    // CSS Animations
    this.testCSS('CSS Animations', () => {
      return CSS.supports('animation', 'test 1s ease');
    });
    
    // CSS Backdrop Filter
    this.testCSS('CSS Backdrop Filter', () => {
      return CSS.supports('backdrop-filter', 'blur(10px)');
    });
    
    // CSS Containment
    this.testCSS('CSS Containment', () => {
      return CSS.supports('contain', 'layout');
    });
    
    // CSS Scroll Behavior
    this.testCSS('CSS Scroll Behavior', () => {
      return CSS.supports('scroll-behavior', 'smooth');
    });
  }

  // Test JavaScript features
  async testJavaScriptFeatures() {
    console.log('⚡ Testing JavaScript Features...');
    
    // ES6 Features
    this.testJS('Arrow Functions', () => {
      try {
        eval('(() => {})');
        return true;
      } catch (e) {
        return false;
      }
    });
    
    this.testJS('Template Literals', () => {
      try {
        eval('`test ${1}`');
        return true;
      } catch (e) {
        return false;
      }
    });
    
    this.testJS('Destructuring', () => {
      try {
        eval('const {a} = {a: 1}');
        return true;
      } catch (e) {
        return false;
      }
    });
    
    this.testJS('Async/Await', () => {
      try {
        eval('async function test() { await Promise.resolve(); }');
        return true;
      } catch (e) {
        return false;
      }
    });
    
    this.testJS('Promises', () => {
      return typeof Promise === 'function';
    });
    
    this.testJS('Map/Set', () => {
      return typeof Map === 'function' && typeof Set === 'function';
    });
    
    this.testJS('WeakMap/WeakSet', () => {
      return typeof WeakMap === 'function' && typeof WeakSet === 'function';
    });
    
    // Modern APIs
    this.testJS('requestAnimationFrame', () => {
      return typeof requestAnimationFrame === 'function';
    });
    
    this.testJS('MutationObserver', () => {
      return typeof MutationObserver === 'function';
    });
    
    this.testJS('CustomEvent', () => {
      try {
        new CustomEvent('test');
        return true;
      } catch (e) {
        return false;
      }
    });
  }

  // Test Quick Order specific features
  async testQuickOrderFeatures() {
    console.log('🛒 Testing Quick Order Features...');
    
    // Shopping Cart Service
    this.testFeature('Shopping Cart Service', () => {
      return window.shoppingCart && typeof window.shoppingCart.addItem === 'function';
    });
    
    // Quick Order Manager
    this.testFeature('Quick Order Manager', () => {
      return window.quickOrderManager && typeof window.quickOrderManager.addProductToCart === 'function';
    });
    
    // Visit Context Service
    this.testFeature('Visit Context Service', () => {
      return window.visitContextService && typeof window.visitContextService.getActiveVisit === 'function';
    });
    
    // Analytics Tracker
    this.testFeature('Analytics Tracker', () => {
      return window.analyticsTracker && typeof window.analyticsTracker.trackEvent === 'function';
    });
    
    // Offline Manager
    this.testFeature('Offline Manager', () => {
      return window.offlineManager && typeof window.offlineManager.isOnline !== 'undefined';
    });
    
    // Mobile Optimizer
    this.testFeature('Mobile Optimizer', () => {
      return window.mobileOptimizer && typeof window.mobileOptimizer.getOptimizationStatus === 'function';
    });
    
    // Performance Optimizer
    this.testFeature('Performance Optimizer', () => {
      return window.performanceOptimizer && typeof window.performanceOptimizer.getPerformanceReport === 'function';
    });
    
    // Test cart operations
    if (window.shoppingCart) {
      this.testFeature('Cart Add Item', () => {
        try {
          const testProduct = { id: 'test', name: 'Test Product', price: 1000 };
          window.shoppingCart.addItem(testProduct, 1);
          const hasItem = window.shoppingCart.hasProduct('test');
          window.shoppingCart.removeItem('test');
          return hasItem;
        } catch (e) {
          return false;
        }
      });
    }
    
    // Test UI components
    this.testFeature('Catalog Grid', () => {
      return document.getElementById('catalog-grid') !== null;
    });
    
    this.testFeature('Floating Cart', () => {
      return document.getElementById('floating-cart') !== null;
    });
    
    this.testFeature('Cart Modal', () => {
      return document.getElementById('cart-modal') !== null;
    });
    
    this.testFeature('Customer Modal', () => {
      return document.getElementById('customer-modal') !== null;
    });
  }

  // Test mobile-specific features
  async testMobileFeatures() {
    console.log('📱 Testing Mobile Features...');
    
    // Touch Events
    this.testFeature('Touch Events', () => {
      return 'ontouchstart' in window;
    });
    
    // Orientation API
    this.testFeature('Orientation API', () => {
      return 'orientation' in window || 'onorientationchange' in window;
    });
    
    // Device Motion
    this.testFeature('Device Motion', () => {
      return 'DeviceMotionEvent' in window;
    });
    
    // Network Information
    this.testFeature('Network Information', () => {
      return 'connection' in navigator;
    });
    
    // Viewport Meta Tag
    this.testFeature('Viewport Meta Tag', () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      return viewport !== null;
    });
    
    // Mobile-specific CSS
    this.testFeature('Mobile CSS Support', () => {
      return CSS.supports('touch-action', 'manipulation');
    });
  }

  // Test browser performance
  async testBrowserPerformance() {
    console.log('📊 Testing Browser Performance...');
    
    // JavaScript execution speed
    const jsStart = performance.now();
    for (let i = 0; i < 100000; i++) {
      Math.random();
    }
    const jsEnd = performance.now();
    const jsPerformance = jsEnd - jsStart;
    
    this.addTestResult('JavaScript Performance', jsPerformance < 50, `${jsPerformance.toFixed(2)}ms`);
    
    // DOM manipulation speed
    const domStart = performance.now();
    const testDiv = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const child = document.createElement('span');
      child.textContent = `Item ${i}`;
      testDiv.appendChild(child);
    }
    document.body.appendChild(testDiv);
    document.body.removeChild(testDiv);
    const domEnd = performance.now();
    const domPerformance = domEnd - domStart;
    
    this.addTestResult('DOM Performance', domPerformance < 100, `${domPerformance.toFixed(2)}ms`);
    
    // Memory usage (if available)
    if (performance.memory) {
      const memoryUsage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
      this.addTestResult('Memory Usage', memoryUsage < 80, `${memoryUsage.toFixed(1)}%`);
    }
    
    // Network performance (basic test)
    try {
      const networkStart = performance.now();
      await fetch(window.location.href, { method: 'HEAD' });
      const networkEnd = performance.now();
      const networkPerformance = networkEnd - networkStart;
      
      this.addTestResult('Network Performance', networkPerformance < 1000, `${networkPerformance.toFixed(2)}ms`);
    } catch (e) {
      this.addTestResult('Network Performance', false, 'Failed to test');
    }
  }

  // Test API availability
  testAPI(name, testFn) {
    try {
      const result = testFn();
      this.addTestResult(`API: ${name}`, result, result ? 'Available' : 'Not Available');
      
      if (!result) {
        this.addCompatibilityIssue('api', name, 'API not available', 'medium');
      }
    } catch (error) {
      this.addTestResult(`API: ${name}`, false, `Error: ${error.message}`);
      this.addCompatibilityIssue('api', name, error.message, 'high');
    }
  }

  // Test CSS feature
  testCSS(name, testFn) {
    try {
      const result = testFn();
      this.addTestResult(`CSS: ${name}`, result, result ? 'Supported' : 'Not Supported');
      
      if (!result) {
        this.addCompatibilityIssue('css', name, 'CSS feature not supported', 'low');
      }
    } catch (error) {
      this.addTestResult(`CSS: ${name}`, false, `Error: ${error.message}`);
      this.addCompatibilityIssue('css', name, error.message, 'medium');
    }
  }

  // Test JavaScript feature
  testJS(name, testFn) {
    try {
      const result = testFn();
      this.addTestResult(`JS: ${name}`, result, result ? 'Supported' : 'Not Supported');
      
      if (!result) {
        this.addCompatibilityIssue('javascript', name, 'JavaScript feature not supported', 'high');
      }
    } catch (error) {
      this.addTestResult(`JS: ${name}`, false, `Error: ${error.message}`);
      this.addCompatibilityIssue('javascript', name, error.message, 'high');
    }
  }

  // Test Quick Order feature
  testFeature(name, testFn) {
    try {
      const result = testFn();
      this.addTestResult(`Feature: ${name}`, result, result ? 'Working' : 'Not Working');
      
      if (!result) {
        this.addCompatibilityIssue('feature', name, 'Feature not working', 'high');
      }
    } catch (error) {
      this.addTestResult(`Feature: ${name}`, false, `Error: ${error.message}`);
      this.addCompatibilityIssue('feature', name, error.message, 'critical');
    }
  }

  // Add test result
  addTestResult(name, passed, details) {
    this.testResults.push({
      name: name,
      passed: passed,
      details: details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${details}`);
  }

  // Add compatibility issue
  addCompatibilityIssue(category, feature, description, severity) {
    this.compatibilityIssues.push({
      category: category,
      feature: feature,
      description: description,
      severity: severity,
      browser: this.browserInfo.name,
      version: this.browserInfo.version,
      device: this.deviceInfo.type,
      timestamp: new Date().toISOString()
    });
  }

  // Generate compatibility report
  generateCompatibilityReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const compatibilityScore = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    console.log('\n🌐 CROSS-BROWSER COMPATIBILITY REPORT');
    console.log('='.repeat(60));
    console.log(`Browser: ${this.browserInfo.name} ${this.browserInfo.version}`);
    console.log(`Device: ${this.deviceInfo.type} (${this.deviceInfo.os})`);
    console.log(`Screen: ${this.deviceInfo.screenWidth}x${this.deviceInfo.screenHeight}`);
    console.log(`Viewport: ${this.deviceInfo.viewportWidth}x${this.deviceInfo.viewportHeight}`);
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Compatibility Score: ${compatibilityScore}%`);
    console.log('='.repeat(60));
    
    // Group results by category
    const categories = {};
    this.testResults.forEach(result => {
      const category = result.name.split(':')[0];
      if (!categories[category]) {
        categories[category] = { passed: 0, failed: 0, tests: [] };
      }
      
      if (result.passed) {
        categories[category].passed++;
      } else {
        categories[category].failed++;
      }
      
      categories[category].tests.push(result);
    });
    
    // Print category summaries
    Object.keys(categories).forEach(category => {
      const cat = categories[category];
      const categoryScore = ((cat.passed / (cat.passed + cat.failed)) * 100).toFixed(1);
      
      console.log(`\n🔧 ${category}: ${cat.passed}/${cat.passed + cat.failed} (${categoryScore}%)`);
      
      cat.tests.forEach(test => {
        const status = test.passed ? '  ✅' : '  ❌';
        const testName = test.name.replace(category + ': ', '');
        console.log(`${status} ${testName}: ${test.details}`);
      });
    });
    
    // Compatibility issues summary
    if (this.compatibilityIssues.length > 0) {
      console.log('\n⚠️ COMPATIBILITY ISSUES:');
      
      const issuesBySeverity = {};
      this.compatibilityIssues.forEach(issue => {
        if (!issuesBySeverity[issue.severity]) {
          issuesBySeverity[issue.severity] = [];
        }
        issuesBySeverity[issue.severity].push(issue);
      });
      
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        if (issuesBySeverity[severity]) {
          console.log(`\n${severity.toUpperCase()} (${issuesBySeverity[severity].length}):`);
          issuesBySeverity[severity].forEach(issue => {
            console.log(`- ${issue.feature}: ${issue.description}`);
          });
        }
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (compatibilityScore >= 95) {
      console.log('✅ Excellent compatibility! Quick Order works well on this browser.');
    } else if (compatibilityScore >= 85) {
      console.log('⚠️ Good compatibility with minor issues to address.');
    } else if (compatibilityScore >= 70) {
      console.log('⚠️ Moderate compatibility. Some features may not work optimally.');
    } else {
      console.log('❌ Poor compatibility. Significant issues need attention.');
    }
    
    // Browser-specific recommendations
    this.generateBrowserSpecificRecommendations();
    
    // Store report
    this.storeCompatibilityReport({
      timestamp: new Date().toISOString(),
      browser: this.browserInfo,
      device: this.deviceInfo,
      summary: { totalTests, passedTests, failedTests, compatibilityScore },
      results: this.testResults,
      issues: this.compatibilityIssues,
      categories: categories
    });
  }

  // Generate browser-specific recommendations
  generateBrowserSpecificRecommendations() {
    const browser = this.browserInfo.name;
    const version = parseInt(this.browserInfo.version);
    
    console.log('\n🔧 BROWSER-SPECIFIC RECOMMENDATIONS:');
    
    switch (browser) {
      case 'Internet Explorer':
        console.log('❌ Internet Explorer is not supported. Please use a modern browser.');
        console.log('- Recommended: Chrome, Firefox, Safari, or Edge');
        break;
        
      case 'Chrome':
        if (version < 80) {
          console.log('⚠️ Chrome version is outdated. Update to latest version for best experience.');
        } else {
          console.log('✅ Chrome is fully supported and optimized.');
        }
        break;
        
      case 'Firefox':
        if (version < 75) {
          console.log('⚠️ Firefox version is outdated. Update to latest version for best experience.');
        } else {
          console.log('✅ Firefox is fully supported.');
        }
        break;
        
      case 'Safari':
        if (version < 13) {
          console.log('⚠️ Safari version may have limited support. Update to latest version.');
        } else {
          console.log('✅ Safari is supported with good compatibility.');
        }
        break;
        
      case 'Edge':
        if (version < 80) {
          console.log('⚠️ Edge version is outdated. Update to latest Chromium-based Edge.');
        } else {
          console.log('✅ Edge is fully supported.');
        }
        break;
        
      default:
        console.log('⚠️ Browser compatibility unknown. Test thoroughly before deployment.');
    }
    
    // Device-specific recommendations
    if (this.deviceInfo.isMobile) {
      console.log('\n📱 MOBILE RECOMMENDATIONS:');
      console.log('- Ensure touch targets are at least 44px');
      console.log('- Test in both portrait and landscape orientations');
      console.log('- Verify virtual keyboard behavior');
      console.log('- Test offline functionality');
    }
  }

  // Store compatibility report
  storeCompatibilityReport(report) {
    try {
      localStorage.setItem('cross_browser_compatibility_report', JSON.stringify(report));
      console.log('\n📁 Compatibility report saved to localStorage');
    } catch (error) {
      console.error('Failed to store compatibility report:', error);
    }
  }

  // Get last compatibility report
  getLastCompatibilityReport() {
    try {
      const stored = localStorage.getItem('cross_browser_compatibility_report');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving compatibility report:', error);
      return null;
    }
  }

  // Quick compatibility check
  quickCompatibilityCheck() {
    console.log('🚀 Running Quick Compatibility Check...');
    
    const criticalFeatures = [
      { name: 'localStorage', test: () => 'localStorage' in window },
      { name: 'fetch', test: () => typeof fetch === 'function' },
      { name: 'Promise', test: () => typeof Promise === 'function' },
      { name: 'CSS Grid', test: () => CSS.supports('display', 'grid') },
      { name: 'CSS Flexbox', test: () => CSS.supports('display', 'flex') }
    ];
    
    const results = criticalFeatures.map(feature => ({
      name: feature.name,
      supported: feature.test()
    }));
    
    const supportedCount = results.filter(r => r.supported).length;
    const compatibilityScore = (supportedCount / criticalFeatures.length) * 100;
    
    console.log(`🌐 Quick Compatibility: ${supportedCount}/${criticalFeatures.length} (${compatibilityScore}%)`);
    
    results.forEach(result => {
      const status = result.supported ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
    });
    
    return {
      compatible: compatibilityScore >= 80,
      score: compatibilityScore,
      results: results,
      browser: this.browserInfo,
      device: this.deviceInfo
    };
  }
}

// Create global instance
export const crossBrowserTester = new CrossBrowserTester();

// Export for global access
if (typeof window !== 'undefined') {
  window.crossBrowserTester = crossBrowserTester;
}
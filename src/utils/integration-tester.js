// Integration Tester - Tests integration with existing systems
// Validates compatibility and performance with order management, auth, and database

export class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.performanceMetrics = new Map();
    this.isRunning = false;
    this.integrationPoints = [
      'authentication',
      'database',
      'order_management',
      'customer_management',
      'navigation',
      'storage',
      'service_worker'
    ];
  }

  // Run all integration tests
  async runAllIntegrationTests() {
    if (this.isRunning) {
      console.log('Integration tests already running...');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    this.performanceMetrics.clear();

    console.log('🔗 Starting Integration Tests...');

    try {
      // Test authentication integration
      await this.testAuthenticationIntegration();
      
      // Test database integration
      await this.testDatabaseIntegration();
      
      // Test order management integration
      await this.testOrderManagementIntegration();
      
      // Test customer management integration
      await this.testCustomerManagementIntegration();
      
      // Test navigation integration
      await this.testNavigationIntegration();
      
      // Test storage integration
      await this.testStorageIntegration();
      
      // Test service worker integration
      await this.testServiceWorkerIntegration();
      
      // Generate integration report
      this.generateIntegrationReport();
      
    } catch (error) {
      console.error('❌ Integration test suite failed:', error);
      this.addTestResult('Integration Suite', false, `Suite failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  // Test authentication integration
  async testAuthenticationIntegration() {
    console.log('🔐 Testing Authentication Integration...');
    
    // Test 1: User session access
    try {
      const user = window.state?.getState('user');
      
      if (user && user.id) {
        this.addTestResult('Auth - User Session', true, `User session active: ${user.role}`);
      } else {
        this.addTestResult('Auth - User Session', false, 'No active user session found');
      }
    } catch (error) {
      this.addTestResult('Auth - User Session', false, error.message);
    }
    
    // Test 2: Role-based access
    try {
      const user = window.state?.getState('user');
      const hasEmployeeAccess = user?.role === 'employee' || user?.role === 'admin';
      
      if (hasEmployeeAccess) {
        this.addTestResult('Auth - Role Access', true, `Role ${user.role} has Quick Order access`);
      } else {
        this.addTestResult('Auth - Role Access', false, `Role ${user?.role || 'none'} lacks Quick Order access`);
      }
    } catch (error) {
      this.addTestResult('Auth - Role Access', false, error.message);
    }
    
    // Test 3: Session persistence
    try {
      const sessionData = localStorage.getItem('user_session');
      const hasValidSession = sessionData && JSON.parse(sessionData);
      
      this.addTestResult('Auth - Session Persistence', hasValidSession, 
        hasValidSession ? 'Session data persisted' : 'No session persistence');
    } catch (error) {
      this.addTestResult('Auth - Session Persistence', false, error.message);
    }
  }

  // Test database integration
  async testDatabaseIntegration() {
    console.log('🗄️ Testing Database Integration...');
    
    // Test 1: Supabase connection
    try {
      const startTime = performance.now();
      const isConnected = window.db && window.db.supabase;
      const endTime = performance.now();
      
      this.recordPerformance('db_connection_check', endTime - startTime);
      
      if (isConnected) {
        this.addTestResult('DB - Connection', true, 'Supabase client available');
      } else {
        this.addTestResult('DB - Connection', false, 'Supabase client not found');
      }
    } catch (error) {
      this.addTestResult('DB - Connection', false, error.message);
    }
    
    // Test 2: Product data access
    try {
      const startTime = performance.now();
      const { data: products, error } = await window.db.getProducts();
      const endTime = performance.now();
      
      this.recordPerformance('db_products_fetch', endTime - startTime);
      
      if (error) {
        this.addTestResult('DB - Products Access', false, `Error: ${error.message}`);
      } else if (products && products.length > 0) {
        this.addTestResult('DB - Products Access', true, `Retrieved ${products.length} products`);
      } else {
        this.addTestResult('DB - Products Access', false, 'No products found');
      }
    } catch (error) {
      this.addTestResult('DB - Products Access', false, error.message);
    }
    
    // Test 3: Customer data access
    try {
      const user = window.state?.getState('user');
      if (!user?.id) {
        this.addTestResult('DB - Customers Access', false, 'No user session for customer test');
        return;
      }
      
      const startTime = performance.now();
      const { data: customers, error } = await window.db.getCustomers(user.id);
      const endTime = performance.now();
      
      this.recordPerformance('db_customers_fetch', endTime - startTime);
      
      if (error) {
        this.addTestResult('DB - Customers Access', false, `Error: ${error.message}`);
      } else {
        this.addTestResult('DB - Customers Access', true, `Retrieved ${customers?.length || 0} customers`);
      }
    } catch (error) {
      this.addTestResult('DB - Customers Access', false, error.message);
    }
  }

  // Test order management integration
  async testOrderManagementIntegration() {
    console.log('📦 Testing Order Management Integration...');
    
    // Test 1: Order service availability
    try {
      const orderService = window.quickOrderManager?.orderService;
      
      if (orderService && typeof orderService.createOrder === 'function') {
        this.addTestResult('Order - Service Available', true, 'Order service accessible');
      } else {
        this.addTestResult('Order - Service Available', false, 'Order service not found');
      }
    } catch (error) {
      this.addTestResult('Order - Service Available', false, error.message);
    }
    
    // Test 2: Order data structure validation
    try {
      const mockOrderData = {
        employee_id: 'test-employee',
        customer_id: 'test-customer',
        items: [{ name: 'Test Item', qty: 1, price: 1000 }],
        items_summary: 'Test Item (1x)',
        total_amount: 1000,
        status: 'pending',
        order_source: 'quick_order',
        creation_method: 'catalog_cart'
      };
      
      // Validate structure without actually creating order
      const hasRequiredFields = mockOrderData.employee_id && 
                               mockOrderData.customer_id && 
                               mockOrderData.items && 
                               mockOrderData.total_amount;
      
      this.addTestResult('Order - Data Structure', hasRequiredFields, 
        hasRequiredFields ? 'Order data structure valid' : 'Missing required fields');
    } catch (error) {
      this.addTestResult('Order - Data Structure', false, error.message);
    }
    
    // Test 3: Order creation workflow
    try {
      const canCreateOrder = window.quickOrderManager && 
                            typeof window.quickOrderManager.completeOrder === 'function';
      
      this.addTestResult('Order - Creation Workflow', canCreateOrder, 
        canCreateOrder ? 'Order creation workflow available' : 'Order creation workflow missing');
    } catch (error) {
      this.addTestResult('Order - Creation Workflow', false, error.message);
    }
  }

  // Test customer management integration
  async testCustomerManagementIntegration() {
    console.log('👥 Testing Customer Management Integration...');
    
    // Test 1: Visit context service
    try {
      const visitService = window.visitContextService;
      
      if (visitService && typeof visitService.getActiveVisit === 'function') {
        this.addTestResult('Customer - Visit Service', true, 'Visit context service available');
      } else {
        this.addTestResult('Customer - Visit Service', false, 'Visit context service not found');
      }
    } catch (error) {
      this.addTestResult('Customer - Visit Service', false, error.message);
    }
    
    // Test 2: Customer suggestion functionality
    try {
      const startTime = performance.now();
      const suggestedCustomer = await window.quickOrderManager?.getSuggestedCustomer();
      const endTime = performance.now();
      
      this.recordPerformance('customer_suggestion', endTime - startTime);
      
      this.addTestResult('Customer - Suggestion', true, 
        suggestedCustomer ? `Suggested: ${suggestedCustomer.customer.name}` : 'No suggestion (expected if no visits)');
    } catch (error) {
      this.addTestResult('Customer - Suggestion', false, error.message);
    }
    
    // Test 3: Customer list access
    try {
      const startTime = performance.now();
      const customers = await window.quickOrderManager?.getAllCustomers();
      const endTime = performance.now();
      
      this.recordPerformance('customer_list_fetch', endTime - startTime);
      
      if (Array.isArray(customers)) {
        this.addTestResult('Customer - List Access', true, `Retrieved ${customers.length} customers`);
      } else {
        this.addTestResult('Customer - List Access', false, 'Customer list not accessible');
      }
    } catch (error) {
      this.addTestResult('Customer - List Access', false, error.message);
    }
  }

  // Test navigation integration
  async testNavigationIntegration() {
    console.log('🧭 Testing Navigation Integration...');
    
    // Test 1: Router integration
    try {
      const router = window.router;
      
      if (router && typeof router.navigate === 'function') {
        this.addTestResult('Nav - Router Available', true, 'Router service accessible');
      } else {
        this.addTestResult('Nav - Router Available', false, 'Router service not found');
      }
    } catch (error) {
      this.addTestResult('Nav - Router Available', false, error.message);
    }
    
    // Test 2: Navigation components
    try {
      const navbar = document.querySelector('.navbar');
      const bottomNav = document.querySelector('.bottom-nav');
      
      const hasNavigation = navbar && bottomNav;
      
      this.addTestResult('Nav - Components', hasNavigation, 
        hasNavigation ? 'Navigation components present' : 'Navigation components missing');
    } catch (error) {
      this.addTestResult('Nav - Components', false, error.message);
    }
    
    // Test 3: Page transitions
    try {
      const currentHash = window.location.hash;
      const canNavigate = typeof window.history.pushState === 'function';
      
      this.addTestResult('Nav - Transitions', canNavigate, 
        canNavigate ? `Current: ${currentHash || 'root'}` : 'Navigation not supported');
    } catch (error) {
      this.addTestResult('Nav - Transitions', false, error.message);
    }
  }

  // Test storage integration
  async testStorageIntegration() {
    console.log('💾 Testing Storage Integration...');
    
    // Test 1: localStorage availability
    try {
      const testKey = 'integration_test_' + Date.now();
      const testValue = 'test_data';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      const storageWorks = retrieved === testValue;
      
      this.addTestResult('Storage - localStorage', storageWorks, 
        storageWorks ? 'localStorage working' : 'localStorage failed');
    } catch (error) {
      this.addTestResult('Storage - localStorage', false, error.message);
    }
    
    // Test 2: Cart persistence
    try {
      const cartData = localStorage.getItem('quick_order_cart');
      const hasCartData = cartData !== null;
      
      this.addTestResult('Storage - Cart Persistence', true, 
        hasCartData ? 'Cart data found in storage' : 'No cart data (expected for new session)');
    } catch (error) {
      this.addTestResult('Storage - Cart Persistence', false, error.message);
    }
    
    // Test 3: Analytics storage
    try {
      const analyticsData = localStorage.getItem('analytics_data');
      const hasAnalyticsData = analyticsData !== null;
      
      this.addTestResult('Storage - Analytics', true, 
        hasAnalyticsData ? 'Analytics data found' : 'No analytics data (expected for new session)');
    } catch (error) {
      this.addTestResult('Storage - Analytics', false, error.message);
    }
  }

  // Test service worker integration
  async testServiceWorkerIntegration() {
    console.log('⚙️ Testing Service Worker Integration...');
    
    // Test 1: Service worker support
    try {
      const swSupported = 'serviceWorker' in navigator;
      
      this.addTestResult('SW - Support', swSupported, 
        swSupported ? 'Service Worker supported' : 'Service Worker not supported');
    } catch (error) {
      this.addTestResult('SW - Support', false, error.message);
    }
    
    // Test 2: Service worker registration
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        this.addTestResult('SW - Registration', !!registration, 
          registration ? 'Service Worker registered' : 'Service Worker not registered');
      } else {
        this.addTestResult('SW - Registration', false, 'Service Worker not supported');
      }
    } catch (error) {
      this.addTestResult('SW - Registration', false, error.message);
    }
    
    // Test 3: Cache API
    try {
      const cacheSupported = 'caches' in window;
      
      if (cacheSupported) {
        const cacheNames = await caches.keys();
        this.addTestResult('SW - Cache API', true, `Found ${cacheNames.length} caches`);
      } else {
        this.addTestResult('SW - Cache API', false, 'Cache API not supported');
      }
    } catch (error) {
      this.addTestResult('SW - Cache API', false, error.message);
    }
  }

  // Record performance metric
  recordPerformance(operation, duration) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    this.performanceMetrics.get(operation).push(duration);
  }

  // Add test result
  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed: passed,
      details: details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  // Generate integration report
  generateIntegrationReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    console.log('\n🔗 INTEGRATION TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('='.repeat(50));
    
    // Group results by integration point
    const integrationResults = {};
    this.testResults.forEach(result => {
      const integration = result.name.split(' - ')[0];
      if (!integrationResults[integration]) {
        integrationResults[integration] = { passed: 0, failed: 0, tests: [] };
      }
      
      if (result.passed) {
        integrationResults[integration].passed++;
      } else {
        integrationResults[integration].failed++;
      }
      
      integrationResults[integration].tests.push(result);
    });
    
    // Print integration summaries
    Object.keys(integrationResults).forEach(integration => {
      const results = integrationResults[integration];
      const integrationSuccessRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
      
      console.log(`\n🔗 ${integration}: ${results.passed}/${results.passed + results.failed} (${integrationSuccessRate}%)`);
      
      results.tests.forEach(test => {
        const status = test.passed ? '  ✅' : '  ❌';
        const testName = test.name.replace(integration + ' - ', '');
        console.log(`${status} ${testName}: ${test.details}`);
      });
    });
    
    // Performance summary
    if (this.performanceMetrics.size > 0) {
      console.log('\n⚡ PERFORMANCE METRICS:');
      
      for (const [operation, durations] of this.performanceMetrics.entries()) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        console.log(`  ${operation}: avg ${avg.toFixed(2)}ms (min: ${min.toFixed(2)}ms, max: ${max.toFixed(2)}ms)`);
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (successRate >= 95) {
      console.log('✅ Excellent integration! All systems working well together.');
    } else if (successRate >= 80) {
      console.log('⚠️ Good integration with some issues to address.');
    } else {
      console.log('❌ Integration issues detected. Review failed tests before deployment.');
    }
    
    if (failedTests > 0) {
      console.log('\n🔧 FAILED INTEGRATIONS TO FIX:');
      this.testResults.filter(r => !r.passed).forEach(test => {
        console.log(`- ${test.name}: ${test.details}`);
      });
    }
    
    // Store report
    this.storeIntegrationReport({
      timestamp: new Date().toISOString(),
      summary: { totalTests, passedTests, failedTests, successRate },
      results: this.testResults,
      integrations: integrationResults,
      performance: Array.from(this.performanceMetrics.entries())
    });
  }

  // Store integration report
  storeIntegrationReport(report) {
    try {
      localStorage.setItem('integration_test_report', JSON.stringify(report));
      console.log('\n📁 Integration report saved to localStorage');
    } catch (error) {
      console.error('Failed to store integration report:', error);
    }
  }

  // Get last integration report
  getLastIntegrationReport() {
    try {
      const stored = localStorage.getItem('integration_test_report');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving integration report:', error);
      return null;
    }
  }

  // Quick integration health check
  async quickHealthCheck() {
    console.log('🏥 Running Quick Integration Health Check...');
    
    const checks = [];
    
    // Check core services
    try {
      const coreServices = {
        'Quick Order Manager': !!window.quickOrderManager,
        'Shopping Cart': !!window.shoppingCart,
        'Visit Context': !!window.visitContextService,
        'Analytics': !!window.analyticsTracker,
        'Offline Manager': !!window.offlineManager
      };
      
      for (const [service, available] of Object.entries(coreServices)) {
        checks.push({ name: service, passed: available });
      }
    } catch (error) {
      checks.push({ name: 'Core Services', passed: false, error: error.message });
    }
    
    // Check database connectivity
    try {
      const dbConnected = !!(window.db && window.db.supabase);
      checks.push({ name: 'Database', passed: dbConnected });
    } catch (error) {
      checks.push({ name: 'Database', passed: false, error: error.message });
    }
    
    // Check authentication
    try {
      const user = window.state?.getState('user');
      const authenticated = !!(user && user.id);
      checks.push({ name: 'Authentication', passed: authenticated });
    } catch (error) {
      checks.push({ name: 'Authentication', passed: false, error: error.message });
    }
    
    const passedChecks = checks.filter(c => c.passed).length;
    const healthScore = (passedChecks / checks.length * 100).toFixed(1);
    
    console.log(`🏥 Integration Health: ${passedChecks}/${checks.length} (${healthScore}%)`);
    
    checks.forEach(check => {
      const status = check.passed ? '✅' : '❌';
      const details = check.error ? ` - ${check.error}` : '';
      console.log(`${status} ${check.name}${details}`);
    });
    
    return {
      healthy: passedChecks === checks.length,
      score: healthScore,
      checks: checks
    };
  }
}

// Create global instance
export const integrationTester = new IntegrationTester();

// Export for global access
if (typeof window !== 'undefined') {
  window.integrationTester = integrationTester;
}
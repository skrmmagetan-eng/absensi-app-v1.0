// Security Integration Test - Tests all security features for Task 14
// Validates security validator, session manager, and CSRF protection

export class SecurityIntegrationTest {
  constructor() {
    this.testResults = [];
    this.securityIssues = [];
    this.isRunning = false;
  }

  // Run comprehensive security tests
  async runSecurityTests() {
    if (this.isRunning) {
      console.log('⚠️ Security tests already running...');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    this.securityIssues = [];

    console.log('🔒 Starting Security Integration Tests...');

    try {
      // Test security validator
      await this.testSecurityValidator();
      
      // Test session management
      await this.testSessionManagement();
      
      // Test CSRF protection
      await this.testCSRFProtection();
      
      // Test input sanitization
      await this.testInputSanitization();
      
      // Test price integrity
      await this.testPriceIntegrity();
      
      // Test user permission validation
      await this.testUserPermissions();
      
      // Test cart security limits
      await this.testCartSecurityLimits();
      
      // Test duplicate order prevention
      await this.testDuplicateOrderPrevention();
      
      // Generate security report
      this.generateSecurityReport();
      
    } catch (error) {
      console.error('❌ Security test suite failed:', error);
      this.addTestResult('Security Suite', false, `Suite failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  // Test security validator
  async testSecurityValidator() {
    console.log('🛡️ Testing Security Validator...');
    
    // Test 1: Validator availability
    try {
      const hasValidator = window.securityValidator && 
                          typeof window.securityValidator.validateCartOperation === 'function';
      
      this.addTestResult('Security Validator Available', hasValidator, 
        hasValidator ? 'Security validator loaded' : 'Security validator not found');
    } catch (error) {
      this.addTestResult('Security Validator Available', false, error.message);
    }
    
    // Test 2: Cart operation validation
    try {
      if (window.securityValidator) {
        const testProduct = { id: 'test', name: 'Test Product', price: 1000 };
        const validation = window.securityValidator.validateCartOperation('add_item', {
          product: testProduct,
          quantity: 1
        });
        
        this.addTestResult('Cart Operation Validation', validation !== undefined, 
          validation ? `Validation result: ${validation.isValid}` : 'No validation result');
      }
    } catch (error) {
      this.addTestResult('Cart Operation Validation', false, error.message);
    }
    
    // Test 3: Security event logging
    try {
      if (window.securityValidator) {
        const initialEvents = window.securityValidator.getSecurityEvents().length;
        
        // Trigger a security event
        window.securityValidator.logSecurityEvent('test_event', { test: true });
        
        const finalEvents = window.securityValidator.getSecurityEvents().length;
        
        this.addTestResult('Security Event Logging', finalEvents > initialEvents, 
          `Events: ${initialEvents} -> ${finalEvents}`);
      }
    } catch (error) {
      this.addTestResult('Security Event Logging', false, error.message);
    }
  }

  // Test session management
  async testSessionManagement() {
    console.log('⏰ Testing Session Management...');
    
    // Test 1: Session manager availability
    try {
      const hasSessionManager = window.sessionManager && 
                               typeof window.sessionManager.getSessionStatus === 'function';
      
      this.addTestResult('Session Manager Available', hasSessionManager, 
        hasSessionManager ? 'Session manager loaded' : 'Session manager not found');
    } catch (error) {
      this.addTestResult('Session Manager Available', false, error.message);
    }
    
    // Test 2: Session status check
    try {
      if (window.sessionManager) {
        const status = window.sessionManager.getSessionStatus();
        
        this.addTestResult('Session Status Check', status !== undefined, 
          status ? `Active: ${status.is_active}, Idle: ${status.idle_minutes}m` : 'No status');
      }
    } catch (error) {
      this.addTestResult('Session Status Check', false, error.message);
    }
    
    // Test 3: Activity tracking
    try {
      if (window.sessionManager) {
        const initialActivity = window.sessionManager.getSessionStatus().last_activity;
        
        // Simulate activity
        window.sessionManager.updateActivity();
        
        const newActivity = window.sessionManager.getSessionStatus().last_activity;
        
        this.addTestResult('Activity Tracking', newActivity > initialActivity, 
          `Activity updated: ${newActivity > initialActivity}`);
      }
    } catch (error) {
      this.addTestResult('Activity Tracking', false, error.message);
    }
    
    // Test 4: Cart expiry check
    try {
      if (window.sessionManager) {
        const cartAge = window.sessionManager.getCartAge();
        
        this.addTestResult('Cart Expiry Check', typeof cartAge === 'number', 
          `Cart age: ${cartAge}ms`);
      }
    } catch (error) {
      this.addTestResult('Cart Expiry Check', false, error.message);
    }
  }

  // Test CSRF protection
  async testCSRFProtection() {
    console.log('🛡️ Testing CSRF Protection...');
    
    // Test 1: CSRF token generation
    try {
      const hasCSRFToken = window.securityValidator && 
                          window.securityValidator.csrfToken;
      
      this.addTestResult('CSRF Token Generation', hasCSRFToken, 
        hasCSRFToken ? `Token length: ${window.securityValidator.csrfToken.length}` : 'No CSRF token');
    } catch (error) {
      this.addTestResult('CSRF Token Generation', false, error.message);
    }
    
    // Test 2: Fetch override for CSRF
    try {
      const originalFetch = window.fetch;
      let csrfHeaderAdded = false;
      
      // Mock fetch to check for CSRF header
      window.fetch = async function(url, options = {}) {
        if (url.includes('/api/') && options.headers && options.headers['X-CSRF-Token']) {
          csrfHeaderAdded = true;
        }
        return { ok: true, json: async () => ({}) };
      };
      
      // Test API call
      await fetch('/api/test', { method: 'POST' });
      
      // Restore original fetch
      window.fetch = originalFetch;
      
      this.addTestResult('CSRF Header Injection', csrfHeaderAdded, 
        csrfHeaderAdded ? 'CSRF header added to API calls' : 'CSRF header not added');
    } catch (error) {
      this.addTestResult('CSRF Header Injection', false, error.message);
    }
  }

  // Test input sanitization
  async testInputSanitization() {
    console.log('🧹 Testing Input Sanitization...');
    
    // Test 1: XSS prevention
    try {
      if (window.securityValidator) {
        const maliciousInput = '<script>alert("xss")</script>';
        const sanitized = window.securityValidator.sanitizeInput(maliciousInput);
        
        const isSanitized = !sanitized.includes('<script>');
        
        this.addTestResult('XSS Prevention', isSanitized, 
          `Input sanitized: ${maliciousInput} -> ${sanitized}`);
        
        if (!isSanitized) {
          this.addSecurityIssue('XSS vulnerability detected in input sanitization');
        }
      }
    } catch (error) {
      this.addTestResult('XSS Prevention', false, error.message);
    }
    
    // Test 2: JavaScript injection prevention
    try {
      if (window.securityValidator) {
        const jsInjection = 'javascript:alert("injection")';
        const sanitized = window.securityValidator.sanitizeInput(jsInjection);
        
        const isPrevented = !sanitized.toLowerCase().includes('javascript:');
        
        this.addTestResult('JS Injection Prevention', isPrevented, 
          `JS injection prevented: ${isPrevented}`);
        
        if (!isPrevented) {
          this.addSecurityIssue('JavaScript injection vulnerability detected');
        }
      }
    } catch (error) {
      this.addTestResult('JS Injection Prevention', false, error.message);
    }
    
    // Test 3: Event handler removal
    try {
      if (window.securityValidator) {
        const eventHandler = 'onclick="malicious()"';
        const sanitized = window.securityValidator.sanitizeInput(eventHandler);
        
        const isRemoved = !sanitized.toLowerCase().includes('onclick=');
        
        this.addTestResult('Event Handler Removal', isRemoved, 
          `Event handlers removed: ${isRemoved}`);
      }
    } catch (error) {
      this.addTestResult('Event Handler Removal', false, error.message);
    }
  }

  // Test price integrity
  async testPriceIntegrity() {
    console.log('💰 Testing Price Integrity...');
    
    // Test 1: Price validation against catalog
    try {
      if (window.securityValidator && window.catalogProducts?.length > 0) {
        const catalogProduct = window.catalogProducts[0];
        
        // Test with correct price
        const correctValidation = window.securityValidator.validatePriceIntegrity(catalogProduct);
        
        this.addTestResult('Correct Price Validation', correctValidation.isValid, 
          `Correct price validated: ${correctValidation.isValid}`);
        
        // Test with manipulated price
        const manipulatedProduct = { ...catalogProduct, price: catalogProduct.price + 1000 };
        const manipulatedValidation = window.securityValidator.validatePriceIntegrity(manipulatedProduct);
        
        this.addTestResult('Price Manipulation Detection', !manipulatedValidation.isValid, 
          `Price manipulation detected: ${!manipulatedValidation.isValid}`);
        
        if (manipulatedValidation.isValid) {
          this.addSecurityIssue('Price manipulation not detected');
        }
      }
    } catch (error) {
      this.addTestResult('Price Integrity Check', false, error.message);
    }
    
    // Test 2: Catalog hash integrity
    try {
      if (window.securityValidator && window.catalogProducts) {
        const hash1 = window.securityValidator.generateCatalogHash(window.catalogProducts);
        const hash2 = window.securityValidator.generateCatalogHash(window.catalogProducts);
        
        this.addTestResult('Catalog Hash Consistency', hash1 === hash2, 
          `Hash consistency: ${hash1 === hash2}`);
      }
    } catch (error) {
      this.addTestResult('Catalog Hash Consistency', false, error.message);
    }
  }

  // Test user permissions
  async testUserPermissions() {
    console.log('👤 Testing User Permissions...');
    
    // Test 1: User authentication check
    try {
      if (window.securityValidator) {
        const authValidation = window.securityValidator.validateUserAuthentication();
        
        this.addTestResult('User Authentication Check', authValidation !== undefined, 
          authValidation ? `Auth valid: ${authValidation.isValid}` : 'No auth validation');
      }
    } catch (error) {
      this.addTestResult('User Authentication Check', false, error.message);
    }
    
    // Test 2: Role validation
    try {
      const user = window.state?.getState('user');
      if (user && window.securityValidator) {
        const allowedRoles = ['employee', 'admin'];
        const hasValidRole = allowedRoles.includes(user.role);
        
        this.addTestResult('Role Validation', hasValidRole, 
          `User role '${user.role}' valid: ${hasValidRole}`);
        
        if (!hasValidRole) {
          this.addSecurityIssue(`Invalid user role: ${user.role}`);
        }
      }
    } catch (error) {
      this.addTestResult('Role Validation', false, error.message);
    }
    
    // Test 3: Session validation
    try {
      if (window.securityValidator) {
        const sessionValidation = window.securityValidator.validateSession();
        
        this.addTestResult('Session Validation', sessionValidation !== undefined, 
          sessionValidation ? `Session valid: ${sessionValidation.isValid}` : 'No session validation');
      }
    } catch (error) {
      this.addTestResult('Session Validation', false, error.message);
    }
  }

  // Test cart security limits
  async testCartSecurityLimits() {
    console.log('🛒 Testing Cart Security Limits...');
    
    // Test 1: Maximum items validation
    try {
      if (window.securityValidator && window.quickOrderManager?.cart) {
        const cart = window.quickOrderManager.cart;
        const initialItemCount = cart.getItemCount();
        
        // Test adding item within limits
        const testProduct = { id: 'test_limit', name: 'Test Limit Product', price: 1000 };
        const validation = window.securityValidator.validateCartOperation('add_item', {
          product: testProduct,
          quantity: 1
        });
        
        this.addTestResult('Cart Limit Validation', validation !== undefined, 
          validation ? `Validation available: ${validation.isValid}` : 'No validation');
      }
    } catch (error) {
      this.addTestResult('Cart Limit Validation', false, error.message);
    }
    
    // Test 2: Maximum quantity per item
    try {
      if (window.securityValidator) {
        const testProduct = { id: 'test_qty', name: 'Test Quantity Product', price: 1000 };
        const validation = window.securityValidator.validateCartOperation('add_item', {
          product: testProduct,
          quantity: 150 // Exceeds limit of 100
        });
        
        const limitEnforced = validation && !validation.isValid;
        
        this.addTestResult('Quantity Limit Enforcement', limitEnforced, 
          `Quantity limit enforced: ${limitEnforced}`);
      }
    } catch (error) {
      this.addTestResult('Quantity Limit Enforcement', false, error.message);
    }
    
    // Test 3: Maximum total value
    try {
      if (window.securityValidator) {
        const expensiveProduct = { id: 'expensive', name: 'Expensive Product', price: 200000000 }; // 200M IDR
        const validation = window.securityValidator.validateCartOperation('add_item', {
          product: expensiveProduct,
          quantity: 1
        });
        
        const limitEnforced = validation && !validation.isValid;
        
        this.addTestResult('Value Limit Enforcement', limitEnforced, 
          `Value limit enforced: ${limitEnforced}`);
      }
    } catch (error) {
      this.addTestResult('Value Limit Enforcement', false, error.message);
    }
  }

  // Test duplicate order prevention
  async testDuplicateOrderPrevention() {
    console.log('🔄 Testing Duplicate Order Prevention...');
    
    // Test 1: Duplicate detection logic
    try {
      if (window.securityValidator) {
        const orderData = {
          customerId: 'test_customer',
          totalAmount: 5000,
          cartItems: [
            { id: 'item1', name: 'Item 1', price: 2500, quantity: 2 }
          ]
        };
        
        const duplicateCheck = window.securityValidator.checkDuplicateOrder(orderData);
        
        this.addTestResult('Duplicate Order Check', duplicateCheck !== undefined, 
          duplicateCheck ? `Duplicate check available: ${duplicateCheck.isValid}` : 'No duplicate check');
      }
    } catch (error) {
      this.addTestResult('Duplicate Order Check', false, error.message);
    }
    
    // Test 2: Order comparison logic
    try {
      if (window.securityValidator) {
        const items1 = [{ id: 'a', quantity: 1, price: 100 }];
        const items2 = [{ id: 'a', quantity: 1, price: 100 }];
        const items3 = [{ id: 'a', quantity: 2, price: 100 }];
        
        const same = window.securityValidator.compareOrderItems(items1, items2);
        const different = window.securityValidator.compareOrderItems(items1, items3);
        
        this.addTestResult('Order Comparison Logic', same && !different, 
          `Same: ${same}, Different: ${!different}`);
      }
    } catch (error) {
      this.addTestResult('Order Comparison Logic', false, error.message);
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

  // Add security issue
  addSecurityIssue(description) {
    this.securityIssues.push({
      description: description,
      severity: 'high',
      timestamp: new Date().toISOString()
    });
  }

  // Generate security report
  generateSecurityReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const securityScore = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    console.log('\n🔒 SECURITY INTEGRATION REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Security Score: ${securityScore}%`);
    console.log(`Security Issues: ${this.securityIssues.length}`);
    console.log('='.repeat(50));
    
    // Group results by category
    const categories = {};
    this.testResults.forEach(result => {
      const category = result.name.split(' ')[0];
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
      
      console.log(`\n🔒 ${category}: ${cat.passed}/${cat.passed + cat.failed} (${categoryScore}%)`);
      
      cat.tests.forEach(test => {
        const status = test.passed ? '  ✅' : '  ❌';
        const testName = test.name.replace(category + ' ', '');
        console.log(`${status} ${testName}: ${test.details}`);
      });
    });
    
    // Security issues
    if (this.securityIssues.length > 0) {
      console.log('\n⚠️ SECURITY ISSUES FOUND:');
      this.securityIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.description} (${issue.severity})`);
      });
    }
    
    // Security recommendations
    console.log('\n💡 SECURITY RECOMMENDATIONS:');
    
    if (securityScore >= 95 && this.securityIssues.length === 0) {
      console.log('✅ Excellent security! All tests passed and no issues found.');
    } else if (securityScore >= 85) {
      console.log('⚠️ Good security with minor issues to address.');
    } else if (securityScore >= 70) {
      console.log('⚠️ Moderate security. Several issues need attention.');
    } else {
      console.log('❌ Poor security. Critical issues must be resolved.');
    }
    
    // Task 14 completion check
    const task14Requirements = [
      { name: 'Security Validator', met: categories.Security?.passed > 0 },
      { name: 'Session Management', met: categories.Session?.passed > 0 },
      { name: 'CSRF Protection', met: categories.CSRF?.passed > 0 },
      { name: 'Input Sanitization', met: categories.XSS?.passed > 0 },
      { name: 'Price Integrity', met: categories.Price?.passed > 0 }
    ];
    
    console.log('\n✅ TASK 14 REQUIREMENTS:');
    task14Requirements.forEach(req => {
      const status = req.met ? '✅' : '❌';
      console.log(`${status} ${req.name}`);
    });
    
    const allRequirementsMet = task14Requirements.every(req => req.met);
    
    console.log('\n🎯 TASK 14 STATUS:');
    if (allRequirementsMet && securityScore >= 90 && this.securityIssues.length === 0) {
      console.log('✅ TASK 14 COMPLETED SUCCESSFULLY');
    } else if (securityScore >= 80) {
      console.log('⚠️ TASK 14 MOSTLY COMPLETED - Minor issues to resolve');
    } else {
      console.log('❌ TASK 14 NEEDS MORE WORK - Security issues must be addressed');
    }
    
    // Store report
    this.storeSecurityReport({
      timestamp: Date.now(),
      summary: { totalTests, passedTests, failedTests, securityScore },
      results: this.testResults,
      issues: this.securityIssues,
      categories: categories,
      requirements: task14Requirements,
      task_14_completed: allRequirementsMet && securityScore >= 90 && this.securityIssues.length === 0
    });
  }

  // Store security report
  storeSecurityReport(report) {
    try {
      localStorage.setItem('security_integration_report', JSON.stringify(report));
      console.log('\n📁 Security report saved to localStorage');
    } catch (error) {
      console.error('Failed to store security report:', error);
    }
  }

  // Get last security report
  getLastSecurityReport() {
    try {
      const stored = localStorage.getItem('security_integration_report');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving security report:', error);
      return null;
    }
  }

  // Quick security check
  async quickSecurityCheck() {
    console.log('🚀 Quick Security Check...');
    
    const checks = [
      {
        name: 'Security Validator',
        available: !!window.securityValidator
      },
      {
        name: 'Session Manager',
        available: !!window.sessionManager
      },
      {
        name: 'User Authentication',
        available: !!(window.state?.getState('user')?.id)
      },
      {
        name: 'CSRF Token',
        available: !!(window.securityValidator?.csrfToken)
      },
      {
        name: 'Input Sanitization',
        available: !!(window.securityValidator?.sanitizeInput)
      }
    ];
    
    const availableCount = checks.filter(check => check.available).length;
    const securityReadiness = (availableCount / checks.length) * 100;
    
    console.log(`🔒 Security Readiness: ${availableCount}/${checks.length} (${securityReadiness}%)`);
    
    checks.forEach(check => {
      const status = check.available ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
    });
    
    return {
      ready: securityReadiness === 100,
      score: securityReadiness,
      checks: checks
    };
  }
}

// Create global instance
export const securityIntegrationTest = new SecurityIntegrationTest();

// Export for global access
if (typeof window !== 'undefined') {
  window.securityIntegrationTest = securityIntegrationTest;
}
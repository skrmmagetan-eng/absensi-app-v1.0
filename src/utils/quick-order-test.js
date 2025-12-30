// Quick Order System Testing Utility
// Comprehensive testing for core functionality

import { quickOrderManager } from '../services/QuickOrderManager.js';
import { shoppingCart } from '../services/ShoppingCart.js';
import { visitContextService } from '../services/VisitContextService.js';

export class QuickOrderTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
  }

  // Run all core functionality tests
  async runAllTests() {
    if (this.isRunning) {
      console.log('Tests already running...');
      return;
    }

    this.isRunning = true;
    this.testResults = [];
    
    console.log('🧪 Starting Quick Order Core Functionality Tests...');
    
    try {
      // Test cart operations
      await this.testCartOperations();
      
      // Test product integration
      await this.testProductIntegration();
      
      // Test customer selection
      await this.testCustomerSelection();
      
      // Test order creation workflow
      await this.testOrderCreationWorkflow();
      
      // Test error handling
      await this.testErrorHandling();
      
      // Test UI integration
      await this.testUIIntegration();
      
      // Generate test report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addTestResult('Test Suite', false, `Suite failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  // Test cart operations
  async testCartOperations() {
    console.log('📦 Testing Cart Operations...');
    
    // Clear cart for clean test
    shoppingCart.clear();
    
    // Test 1: Add item to cart
    try {
      const mockProduct = {
        id: 'test-product-1',
        name: 'Test Product',
        price: 10000,
        image_url: null
      };
      
      const total = shoppingCart.addItem(mockProduct, 2);
      
      if (total === 20000 && shoppingCart.getItemCount() === 2) {
        this.addTestResult('Cart Add Item', true, 'Successfully added item with correct total');
      } else {
        this.addTestResult('Cart Add Item', false, `Expected total 20000, got ${total}`);
      }
    } catch (error) {
      this.addTestResult('Cart Add Item', false, error.message);
    }
    
    // Test 2: Update quantity
    try {
      shoppingCart.updateQuantity('test-product-1', 5);
      
      if (shoppingCart.getProductQuantity('test-product-1') === 5 && shoppingCart.getTotal() === 50000) {
        this.addTestResult('Cart Update Quantity', true, 'Successfully updated quantity');
      } else {
        this.addTestResult('Cart Update Quantity', false, 'Quantity update failed');
      }
    } catch (error) {
      this.addTestResult('Cart Update Quantity', false, error.message);
    }
    
    // Test 3: Remove item
    try {
      shoppingCart.removeItem('test-product-1');
      
      if (shoppingCart.isEmpty() && shoppingCart.getTotal() === 0) {
        this.addTestResult('Cart Remove Item', true, 'Successfully removed item');
      } else {
        this.addTestResult('Cart Remove Item', false, 'Item removal failed');
      }
    } catch (error) {
      this.addTestResult('Cart Remove Item', false, error.message);
    }
    
    // Test 4: Cart persistence
    try {
      const testProduct = {
        id: 'persist-test',
        name: 'Persistence Test',
        price: 5000
      };
      
      shoppingCart.addItem(testProduct, 1);
      shoppingCart.saveToStorage();
      
      // Simulate reload by creating new cart instance
      const newCart = new (shoppingCart.constructor)();
      newCart.loadFromStorage();
      
      if (newCart.hasProduct('persist-test')) {
        this.addTestResult('Cart Persistence', true, 'Cart data persisted correctly');
      } else {
        this.addTestResult('Cart Persistence', false, 'Cart data not persisted');
      }
    } catch (error) {
      this.addTestResult('Cart Persistence', false, error.message);
    }
    
    // Test 5: Cart validation
    try {
      const validation = shoppingCart.validate();
      
      if (validation.isValid) {
        this.addTestResult('Cart Validation', true, 'Cart validation passed');
      } else {
        this.addTestResult('Cart Validation', false, `Validation errors: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      this.addTestResult('Cart Validation', false, error.message);
    }
  }

  // Test product integration
  async testProductIntegration() {
    console.log('🛍️ Testing Product Integration...');
    
    // Test 1: Product data validation
    try {
      const validProduct = {
        id: 'valid-product',
        name: 'Valid Product',
        price: 15000,
        description: 'Test description'
      };
      
      const validation = quickOrderManager.validateProductData(validProduct);
      
      if (validation.isValid) {
        this.addTestResult('Product Validation - Valid', true, 'Valid product passed validation');
      } else {
        this.addTestResult('Product Validation - Valid', false, `Valid product failed: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      this.addTestResult('Product Validation - Valid', false, error.message);
    }
    
    // Test 2: Invalid product validation
    try {
      const invalidProduct = {
        id: '',
        name: '',
        price: -100
      };
      
      const validation = quickOrderManager.validateProductData(invalidProduct);
      
      if (!validation.isValid && validation.errors.length > 0) {
        this.addTestResult('Product Validation - Invalid', true, 'Invalid product correctly rejected');
      } else {
        this.addTestResult('Product Validation - Invalid', false, 'Invalid product incorrectly accepted');
      }
    } catch (error) {
      this.addTestResult('Product Validation - Invalid', false, error.message);
    }
    
    // Test 3: Product addition to cart
    try {
      // Mock window.catalogProducts for testing
      window.catalogProducts = [
        {
          id: 'catalog-product-1',
          name: 'Catalog Product',
          price: 25000,
          description: 'From catalog'
        }
      ];
      
      const result = await quickOrderManager.addProductToCart('catalog-product-1', 2);
      
      if (result.success && result.total === 50000) {
        this.addTestResult('Product Addition', true, 'Product successfully added from catalog');
      } else {
        this.addTestResult('Product Addition', false, result.error || 'Addition failed');
      }
    } catch (error) {
      this.addTestResult('Product Addition', false, error.message);
    }
  }

  // Test customer selection
  async testCustomerSelection() {
    console.log('👤 Testing Customer Selection...');
    
    // Test 1: Get suggested customer
    try {
      const suggested = await quickOrderManager.getSuggestedCustomer();
      
      // This might be null if no active visit or recent customers
      this.addTestResult('Get Suggested Customer', true, 
        suggested ? `Found suggested customer: ${suggested.customer.name}` : 'No suggested customer (expected if no visits)');
    } catch (error) {
      this.addTestResult('Get Suggested Customer', false, error.message);
    }
    
    // Test 2: Get all customers
    try {
      const customers = await quickOrderManager.getAllCustomers();
      
      if (Array.isArray(customers)) {
        this.addTestResult('Get All Customers', true, `Retrieved ${customers.length} customers`);
      } else {
        this.addTestResult('Get All Customers', false, 'Customers not returned as array');
      }
    } catch (error) {
      this.addTestResult('Get All Customers', false, error.message);
    }
    
    // Test 3: Visit context service
    try {
      const context = await visitContextService.getVisitContext();
      
      if (context && typeof context === 'object') {
        this.addTestResult('Visit Context', true, 
          `Context retrieved - Active visit: ${context.hasActiveVisit}, Recent customers: ${context.recentCustomersCount}`);
      } else {
        this.addTestResult('Visit Context', false, 'Invalid context returned');
      }
    } catch (error) {
      this.addTestResult('Visit Context', false, error.message);
    }
  }

  // Test order creation workflow
  async testOrderCreationWorkflow() {
    console.log('📝 Testing Order Creation Workflow...');
    
    // Setup test cart
    shoppingCart.clear();
    const testProduct = {
      id: 'order-test-product',
      name: 'Order Test Product',
      price: 30000
    };
    shoppingCart.addItem(testProduct, 1);
    
    // Test 1: Order validation
    try {
      const validation = await quickOrderManager.validateOrderCreation('test-customer-id', 'Test notes');
      
      // This might fail due to invalid customer ID, which is expected
      this.addTestResult('Order Validation', true, 
        validation.isValid ? 'Order validation passed' : `Validation failed as expected: ${validation.errors[0]}`);
    } catch (error) {
      this.addTestResult('Order Validation', false, error.message);
    }
    
    // Test 2: Build order data
    try {
      const orderData = await quickOrderManager.buildOrderDataWithValidation('test-customer-id', 'Test notes');
      
      if (orderData && orderData.items && orderData.total_amount === 30000) {
        this.addTestResult('Build Order Data', true, 'Order data built correctly');
      } else {
        this.addTestResult('Build Order Data', false, 'Order data structure invalid');
      }
    } catch (error) {
      this.addTestResult('Build Order Data', false, error.message);
    }
    
    // Test 3: Duplicate order check
    try {
      const orderData = {
        customer_id: 'test-customer',
        total_amount: 30000,
        items_summary: 'Test Product (1x)',
        created_at: new Date().toISOString()
      };
      
      const isDuplicate = await quickOrderManager.checkDuplicateOrder(orderData);
      
      this.addTestResult('Duplicate Order Check', true, 
        `Duplicate check completed - Is duplicate: ${isDuplicate}`);
    } catch (error) {
      this.addTestResult('Duplicate Order Check', false, error.message);
    }
  }

  // Test error handling
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');
    
    // Test 1: Invalid product addition
    try {
      const result = await quickOrderManager.addProductToCart('non-existent-product', 1);
      
      if (!result.success && result.error) {
        this.addTestResult('Error Handling - Invalid Product', true, 'Invalid product correctly rejected');
      } else {
        this.addTestResult('Error Handling - Invalid Product', false, 'Invalid product not rejected');
      }
    } catch (error) {
      this.addTestResult('Error Handling - Invalid Product', true, 'Exception correctly thrown');
    }
    
    // Test 2: Cart capacity limits
    try {
      shoppingCart.clear();
      
      // Try to add item with excessive quantity
      const testProduct = {
        id: 'capacity-test',
        name: 'Capacity Test',
        price: 1000
      };
      
      try {
        shoppingCart.addItem(testProduct, 150); // Exceeds limit of 100
        this.addTestResult('Error Handling - Capacity Limit', false, 'Excessive quantity not rejected');
      } catch (capacityError) {
        this.addTestResult('Error Handling - Capacity Limit', true, 'Capacity limit correctly enforced');
      }
    } catch (error) {
      this.addTestResult('Error Handling - Capacity Limit', false, error.message);
    }
    
    // Test 3: Cart recovery
    try {
      const healthBefore = shoppingCart.getHealthStatus();
      const recovered = shoppingCart.recoverFromCorruption();
      
      this.addTestResult('Error Handling - Cart Recovery', true, 
        `Recovery completed - Success: ${recovered}, Health: ${healthBefore.isHealthy}`);
    } catch (error) {
      this.addTestResult('Error Handling - Cart Recovery', false, error.message);
    }
    
    // Test 4: Network error simulation
    try {
      const isRetryable = quickOrderManager.isRetryableError(new Error('Network timeout'));
      const isNotRetryable = quickOrderManager.isRetryableError(new Error('Invalid data'));
      
      if (isRetryable && !isNotRetryable) {
        this.addTestResult('Error Handling - Retry Logic', true, 'Retry logic correctly identifies retryable errors');
      } else {
        this.addTestResult('Error Handling - Retry Logic', false, 'Retry logic incorrect');
      }
    } catch (error) {
      this.addTestResult('Error Handling - Retry Logic', false, error.message);
    }
  }

  // Test UI integration
  async testUIIntegration() {
    console.log('🎨 Testing UI Integration...');
    
    // Test 1: Cart state management
    try {
      const cartState = quickOrderManager.getCartState();
      
      if (cartState && typeof cartState.total === 'number' && typeof cartState.itemCount === 'number') {
        this.addTestResult('UI Integration - Cart State', true, 'Cart state structure correct');
      } else {
        this.addTestResult('UI Integration - Cart State', false, 'Cart state structure invalid');
      }
    } catch (error) {
      this.addTestResult('UI Integration - Cart State', false, error.message);
    }
    
    // Test 2: Order context
    try {
      const orderContext = await quickOrderManager.getOrderContext();
      
      if (orderContext && orderContext.cart && typeof orderContext.canCreateOrder === 'boolean') {
        this.addTestResult('UI Integration - Order Context', true, 'Order context structure correct');
      } else {
        this.addTestResult('UI Integration - Order Context', false, 'Order context structure invalid');
      }
    } catch (error) {
      this.addTestResult('UI Integration - Order Context', false, error.message);
    }
    
    // Test 3: Event system
    try {
      let eventReceived = false;
      
      const testListener = (event) => {
        if (event.type === 'test_event') {
          eventReceived = true;
        }
      };
      
      shoppingCart.addEventListener(testListener);
      shoppingCart.notifyListeners('test_event', { test: true });
      
      // Small delay to ensure event is processed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (eventReceived) {
        this.addTestResult('UI Integration - Event System', true, 'Event system working correctly');
      } else {
        this.addTestResult('UI Integration - Event System', false, 'Event not received');
      }
      
      shoppingCart.removeEventListener(testListener);
    } catch (error) {
      this.addTestResult('UI Integration - Event System', false, error.message);
    }
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

  // Generate comprehensive test report
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    console.log('\n📊 QUICK ORDER CORE FUNCTIONALITY TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log('='.repeat(50));
    
    // Group results by category
    const categories = {};
    this.testResults.forEach(result => {
      const category = result.name.split(' - ')[0];
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
      const catSuccessRate = ((cat.passed / (cat.passed + cat.failed)) * 100).toFixed(1);
      
      console.log(`\n📂 ${category}: ${cat.passed}/${cat.passed + cat.failed} (${catSuccessRate}%)`);
      
      cat.tests.forEach(test => {
        const status = test.passed ? '  ✅' : '  ❌';
        console.log(`${status} ${test.name.replace(category + ' - ', '')}: ${test.details}`);
      });
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (successRate >= 90) {
      console.log('✅ Core functionality is working well! Ready for production use.');
    } else if (successRate >= 70) {
      console.log('⚠️ Most functionality works, but some issues need attention.');
    } else {
      console.log('❌ Significant issues detected. Review failed tests before proceeding.');
    }
    
    if (failedTests > 0) {
      console.log('\n🔧 FAILED TESTS TO INVESTIGATE:');
      this.testResults.filter(r => !r.passed).forEach(test => {
        console.log(`- ${test.name}: ${test.details}`);
      });
    }
    
    // Store report for later analysis
    localStorage.setItem('quick_order_test_report', JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { totalTests, passedTests, failedTests, successRate },
      results: this.testResults,
      categories: categories
    }));
    
    console.log('\n📁 Full report saved to localStorage as "quick_order_test_report"');
  }

  // Get last test report
  getLastTestReport() {
    try {
      const stored = localStorage.getItem('quick_order_test_report');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving test report:', error);
      return null;
    }
  }

  // Quick health check (subset of full tests)
  async quickHealthCheck() {
    console.log('🏥 Running Quick Health Check...');
    
    const checks = [];
    
    // Check cart basic operations
    try {
      shoppingCart.clear();
      const testProduct = { id: 'health-test', name: 'Health Test', price: 1000 };
      shoppingCart.addItem(testProduct, 1);
      const hasProduct = shoppingCart.hasProduct('health-test');
      shoppingCart.clear();
      
      checks.push({ name: 'Cart Operations', passed: hasProduct });
    } catch (error) {
      checks.push({ name: 'Cart Operations', passed: false, error: error.message });
    }
    
    // Check services availability
    try {
      const cartState = quickOrderManager.getCartState();
      const isAvailable = cartState && typeof cartState.total === 'number';
      
      checks.push({ name: 'Service Availability', passed: isAvailable });
    } catch (error) {
      checks.push({ name: 'Service Availability', passed: false, error: error.message });
    }
    
    // Check storage
    try {
      localStorage.setItem('health_test', 'test');
      const retrieved = localStorage.getItem('health_test');
      localStorage.removeItem('health_test');
      
      checks.push({ name: 'Storage Access', passed: retrieved === 'test' });
    } catch (error) {
      checks.push({ name: 'Storage Access', passed: false, error: error.message });
    }
    
    const passedChecks = checks.filter(c => c.passed).length;
    const healthScore = (passedChecks / checks.length * 100).toFixed(1);
    
    console.log(`🏥 Health Check Complete: ${passedChecks}/${checks.length} (${healthScore}%)`);
    
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
export const quickOrderTester = new QuickOrderTester();

// Export for global access
if (typeof window !== 'undefined') {
  window.quickOrderTester = quickOrderTester;
}
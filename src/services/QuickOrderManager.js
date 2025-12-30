// Quick Order Manager - Main orchestrator for quick order workflow
// Coordinates between cart, visit context, and order creation

import { shoppingCart } from './ShoppingCart.js';
import { visitContextService } from './VisitContextService.js';
import { analyticsTracker } from '../utils/analytics-tracker.js';
import { securityValidator } from '../utils/security-validator.js';
import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { showNotification, showLoading, hideLoading } from '../utils/helpers.js';

export class QuickOrderManager {
  constructor() {
    this.cart = shoppingCart;
    this.visitContext = visitContextService;
    this.orderService = db;
    this.isProcessingOrder = false;
    
    // Setup cart event listeners
    this.setupCartListeners();
  }

  // Setup event listeners for cart changes
  setupCartListeners() {
    this.cart.addEventListener((event) => {
      this.handleCartEvent(event);
    });
  }

  // Handle cart events for UI updates and analytics
  handleCartEvent(event) {
    try {
      // Update UI indicators
      this.updateCartIndicators(event.cart);
      
      // Track analytics
      this.trackCartEvent(event);
      
      // Trigger custom events for UI components
      this.dispatchCartEvent(event);
    } catch (error) {
      console.error('Error handling cart event:', error);
    }
  }

  // Add product to cart from catalog
  async addProductToCart(productId, quantity = 1, retryCount = 0) {
    const maxRetries = 2;
    const startTime = performance.now();
    
    // Security validation
    const securityCheck = securityValidator.validateCartOperation('add_item', {
      product: { id: productId },
      quantity: quantity
    });
    
    if (!securityCheck.isValid) {
      const errorMessage = securityCheck.errors.join(', ');
      showNotification(`🔒 ${errorMessage}`, 'danger');
      
      analyticsTracker.trackError(new Error(errorMessage), {
        operation: 'add_to_cart_security_check',
        product_id: productId,
        quantity: quantity,
        security_level: securityCheck.securityLevel
      });
      
      return {
        success: false,
        error: errorMessage,
        securityBlocked: true
      };
    }
    
    // Track funnel step
    analyticsTracker.trackFunnelStep('quick_order', 'add_to_cart_attempt', {
      product_id: productId,
      quantity: quantity,
      retry_count: retryCount
    });
    
    try {
      // Validate input parameters
      if (!productId) {
        throw new Error('Product ID is required');
      }
      
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }

      // Get product details with retry logic
      const product = await this.getProductDetailsWithRetry(productId, retryCount);
      if (!product) {
        throw new Error('Product not found or unavailable');
      }

      // Additional security validation with full product data
      const fullSecurityCheck = securityValidator.validateCartOperation('add_item', {
        product: product,
        quantity: quantity
      });
      
      if (!fullSecurityCheck.isValid) {
        throw new Error(`Security validation failed: ${fullSecurityCheck.errors.join(', ')}`);
      }

      // Validate product data
      const validation = this.validateProductData(product);
      if (!validation.isValid) {
        throw new Error(`Invalid product data: ${validation.errors.join(', ')}`);
      }

      // Check cart capacity (prevent excessive items)
      if (this.cart.getItemCount() + quantity > 50) {
        throw new Error('Cart capacity exceeded (maximum 50 items)');
      }

      // Add to cart with error recovery
      const total = this.cart.addItem(product, quantity);
      
      // Verify cart state after addition
      if (!this.cart.hasProduct(productId)) {
        throw new Error('Failed to add product to cart - cart state inconsistent');
      }
      
      // Track successful addition
      const endTime = performance.now();
      analyticsTracker.trackPerformance('add_to_cart', startTime, endTime, {
        product_id: productId,
        quantity: quantity,
        retry_count: retryCount,
        cart_total: total,
        cart_items: this.cart.getItemCount()
      });
      
      analyticsTracker.trackCartEvent('item_added', {
        sessionId: this.cart.sessionId,
        itemCount: this.cart.getItemCount(),
        total: total,
        items: this.cart.getItems(),
        product_added: {
          id: productId,
          name: product.name,
          price: product.price,
          quantity: quantity
        }
      });
      
      analyticsTracker.trackFunnelStep('quick_order', 'add_to_cart_success', {
        product_id: productId,
        quantity: quantity,
        cart_total: total,
        performance: endTime - startTime
      });
      
      // Show success feedback
      showNotification(`${product.name} ditambahkan ke keranjang`, 'success');
      
      return {
        success: true,
        total: total,
        itemCount: this.cart.getItemCount(),
        product: product,
        quantity: quantity
      };
    } catch (error) {
      console.error('Error adding product to cart:', error);
      
      const endTime = performance.now();
      
      // Track error for analytics
      analyticsTracker.trackError(error, {
        operation: 'add_to_cart',
        product_id: productId,
        quantity: quantity,
        retry_count: retryCount,
        performance: endTime - startTime
      });
      
      analyticsTracker.trackFunnelStep('quick_order', 'add_to_cart_failed', {
        product_id: productId,
        quantity: quantity,
        error: error.message,
        retry_count: retryCount
      });
      
      // Retry logic for network errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying add to cart (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.addProductToCart(productId, quantity, retryCount + 1);
      }
      
      // Show user-friendly error message
      const userMessage = this.getUserFriendlyErrorMessage(error);
      showNotification(userMessage, 'danger');
      
      return {
        success: false,
        error: error.message,
        userMessage: userMessage,
        retryable: this.isRetryableError(error)
      };
    }
  }

  // Get product details from catalog with retry logic
  async getProductDetailsWithRetry(productId, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      return await this.getProductDetails(productId);
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying product fetch (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(500 * (retryCount + 1));
        return this.getProductDetailsWithRetry(productId, retryCount + 1);
      }
      throw error;
    }
  }

  // Get product details from catalog
  async getProductDetails(productId) {
    try {
      // First check if product is cached in window.catalogProducts
      if (window.catalogProducts) {
        const cachedProduct = window.catalogProducts.find(p => p.id === productId);
        if (cachedProduct) {
          return cachedProduct;
        }
      }

      // Fetch from database if not cached
      const { data: products, error } = await this.orderService.getProducts();
      if (error) throw error;

      const product = products?.find(p => p.id === productId);
      return product || null;
    } catch (error) {
      console.error('Error fetching product details:', error);
      
      // Try to recover from cache if network fails
      if (window.catalogProducts) {
        const cachedProduct = window.catalogProducts.find(p => p.id === productId);
        if (cachedProduct) {
          console.log('Recovered product from cache after network error');
          return cachedProduct;
        }
      }
      
      throw new Error(`Failed to fetch product details: ${error.message}`);
    }
  }

  // Validate product data before adding to cart
  validateProductData(product) {
    const errors = [];
    
    if (!product) {
      errors.push('Product data is null or undefined');
      return { isValid: false, errors };
    }
    
    if (!product.id) {
      errors.push('Product ID is missing');
    }
    
    if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
      errors.push('Product name is invalid or empty');
    }
    
    if (typeof product.price !== 'number' || product.price < 0 || !isFinite(product.price)) {
      errors.push('Product price is invalid');
    }
    
    // Optional fields validation
    if (product.description && typeof product.description !== 'string') {
      errors.push('Product description must be a string');
    }
    
    if (product.image_url && typeof product.image_url !== 'string') {
      errors.push('Product image URL must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Get suggested customer for order
  async getSuggestedCustomer() {
    try {
      return await this.visitContext.getSuggestedCustomer();
    } catch (error) {
      console.error('Error getting suggested customer:', error);
      return null;
    }
  }

  // Get all available customers for manual selection
  async getAllCustomers() {
    try {
      return await this.visitContext.getAllCustomers();
    } catch (error) {
      console.error('Error getting all customers:', error);
      return [];
    }
  }

  // Complete order with current cart contents
  async completeOrder(customerId, notes = '', retryCount = 0) {
    const maxRetries = 2;
    const startTime = performance.now();
    
    if (this.isProcessingOrder) {
      showNotification('Order sedang diproses, mohon tunggu...', 'warning');
      return { success: false, error: 'Order already in progress' };
    }

    // Security validation for order creation
    const securityCheck = securityValidator.validateCartOperation('create_order', {
      customerId: customerId,
      notes: notes,
      cartItems: this.cart.getItems(),
      totalAmount: this.cart.getTotal()
    });
    
    if (!securityCheck.isValid) {
      const errorMessage = securityCheck.errors.join(', ');
      showNotification(`🔒 ${errorMessage}`, 'danger');
      
      analyticsTracker.trackError(new Error(errorMessage), {
        operation: 'create_order_security_check',
        customer_id: customerId,
        security_level: securityCheck.securityLevel
      });
      
      return {
        success: false,
        error: errorMessage,
        securityBlocked: true
      };
    }

    // Track order creation attempt
    analyticsTracker.trackFunnelStep('quick_order', 'order_creation_attempt', {
      customer_id: customerId,
      cart_items: this.cart.getItemCount(),
      cart_total: this.cart.getTotal(),
      retry_count: retryCount
    });

    try {
      this.isProcessingOrder = true;
      showLoading('Membuat order...');

      // Comprehensive validation
      const validationResult = await this.validateOrderCreation(customerId, notes);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Get customer details with retry
      const customer = await this.getCustomerWithRetry(customerId, retryCount);
      if (!customer) {
        throw new Error('Data pelanggan tidak ditemukan atau tidak dapat diakses');
      }

      // Build order data with validation
      const orderData = await this.buildOrderDataWithValidation(customerId, notes);
      
      // Duplicate order prevention
      const isDuplicate = await this.checkDuplicateOrder(orderData);
      if (isDuplicate) {
        throw new Error('Order serupa baru saja dibuat. Tunggu beberapa menit sebelum membuat order yang sama.');
      }
      
      // Create order with retry logic
      const { data: order, error } = await this.createOrderWithRetry(orderData, retryCount);
      if (error) throw error;

      // Verify order creation
      if (!order || !order.id) {
        throw new Error('Order berhasil dibuat tetapi data tidak lengkap');
      }

      const endTime = performance.now();
      const orderCreationTime = endTime - startTime;

      // Track successful order creation
      analyticsTracker.trackPerformance('order_creation', startTime, endTime, {
        customer_id: customerId,
        order_id: order.id,
        items_count: orderData.items.length,
        total_amount: orderData.total_amount,
        retry_count: retryCount
      });

      analyticsTracker.trackOrderEvent('created', {
        id: order.id,
        customer_id: customerId,
        total_amount: orderData.total_amount,
        items: orderData.items,
        order_source: orderData.order_source,
        creation_method: orderData.creation_method,
        creation_time: orderCreationTime,
        cart_session_id: orderData.cart_session_id
      });

      analyticsTracker.trackFunnelStep('quick_order', 'order_creation_success', {
        order_id: order.id,
        customer_id: customerId,
        total_amount: orderData.total_amount,
        creation_time: orderCreationTime,
        items_count: orderData.items.length
      });

      // Track cart abandonment prevention (successful conversion)
      analyticsTracker.trackEvent('cart_converted', {
        cart_session_id: this.cart.sessionId,
        order_id: order.id,
        conversion_time: orderCreationTime,
        cart_value: this.cart.getTotal(),
        items_count: this.cart.getItemCount()
      });

      // Clear cart on success
      this.cart.clear();
      
      hideLoading();
      showNotification('Order berhasil dibuat! 🎉', 'success');

      return {
        success: true,
        order: order,
        customer: customer,
        orderData: orderData
      };

    } catch (error) {
      hideLoading();
      console.error('Error completing order:', error);
      
      const endTime = performance.now();
      
      // Track order creation failure
      analyticsTracker.trackError(error, {
        operation: 'order_creation',
        customer_id: customerId,
        cart_items: this.cart.getItemCount(),
        cart_total: this.cart.getTotal(),
        retry_count: retryCount,
        performance: endTime - startTime
      });
      
      analyticsTracker.trackFunnelStep('quick_order', 'order_creation_failed', {
        customer_id: customerId,
        error: error.message,
        retry_count: retryCount,
        cart_items: this.cart.getItemCount()
      });
      
      // Track cart abandonment
      analyticsTracker.trackEvent('cart_abandoned', {
        cart_session_id: this.cart.sessionId,
        abandonment_reason: 'order_creation_failed',
        cart_value: this.cart.getTotal(),
        items_count: this.cart.getItemCount(),
        error: error.message
      });
      
      // Retry logic for retryable errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying order creation (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(2000 * (retryCount + 1)); // Longer delay for order creation
        return this.completeOrder(customerId, notes, retryCount + 1);
      }
      
      // Show user-friendly error message
      const userMessage = this.getUserFriendlyErrorMessage(error);
      showNotification(userMessage, 'danger');
      
      return {
        success: false,
        error: error.message,
        userMessage: userMessage,
        retryable: this.isRetryableError(error)
      };
    } finally {
      this.isProcessingOrder = false;
    }
  }

  // Build order data from cart contents
  async buildOrderData(customerId, notes) {
    const user = state.getState('user');
    const cartItems = this.cart.getItems();
    const cartSummary = this.cart.getSummary();
    const visitContext = await this.visitContext.getVisitContext();

    // Convert cart items to order items format
    const items = cartItems.map(item => ({
      name: item.name,
      qty: item.quantity,
      price: item.price
    }));

    // Generate items summary
    const itemsSummary = items.map(item => 
      `${item.name} (${item.qty}x)`
    ).join(', ');

    return {
      employee_id: user.id,
      customer_id: customerId,
      items: items,
      items_summary: itemsSummary,
      total_amount: this.cart.getTotal(),
      status: 'pending',
      notes: notes || null,
      
      // Quick order specific fields
      order_source: 'quick_order',
      cart_session_id: cartSummary.sessionId,
      visit_context_id: visitContext.hasActiveVisit ? 'active' : null,
      creation_method: 'catalog_cart',
      
      created_at: new Date().toISOString()
    };
  }

  // Update cart indicators in UI
  updateCartIndicators(cartState) {
    try {
      // Update floating cart if exists
      const floatingCart = document.querySelector('.floating-cart');
      if (floatingCart) {
        this.updateFloatingCart(floatingCart, cartState);
      }

      // Update product card indicators
      this.updateProductCardIndicators(cartState);

      // Update navigation badge
      this.updateNavigationBadge(cartState);
    } catch (error) {
      console.error('Error updating cart indicators:', error);
    }
  }

  // Update floating cart summary
  updateFloatingCart(floatingCart, cartState) {
    const isVisible = !cartState.isEmpty;
    floatingCart.classList.toggle('visible', isVisible);
    
    if (isVisible) {
      const countElement = floatingCart.querySelector('.cart-count');
      const totalElement = floatingCart.querySelector('.cart-total');
      
      if (countElement) {
        countElement.textContent = `${cartState.itemCount} item${cartState.itemCount > 1 ? 's' : ''}`;
      }
      
      if (totalElement) {
        totalElement.textContent = this.formatCurrency(cartState.total);
      }
    }
  }

  // Update product card indicators
  updateProductCardIndicators(cartState) {
    cartState.items.forEach(item => {
      const productCard = document.querySelector(`[data-product-id="${item.id}"]`);
      if (productCard) {
        const indicator = productCard.querySelector('.cart-indicator');
        const badge = productCard.querySelector('.cart-badge');
        
        if (indicator) {
          indicator.classList.add('visible');
        }
        
        if (badge) {
          badge.textContent = item.quantity;
        }
      }
    });

    // Hide indicators for products not in cart
    document.querySelectorAll('.cart-indicator.visible').forEach(indicator => {
      const productCard = indicator.closest('[data-product-id]');
      if (productCard) {
        const productId = productCard.dataset.productId;
        const inCart = cartState.items.some(item => item.id === productId);
        
        if (!inCart) {
          indicator.classList.remove('visible');
        }
      }
    });
  }

  // Update navigation badge
  updateNavigationBadge(cartState) {
    const badge = document.querySelector('.cart-nav-badge');
    if (badge) {
      badge.textContent = cartState.itemCount;
      badge.classList.toggle('visible', cartState.itemCount > 0);
    }
  }

  // Dispatch custom cart event for UI components
  dispatchCartEvent(cartEvent) {
    const customEvent = new CustomEvent('quickOrderCartUpdate', {
      detail: cartEvent,
      bubbles: true
    });
    
    document.dispatchEvent(customEvent);
  }

  // Track cart events for analytics
  trackCartEvent(event) {
    try {
      const analyticsData = {
        event_type: 'cart_' + event.type,
        session_id: this.cart.sessionId,
        timestamp: event.timestamp,
        cart_state: {
          item_count: event.cart.itemCount,
          total_amount: event.cart.total,
          unique_products: event.cart.items.length
        },
        event_data: event.data
      };

      // Store in localStorage for later sync
      this.storeAnalyticsEvent(analyticsData);
    } catch (error) {
      console.error('Error tracking cart event:', error);
    }
  }

  // Track order completion for analytics
  trackOrderCompletion(order, orderData) {
    try {
      const analyticsData = {
        event_type: 'order_completed',
        session_id: this.cart.sessionId,
        order_id: order.id,
        timestamp: new Date().toISOString(),
        order_data: {
          total_amount: orderData.total_amount,
          item_count: orderData.items.length,
          creation_method: orderData.creation_method,
          order_source: orderData.order_source,
          has_visit_context: !!orderData.visit_context_id
        }
      };

      this.storeAnalyticsEvent(analyticsData);
    } catch (error) {
      console.error('Error tracking order completion:', error);
    }
  }

  // Store analytics event for later sync
  storeAnalyticsEvent(eventData) {
    try {
      const stored = localStorage.getItem('quick_order_analytics') || '[]';
      const events = JSON.parse(stored);
      
      events.push(eventData);
      
      // Keep only last 100 events to prevent storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('quick_order_analytics', JSON.stringify(events));
    } catch (error) {
      console.error('Error storing analytics event:', error);
    }
  }

  // Format currency for display
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Get cart state for external components
  getCartState() {
    return {
      items: this.cart.getItems(),
      total: this.cart.getTotal(),
      itemCount: this.cart.getItemCount(),
      isEmpty: this.cart.isEmpty(),
      summary: this.cart.getSummary()
    };
  }

  // Check if product is in cart
  isProductInCart(productId) {
    return this.cart.hasProduct(productId);
  }

  // Get product quantity in cart
  getProductQuantityInCart(productId) {
    return this.cart.getProductQuantity(productId);
  }

  // Clear cart
  clearCart() {
    this.cart.clear();
    showNotification('Keranjang dikosongkan', 'info');
  }

  // Get order creation context
  async getOrderContext() {
    try {
      const suggestedCustomer = await this.getSuggestedCustomer();
      const visitContext = await this.visitContext.getVisitContext();
      const cartState = this.getCartState();

      return {
        cart: cartState,
        suggestedCustomer: suggestedCustomer,
        visitContext: visitContext,
        canCreateOrder: !cartState.isEmpty && !this.isProcessingOrder
      };
    } catch (error) {
      console.error('Error getting order context:', error);
      return {
        cart: this.getCartState(),
        suggestedCustomer: null,
        visitContext: null,
        canCreateOrder: false
      };
    }
  }
}

// Create singleton instance
export const quickOrderManager = new QuickOrderManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.quickOrderManager = quickOrderManager;
}

  // Comprehensive order validation
  async validateOrderCreation(customerId, notes) {
    const errors = [];

    // Validate cart
    const cartValidation = this.cart.validate();
    if (!cartValidation.isValid) {
      errors.push(...cartValidation.errors.map(e => `Cart: ${e}`));
    }

    // Validate customer ID
    if (!customerId || typeof customerId !== 'string') {
      errors.push('Customer ID is required and must be valid');
    }

    // Validate notes length
    if (notes && typeof notes === 'string' && notes.length > 1000) {
      errors.push('Notes cannot exceed 1000 characters');
    }

    // Check user session
    const user = state.getState('user');
    if (!user?.id) {
      errors.push('User session is invalid - please login again');
    }

    // Check cart value limits
    const cartTotal = this.cart.getTotal();
    if (cartTotal <= 0) {
      errors.push('Order total must be greater than zero');
    }
    
    if (cartTotal > 100000000) { // 100 million IDR limit
      errors.push('Order total exceeds maximum allowed amount');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Get customer with retry logic
  async getCustomerWithRetry(customerId, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const customer = await this.visitContext.getCustomerById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return customer;
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying customer fetch (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(1000 * (retryCount + 1));
        return this.getCustomerWithRetry(customerId, retryCount + 1);
      }
      throw error;
    }
  }

  // Build order data with additional validation
  async buildOrderDataWithValidation(customerId, notes) {
    const user = state.getState('user');
    const cartItems = this.cart.getItems();
    const cartSummary = this.cart.getSummary();
    const visitContext = await this.visitContext.getVisitContext();

    // Validate cart items before building order
    for (const item of cartItems) {
      if (!item.name || item.name.trim().length === 0) {
        throw new Error(`Invalid item name for product ${item.id}`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for ${item.name}`);
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        throw new Error(`Invalid price for ${item.name}`);
      }
    }

    // Convert cart items to order items format
    const items = cartItems.map(item => ({
      name: item.name.trim(),
      qty: item.quantity,
      price: item.price
    }));

    // Generate items summary with length validation
    const itemsSummary = items.map(item => 
      `${item.name} (${item.qty}x)`
    ).join(', ');

    if (itemsSummary.length > 500) {
      throw new Error('Order summary is too long - reduce item names or quantities');
    }

    const orderData = {
      employee_id: user.id,
      customer_id: customerId,
      items: items,
      items_summary: itemsSummary,
      total_amount: this.cart.getTotal(),
      status: 'pending',
      notes: notes?.trim() || null,
      
      // Quick order specific fields
      order_source: 'quick_order',
      cart_session_id: cartSummary.sessionId,
      visit_context_id: visitContext.hasActiveVisit ? 'active' : null,
      creation_method: 'catalog_cart',
      
      created_at: new Date().toISOString()
    };

    return orderData;
  }

  // Check for duplicate orders
  async checkDuplicateOrder(orderData) {
    try {
      // Check if similar order was created in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // This would need to be implemented in the database service
      // For now, we'll use a simple localStorage check
      const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
      
      const isDuplicate = recentOrders.some(order => {
        return order.customer_id === orderData.customer_id &&
               order.total_amount === orderData.total_amount &&
               order.items_summary === orderData.items_summary &&
               new Date(order.created_at) > new Date(fiveMinutesAgo);
      });

      return isDuplicate;
    } catch (error) {
      console.error('Error checking duplicate order:', error);
      return false; // Don't block order creation if check fails
    }
  }

  // Create order with retry logic
  async createOrderWithRetry(orderData, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const result = await this.orderService.createOrder(orderData);
      
      // Store in recent orders for duplicate prevention
      if (result.data) {
        this.storeRecentOrder(orderData);
      }
      
      return result;
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying order creation (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(2000 * (retryCount + 1));
        return this.createOrderWithRetry(orderData, retryCount + 1);
      }
      throw error;
    }
  }

  // Store recent order for duplicate prevention
  storeRecentOrder(orderData) {
    try {
      const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
      
      // Add current order
      recentOrders.push({
        customer_id: orderData.customer_id,
        total_amount: orderData.total_amount,
        items_summary: orderData.items_summary,
        created_at: orderData.created_at
      });
      
      // Keep only last 10 orders
      if (recentOrders.length > 10) {
        recentOrders.splice(0, recentOrders.length - 10);
      }
      
      localStorage.setItem('recent_orders', JSON.stringify(recentOrders));
    } catch (error) {
      console.error('Error storing recent order:', error);
    }
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'fetch',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'temporary',
      'rate limit'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  // Get user-friendly error message
  getUserFriendlyErrorMessage(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Koneksi internet bermasalah. Periksa koneksi dan coba lagi.';
    }
    
    if (errorMessage.includes('timeout')) {
      return 'Permintaan timeout. Coba lagi dalam beberapa saat.';
    }
    
    if (errorMessage.includes('customer') && errorMessage.includes('not found')) {
      return 'Data pelanggan tidak ditemukan. Pilih pelanggan yang valid.';
    }
    
    if (errorMessage.includes('cart') && errorMessage.includes('empty')) {
      return 'Keranjang kosong. Tambahkan produk terlebih dahulu.';
    }
    
    if (errorMessage.includes('duplicate')) {
      return 'Order serupa baru saja dibuat. Tunggu beberapa menit.';
    }
    
    if (errorMessage.includes('capacity') || errorMessage.includes('limit')) {
      return 'Batas maksimum tercapai. Kurangi jumlah item.';
    }
    
    if (errorMessage.includes('session') || errorMessage.includes('login')) {
      return 'Sesi login bermasalah. Silakan login ulang.';
    }
    
    // Default user-friendly message
    return 'Terjadi kesalahan. Silakan coba lagi atau hubungi admin jika masalah berlanjut.';
  }

  // Delay utility for retry logic
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced cart event tracking
  trackCartEvent(eventData) {
    try {
      const analyticsData = {
        event_type: eventData.type,
        session_id: this.cart.sessionId,
        timestamp: new Date().toISOString(),
        cart_state: {
          item_count: this.cart.getItemCount(),
          total_amount: this.cart.getTotal(),
          unique_products: this.cart.getItems().length
        },
        event_data: eventData,
        user_agent: navigator.userAgent,
        connection_type: navigator.connection?.effectiveType || 'unknown'
      };

      // Store in localStorage for later sync
      this.storeAnalyticsEvent(analyticsData);
    } catch (error) {
      console.error('Error tracking cart event:', error);
    }
  }

  // Enhanced order completion tracking
  trackOrderCompletion(order, orderData, retryCount = 0) {
    try {
      const analyticsData = {
        event_type: 'order_completed_success',
        session_id: this.cart.sessionId,
        order_id: order.id,
        timestamp: new Date().toISOString(),
        order_data: {
          total_amount: orderData.total_amount,
          item_count: orderData.items.length,
          creation_method: orderData.creation_method,
          order_source: orderData.order_source,
          has_visit_context: !!orderData.visit_context_id,
          retry_count: retryCount
        },
        performance_metrics: {
          cart_session_duration: this.getCartSessionDuration(),
          items_added_count: this.getItemsAddedCount(),
          cart_modifications: this.getCartModificationCount()
        }
      };

      this.storeAnalyticsEvent(analyticsData);
    } catch (error) {
      console.error('Error tracking order completion:', error);
    }
  }

  // Get cart session duration
  getCartSessionDuration() {
    try {
      const cartSummary = this.cart.getSummary();
      if (cartSummary.createdAt) {
        return Date.now() - cartSummary.createdAt;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Get items added count (from analytics events)
  getItemsAddedCount() {
    try {
      const events = JSON.parse(localStorage.getItem('quick_order_analytics') || '[]');
      return events.filter(e => e.event_type === 'cart_item_added').length;
    } catch (error) {
      return 0;
    }
  }

  // Get cart modification count
  getCartModificationCount() {
    try {
      const events = JSON.parse(localStorage.getItem('quick_order_analytics') || '[]');
      const modificationEvents = ['cart_item_added', 'cart_item_removed', 'cart_quantity_updated'];
      return events.filter(e => modificationEvents.includes(e.event_type)).length;
    } catch (error) {
      return 0;
    }
  }

  // Enhanced analytics event storage
  storeAnalyticsEvent(eventData) {
    try {
      const stored = localStorage.getItem('quick_order_analytics') || '[]';
      const events = JSON.parse(stored);
      
      events.push(eventData);
      
      // Keep only last 200 events to prevent storage bloat
      if (events.length > 200) {
        events.splice(0, events.length - 200);
      }
      
      localStorage.setItem('quick_order_analytics', JSON.stringify(events));
      
      // Also store error events separately for debugging
      if (eventData.event_type.includes('error')) {
        this.storeErrorEvent(eventData);
      }
    } catch (error) {
      console.error('Error storing analytics event:', error);
    }
  }

  // Store error events for debugging
  storeErrorEvent(eventData) {
    try {
      const stored = localStorage.getItem('quick_order_errors') || '[]';
      const errors = JSON.parse(stored);
      
      errors.push({
        ...eventData,
        stack_trace: new Error().stack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('quick_order_errors', JSON.stringify(errors));
    } catch (error) {
      console.error('Error storing error event:', error);
    }
  }

  // Get error recovery suggestions
  getErrorRecoverySuggestions(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const suggestions = [];
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      suggestions.push('Periksa koneksi internet Anda');
      suggestions.push('Coba refresh halaman');
      suggestions.push('Pindah ke area dengan sinyal lebih baik');
    }
    
    if (errorMessage.includes('cart') && errorMessage.includes('empty')) {
      suggestions.push('Tambahkan produk ke keranjang terlebih dahulu');
      suggestions.push('Periksa apakah produk masih tersedia');
    }
    
    if (errorMessage.includes('customer')) {
      suggestions.push('Pilih pelanggan yang valid dari daftar');
      suggestions.push('Periksa apakah pelanggan masih aktif');
    }
    
    if (errorMessage.includes('session') || errorMessage.includes('login')) {
      suggestions.push('Login ulang ke aplikasi');
      suggestions.push('Hapus cache browser dan coba lagi');
    }
    
    return suggestions;
  }

  // Clear error state and reset
  clearErrorState() {
    try {
      // Clear processing flags
      this.isProcessingOrder = false;
      
      // Clear any error indicators in UI
      document.querySelectorAll('.error-indicator').forEach(el => {
        el.classList.remove('error-indicator');
      });
      
      // Clear error messages
      document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
      });
      
      console.log('Error state cleared successfully');
    } catch (error) {
      console.error('Error clearing error state:', error);
    }
  }
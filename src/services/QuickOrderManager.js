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
    
    try {
      // Validate input parameters
      if (!productId) {
        throw new Error('Product ID is required');
      }
      
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }

      // Get product details
      const product = await this.getProductDetails(productId);
      if (!product) {
        throw new Error('Product not found or unavailable');
      }

      // Add to cart
      const total = this.cart.addItem(product, quantity);
      
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
      
      // Retry logic for network errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying add to cart (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(1000 * (retryCount + 1));
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
    
    if (this.isProcessingOrder) {
      showNotification('Order sedang diproses, mohon tunggu...', 'warning');
      return { success: false, error: 'Order already in progress' };
    }

    try {
      this.isProcessingOrder = true;
      showLoading('Membuat order...');

      // Validate order creation
      const validationResult = this.validateOrderCreation(customerId, notes);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Get customer details
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error('Data pelanggan tidak ditemukan atau tidak dapat diakses');
      }

      // Build order data
      const orderData = this.buildOrderData(customerId, notes);
      
      // Create order
      const { data: order, error } = await this.orderService.createOrder(orderData);
      if (error) throw error;

      // Verify order creation
      if (!order || !order.id) {
        throw new Error('Order berhasil dibuat tetapi data tidak lengkap');
      }

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
      
      // Retry logic for retryable errors
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying order creation (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(2000 * (retryCount + 1));
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

  // Validate order creation
  validateOrderCreation(customerId, notes) {
    const errors = [];

    // Validate cart
    if (this.cart.isEmpty()) {
      errors.push('Cart is empty');
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

  // Get customer details
  async getCustomer(customerId) {
    try {
      const customer = await this.visitContext.getCustomerById(customerId);
      return customer;
    } catch (error) {
      console.error('Error getting customer:', error);
      throw error;
    }
  }

  // Build order data from cart contents
  buildOrderData(customerId, notes) {
    const user = state.getState('user');
    const cartItems = this.cart.getItems();
    const cartSummary = this.cart.getSummary();

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

  // Utility methods for error handling and retry logic
  isRetryableError(error) {
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'AbortError',
      'fetch',
      'network',
      'timeout',
      'connection',
      'ECONNRESET',
      'ETIMEDOUT'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';
    
    return retryableErrors.some(keyword => 
      errorMessage.includes(keyword) || errorName.includes(keyword)
    );
  }

  getUserFriendlyErrorMessage(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Koneksi internet bermasalah. Silakan coba lagi.';
    }
    
    if (message.includes('timeout')) {
      return 'Permintaan timeout. Silakan coba lagi.';
    }
    
    if (message.includes('not found')) {
      return 'Data tidak ditemukan. Silakan refresh halaman.';
    }
    
    if (message.includes('duplicate')) {
      return 'Order serupa baru saja dibuat. Tunggu beberapa menit.';
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Data tidak valid. Silakan periksa kembali.';
    }
    
    // Default user-friendly message
    return 'Terjadi kesalahan. Silakan coba lagi atau hubungi admin.';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const quickOrderManager = new QuickOrderManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.quickOrderManager = quickOrderManager;
}
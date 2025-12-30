// Shopping Cart Service - Manages cart state and operations
// Provides localStorage persistence and event-driven updates

export class ShoppingCart {
  constructor() {
    this.items = [];
    this.listeners = [];
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
  }

  // Generate unique session ID for cart tracking
  generateSessionId() {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  }

  // Add item to cart with duplicate handling
  addItem(product, quantity = 1) {
    try {
      if (!product || !product.id) {
        throw new Error('Invalid product data: missing product or product ID');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }

      if (quantity > 100) {
        throw new Error('Quantity cannot exceed 100 per item');
      }

      // Validate product data
      const validation = this.validateProductForCart(product);
      if (!validation.isValid) {
        throw new Error(`Invalid product: ${validation.errors.join(', ')}`);
      }

      const existingItem = this.findItem(product.id);
      
      if (existingItem) {
        // Check if new total quantity would exceed limits
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > 100) {
          throw new Error(`Total quantity for ${product.name} would exceed maximum (100)`);
        }
        
        // Increase quantity for existing item
        existingItem.quantity = newQuantity;
        existingItem.updated_at = new Date().toISOString();
      } else {
        // Check cart capacity
        if (this.items.length >= 20) {
          throw new Error('Cart capacity exceeded (maximum 20 different products)');
        }
        
        // Add new item to cart
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url || null,
          quantity: quantity,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source: 'catalog'
        });
      }
      
      // Validate cart state after addition
      const cartValidation = this.validate();
      if (!cartValidation.isValid) {
        // Rollback the addition
        if (existingItem) {
          existingItem.quantity -= quantity;
        } else {
          this.items.pop();
        }
        throw new Error(`Cart validation failed after addition: ${cartValidation.errors.join(', ')}`);
      }
      
      this.saveToStorage();
      this.notifyListeners('item_added', { product, quantity });
      return this.getTotal();
    } catch (error) {
      console.error('Error adding item to cart:', error);
      this.notifyListeners('item_add_error', { product, quantity, error: error.message });
      throw error;
    }
  }

  // Remove item from cart
  removeItem(productId) {
    const initialLength = this.items.length;
    this.items = this.items.filter(item => item.id !== productId);
    
    if (this.items.length < initialLength) {
      this.saveToStorage();
      this.notifyListeners('item_removed', { productId });
    }
  }

  // Update item quantity
  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.findItem(productId);
    if (item) {
      const oldQuantity = item.quantity;
      item.quantity = quantity;
      item.updated_at = new Date().toISOString();
      
      this.saveToStorage();
      this.notifyListeners('quantity_updated', { 
        productId, 
        oldQuantity, 
        newQuantity: quantity 
      });
    }
  }

  // Find item by product ID
  findItem(productId) {
    return this.items.find(item => item.id === productId);
  }

  // Get all items in cart
  getItems() {
    return [...this.items]; // Return copy to prevent external mutation
  }

  // Get total amount
  getTotal() {
    return this.items.reduce((total, item) => 
      total + (item.price * item.quantity), 0
    );
  }

  // Get total item count
  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  // Check if cart is empty
  isEmpty() {
    return this.items.length === 0;
  }

  // Check if product is in cart
  hasProduct(productId) {
    return this.findItem(productId) !== undefined;
  }

  // Get quantity of specific product
  getProductQuantity(productId) {
    const item = this.findItem(productId);
    return item ? item.quantity : 0;
  }

  // Clear entire cart
  clear() {
    const hadItems = this.items.length > 0;
    this.items = [];
    this.saveToStorage();
    
    if (hadItems) {
      this.notifyListeners('cart_cleared', {});
    }
  }

  // Add event listener for cart changes
  addEventListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  // Remove event listener
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners of cart changes
  notifyListeners(eventType, data) {
    const event = {
      type: eventType,
      data: data,
      cart: {
        items: this.getItems(),
        total: this.getTotal(),
        itemCount: this.getItemCount(),
        isEmpty: this.isEmpty()
      },
      timestamp: new Date().toISOString()
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Cart listener error:', error);
      }
    });
  }

  // Save cart to localStorage
  saveToStorage() {
    try {
      const cartData = {
        sessionId: this.sessionId,
        items: this.items,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('quick_order_cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  }

  // Load cart from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('quick_order_cart');
      if (stored) {
        const cartData = JSON.parse(stored);
        
        // Check if cart is not too old (24 hours)
        const lastUpdated = new Date(cartData.lastUpdated);
        const now = new Date();
        const hoursDiff = (now - lastUpdated) / (1000 * 60 * 60);
        
        if (hoursDiff < 24 && cartData.items) {
          this.items = cartData.items;
          this.sessionId = cartData.sessionId || this.sessionId;
        }
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
      this.items = [];
    }
  }

  // Get cart summary for analytics
  getSummary() {
    return {
      sessionId: this.sessionId,
      itemCount: this.getItemCount(),
      uniqueProducts: this.items.length,
      totalAmount: this.getTotal(),
      createdAt: this.items.length > 0 ? 
        Math.min(...this.items.map(item => new Date(item.added_at).getTime())) : null,
      lastUpdated: this.items.length > 0 ? 
        Math.max(...this.items.map(item => new Date(item.updated_at).getTime())) : null
    };
  }

  // Validate cart contents (for order submission)
  validate() {
    const errors = [];

    if (this.isEmpty()) {
      errors.push('Cart is empty');
    }

    this.items.forEach((item, index) => {
      if (!item.id) {
        errors.push(`Item ${index + 1}: Missing product ID`);
      }
      if (!item.name) {
        errors.push(`Item ${index + 1}: Missing product name`);
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        errors.push(`Item ${index + 1}: Invalid price`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Invalid quantity`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

// Create singleton instance
export const shoppingCart = new ShoppingCart();

// Export for global access
if (typeof window !== 'undefined') {
  window.shoppingCart = shoppingCart;
}
  // Validate product for cart addition
  validateProductForCart(product) {
    const errors = [];
    
    if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
      errors.push('Product name is required');
    }
    
    if (typeof product.price !== 'number' || product.price < 0 || !isFinite(product.price)) {
      errors.push('Product price must be a valid positive number');
    }
    
    if (product.price > 10000000) { // 10 million IDR per item limit
      errors.push('Product price exceeds maximum allowed amount');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Enhanced cart validation
  validate() {
    const errors = [];

    if (this.isEmpty()) {
      errors.push('Cart is empty');
    }

    // Check total value limits
    const total = this.getTotal();
    if (total > 100000000) { // 100 million IDR total limit
      errors.push('Cart total exceeds maximum allowed amount');
    }

    // Check item count limits
    const itemCount = this.getItemCount();
    if (itemCount > 500) { // 500 total items limit
      errors.push('Cart contains too many items');
    }

    this.items.forEach((item, index) => {
      if (!item.id) {
        errors.push(`Item ${index + 1}: Missing product ID`);
      }
      if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
        errors.push(`Item ${index + 1}: Missing or invalid product name`);
      }
      if (typeof item.price !== 'number' || item.price < 0 || !isFinite(item.price)) {
        errors.push(`Item ${index + 1}: Invalid price`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Invalid quantity`);
      }
      if (item.quantity > 100) {
        errors.push(`Item ${index + 1}: Quantity exceeds maximum (100)`);
      }
      
      // Check for data corruption
      if (!item.added_at || !item.updated_at) {
        errors.push(`Item ${index + 1}: Missing timestamp data`);
      }
    });

    // Check for duplicate IDs (data corruption)
    const ids = this.items.map(item => item.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      errors.push('Cart contains duplicate items (data corruption detected)');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Enhanced save to storage with error handling
  saveToStorage() {
    try {
      // Validate before saving
      const validation = this.validate();
      if (!validation.isValid) {
        console.warn('Saving invalid cart to storage:', validation.errors);
      }

      const cartData = {
        sessionId: this.sessionId,
        items: this.items,
        lastUpdated: new Date().toISOString(),
        version: '1.0' // For future migration compatibility
      };
      
      const serialized = JSON.stringify(cartData);
      
      // Check storage size (5MB limit for localStorage)
      if (serialized.length > 5000000) {
        throw new Error('Cart data too large for storage');
      }
      
      localStorage.setItem('quick_order_cart', serialized);
      
      // Verify save was successful
      const saved = localStorage.getItem('quick_order_cart');
      if (!saved || saved !== serialized) {
        throw new Error('Cart save verification failed');
      }
      
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
      
      // Try to save minimal cart data as fallback
      try {
        const minimalCart = {
          sessionId: this.sessionId,
          items: this.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          lastUpdated: new Date().toISOString(),
          fallback: true
        };
        
        localStorage.setItem('quick_order_cart_fallback', JSON.stringify(minimalCart));
        console.log('Saved fallback cart data');
      } catch (fallbackError) {
        console.error('Failed to save fallback cart:', fallbackError);
        
        // Notify listeners of storage failure
        this.notifyListeners('storage_error', { 
          error: error.message,
          fallbackError: fallbackError.message 
        });
      }
    }
  }

  // Enhanced load from storage with recovery
  loadFromStorage() {
    try {
      let cartData = null;
      
      // Try to load main cart data
      const stored = localStorage.getItem('quick_order_cart');
      if (stored) {
        cartData = JSON.parse(stored);
      } else {
        // Try fallback cart data
        const fallback = localStorage.getItem('quick_order_cart_fallback');
        if (fallback) {
          cartData = JSON.parse(fallback);
          console.log('Loaded cart from fallback storage');
        }
      }
      
      if (cartData) {
        // Check if cart is not too old (24 hours)
        const lastUpdated = new Date(cartData.lastUpdated);
        const now = new Date();
        const hoursDiff = (now - lastUpdated) / (1000 * 60 * 60);
        
        if (hoursDiff < 24 && cartData.items && Array.isArray(cartData.items)) {
          // Validate loaded items
          const validItems = cartData.items.filter(item => {
            return item && 
                   item.id && 
                   item.name && 
                   typeof item.price === 'number' && 
                   typeof item.quantity === 'number' && 
                   item.quantity > 0;
          });
          
          if (validItems.length !== cartData.items.length) {
            console.warn(`Filtered out ${cartData.items.length - validItems.length} invalid cart items`);
          }
          
          this.items = validItems;
          this.sessionId = cartData.sessionId || this.sessionId;
          
          // Validate loaded cart
          const validation = this.validate();
          if (!validation.isValid) {
            console.warn('Loaded cart is invalid, clearing:', validation.errors);
            this.items = [];
          } else {
            console.log(`Loaded ${this.items.length} items from storage`);
          }
        } else {
          console.log('Cart data is too old or invalid, starting fresh');
          this.items = [];
        }
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
      this.items = [];
      
      // Try to clear corrupted storage
      try {
        localStorage.removeItem('quick_order_cart');
        localStorage.removeItem('quick_order_cart_fallback');
      } catch (clearError) {
        console.error('Failed to clear corrupted cart storage:', clearError);
      }
      
      // Notify listeners of load failure
      this.notifyListeners('storage_load_error', { error: error.message });
    }
  }

  // Enhanced notification with error handling
  notifyListeners(eventType, data) {
    const event = {
      type: eventType,
      data: data,
      cart: {
        items: this.getItems(),
        total: this.getTotal(),
        itemCount: this.getItemCount(),
        isEmpty: this.isEmpty()
      },
      timestamp: new Date().toISOString()
    };

    // Create a copy of listeners to avoid issues if listeners are modified during iteration
    const listenersCopy = [...this.listeners];
    
    listenersCopy.forEach((listener, index) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Cart listener ${index} error:`, error);
        
        // Remove problematic listener
        const listenerIndex = this.listeners.indexOf(listener);
        if (listenerIndex > -1) {
          this.listeners.splice(listenerIndex, 1);
          console.log(`Removed problematic cart listener ${index}`);
        }
      }
    });
  }

  // Cart recovery methods
  recoverFromCorruption() {
    try {
      console.log('Attempting cart recovery...');
      
      // Clear current state
      this.items = [];
      
      // Try to load from fallback
      const fallback = localStorage.getItem('quick_order_cart_fallback');
      if (fallback) {
        const fallbackData = JSON.parse(fallback);
        if (fallbackData.items && Array.isArray(fallbackData.items)) {
          this.items = fallbackData.items.filter(item => 
            item && item.id && item.name && typeof item.price === 'number'
          );
          console.log(`Recovered ${this.items.length} items from fallback`);
        }
      }
      
      // Generate new session ID
      this.sessionId = this.generateSessionId();
      
      // Save recovered state
      this.saveToStorage();
      
      // Notify listeners
      this.notifyListeners('cart_recovered', { 
        recoveredItems: this.items.length 
      });
      
      return true;
    } catch (error) {
      console.error('Cart recovery failed:', error);
      return false;
    }
  }

  // Get cart health status
  getHealthStatus() {
    try {
      const validation = this.validate();
      const storageSize = JSON.stringify(this.items).length;
      
      return {
        isHealthy: validation.isValid,
        errors: validation.errors,
        itemCount: this.items.length,
        totalValue: this.getTotal(),
        storageSize: storageSize,
        sessionId: this.sessionId,
        lastActivity: this.items.length > 0 ? 
          Math.max(...this.items.map(item => new Date(item.updated_at).getTime())) : null
      };
    } catch (error) {
      return {
        isHealthy: false,
        errors: ['Health check failed: ' + error.message],
        itemCount: 0,
        totalValue: 0,
        storageSize: 0,
        sessionId: this.sessionId,
        lastActivity: null
      };
    }
  }
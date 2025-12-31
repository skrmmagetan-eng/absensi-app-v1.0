// Shopping Cart Service - Manages cart state and operations
// Provides persistent storage and event-driven updates

export class ShoppingCart {
  constructor() {
    this.items = [];
    this.listeners = [];
    this.sessionId = this.generateSessionId();
    this.createdAt = new Date().toISOString();
    this.lastModified = new Date().toISOString();
    
    // Load from localStorage if available
    this.loadFromStorage();
  }

  // Generate unique session ID
  generateSessionId() {
    return 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Add event listener for cart changes
  addEventListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  // Remove event listener
  removeEventListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notify all listeners of cart changes
  notifyListeners(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      cart: this.getState(),
      data: data
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cart event listener:', error);
      }
    });
  }

  // Add item to cart
  addItem(product, quantity = 1) {
    if (!product || !product.id) {
      throw new Error('Invalid product');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }

    // Check if product already exists in cart
    const existingItemIndex = this.items.findIndex(item => item.id === product.id);
    
    if (existingItemIndex > -1) {
      // Update existing item quantity
      this.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image_url: product.image_url || null,
        addedAt: new Date().toISOString()
      });
    }

    this.updateTimestamp();
    this.saveToStorage();
    this.notifyListeners('item_added', { product, quantity });
    
    return this.getTotal();
  }

  // Remove item from cart
  removeItem(productId) {
    const itemIndex = this.items.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
      const removedItem = this.items[itemIndex];
      this.items.splice(itemIndex, 1);
      
      this.updateTimestamp();
      this.saveToStorage();
      this.notifyListeners('item_removed', { item: removedItem });
      
      return true;
    }
    
    return false;
  }

  // Update item quantity
  updateQuantity(productId, newQuantity) {
    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      throw new Error('Quantity must be a non-negative integer');
    }

    const itemIndex = this.items.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
      const oldQuantity = this.items[itemIndex].quantity;
      
      if (newQuantity === 0) {
        // Remove item if quantity is 0
        return this.removeItem(productId);
      } else {
        // Update quantity
        this.items[itemIndex].quantity = newQuantity;
        
        this.updateTimestamp();
        this.saveToStorage();
        this.notifyListeners('quantity_updated', { 
          productId, 
          oldQuantity, 
          newQuantity 
        });
        
        return true;
      }
    }
    
    return false;
  }

  // Get all items in cart
  getItems() {
    return [...this.items]; // Return copy to prevent external modification
  }

  // Get total price
  getTotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
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
    return this.items.some(item => item.id === productId);
  }

  // Get product quantity in cart
  getProductQuantity(productId) {
    const item = this.items.find(item => item.id === productId);
    return item ? item.quantity : 0;
  }

  // Clear all items from cart
  clear() {
    const clearedItems = [...this.items];
    this.items = [];
    
    this.updateTimestamp();
    this.saveToStorage();
    this.notifyListeners('cleared', { clearedItems });
  }

  // Get cart summary
  getSummary() {
    return {
      itemCount: this.getItemCount(),
      uniqueProducts: this.items.length,
      total: this.getTotal(),
      isEmpty: this.isEmpty(),
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      lastModified: this.lastModified
    };
  }

  // Get cart state for external use
  getState() {
    return {
      items: this.getItems(),
      total: this.getTotal(),
      itemCount: this.getItemCount(),
      isEmpty: this.isEmpty(),
      summary: this.getSummary()
    };
  }

  // Update timestamp
  updateTimestamp() {
    this.lastModified = new Date().toISOString();
  }

  // Save cart to localStorage
  saveToStorage() {
    try {
      const cartData = {
        items: this.items,
        sessionId: this.sessionId,
        createdAt: this.createdAt,
        lastModified: this.lastModified
      };
      
      localStorage.setItem('shopping_cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  // Load cart from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('shopping_cart');
      if (stored) {
        const cartData = JSON.parse(stored);
        
        if (cartData && Array.isArray(cartData.items)) {
          this.items = cartData.items;
          this.sessionId = cartData.sessionId || this.sessionId;
          this.createdAt = cartData.createdAt || this.createdAt;
          this.lastModified = cartData.lastModified || this.lastModified;
        }
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      // Reset to empty cart on error
      this.items = [];
    }
  }

  // Validate cart state
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

    // Validate individual items
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
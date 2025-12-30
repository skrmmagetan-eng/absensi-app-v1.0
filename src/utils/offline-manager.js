// Offline Manager - Handles offline functionality and sync
// Provides offline cart operations, order queuing, and sync when online

export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.offlineOrders = [];
    this.offlineData = new Map();
    this.syncInProgress = false;
    this.lastSyncAttempt = null;
    this.syncRetryCount = 0;
    this.maxRetries = 3;
    
    this.init();
  }

  // Initialize offline manager
  init() {
    this.setupNetworkListeners();
    this.loadOfflineData();
    this.setupPeriodicSync();
    this.setupServiceWorker();
    
    console.log('📴 Offline manager initialized');
  }

  // Setup network event listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Network restored');
      this.isOnline = true;
      this.updateNetworkStatus();
      this.attemptSync();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Network lost');
      this.isOnline = false;
      this.updateNetworkStatus();
    });

    // Initial status
    this.updateNetworkStatus();
  }

  // Update network status UI
  updateNetworkStatus() {
    const statusElement = document.getElementById('network-status');
    if (statusElement) {
      statusElement.textContent = this.isOnline ? '🟢 Online' : '🔴 Offline';
      statusElement.className = `network-status ${this.isOnline ? 'online' : 'offline'}`;
      
      if (!this.isOnline) {
        statusElement.classList.add('visible');
      } else {
        // Show briefly when coming back online
        statusElement.classList.add('visible');
        setTimeout(() => {
          statusElement.classList.remove('visible');
        }, 3000);
      }
    }

    // Update body class for CSS targeting
    document.body.classList.toggle('offline', !this.isOnline);
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('networkStatusChange', {
      detail: { isOnline: this.isOnline }
    }));
  }

  // Load offline data from storage
  loadOfflineData() {
    try {
      // Load sync queue
      const storedQueue = localStorage.getItem('offline_sync_queue');
      if (storedQueue) {
        this.syncQueue = JSON.parse(storedQueue);
      }

      // Load offline orders
      const storedOrders = localStorage.getItem('offline_orders');
      if (storedOrders) {
        this.offlineOrders = JSON.parse(storedOrders);
      }

      // Load cached data
      const storedData = localStorage.getItem('offline_cached_data');
      if (storedData) {
        const dataArray = JSON.parse(storedData);
        this.offlineData = new Map(dataArray);
      }

      console.log(`📴 Loaded offline data: ${this.syncQueue.length} queued items, ${this.offlineOrders.length} offline orders`);
    } catch (error) {
      console.error('Failed to load offline data:', error);
      this.clearOfflineData();
    }
  }

  // Save offline data to storage
  saveOfflineData() {
    try {
      localStorage.setItem('offline_sync_queue', JSON.stringify(this.syncQueue));
      localStorage.setItem('offline_orders', JSON.stringify(this.offlineOrders));
      
      // Convert Map to array for storage
      const dataArray = Array.from(this.offlineData.entries());
      localStorage.setItem('offline_cached_data', JSON.stringify(dataArray));
    } catch (error) {
      console.error('Failed to save offline data:', error);
      
      // Try to free up space by clearing old data
      this.cleanupOfflineData();
      
      // Retry save
      try {
        localStorage.setItem('offline_sync_queue', JSON.stringify(this.syncQueue));
        localStorage.setItem('offline_orders', JSON.stringify(this.offlineOrders));
      } catch (retryError) {
        console.error('Failed to save offline data after cleanup:', retryError);
      }
    }
  }

  // Clear all offline data
  clearOfflineData() {
    this.syncQueue = [];
    this.offlineOrders = [];
    this.offlineData.clear();
    
    localStorage.removeItem('offline_sync_queue');
    localStorage.removeItem('offline_orders');
    localStorage.removeItem('offline_cached_data');
  }

  // Cleanup old offline data
  cleanupOfflineData() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Remove old sync queue items
    this.syncQueue = this.syncQueue.filter(item => {
      return (now - new Date(item.timestamp).getTime()) < maxAge;
    });

    // Remove old offline orders
    this.offlineOrders = this.offlineOrders.filter(order => {
      return (now - new Date(order.created_at).getTime()) < maxAge;
    });

    // Remove old cached data
    for (const [key, data] of this.offlineData.entries()) {
      if (data.timestamp && (now - data.timestamp) > maxAge) {
        this.offlineData.delete(key);
      }
    }

    this.saveOfflineData();
  }

  // Cache data for offline use
  cacheData(key, data, ttl = 24 * 60 * 60 * 1000) { // 24 hours default TTL
    this.offlineData.set(key, {
      data: data,
      timestamp: Date.now(),
      ttl: ttl
    });
    
    this.saveOfflineData();
  }

  // Get cached data
  getCachedData(key) {
    const cached = this.offlineData.get(key);
    if (!cached) return null;

    // Check if data has expired
    if (cached.ttl && (Date.now() - cached.timestamp) > cached.ttl) {
      this.offlineData.delete(key);
      return null;
    }

    return cached.data;
  }

  // Add item to sync queue
  addToSyncQueue(operation, data) {
    const queueItem = {
      id: this.generateId(),
      operation: operation,
      data: data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };

    this.syncQueue.push(queueItem);
    this.saveOfflineData();

    console.log(`📴 Added to sync queue: ${operation}`);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.attemptSync();
    }

    return queueItem.id;
  }

  // Queue order for offline submission
  queueOfflineOrder(orderData) {
    const offlineOrder = {
      id: this.generateId(),
      ...orderData,
      offline_created: true,
      offline_timestamp: new Date().toISOString(),
      sync_status: 'pending'
    };

    this.offlineOrders.push(offlineOrder);
    this.saveOfflineData();

    console.log('📴 Order queued for offline submission');

    // Add to sync queue
    this.addToSyncQueue('create_order', offlineOrder);

    return offlineOrder;
  }

  // Get offline orders
  getOfflineOrders() {
    return [...this.offlineOrders];
  }

  // Remove offline order (after successful sync)
  removeOfflineOrder(orderId) {
    this.offlineOrders = this.offlineOrders.filter(order => order.id !== orderId);
    this.saveOfflineData();
  }

  // Attempt to sync queued operations
  async attemptSync() {
    if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = Date.now();

    console.log(`📴 Starting sync: ${this.syncQueue.length} items in queue`);

    try {
      const results = await this.processSyncQueue();
      
      if (results.success > 0) {
        this.syncRetryCount = 0; // Reset retry count on success
        this.showSyncNotification(`✅ Synced ${results.success} items`, 'success');
      }

      if (results.failed > 0) {
        this.showSyncNotification(`⚠️ ${results.failed} items failed to sync`, 'warning');
      }

    } catch (error) {
      console.error('Sync failed:', error);
      this.syncRetryCount++;
      
      if (this.syncRetryCount < this.maxRetries) {
        this.showSyncNotification('🔄 Sync failed, will retry...', 'warning');
        this.scheduleRetrySync();
      } else {
        this.showSyncNotification('❌ Sync failed after multiple attempts', 'danger');
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process sync queue
  async processSyncQueue() {
    const results = { success: 0, failed: 0 };
    const itemsToRemove = [];

    for (const item of this.syncQueue) {
      if (item.status === 'completed') {
        itemsToRemove.push(item.id);
        continue;
      }

      try {
        const success = await this.syncItem(item);
        
        if (success) {
          item.status = 'completed';
          itemsToRemove.push(item.id);
          results.success++;
        } else {
          item.retryCount++;
          if (item.retryCount >= this.maxRetries) {
            item.status = 'failed';
            itemsToRemove.push(item.id);
          }
          results.failed++;
        }
      } catch (error) {
        console.error(`Sync item failed:`, error);
        item.retryCount++;
        if (item.retryCount >= this.maxRetries) {
          item.status = 'failed';
          itemsToRemove.push(item.id);
        }
        results.failed++;
      }

      // Add delay between sync operations to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remove completed/failed items
    this.syncQueue = this.syncQueue.filter(item => !itemsToRemove.includes(item.id));
    this.saveOfflineData();

    return results;
  }

  // Sync individual item
  async syncItem(item) {
    switch (item.operation) {
      case 'create_order':
        return await this.syncCreateOrder(item.data);
      
      case 'update_cart':
        return await this.syncCartUpdate(item.data);
      
      case 'analytics_event':
        return await this.syncAnalyticsEvent(item.data);
      
      default:
        console.warn(`Unknown sync operation: ${item.operation}`);
        return false;
    }
  }

  // Sync order creation
  async syncCreateOrder(orderData) {
    try {
      // Use the existing order service
      if (window.quickOrderManager && window.quickOrderManager.orderService) {
        const { data, error } = await window.quickOrderManager.orderService.createOrder(orderData);
        
        if (error) {
          console.error('Order sync failed:', error);
          return false;
        }

        // Remove from offline orders
        this.removeOfflineOrder(orderData.id);
        
        console.log('✅ Order synced successfully:', data.id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Order sync error:', error);
      return false;
    }
  }

  // Sync cart update (for analytics)
  async syncCartUpdate(cartData) {
    try {
      // This would typically sync cart state to server for analytics
      // For now, we'll just log it
      console.log('📊 Cart update synced:', cartData);
      return true;
    } catch (error) {
      console.error('Cart sync error:', error);
      return false;
    }
  }

  // Sync analytics event
  async syncAnalyticsEvent(eventData) {
    try {
      // This would typically send analytics to server
      // For now, we'll just log it
      console.log('📊 Analytics event synced:', eventData);
      return true;
    } catch (error) {
      console.error('Analytics sync error:', error);
      return false;
    }
  }

  // Schedule retry sync
  scheduleRetrySync() {
    const delay = Math.min(1000 * Math.pow(2, this.syncRetryCount), 30000); // Exponential backoff, max 30s
    
    setTimeout(() => {
      if (this.isOnline) {
        this.attemptSync();
      }
    }, delay);
  }

  // Setup periodic sync
  setupPeriodicSync() {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.attemptSync();
      }
    }, 5 * 60 * 1000);

    // Cleanup old data daily
    setInterval(() => {
      this.cleanupOfflineData();
    }, 24 * 60 * 60 * 1000);
  }

  // Setup service worker for offline caching
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('📴 Service Worker registered:', registration);
        })
        .catch(error => {
          console.log('📴 Service Worker registration failed:', error);
        });
    }
  }

  // Show sync notification
  showSyncNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      console.log(`📴 Sync: ${message}`);
    }
  }

  // Generate unique ID
  generateId() {
    return 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  }

  // Check if operation can be performed offline
  canPerformOffline(operation) {
    const offlineOperations = [
      'add_to_cart',
      'remove_from_cart',
      'update_quantity',
      'clear_cart',
      'cache_product_data'
    ];

    return offlineOperations.includes(operation);
  }

  // Perform offline cart operation
  performOfflineCartOperation(operation, data) {
    if (!this.canPerformOffline(operation)) {
      throw new Error(`Operation ${operation} cannot be performed offline`);
    }

    // Add to sync queue for later
    this.addToSyncQueue('update_cart', {
      operation: operation,
      data: data,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Get offline status
  getOfflineStatus() {
    return {
      isOnline: this.isOnline,
      syncQueueLength: this.syncQueue.length,
      offlineOrdersCount: this.offlineOrders.length,
      cachedDataCount: this.offlineData.size,
      lastSyncAttempt: this.lastSyncAttempt,
      syncInProgress: this.syncInProgress,
      syncRetryCount: this.syncRetryCount
    };
  }

  // Force sync (manual trigger)
  async forceSync() {
    if (!this.isOnline) {
      this.showSyncNotification('❌ Cannot sync while offline', 'danger');
      return false;
    }

    this.syncRetryCount = 0; // Reset retry count
    await this.attemptSync();
    return true;
  }

  // Export offline data (for debugging/backup)
  exportOfflineData() {
    return {
      syncQueue: this.syncQueue,
      offlineOrders: this.offlineOrders,
      cachedData: Array.from(this.offlineData.entries()),
      status: this.getOfflineStatus(),
      exportedAt: new Date().toISOString()
    };
  }

  // Import offline data (for restore)
  importOfflineData(data) {
    try {
      if (data.syncQueue) this.syncQueue = data.syncQueue;
      if (data.offlineOrders) this.offlineOrders = data.offlineOrders;
      if (data.cachedData) this.offlineData = new Map(data.cachedData);
      
      this.saveOfflineData();
      console.log('📴 Offline data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import offline data:', error);
      return false;
    }
  }
}

// Create global instance
export const offlineManager = new OfflineManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.offlineManager = offlineManager;
}
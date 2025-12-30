// Batch Operations Manager
// Optimizes network efficiency by batching operations and reducing API calls

export class BatchOperationsManager {
  constructor() {
    this.batchQueues = new Map();
    this.batchTimers = new Map();
    this.batchConfig = {
      defaultBatchSize: 10,
      defaultBatchDelay: 1000, // 1 second
      maxBatchDelay: 5000, // 5 seconds max wait
      operations: {
        analytics: { batchSize: 20, delay: 2000 },
        cart_sync: { batchSize: 5, delay: 500 },
        product_views: { batchSize: 15, delay: 1500 },
        error_reports: { batchSize: 10, delay: 1000 },
        performance_metrics: { batchSize: 25, delay: 3000 }
      }
    };
    
    this.networkOptimizer = new NetworkOptimizer();
    this.compressionManager = new CompressionManager();
    
    console.log('📦 Batch Operations Manager initialized');
  }

  // Add operation to batch queue
  addToBatch(operationType, data, priority = 'normal') {
    const config = this.batchConfig.operations[operationType] || {
      batchSize: this.batchConfig.defaultBatchSize,
      delay: this.batchConfig.defaultBatchDelay
    };
    
    // Initialize queue if not exists
    if (!this.batchQueues.has(operationType)) {
      this.batchQueues.set(operationType, []);
    }
    
    const queue = this.batchQueues.get(operationType);
    
    // Add operation with metadata
    queue.push({
      data: data,
      timestamp: Date.now(),
      priority: priority,
      id: this.generateOperationId()
    });
    
    // Check if batch should be processed immediately
    if (priority === 'high' || queue.length >= config.batchSize) {
      this.processBatch(operationType);
    } else {
      // Schedule batch processing
      this.scheduleBatchProcessing(operationType, config.delay);
    }
    
    return queue.length;
  }

  // Schedule batch processing
  scheduleBatchProcessing(operationType, delay) {
    // Clear existing timer
    if (this.batchTimers.has(operationType)) {
      clearTimeout(this.batchTimers.get(operationType));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(operationType);
    }, delay);
    
    this.batchTimers.set(operationType, timer);
  }

  // Process batch for specific operation type
  async processBatch(operationType) {
    const queue = this.batchQueues.get(operationType);
    
    if (!queue || queue.length === 0) {
      return;
    }
    
    // Clear timer
    if (this.batchTimers.has(operationType)) {
      clearTimeout(this.batchTimers.get(operationType));
      this.batchTimers.delete(operationType);
    }
    
    // Extract operations to process
    const operations = [...queue];
    queue.length = 0; // Clear queue
    
    console.log(`📦 Processing batch: ${operationType} (${operations.length} operations)`);
    
    try {
      // Process based on operation type
      switch (operationType) {
        case 'analytics':
          await this.processAnalyticsBatch(operations);
          break;
        case 'cart_sync':
          await this.processCartSyncBatch(operations);
          break;
        case 'product_views':
          await this.processProductViewsBatch(operations);
          break;
        case 'error_reports':
          await this.processErrorReportsBatch(operations);
          break;
        case 'performance_metrics':
          await this.processPerformanceMetricsBatch(operations);
          break;
        default:
          await this.processGenericBatch(operationType, operations);
      }
      
      console.log(`✅ Batch processed successfully: ${operationType}`);
    } catch (error) {
      console.error(`❌ Batch processing failed: ${operationType}`, error);
      
      // Re-queue failed operations with lower priority
      this.requeueFailedOperations(operationType, operations);
    }
  }

  // Process analytics batch
  async processAnalyticsBatch(operations) {
    const analyticsData = {
      batch_id: this.generateBatchId(),
      timestamp: Date.now(),
      events: operations.map(op => op.data),
      metadata: {
        batch_size: operations.length,
        time_span: this.calculateTimeSpan(operations),
        compression_used: true
      }
    };
    
    // Compress data for network efficiency
    const compressedData = await this.compressionManager.compress(analyticsData);
    
    // Send to analytics endpoint (simulated)
    await this.networkOptimizer.sendBatchRequest('/api/analytics/batch', compressedData, {
      compression: 'gzip',
      batch: true
    });
    
    // Store locally as backup
    this.storeAnalyticsBatch(analyticsData);
  }

  // Process cart sync batch
  async processCartSyncBatch(operations) {
    const cartOperations = {
      batch_id: this.generateBatchId(),
      timestamp: Date.now(),
      operations: operations.map(op => ({
        type: op.data.type,
        product_id: op.data.product_id,
        quantity: op.data.quantity,
        timestamp: op.timestamp
      })),
      cart_state: operations[operations.length - 1]?.data.cart_state
    };
    
    // Optimize cart operations (merge duplicate operations)
    const optimizedOperations = this.optimizeCartOperations(cartOperations.operations);
    cartOperations.operations = optimizedOperations;
    
    // Send to cart sync endpoint
    await this.networkOptimizer.sendBatchRequest('/api/cart/sync', cartOperations, {
      priority: 'high',
      retry: true
    });
  }

  // Process product views batch
  async processProductViewsBatch(operations) {
    const viewsData = {
      batch_id: this.generateBatchId(),
      timestamp: Date.now(),
      views: operations.map(op => ({
        product_id: op.data.product_id,
        view_duration: op.data.duration,
        timestamp: op.timestamp,
        user_agent: navigator.userAgent
      }))
    };
    
    // Aggregate views by product
    const aggregatedViews = this.aggregateProductViews(viewsData.views);
    viewsData.aggregated_views = aggregatedViews;
    
    // Send to product analytics endpoint
    await this.networkOptimizer.sendBatchRequest('/api/products/views', viewsData);
  }

  // Process error reports batch
  async processErrorReportsBatch(operations) {
    const errorReports = {
      batch_id: this.generateBatchId(),
      timestamp: Date.now(),
      errors: operations.map(op => ({
        error_type: op.data.type,
        message: op.data.message,
        stack: op.data.stack,
        url: op.data.url,
        timestamp: op.timestamp,
        user_agent: navigator.userAgent,
        browser_info: this.getBrowserInfo()
      }))
    };
    
    // Compress error data
    const compressedErrors = await this.compressionManager.compress(errorReports);
    
    // Send to error reporting endpoint
    await this.networkOptimizer.sendBatchRequest('/api/errors/batch', compressedErrors, {
      priority: 'high',
      compression: 'gzip'
    });
  }

  // Process performance metrics batch
  async processPerformanceMetricsBatch(operations) {
    const metricsData = {
      batch_id: this.generateBatchId(),
      timestamp: Date.now(),
      metrics: operations.map(op => op.data),
      summary: this.calculateMetricsSummary(operations)
    };
    
    // Send to performance monitoring endpoint
    await this.networkOptimizer.sendBatchRequest('/api/performance/metrics', metricsData);
  }

  // Process generic batch
  async processGenericBatch(operationType, operations) {
    const batchData = {
      batch_id: this.generateBatchId(),
      operation_type: operationType,
      timestamp: Date.now(),
      operations: operations.map(op => op.data)
    };
    
    // Send to generic batch endpoint
    await this.networkOptimizer.sendBatchRequest(`/api/batch/${operationType}`, batchData);
  }

  // Optimize cart operations by merging duplicates
  optimizeCartOperations(operations) {
    const optimized = new Map();
    
    operations.forEach(op => {
      const key = `${op.product_id}_${op.type}`;
      
      if (optimized.has(key)) {
        const existing = optimized.get(key);
        
        // Merge quantities for add operations
        if (op.type === 'add' && existing.type === 'add') {
          existing.quantity += op.quantity;
          existing.timestamp = Math.max(existing.timestamp, op.timestamp);
        } else {
          // Use latest operation for other types
          if (op.timestamp > existing.timestamp) {
            optimized.set(key, op);
          }
        }
      } else {
        optimized.set(key, { ...op });
      }
    });
    
    return Array.from(optimized.values());
  }

  // Aggregate product views
  aggregateProductViews(views) {
    const aggregated = new Map();
    
    views.forEach(view => {
      if (aggregated.has(view.product_id)) {
        const existing = aggregated.get(view.product_id);
        existing.view_count++;
        existing.total_duration += view.view_duration || 0;
        existing.last_viewed = Math.max(existing.last_viewed, view.timestamp);
      } else {
        aggregated.set(view.product_id, {
          product_id: view.product_id,
          view_count: 1,
          total_duration: view.view_duration || 0,
          first_viewed: view.timestamp,
          last_viewed: view.timestamp
        });
      }
    });
    
    return Array.from(aggregated.values());
  }

  // Calculate metrics summary
  calculateMetricsSummary(operations) {
    const metrics = operations.map(op => op.data);
    
    const summary = {
      total_operations: metrics.length,
      time_span: this.calculateTimeSpan(operations),
      performance_averages: {},
      error_count: 0
    };
    
    // Calculate averages for numeric metrics
    const numericMetrics = {};
    
    metrics.forEach(metric => {
      Object.keys(metric).forEach(key => {
        if (typeof metric[key] === 'number') {
          if (!numericMetrics[key]) {
            numericMetrics[key] = [];
          }
          numericMetrics[key].push(metric[key]);
        }
        
        if (key.includes('error') || metric[key] === 'error') {
          summary.error_count++;
        }
      });
    });
    
    // Calculate averages
    Object.keys(numericMetrics).forEach(key => {
      const values = numericMetrics[key];
      summary.performance_averages[key] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    
    return summary;
  }

  // Calculate time span of operations
  calculateTimeSpan(operations) {
    if (operations.length === 0) return 0;
    
    const timestamps = operations.map(op => op.timestamp);
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  // Re-queue failed operations
  requeueFailedOperations(operationType, operations) {
    // Re-add operations with lower priority and exponential backoff
    const delay = Math.min(
      this.batchConfig.defaultBatchDelay * 2,
      this.batchConfig.maxBatchDelay
    );
    
    setTimeout(() => {
      operations.forEach(op => {
        this.addToBatch(operationType, op.data, 'low');
      });
    }, delay);
    
    console.log(`🔄 Re-queued ${operations.length} failed operations for ${operationType}`);
  }

  // Store analytics batch locally
  storeAnalyticsBatch(batchData) {
    try {
      const stored = JSON.parse(localStorage.getItem('analytics_batches') || '[]');
      stored.push({
        ...batchData,
        stored_at: Date.now()
      });
      
      // Keep only last 10 batches
      if (stored.length > 10) {
        stored.splice(0, stored.length - 10);
      }
      
      localStorage.setItem('analytics_batches', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store analytics batch:', error);
    }
  }

  // Generate operation ID
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Generate batch ID
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Get browser info
  getBrowserInfo() {
    return {
      user_agent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookie_enabled: navigator.cookieEnabled,
      online: navigator.onLine
    };
  }

  // Get batch statistics
  getBatchStatistics() {
    const stats = {
      active_queues: this.batchQueues.size,
      pending_operations: 0,
      scheduled_batches: this.batchTimers.size,
      queue_details: {}
    };
    
    for (const [type, queue] of this.batchQueues.entries()) {
      stats.pending_operations += queue.length;
      stats.queue_details[type] = {
        pending: queue.length,
        oldest_operation: queue.length > 0 ? 
          Date.now() - Math.min(...queue.map(op => op.timestamp)) : 0
      };
    }
    
    return stats;
  }

  // Force process all batches
  async forceProcessAllBatches() {
    console.log('🚀 Force processing all batches...');
    
    const promises = [];
    
    for (const operationType of this.batchQueues.keys()) {
      promises.push(this.processBatch(operationType));
    }
    
    await Promise.allSettled(promises);
    
    console.log('✅ All batches processed');
  }

  // Clear all batches
  clearAllBatches() {
    this.batchQueues.clear();
    
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    this.batchTimers.clear();
    
    console.log('🧹 All batches cleared');
  }
}

// Network Optimizer for efficient requests
class NetworkOptimizer {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
  }

  // Send batch request with optimization
  async sendBatchRequest(endpoint, data, options = {}) {
    const request = {
      endpoint: endpoint,
      data: data,
      options: options,
      timestamp: Date.now(),
      retries: 0
    };
    
    return this.executeRequest(request);
  }

  // Execute request with retry logic
  async executeRequest(request) {
    try {
      // Simulate API call (replace with actual implementation)
      const response = await this.simulateAPICall(request);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (request.retries < this.retryConfig.maxRetries) {
        request.retries++;
        
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, request.retries - 1),
          this.retryConfig.maxDelay
        );
        
        console.log(`🔄 Retrying request to ${request.endpoint} (attempt ${request.retries}/${this.retryConfig.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest(request);
      }
      
      throw error;
    }
  }

  // Simulate API call (replace with actual fetch)
  async simulateAPICall(request) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Network error (simulated)');
    }
    
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ success: true, batch_id: request.data.batch_id })
    };
  }
}

// Compression Manager for data optimization
class CompressionManager {
  constructor() {
    this.compressionEnabled = 'CompressionStream' in window;
  }

  // Compress data (simplified implementation)
  async compress(data) {
    if (!this.compressionEnabled) {
      return data;
    }
    
    try {
      const jsonString = JSON.stringify(data);
      
      // Simple compression simulation (in real implementation, use actual compression)
      const compressed = {
        compressed: true,
        original_size: jsonString.length,
        data: jsonString, // In real implementation, this would be compressed
        compression_ratio: 0.7 // Simulated 30% compression
      };
      
      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  // Decompress data
  async decompress(compressedData) {
    if (!compressedData.compressed) {
      return compressedData;
    }
    
    try {
      // In real implementation, decompress the data
      return JSON.parse(compressedData.data);
    } catch (error) {
      console.error('Decompression failed:', error);
      return compressedData;
    }
  }
}

// Create global instance
export const batchOperationsManager = new BatchOperationsManager();

// Export for global access
if (typeof window !== 'undefined') {
  window.batchOperationsManager = batchOperationsManager;
}
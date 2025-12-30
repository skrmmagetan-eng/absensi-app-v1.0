// Analytics Tracker - Comprehensive tracking for Quick Order system
// Tracks user behavior, performance metrics, and business intelligence data

export class AnalyticsTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.events = [];
    this.metrics = new Map();
    this.startTime = Date.now();
    this.isEnabled = true;
    this.batchSize = 10;
    this.flushInterval = 30000; // 30 seconds
    
    this.init();
  }

  // Initialize analytics tracker
  init() {
    this.loadStoredEvents();
    this.setupUserTracking();
    this.setupPerformanceTracking();
    this.setupBehaviorTracking();
    this.setupAutoFlush();
    
    console.log('📊 Analytics tracker initialized');
  }

  // Generate unique session ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  }

  // Setup user tracking
  setupUserTracking() {
    // Get user info from state if available
    if (window.state?.getState) {
      const user = window.state.getState('user');
      if (user) {
        this.userId = user.id;
        this.trackEvent('session_start', {
          user_id: user.id,
          user_role: user.role,
          session_id: this.sessionId
        });
      }
    }

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session_pause', {
          duration: Date.now() - this.startTime
        });
      } else {
        this.trackEvent('session_resume', {
          pause_duration: Date.now() - this.startTime
        });
        this.startTime = Date.now();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        total_duration: Date.now() - this.startTime,
        events_count: this.events.length
      });
      this.flush(true); // Force immediate flush
    });
  }

  // Setup performance tracking
  setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      if (performance.timing) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        
        this.trackEvent('page_load_performance', {
          load_time: loadTime,
          dom_ready: timing.domContentLoadedEventEnd - timing.navigationStart,
          first_paint: timing.responseStart - timing.navigationStart,
          dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcp_connect: timing.connectEnd - timing.connectStart
        });
      }
    });

    // Track resource loading
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(r => r.duration > 1000);
      
      if (slowResources.length > 0) {
        this.trackEvent('slow_resources', {
          count: slowResources.length,
          resources: slowResources.map(r => ({
            name: r.name,
            duration: r.duration,
            type: r.initiatorType
          }))
        });
      }
    }

    // Track memory usage if available
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        this.updateMetric('memory_usage', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usage_percent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        });
      }, 60000); // Every minute
    }
  }

  // Setup behavior tracking
  setupBehaviorTracking() {
    // Track clicks on important elements
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-track]');
      if (target) {
        const trackingData = target.dataset.track;
        this.trackEvent('element_click', {
          element: trackingData,
          tag: target.tagName,
          classes: target.className,
          text: target.textContent?.substring(0, 50)
        });
      }
    });

    // Track form interactions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        this.trackEvent('form_submit', {
          form_id: form.id,
          form_action: form.action,
          fields_count: form.elements.length
        });
      }
    });

    // Track scroll behavior
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        this.updateMetric('max_scroll_depth', Math.max(this.getMetric('max_scroll_depth') || 0, scrollPercent));
      }, 100);
    });
  }

  // Setup auto flush
  setupAutoFlush() {
    setInterval(() => {
      if (this.events.length >= this.batchSize) {
        this.flush();
      }
    }, this.flushInterval);
  }

  // Track event
  trackEvent(eventType, data = {}) {
    if (!this.isEnabled) return;

    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: Date.now(),
      session_id: this.sessionId,
      user_id: this.userId,
      url: window.location.href,
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      data: data
    };

    this.events.push(event);
    this.storeEvents();

    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush();
    }

    console.log('📊 Event tracked:', eventType, data);
  }

  // Update metric
  updateMetric(key, value) {
    this.metrics.set(key, {
      value: value,
      timestamp: Date.now(),
      session_id: this.sessionId
    });
  }

  // Get metric
  getMetric(key) {
    const metric = this.metrics.get(key);
    return metric ? metric.value : null;
  }

  // Track cart events
  trackCartEvent(eventType, cartData) {
    this.trackEvent(`cart_${eventType}`, {
      cart_session_id: cartData.sessionId || 'unknown',
      item_count: cartData.itemCount || 0,
      total_amount: cartData.total || 0,
      unique_products: cartData.items?.length || 0,
      cart_data: cartData
    });
  }

  // Track order events
  trackOrderEvent(eventType, orderData) {
    this.trackEvent(`order_${eventType}`, {
      order_id: orderData.id,
      customer_id: orderData.customer_id,
      total_amount: orderData.total_amount,
      items_count: orderData.items?.length || 0,
      order_source: orderData.order_source || 'unknown',
      creation_method: orderData.creation_method || 'unknown',
      order_data: orderData
    });
  }

  // Track performance metrics
  trackPerformance(operation, startTime, endTime, metadata = {}) {
    const duration = endTime - startTime;
    
    this.trackEvent('performance_metric', {
      operation: operation,
      duration: duration,
      start_time: startTime,
      end_time: endTime,
      metadata: metadata
    });

    // Update performance metrics
    const key = `performance_${operation}`;
    const currentMetric = this.getMetric(key) || { count: 0, total: 0, min: Infinity, max: 0 };
    
    this.updateMetric(key, {
      count: currentMetric.count + 1,
      total: currentMetric.total + duration,
      average: (currentMetric.total + duration) / (currentMetric.count + 1),
      min: Math.min(currentMetric.min, duration),
      max: Math.max(currentMetric.max, duration),
      last: duration
    });
  }

  // Track user journey
  trackUserJourney(step, data = {}) {
    this.trackEvent('user_journey', {
      step: step,
      journey_data: data,
      sequence_number: this.getJourneySequence()
    });
  }

  // Get journey sequence number
  getJourneySequence() {
    const journeyEvents = this.events.filter(e => e.type === 'user_journey');
    return journeyEvents.length + 1;
  }

  // Track conversion funnel
  trackFunnelStep(funnel, step, data = {}) {
    this.trackEvent('funnel_step', {
      funnel: funnel,
      step: step,
      step_data: data,
      funnel_session: this.getFunnelSession(funnel)
    });
  }

  // Get funnel session
  getFunnelSession(funnel) {
    const funnelKey = `funnel_${funnel}`;
    let funnelSession = this.getMetric(funnelKey);
    
    if (!funnelSession) {
      funnelSession = this.generateEventId();
      this.updateMetric(funnelKey, funnelSession);
    }
    
    return funnelSession;
  }

  // Track error events
  trackError(error, context = {}) {
    this.trackEvent('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.constructor.name,
      context: context,
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  // Track feature usage
  trackFeatureUsage(feature, action, data = {}) {
    this.trackEvent('feature_usage', {
      feature: feature,
      action: action,
      usage_data: data,
      feature_session: this.getFeatureSession(feature)
    });
  }

  // Get feature session
  getFeatureSession(feature) {
    const featureKey = `feature_${feature}`;
    let featureSession = this.getMetric(featureKey);
    
    if (!featureSession) {
      featureSession = {
        session_id: this.generateEventId(),
        start_time: Date.now(),
        usage_count: 0
      };
      this.updateMetric(featureKey, featureSession);
    }
    
    featureSession.usage_count++;
    featureSession.last_used = Date.now();
    this.updateMetric(featureKey, featureSession);
    
    return featureSession.session_id;
  }

  // Generate event ID
  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  }

  // Store events in localStorage
  storeEvents() {
    try {
      const stored = {
        events: this.events,
        metrics: Array.from(this.metrics.entries()),
        session_id: this.sessionId,
        user_id: this.userId,
        last_updated: Date.now()
      };
      
      localStorage.setItem('analytics_data', JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store analytics data:', error);
    }
  }

  // Load stored events
  loadStoredEvents() {
    try {
      const stored = localStorage.getItem('analytics_data');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Only load recent events (last 24 hours)
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.events = data.events?.filter(e => e.timestamp > dayAgo) || [];
        
        if (data.metrics) {
          this.metrics = new Map(data.metrics);
        }
      }
    } catch (error) {
      console.error('Failed to load stored analytics data:', error);
      this.events = [];
      this.metrics = new Map();
    }
  }

  // Flush events to server
  async flush(force = false) {
    if (!this.isEnabled || (this.events.length === 0 && !force)) {
      return;
    }

    const eventsToSend = [...this.events];
    const metricsToSend = Array.from(this.metrics.entries());
    
    try {
      // In a real implementation, this would send to your analytics server
      console.log('📊 Flushing analytics data:', {
        events: eventsToSend.length,
        metrics: metricsToSend.length,
        session_id: this.sessionId
      });
      
      // Simulate API call
      await this.sendToAnalyticsServer(eventsToSend, metricsToSend);
      
      // Clear sent events
      this.events = [];
      this.storeEvents();
      
    } catch (error) {
      console.error('Failed to flush analytics data:', error);
      
      // Keep events for retry
      this.trackError(error, { context: 'analytics_flush' });
    }
  }

  // Send data to analytics server (mock implementation)
  async sendToAnalyticsServer(events, metrics) {
    // This would be replaced with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('📊 Analytics data sent to server (mock)');
        resolve();
      }, 100);
    });
  }

  // Get analytics summary
  getAnalyticsSummary() {
    const summary = {
      session_id: this.sessionId,
      user_id: this.userId,
      session_duration: Date.now() - this.startTime,
      events_count: this.events.length,
      metrics_count: this.metrics.size,
      top_events: this.getTopEvents(),
      performance_metrics: this.getPerformanceMetrics(),
      user_journey: this.getUserJourney()
    };
    
    return summary;
  }

  // Get top events
  getTopEvents(limit = 5) {
    const eventCounts = {};
    
    this.events.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    return Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const perfMetrics = {};
    
    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith('performance_')) {
        perfMetrics[key] = value.value;
      }
    }
    
    return perfMetrics;
  }

  // Get user journey
  getUserJourney() {
    return this.events
      .filter(e => e.type === 'user_journey')
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => ({
        step: e.data.step,
        timestamp: e.timestamp,
        sequence: e.data.sequence_number
      }));
  }

  // Enable/disable tracking
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.trackEvent('analytics_enabled');
    } else {
      this.trackEvent('analytics_disabled');
      this.flush(true);
    }
  }

  // Clear all data
  clearData() {
    this.events = [];
    this.metrics.clear();
    localStorage.removeItem('analytics_data');
    
    this.trackEvent('analytics_cleared');
  }

  // Export data for debugging
  exportData() {
    return {
      session_id: this.sessionId,
      user_id: this.userId,
      events: this.events,
      metrics: Array.from(this.metrics.entries()),
      summary: this.getAnalyticsSummary(),
      exported_at: Date.now()
    };
  }

  // Import data (for testing/debugging)
  importData(data) {
    try {
      if (data.events) this.events = data.events;
      if (data.metrics) this.metrics = new Map(data.metrics);
      if (data.session_id) this.sessionId = data.session_id;
      if (data.user_id) this.userId = data.user_id;
      
      this.storeEvents();
      this.trackEvent('analytics_imported');
      
      return true;
    } catch (error) {
      console.error('Failed to import analytics data:', error);
      return false;
    }
  }
}

// Create global instance
export const analyticsTracker = new AnalyticsTracker();

// Export for global access
if (typeof window !== 'undefined') {
  window.analyticsTracker = analyticsTracker;
  
  // Track global errors
  window.addEventListener('error', (e) => {
    analyticsTracker.trackError(e.error, {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno
    });
  });
  
  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    analyticsTracker.trackError(new Error(e.reason), {
      type: 'unhandled_promise_rejection'
    });
  });
}
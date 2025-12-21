/**
 * Vercel Speed Insights Integration
 * 
 * This module initializes Vercel Speed Insights for performance monitoring.
 * It provides a simple interface to inject Speed Insights tracking into the app.
 */

import { injectSpeedInsights } from '@vercel/speed-insights';

/**
 * Initialize Vercel Speed Insights
 * This should be called once when the app starts
 */
export function initializeSpeedInsights() {
  try {
    // Inject Speed Insights tracking script
    injectSpeedInsights();
    console.log('✅ Vercel Speed Insights initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Speed Insights:', error);
    // Don't throw - Speed Insights is not critical to app functionality
  }
}

/**
 * Optional: Send custom performance events to Speed Insights
 * Can be used to track custom metrics
 */
export function trackPerformanceMetric(metricName, metricValue) {
  try {
    // Check if Speed Insights global is available
    if (window.si && typeof window.si === 'function') {
      window.si('event', {
        name: metricName,
        value: metricValue,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.warn('⚠️ Failed to track metric:', error);
  }
}

export default {
  initializeSpeedInsights,
  trackPerformanceMetric
};

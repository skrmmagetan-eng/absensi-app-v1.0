// Notification Manager - Prevents notification overlap and manages priority
// Ensures only one important notification is shown at a time

export class NotificationManager {
  constructor() {
    this.activeNotifications = new Set();
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    this.currentPriorityNotification = null;
  }

  // Check if any priority notification is currently active
  hasPriorityNotification() {
    return this.currentPriorityNotification !== null;
  }

  // Register a priority notification (version updates, deployment, etc.)
  registerPriorityNotification(id, element) {
    this.currentPriorityNotification = { id, element };
    this.activeNotifications.add(id);
    
    // Set up cleanup when notification is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === element) {
            this.clearPriorityNotification(id);
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Clear priority notification
  clearPriorityNotification(id) {
    if (this.currentPriorityNotification?.id === id) {
      this.currentPriorityNotification = null;
    }
    this.activeNotifications.delete(id);
  }

  // Check if a specific notification type is active
  isNotificationActive(id) {
    return this.activeNotifications.has(id);
  }

  // Queue a notification to show after current ones finish
  queueNotification(notification) {
    this.notificationQueue.push(notification);
    this.processQueue();
  }

  // Process notification queue
  async processQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.notificationQueue.length > 0) {
      // Wait for priority notifications to clear
      if (this.hasPriorityNotification()) {
        await this.waitForPriorityNotificationClear();
      }

      const notification = this.notificationQueue.shift();
      
      try {
        await notification.action();
        
        // Wait before showing next notification
        if (this.notificationQueue.length > 0) {
          await this.delay(notification.spacing || 2000);
        }
      } catch (error) {
        console.error('Error showing queued notification:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  // Wait for priority notification to be cleared
  waitForPriorityNotificationClear() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.hasPriorityNotification()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 60000);
    });
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Dismiss all notifications of a specific type
  dismissNotificationType(type) {
    const notifications = document.querySelectorAll(`[data-notification-type="${type}"]`);
    notifications.forEach(notification => {
      notification.remove();
    });
  }

  // Get notification statistics
  getStats() {
    return {
      activeNotifications: Array.from(this.activeNotifications),
      queueLength: this.notificationQueue.length,
      hasPriorityNotification: this.hasPriorityNotification(),
      isProcessingQueue: this.isProcessingQueue
    };
  }

  // Clear all notifications and queue
  clearAll() {
    this.activeNotifications.clear();
    this.notificationQueue = [];
    this.currentPriorityNotification = null;
    this.isProcessingQueue = false;
    
    // Remove all notification elements
    const notifications = document.querySelectorAll('[data-notification-type]');
    notifications.forEach(notification => notification.remove());
  }
}

// Create global instance
export const notificationManager = new NotificationManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.notificationManager = notificationManager;
}
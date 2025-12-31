// Deployment Notification System
// Shows users about successful deployment and new features

import { notificationManager } from './notification-manager.js';

export class DeploymentNotificationManager {
  constructor() {
    this.DEPLOYMENT_KEY = 'deployment_v2_2_1_notified';
    this.DEPLOYMENT_VERSION = '2.2.1';
    this.DEPLOYMENT_DATE = new Date().toISOString();
  }

  // Check if deployment notification should be shown
  shouldShowDeploymentNotification() {
    const hasSeenDeployment = localStorage.getItem(this.DEPLOYMENT_KEY);
    return !hasSeenDeployment;
  }

  // Show deployment success notification
  showDeploymentSuccess() {
    if (!this.shouldShowDeploymentNotification()) return;

    setTimeout(() => {
      this.createDeploymentNotification();
    }, 3000); // Show after 3 seconds to let page load
  }

  createDeploymentNotification() {
    // Check if there's already a priority notification active
    if (notificationManager.hasPriorityNotification()) {
      console.log('⏳ Deployment notification queued - waiting for current notification to finish');
      notificationManager.queueNotification({
        action: () => this.showDeploymentNotification(),
        spacing: 3000
      });
      return;
    }

    this.showDeploymentNotification();
  }

  showDeploymentNotification() {
    // Remove existing notification if any
    const existingNotification = document.getElementById('deployment-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.id = 'deployment-notification';
    notification.setAttribute('data-notification-type', 'deployment');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        z-index: 10001;
        max-width: 350px;
        animation: slideInRight 0.5s ease-out;
        border: 1px solid rgba(255, 255, 255, 0.2);
      ">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 2rem; flex-shrink: 0;">🚀</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px;">
              Deployment Berhasil!
            </div>
            <div style="font-size: 14px; opacity: 0.95; margin-bottom: 12px;">
              SKRM v${this.DEPLOYMENT_VERSION} telah berhasil di-deploy dengan perbaikan notifikasi dan session timeout.
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button id="explore-features-btn" style="
                background: white;
                color: #059669;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
              ">
                🔧 Coba Perbaikan
              </button>
              <button id="dismiss-deployment-btn" style="
                background: transparent;
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.6);
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
              ">
                OK
              </button>
            </div>
          </div>
          <button id="close-deployment-btn" style="
            background: transparent;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            opacity: 0.7;
            transition: opacity 0.2s;
          ">×</button>
        </div>
      </div>

      <style>
        @keyframes slideInRight {
          from { 
            opacity: 0; 
            transform: translateX(100px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        @keyframes slideOutRight {
          from { 
            opacity: 1; 
            transform: translateX(0); 
          }
          to { 
            opacity: 0; 
            transform: translateX(100px); 
          }
        }
      </style>
    `;

    document.body.appendChild(notification);

    // Register as priority notification
    notificationManager.registerPriorityNotification('deployment', notification);

    // Event listeners
    const closeNotification = () => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => {
        notification.remove();
        notificationManager.clearPriorityNotification('deployment');
      }, 300);
      localStorage.setItem(this.DEPLOYMENT_KEY, 'true');
    };

    document.getElementById('close-deployment-btn').addEventListener('click', closeNotification);
    document.getElementById('dismiss-deployment-btn').addEventListener('click', closeNotification);

    document.getElementById('explore-features-btn').addEventListener('click', () => {
      localStorage.setItem(this.DEPLOYMENT_KEY, 'true');
      closeNotification();
      
      // Navigate to catalog page to show Quick Order
      setTimeout(() => {
        window.location.hash = '#katalog';
      }, 300);
    });

    // Extended auto dismiss - 30 seconds instead of 15
    setTimeout(() => {
      if (document.getElementById('deployment-notification')) {
        closeNotification();
      }
    }, 30000);
  }

  // Show deployment status in console
  logDeploymentStatus() {
    console.log(`
🚀 SKRM Deployment Status
========================
Version: ${this.DEPLOYMENT_VERSION}
Deployed: ${new Date(this.DEPLOYMENT_DATE).toLocaleString()}
Features: Quick Order System
Status: ✅ Production Ready

New Features:
• 🛒 Quick Order dari Katalog
• 📱 Mobile-optimized shopping cart
• 🔄 Offline support untuk keranjang
• 🎯 Smart customer selection
• 🔒 Enhanced security validation
• ♿ Accessibility improvements
    `);
  }

  // Reset deployment notification (for testing)
  resetDeploymentNotification() {
    localStorage.removeItem(this.DEPLOYMENT_KEY);
  }
}

// Create global instance
export const deploymentNotificationManager = new DeploymentNotificationManager();
// Session Validator - Ensures user session is valid before operations
// Provides consistent session validation across the application

import { state } from '../lib/router.js';
import { showNotification } from './helpers.js';

export class SessionValidator {
  // Validate user session and return user data
  static validateUserSession(redirectOnFail = true) {
    const user = state.getState('user');
    const profile = state.getState('profile');
    
    if (!user || !user.id) {
      if (redirectOnFail) {
        showNotification('Sesi pengguna tidak valid. Silakan login kembali.', 'danger');
        setTimeout(() => {
          window.location.hash = '#login';
        }, 2000);
      }
      return null;
    }
    
    return { user, profile };
  }

  // Validate user session with specific role requirements
  static validateUserWithRole(requiredRoles = [], redirectOnFail = true) {
    const sessionData = this.validateUserSession(redirectOnFail);
    
    if (!sessionData) {
      return null;
    }
    
    const { user, profile } = sessionData;
    
    if (requiredRoles.length > 0 && !requiredRoles.includes(profile?.role)) {
      if (redirectOnFail) {
        showNotification('Anda tidak memiliki akses untuk melakukan operasi ini.', 'danger');
        setTimeout(() => {
          window.location.hash = '#dashboard';
        }, 2000);
      }
      return null;
    }
    
    return { user, profile };
  }

  // Check if user session is valid without side effects
  static isSessionValid() {
    const user = state.getState('user');
    return user && user.id;
  }

  // Get user ID safely
  static getUserId() {
    const user = state.getState('user');
    return user?.id || null;
  }

  // Get user profile safely
  static getUserProfile() {
    const profile = state.getState('profile');
    return profile || null;
  }

  // Validate session and show appropriate error message
  static validateWithCustomError(errorMessage, redirectPath = '#login') {
    const user = state.getState('user');
    
    if (!user || !user.id) {
      showNotification(errorMessage, 'danger');
      setTimeout(() => {
        window.location.hash = redirectPath;
      }, 2000);
      return false;
    }
    
    return true;
  }

  // Enhanced validation for critical operations
  static validateForCriticalOperation(operationName) {
    const user = state.getState('user');
    const profile = state.getState('profile');
    
    if (!user || !user.id) {
      showNotification(`Tidak dapat melakukan ${operationName}: Sesi tidak valid`, 'danger');
      setTimeout(() => {
        window.location.hash = '#login';
      }, 2000);
      return null;
    }
    
    if (profile?.status === 'inactive') {
      showNotification(`Tidak dapat melakukan ${operationName}: Akun tidak aktif`, 'danger');
      return null;
    }
    
    return { user, profile };
  }
}

// Export singleton instance
export const sessionValidator = SessionValidator;
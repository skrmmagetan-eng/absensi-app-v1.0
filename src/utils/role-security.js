/**
 * Role Security Utility
 * Prevents unauthorized role switching and logs security events
 */

class RoleSecurity {
  constructor() {
    this.securityLog = [];
    this.maxLogEntries = 100;
  }

  log(event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.securityLog.unshift(entry);
    
    // Keep only recent entries
    if (this.securityLog.length > this.maxLogEntries) {
      this.securityLog = this.securityLog.slice(0, this.maxLogEntries);
    }
    
    // Log to console for debugging
    console.log(`🔒 [SECURITY] ${event}:`, details);
  }

  validateRoleChange(currentProfile, newProfile, context = 'unknown') {
    if (!currentProfile || !newProfile) {
      return true; // Allow initial profile setting
    }

    if (currentProfile.id !== newProfile.id) {
      this.log('PROFILE_ID_MISMATCH', {
        context,
        currentId: currentProfile.id,
        newId: newProfile.id,
        currentEmail: currentProfile.email,
        newEmail: newProfile.email
      });
      return false;
    }

    if (currentProfile.role !== newProfile.role) {
      this.log('ROLE_CHANGE_ATTEMPT', {
        context,
        userId: currentProfile.id,
        email: currentProfile.email,
        oldRole: currentProfile.role,
        newRole: newProfile.role
      });
      
      // For security, we don't allow automatic role changes
      // User must re-login to get new role
      return false;
    }

    return true;
  }

  validateUserProfile(profile, expectedUserId) {
    if (!profile) {
      this.log('PROFILE_NOT_FOUND', { expectedUserId });
      return false;
    }

    if (profile.id !== expectedUserId) {
      this.log('USER_ID_MISMATCH', {
        expectedId: expectedUserId,
        receivedId: profile.id,
        email: profile.email
      });
      return false;
    }

    if (profile.status === 'inactive') {
      this.log('INACTIVE_ACCOUNT_ACCESS', {
        userId: profile.id,
        email: profile.email
      });
      return false;
    }

    return true;
  }

  checkAdminAccess(profile, route) {
    if (!profile) {
      this.log('ADMIN_ACCESS_NO_PROFILE', { route });
      return false;
    }

    if (!['admin', 'manager'].includes(profile.role)) {
      this.log('UNAUTHORIZED_ADMIN_ACCESS', {
        route,
        userId: profile.id,
        email: profile.email,
        role: profile.role
      });
      return false;
    }

    this.log('ADMIN_ACCESS_GRANTED', {
      route,
      userId: profile.id,
      email: profile.email,
      role: profile.role
    });
    return true;
  }

  getSecurityLog() {
    return [...this.securityLog];
  }

  clearLog() {
    this.securityLog = [];
    this.log('SECURITY_LOG_CLEARED');
  }

  exportLog() {
    const logData = {
      exportTime: new Date().toISOString(),
      entries: this.securityLog
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Create global instance
export const roleSecurity = new RoleSecurity();

// Add to window for debugging
if (typeof window !== 'undefined') {
  window.roleSecurity = roleSecurity;
}
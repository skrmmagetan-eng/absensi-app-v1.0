// Fix untuk masalah role switching otomatis
// Masalah: Employee berubah jadi admin secara otomatis

console.log('🔧 APPLYING ROLE SWITCHING FIX');

// 1. Backup original functions
const originalValidateUserStatus = window.securityManager?.validateUserStatus;
const originalGetUserProfile = db.getUserProfile;

// 2. Enhanced getUserProfile with logging
db.getUserProfile = async function(userId) {
  console.log('🔍 getUserProfile called with ID:', userId);
  
  const result = await originalGetUserProfile.call(this, userId);
  
  console.log('📊 getUserProfile result:', {
    userId,
    profile: result.data,
    error: result.error
  });
  
  // Additional validation - check if this is the correct user
  const currentUser = state.getState('user');
  if (currentUser && userId !== currentUser.id) {
    console.warn('⚠️ WARNING: Fetching profile for different user!');
    console.log('Current user ID:', currentUser.id);
    console.log('Requested user ID:', userId);
  }
  
  return result;
};

// 3. Enhanced validateUserStatus with additional checks
if (window.securityManager && originalValidateUserStatus) {
  window.securityManager.validateUserStatus = async function() {
    const user = state.getState('user');
    if (!user) return;
    
    console.log('🔒 Security validation for user:', user.id);
    
    try {
      // Double-check we're fetching the right user
      const { data: profile, error } = await db.getUserProfile(user.id);
      
      if (error || !profile) {
        console.error('❌ Profile fetch failed:', error);
        this.forceLogout('User profile not found');
        return;
      }
      
      console.log('✅ Profile fetched:', {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.name
      });
      
      // Verify this is the same user
      if (profile.id !== user.id) {
        console.error('❌ SECURITY BREACH: Profile ID mismatch!');
        console.log('Expected ID:', user.id);
        console.log('Received ID:', profile.id);
        this.forceLogout('Security validation failed - ID mismatch');
        return;
      }
      
      if (profile.status === 'inactive') {
        console.log('❌ Account inactive');
        this.forceLogout('Account has been deactivated');
        return;
      }
      
      // Update profile if changed - but with additional validation
      const currentProfile = state.getState('profile');
      if (currentProfile?.role !== profile.role) {
        console.warn('⚠️ ROLE CHANGE DETECTED!');
        console.log('Old role:', currentProfile?.role);
        console.log('New role:', profile.role);
        console.log('User ID:', profile.id);
        console.log('User email:', profile.email);
        
        // Additional check - verify this change is legitimate
        // For now, we'll be more conservative and not auto-update roles
        console.log('🛡️ Role change blocked for security - manual verification required');
        
        // Instead of auto-updating, force re-login
        this.forceLogout('Role change detected - please login again');
        return;
      }
      
      console.log('✅ Security validation passed');
      
    } catch (error) {
      console.error('❌ Security check failed:', error);
      this.forceLogout('Security validation failed');
    }
  };
}

// 4. Add monitoring for state changes
const originalUpdateState = state.updateState;
state.updateState = function(updates) {
  if (updates.profile) {
    const currentProfile = state.getState('profile');
    const newProfile = updates.profile;
    
    console.log('📝 Profile update requested:');
    console.log('Current:', currentProfile);
    console.log('New:', newProfile);
    
    // Check for suspicious role changes
    if (currentProfile && newProfile && currentProfile.role !== newProfile.role) {
      console.warn('🚨 SUSPICIOUS ROLE CHANGE BLOCKED!');
      console.log('Attempted change from', currentProfile.role, 'to', newProfile.role);
      console.log('Stack trace:', new Error().stack);
      
      // Block the role change
      const safeUpdates = { ...updates };
      delete safeUpdates.profile;
      
      if (Object.keys(safeUpdates).length > 0) {
        return originalUpdateState.call(this, safeUpdates);
      }
      return;
    }
  }
  
  return originalUpdateState.call(this, updates);
};

// 5. Disable automatic security validation temporarily
if (window.securityManager) {
  console.log('🛡️ Disabling automatic security validation');
  
  // Clear existing timers
  if (window.securityManager.securityTimer) {
    clearInterval(window.securityManager.securityTimer);
    window.securityManager.securityTimer = null;
  }
  
  // Replace with manual validation only
  window.securityManager.startSecurityValidation = function() {
    console.log('🛡️ Security validation disabled - manual mode only');
  };
}

console.log('✅ Role switching fix applied');
console.log('📋 Changes made:');
console.log('- Enhanced getUserProfile logging');
console.log('- Blocked automatic role changes');
console.log('- Disabled automatic security validation');
console.log('- Added state change monitoring');

// Helper function to manually validate if needed
window.manualSecurityCheck = async function() {
  const user = state.getState('user');
  if (!user) {
    console.log('❌ No user logged in');
    return;
  }
  
  console.log('🔍 Manual security check for:', user.email);
  
  const { data: profile, error } = await db.getUserProfile(user.id);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Current profile:', profile);
  return profile;
};

console.log('\n🔧 Available commands:');
console.log('- manualSecurityCheck() - Check current user profile');
console.log('- state.getState("profile") - Get current profile from state');
console.log('- state.getState("user") - Get current user from state');
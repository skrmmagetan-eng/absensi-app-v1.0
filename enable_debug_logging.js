// Enable detailed logging for role switching debugging
// Copy paste this into browser console after login

console.log('🔍 ENABLING DETAILED ROLE SWITCHING DEBUG');

// 1. Monitor all database calls
const originalGetUserProfile = db.getUserProfile;
db.getUserProfile = async function(userId) {
  console.log('📊 [DB] getUserProfile called:', {
    requestedUserId: userId,
    currentUser: state.getState('user')?.id,
    currentProfile: state.getState('profile')?.role,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack.split('\n').slice(1, 4)
  });
  
  const result = await originalGetUserProfile.call(this, userId);
  
  console.log('📊 [DB] getUserProfile result:', {
    requestedUserId: userId,
    resultProfile: result.data,
    error: result.error,
    timestamp: new Date().toISOString()
  });
  
  return result;
};

// 2. Monitor state changes
const originalUpdateState = state.updateState;
state.updateState = function(updates) {
  if (updates.profile || updates.user) {
    console.log('📝 [STATE] Update requested:', {
      updates: updates,
      currentState: {
        user: state.getState('user'),
        profile: state.getState('profile')
      },
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack.split('\n').slice(1, 4)
    });
  }
  
  return originalUpdateState.call(this, updates);
};

// 3. Monitor navigation
const originalNavigate = router.navigate;
router.navigate = async function(path, skipHistory) {
  console.log('🧭 [ROUTER] Navigation:', {
    path: path,
    currentUser: state.getState('user')?.email,
    currentRole: state.getState('profile')?.role,
    timestamp: new Date().toISOString()
  });
  
  return originalNavigate.call(this, path, skipHistory);
};

// 4. Monitor authentication state changes
auth.onAuthStateChange((event, session) => {
  console.log('🔐 [AUTH] State change:', {
    event: event,
    userId: session?.user?.id,
    email: session?.user?.email,
    currentProfile: state.getState('profile')?.role,
    timestamp: new Date().toISOString()
  });
});

// 5. Set up periodic monitoring
let monitoringInterval = setInterval(() => {
  const user = state.getState('user');
  const profile = state.getState('profile');
  
  console.log('⏰ [MONITOR] Periodic check:', {
    userId: user?.id,
    userEmail: user?.email,
    profileRole: profile?.role,
    profileName: profile?.name,
    timestamp: new Date().toISOString()
  });
}, 30000); // Every 30 seconds

// 6. Helper functions
window.debugRoleIssue = {
  stopMonitoring: () => {
    clearInterval(monitoringInterval);
    console.log('🛑 Monitoring stopped');
  },
  
  getCurrentState: () => {
    return {
      user: state.getState('user'),
      profile: state.getState('profile'),
      timestamp: new Date().toISOString()
    };
  },
  
  forceProfileRefresh: async () => {
    const user = state.getState('user');
    if (user) {
      console.log('🔄 Force refreshing profile...');
      const result = await db.getUserProfile(user.id);
      console.log('🔄 Fresh profile:', result);
      return result;
    }
  },
  
  clearAllData: () => {
    sessionStorage.clear();
    localStorage.clear();
    console.log('🧹 All browser data cleared');
  }
};

console.log('✅ Debug logging enabled');
console.log('📋 Available commands:');
console.log('- debugRoleIssue.getCurrentState()');
console.log('- debugRoleIssue.forceProfileRefresh()');
console.log('- debugRoleIssue.clearAllData()');
console.log('- debugRoleIssue.stopMonitoring()');

console.log('🎯 Now use the app normally and watch the console for detailed logs');
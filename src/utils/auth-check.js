// Auto-login check and session management

import { auth, db } from '../lib/supabase.js';
import { state } from '../lib/router.js';
import { router } from '../lib/router.js';

export const authChecker = {
  async checkAuthOnAppStart() {
    try {
      // Check if user is already logged in
      const { data: { session } } = await auth.getSession();
      
      if (session?.user) {
        // User is logged in, restore state
        const userData = {
          id: session.user.id,
          email: session.user.email,
          ...session.user.user_metadata
        };
        
        state.setState('user', userData);
        
        // Try to get profile from database
        try {
          const { data: profile } = await db.getUserProfile(userData.id);
          if (profile) {
            state.setState('profile', profile);
          }
        } catch (profileErr) {
          console.warn('Could not load profile:', profileErr);
        }
        
        // Redirect to appropriate page
        const currentHash = window.location.hash.replace('#', '');
        if (!currentHash || currentHash === 'login') {
          const profile = state.getState('profile');
          const isAdmin = ['admin', 'manager'].includes(profile?.role);
          router.navigate(isAdmin ? 'admin' : 'dashboard');
        }
        
        return true; // User is authenticated
      } else {
        // No session, redirect to login
        this.redirectToLogin();
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.redirectToLogin();
      return false;
    }
  },

  redirectToLogin() {
    // Clear any existing state
    state.reset();
    
    // Redirect to login page
    const currentPath = window.location.hash.replace('#', '');
    if (currentPath !== 'login') {
      router.navigate('login');
    }
  },

  // Check if user should be logged in for protected routes
  requireAuth() {
    const user = state.getState('user');
    if (!user) {
      this.redirectToLogin();
      return false;
    }
    return true;
  },

  // Setup session listener for real-time auth changes
  setupAuthListener() {
    auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        state.reset();
        this.redirectToLogin();
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Update user state
        const userData = {
          id: session.user.id,
          email: session.user.email,
          ...session.user.user_metadata
        };
        state.setState('user', userData);
      }
    });
  }
};
// Visit Context Service - Detects and manages active customer visits
// Provides smart customer suggestions based on current check-in status

import { db } from '../lib/supabase.js';
import { state } from '../lib/router.js';

export class VisitContextService {
  constructor() {
    this.cache = {
      activeVisit: null,
      recentCustomers: [],
      lastFetch: null,
      cacheTimeout: 5 * 60 * 1000 // 5 minutes
    };
  }

  // Get current active visit (check-in without check-out)
  async getActiveVisit() {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.activeVisit !== null) {
        return this.cache.activeVisit;
      }

      const user = state.getState('user');
      if (!user?.id) {
        return null;
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Get today's attendance records without check-out
      const { data: activeVisits, error } = await db.supabase
        .from('attendance')
        .select(`
          id,
          customer_id,
          check_in_time,
          notes,
          customers (
            id,
            name,
            address,
            phone,
            livestock_type,
            latitude,
            longitude
          )
        `)
        .eq('employee_id', user.id)
        .gte('check_in_time', `${today}T00:00:00`)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active visit:', error);
        return null;
      }

      const activeVisit = activeVisits?.[0] || null;
      
      // Update cache
      this.cache.activeVisit = activeVisit;
      this.cache.lastFetch = Date.now();

      return activeVisit;
    } catch (error) {
      console.error('Error in getActiveVisit:', error);
      return null;
    }
  }

  // Get recently visited customers (last 7 days)
  async getRecentCustomers(limit = 5) {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.recentCustomers.length > 0) {
        return this.cache.recentCustomers.slice(0, limit);
      }

      const user = state.getState('user');
      if (!user?.id) {
        return [];
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get recently visited customers (distinct)
      const { data: recentVisits, error } = await db.supabase
        .from('attendance')
        .select(`
          customer_id,
          check_in_time,
          customers (
            id,
            name,
            address,
            phone,
            livestock_type,
            latitude,
            longitude
          )
        `)
        .eq('employee_id', user.id)
        .gte('check_in_time', sevenDaysAgo.toISOString())
        .order('check_in_time', { ascending: false });

      if (error) {
        console.error('Error fetching recent customers:', error);
        return [];
      }

      // Remove duplicates and extract customers
      const uniqueCustomers = [];
      const seenCustomerIds = new Set();

      recentVisits?.forEach(visit => {
        if (visit.customers && !seenCustomerIds.has(visit.customers.id)) {
          seenCustomerIds.add(visit.customers.id);
          uniqueCustomers.push({
            ...visit.customers,
            lastVisit: visit.check_in_time
          });
        }
      });

      // Update cache
      this.cache.recentCustomers = uniqueCustomers;
      this.cache.lastFetch = Date.now();

      return uniqueCustomers.slice(0, limit);
    } catch (error) {
      console.error('Error in getRecentCustomers:', error);
      return [];
    }
  }

  // Get suggested customer for order (active visit or most recent)
  async getSuggestedCustomer() {
    try {
      // First try to get active visit customer
      const activeVisit = await this.getActiveVisit();
      if (activeVisit?.customers) {
        return {
          customer: activeVisit.customers,
          source: 'active_visit',
          visitId: activeVisit.id,
          checkInTime: activeVisit.check_in_time
        };
      }

      // If no active visit, get most recent customer
      const recentCustomers = await this.getRecentCustomers(1);
      if (recentCustomers.length > 0) {
        return {
          customer: recentCustomers[0],
          source: 'recent_visit',
          lastVisit: recentCustomers[0].lastVisit
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getSuggestedCustomer:', error);
      return null;
    }
  }

  // Check if employee is currently on a visit
  async isOnActiveVisit() {
    const activeVisit = await this.getActiveVisit();
    return activeVisit !== null;
  }

  // Get visit context for analytics
  async getVisitContext() {
    try {
      const activeVisit = await this.getActiveVisit();
      const recentCustomers = await this.getRecentCustomers(5);
      
      return {
        hasActiveVisit: activeVisit !== null,
        activeCustomer: activeVisit?.customers || null,
        recentCustomersCount: recentCustomers.length,
        visitStartTime: activeVisit?.check_in_time || null,
        lastVisitTime: recentCustomers[0]?.lastVisit || null
      };
    } catch (error) {
      console.error('Error in getVisitContext:', error);
      return {
        hasActiveVisit: false,
        activeCustomer: null,
        recentCustomersCount: 0,
        visitStartTime: null,
        lastVisitTime: null
      };
    }
  }

  // Get all customers for manual selection
  async getAllCustomers() {
    try {
      const user = state.getState('user');
      if (!user?.id) {
        return [];
      }

      const { data: customers, error } = await db.getCustomers(user.id);
      
      if (error) {
        console.error('Error fetching all customers:', error);
        return [];
      }

      return customers || [];
    } catch (error) {
      console.error('Error in getAllCustomers:', error);
      return [];
    }
  }

  // Clear cache (useful for testing or forced refresh)
  clearCache() {
    this.cache = {
      activeVisit: null,
      recentCustomers: [],
      lastFetch: null,
      cacheTimeout: 5 * 60 * 1000
    };
  }

  // Check if cache is still valid
  isCacheValid() {
    if (!this.cache.lastFetch) {
      return false;
    }
    
    const now = Date.now();
    return (now - this.cache.lastFetch) < this.cache.cacheTimeout;
  }

  // Refresh cache manually
  async refreshCache() {
    this.clearCache();
    await Promise.all([
      this.getActiveVisit(),
      this.getRecentCustomers()
    ]);
  }

  // Get customer by ID (with caching)
  async getCustomerById(customerId) {
    try {
      // Check if customer is in recent customers cache
      const recentCustomers = await this.getRecentCustomers(10);
      const cachedCustomer = recentCustomers.find(c => c.id === customerId);
      
      if (cachedCustomer) {
        return cachedCustomer;
      }

      // Fetch from database
      const { data: customer, error } = await db.getCustomerById(customerId);
      
      if (error) {
        console.error('Error fetching customer by ID:', error);
        return null;
      }

      return customer;
    } catch (error) {
      console.error('Error in getCustomerById:', error);
      return null;
    }
  }

  // Check if customer is currently being visited
  async isCustomerBeingVisited(customerId) {
    const activeVisit = await this.getActiveVisit();
    return activeVisit?.customers?.id === customerId;
  }

  // Get visit duration for active visit
  getActiveVisitDuration() {
    if (!this.cache.activeVisit?.check_in_time) {
      return null;
    }

    const checkInTime = new Date(this.cache.activeVisit.check_in_time);
    const now = new Date();
    const durationMs = now - checkInTime;
    
    return {
      milliseconds: durationMs,
      minutes: Math.floor(durationMs / (1000 * 60)),
      hours: Math.floor(durationMs / (1000 * 60 * 60)),
      formatted: this.formatDuration(durationMs)
    };
  }

  // Format duration for display
  formatDuration(durationMs) {
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}j ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

// Create singleton instance
export const visitContextService = new VisitContextService();

// Export for global access
if (typeof window !== 'undefined') {
  window.visitContextService = visitContextService;
}
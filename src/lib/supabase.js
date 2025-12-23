import { createClient } from '@supabase/supabase-js';
import { compressImage } from '../utils/helpers.js';

// TODO: Ganti dengan kredensial Supabase Anda
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseServiceKey = (import.meta.env.VITE_SUPABASE_SERVICE_KEY || '').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for password reset (requires service_role key)
export const supabaseAdmin = supabaseServiceKey ? 
    createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }) : null;

// Authentication helpers
export const auth = {
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    async signUp(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });
        return { data, error };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },
};

// Database helpers
export const db = {
    // Expose supabase client for direct access (needed for custom-reset.js)
    supabase: supabase,
    // Expose admin client for password reset operations
    supabaseAdmin: supabaseAdmin,
    // Users/Employees
    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    // Fungsi baru untuk mengambil profil berdasarkan email
    async getUserProfileByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        return { data, error };
    },

    async updateUserProfile(userId, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        return { data, error };
    },

    async getAllEmployees() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .in('role', ['employee', 'manager'])
            .order('name');
        return { data, error };
    },

    async deleteUser(userId) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        return { error };
    },

    // Customers
    async getCustomers(userId = null) {
        let query = supabase
            .from('customers')
            .select('*, users!customers_employee_id_fkey(name)')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('employee_id', userId);
        }

        const { data, error } = await query;
        return { data, error };
    },

    async getCustomerById(customerId) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
        return { data, error };
    },

    async createCustomer(customerData) {
        // Ensure employee_id is set correctly and add audit trail
        const user = await auth.getUser();
        const finalData = {
            ...customerData,
            employee_id: user?.id || customerData.employee_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: user?.id
        };

        const { data, error } = await supabase
            .from('customers')
            .insert([finalData])
            .select()
            .single();
        return { data, error };
    },

    async updateCustomer(customerId, updates) {
        const user = await auth.getUser();
        const finalUpdates = {
            ...updates,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
        };

        const { data, error } = await supabase
            .from('customers')
            .update(finalUpdates)
            .eq('id', customerId)
            .select()
            .single();
        return { data, error };
    },

    async deleteCustomer(customerId) {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);
        return { error };
    },

    // Livestock Population & Feed Tracking
    async updatePopulation(customerId, populationData) {
        const user = await auth.getUser();
        
        // Get current population data
        const { data: currentCustomer } = await supabase
            .from('customers')
            .select('population_count, population_unit')
            .eq('id', customerId)
            .single();

        // Update customer population
        const { data, error } = await supabase
            .from('customers')
            .update({
                population_count: populationData.count,
                population_unit: populationData.unit,
                last_population_update: new Date().toISOString()
            })
            .eq('id', customerId)
            .select()
            .single();

        if (!error && currentCustomer) {
            // Log the population update
            await supabase.rpc('log_population_update', {
                p_customer_id: customerId,
                p_employee_id: user.id,
                p_old_count: currentCustomer.population_count || 0,
                p_new_count: populationData.count,
                p_unit: populationData.unit,
                p_notes: populationData.notes || null,
                p_visit_id: populationData.visit_id || null
            });
        }

        return { data, error };
    },

    async updateFeed(customerId, feedData) {
        const user = await auth.getUser();
        
        // Get current feed data
        const { data: currentCustomer } = await supabase
            .from('customers')
            .select('feed_type, feed_brand, daily_feed_consumption, feed_unit')
            .eq('id', customerId)
            .single();

        // Update customer feed
        const { data, error } = await supabase
            .from('customers')
            .update({
                feed_type: feedData.type,
                feed_brand: feedData.brand,
                daily_feed_consumption: feedData.consumption,
                feed_unit: feedData.unit,
                last_feed_update: new Date().toISOString()
            })
            .eq('id', customerId)
            .select()
            .single();

        if (!error && currentCustomer) {
            // Log the feed update
            await supabase.rpc('log_feed_update', {
                p_customer_id: customerId,
                p_employee_id: user.id,
                p_old_type: currentCustomer.feed_type || '',
                p_new_type: feedData.type,
                p_old_brand: currentCustomer.feed_brand || '',
                p_new_brand: feedData.brand,
                p_old_consumption: currentCustomer.daily_feed_consumption || 0,
                p_new_consumption: feedData.consumption,
                p_unit: feedData.unit,
                p_notes: feedData.notes || null,
                p_visit_id: feedData.visit_id || null
            });
        }

        return { data, error };
    },

    async getLivestockUpdates(customerId = null, employeeId = null, limit = 50) {
        let query = supabase
            .from('livestock_updates')
            .select(`
                *,
                customers(name, livestock_type),
                users!livestock_updates_employee_id_fkey(name)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (customerId) {
            query = query.eq('customer_id', customerId);
        }

        if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }

        const { data, error } = await query;
        return { data, error };
    },

    async getCustomerLivestockSummary(customerId = null) {
        let query = supabase
            .from('customer_livestock_summary')
            .select('*')
            .order('name');

        if (customerId) {
            query = query.eq('id', customerId);
        }

        const { data, error } = await query;
        return { data, error };
    },

    // Attendance
    async checkIn(attendanceData) {
        // Ensure employee_id is set correctly
        const user = await auth.getUser();
        const finalData = {
            ...attendanceData,
            employee_id: user?.id || attendanceData.employee_id,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('attendance')
            .insert([finalData])
            .select()
            .single();
        return { data, error };
    },

    async checkOut(attendanceId, checkOutData) {
        const user = await auth.getUser();
        const finalData = {
            ...checkOutData,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
        };

        const { data, error } = await supabase
            .from('attendance')
            .update(finalData)
            .eq('id', attendanceId)
            .select()
            .single();
        return { data, error };
    },

    async getTodayAttendance(userId) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('attendance')
            .select('*, customers(*)')
            .eq('employee_id', userId)
            .gte('check_in_time', `${today}T00:00:00`)
            .lte('check_in_time', `${today}T23:59:59`)
            .order('check_in_time', { ascending: false });
        return { data, error };
    },

    async getAttendanceHistory(userId, limit = 50) {
        const { data, error } = await supabase
            .from('attendance')
            .select('*, customers(*)')
            .eq('employee_id', userId)
            .order('check_in_time', { ascending: false })
            .limit(limit);
        return { data, error };
    },

    async getAllAttendance(startDate = null, endDate = null, options = {}) {
        const { 
            limit = 100, 
            offset = 0, 
            employeeId = null 
        } = options;

        let query = supabase
            .from('attendance')
            .select('*, customers(*), users!attendance_employee_id_fkey(name, email)')
            .order('check_in_time', { ascending: false });

        if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }

        if (startDate) {
            query = query.gte('check_in_time', startDate);
        }
        if (endDate) {
            query = query.lte('check_in_time', endDate);
        }

        // Add pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        return { data, error };
    },

    // Get attendance count for pagination
    async getAttendanceCount(startDate = null, endDate = null, employeeId = null) {
        let query = supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true });

        if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }

        if (startDate) {
            query = query.gte('check_in_time', startDate);
        }
        if (endDate) {
            query = query.lte('check_in_time', endDate);
        }

        const { count, error } = await query;
        return { data: count, error };
    },

    // Orders
    async createOrder(orderData) {
        // Ensure employee_id is set and create consistent items data
        const user = await auth.getUser();
        
        // Ensure items_summary is generated from items array
        let itemsSummary = '';
        if (orderData.items && Array.isArray(orderData.items)) {
            itemsSummary = orderData.items
                .map(item => `${item.name} (${item.qty}x)`)
                .join(', ');
        }

        const finalData = {
            ...orderData,
            employee_id: user?.id || orderData.employee_id,
            items_summary: itemsSummary || orderData.items_summary,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: user?.id
        };

        const { data, error } = await supabase
            .from('orders')
            .insert([finalData])
            .select()
            .single();
        return { data, error };
    },

    async getOrders(userId = null, options = {}) {
        const { 
            limit = 100, 
            offset = 0, 
            status = null, 
            startDate = null, 
            endDate = null 
        } = options;

        let query = supabase
            .from('orders')
            .select('*, customers(*), users!orders_employee_id_fkey(name, email)')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('employee_id', userId);
        }

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        // Add pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        return { data, error };
    },

    // Get orders count for pagination
    async getOrdersCount(userId = null, options = {}) {
        const { status = null, startDate = null, endDate = null } = options;

        let query = supabase
            .from('orders')
            .select('id', { count: 'exact', head: true });

        if (userId) {
            query = query.eq('employee_id', userId);
        }

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { count, error } = await query;
        return { data: count, error };
    },

    async updateOrderStatus(orderId, status, notes = null) {
        const user = await auth.getUser();
        const payload = { 
            status, 
            updated_at: new Date().toISOString(),
            updated_by: user?.id
        };
        if (notes) {
            payload.notes = notes;
        }

        const { data, error } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', orderId)
            .select()
            .single();
        return { data, error };
    },

    // Business Profile
    async getBusinessProfile() {
        const { data, error } = await supabase
            .from('business_profile')
            .select('*')
            .single();
        return { data, error };
    },

    async updateBusinessProfile(updates) {
        const { data, error } = await supabase
            .from('business_profile')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .neq('id', '00000000-0000-0000-0000-000000000000') // Dummy condition to affect all rows (singleton)
            .select()
            .single();
        return { data, error };
    },

    async uploadLogo(file) {
        // Compress first
        const compressedFile = await compressImage(file);

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('app-assets')
            .upload(filePath, compressedFile);

        if (uploadError) {
            return { error: uploadError };
        }

        const { data } = supabase.storage
            .from('app-assets')
            .getPublicUrl(filePath);

        return { data: data.publicUrl };
    },

    // Products (Catalog)
    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    async createProduct(productData) {
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();
        return { data, error };
    },

    async updateProduct(id, updates) {
        const { data, error } = await supabase
            .from('products')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async deleteProduct(id) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        return { error };
    },

    async uploadProductImage(file) {
        // Compress first
        const compressedFile = await compressImage(file);

        const fileExt = compressedFile.name.split('.').pop();
        // Sanitize filename
        const fileName = `products/prod-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('app-assets')
            .upload(fileName, compressedFile);

        if (uploadError) return { error: uploadError };

        const { data } = supabase.storage
            .from('app-assets')
            .getPublicUrl(fileName);

        return { data: data.publicUrl };
    },

    async uploadVisitEvidence(file) {
        // Compress first
        const compressedFile = await compressImage(file);

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `visits/visit-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('app-assets')
            .upload(fileName, compressedFile);

        if (uploadError) return { error: uploadError };

        const { data } = supabase.storage
            .from('app-assets')
            .getPublicUrl(fileName);

        return { data: data.publicUrl };
    },

    // Visits / Survey
    async logVisit(visitData) {
        // Ensure employee_id is set correctly (fix field naming)
        const user = await auth.getUser();
        const finalData = {
            ...visitData,
            employee_id: user?.id || visitData.employee_id, // Use employee_id instead of user_id
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('customer_visits')
            .insert([finalData])
            .select();
        return { data, error };
    },

    // Real-time sync helpers
    async setupRealtimeSync(callback) {
        // Subscribe to data changes for real-time admin dashboard updates
        const channel = supabase
            .channel('data_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'customers' }, 
                (payload) => callback('customers', payload)
            )
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'orders' }, 
                (payload) => callback('orders', payload)
            )
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'attendance' }, 
                (payload) => callback('attendance', payload)
            )
            .subscribe();

        return channel;
    },

    async removeRealtimeSync(channel) {
        if (channel) {
            await supabase.removeChannel(channel);
        }
    },

    // KPI (Using RPC for performance)
    async getKPIStats(startDate, endDate) {
        const { data, error } = await supabase
            .rpc('get_kpi_summary', {
                start_date: startDate,
                end_date: endDate
            });
        return { data, error };
    },

    async getAllEmployeesKPI(startDate, endDate) {
        const { data, error } = await supabase
            .rpc('calculate_all_kpi', {
                start_date: startDate,
                end_date: endDate,
            });
        return { data, error };
    },

    // Optimized dashboard stats (single query for multiple metrics)
    async getDashboardStats(startDate, endDate, userRole = 'admin', managerId = null) {
        try {
            // Parallel queries for better performance
            const promises = [];

            // 1. Employee count
            let employeeQuery = supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .in('role', ['employee', 'manager']);
            
            // If manager, only show their team
            if (userRole === 'manager' && managerId) {
                // Assuming managers can only see employees they manage
                // You might need to add a manager_id field to users table
                employeeQuery = employeeQuery.eq('manager_id', managerId);
            }
            promises.push(employeeQuery);

            // 2. Revenue this period
            let revenueQuery = supabase
                .from('orders')
                .select('total_amount')
                .eq('status', 'completed')
                .gte('created_at', startDate)
                .lte('created_at', endDate);
            
            if (userRole === 'manager' && managerId) {
                revenueQuery = revenueQuery.eq('employee_id', managerId);
            }
            promises.push(revenueQuery);

            // 3. New customers this period
            let customerQuery = supabase
                .from('customers')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', startDate)
                .lte('created_at', endDate);
            
            if (userRole === 'manager' && managerId) {
                customerQuery = customerQuery.eq('employee_id', managerId);
            }
            promises.push(customerQuery);

            // 4. Active targets
            let targetQuery = supabase
                .from('sales_plans')
                .select('id', { count: 'exact', head: true })
                .eq('current_status', 'on_progress');
            
            if (userRole === 'manager' && managerId) {
                targetQuery = targetQuery.eq('employee_id', managerId);
            }
            promises.push(targetQuery);

            // Execute all queries in parallel
            const [employeeResult, revenueResult, customerResult, targetResult] = await Promise.all(promises);

            // Calculate total revenue
            const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            return {
                data: {
                    totalEmployees: employeeResult.count || 0,
                    totalRevenue: totalRevenue,
                    newCustomers: customerResult.count || 0,
                    activeTargets: targetResult.count || 0
                },
                error: null
            };

        } catch (error) {
            console.error('Dashboard stats error:', error);
            return { data: null, error };
        }
    },

    // Get recent activities for dashboard
    async getRecentActivities(limit = 10, userRole = 'admin', managerId = null) {
        try {
            const promises = [];

            // Recent orders
            let orderQuery = supabase
                .from('orders')
                .select('id, total_amount, status, created_at, customers(name), users!orders_employee_id_fkey(name)')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (userRole === 'manager' && managerId) {
                orderQuery = orderQuery.eq('employee_id', managerId);
            }
            promises.push(orderQuery);

            // Recent visits
            let visitQuery = supabase
                .from('attendance')
                .select('id, check_in_time, notes, customers(name), users!attendance_employee_id_fkey(name)')
                .order('check_in_time', { ascending: false })
                .limit(limit);
            
            if (userRole === 'manager' && managerId) {
                visitQuery = visitQuery.eq('employee_id', managerId);
            }
            promises.push(visitQuery);

            const [ordersResult, visitsResult] = await Promise.all(promises);

            return {
                data: {
                    recentOrders: ordersResult.data || [],
                    recentVisits: visitsResult.data || []
                },
                error: null
            };

        } catch (error) {
            console.error('Recent activities error:', error);
            return { data: null, error };
        }
    },

    // Sales Plans / Targeting
    async getSalesPlans(userId) {
        const { data, error } = await supabase
            .from('sales_plans')
            .select('*')
            .eq('employee_id', userId)
            .order('created_at', { ascending: false });
        return { data, error };
    },

    async getAllSalesPlans() {
        const { data, error } = await supabase
            .from('sales_plans')
            .select('*, users(name)')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    async createSalesPlan(data) {
        const { data: result, error } = await supabase
            .from('sales_plans')
            .insert([data])
            .select()
            .single();
        return { data: result, error };
    },

    async updateSalesPlan(id, updates) {
        const { data: result, error } = await supabase
            .from('sales_plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data: result, error };
    },
};

export default supabase;

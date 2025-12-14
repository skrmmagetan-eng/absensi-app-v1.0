import { createClient } from '@supabase/supabase-js';
import { compressImage } from '../utils/helpers.js';

// TODO: Ganti dengan kredensial Supabase Anda
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    // Users/Employees
    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
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
            .eq('role', 'employee')
            .order('name');
        return { data, error };
    },

    // Customers
    async getCustomers(userId = null) {
        let query = supabase
            .from('customers')
            .select('*')
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
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();
        return { data, error };
    },

    async updateCustomer(customerId, updates) {
        const { data, error } = await supabase
            .from('customers')
            .update(updates)
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

    // Attendance
    async checkIn(attendanceData) {
        const { data, error } = await supabase
            .from('attendance')
            .insert([attendanceData])
            .select()
            .single();
        return { data, error };
    },

    async checkOut(attendanceId, checkOutData) {
        const { data, error } = await supabase
            .from('attendance')
            .update(checkOutData)
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

    async getAllAttendance(startDate = null, endDate = null) {
        let query = supabase
            .from('attendance')
            .select('*, customers(*), users(name, email)')
            .order('check_in_time', { ascending: false });

        if (startDate) {
            query = query.gte('check_in_time', startDate);
        }
        if (endDate) {
            query = query.lte('check_in_time', endDate);
        }

        const { data, error } = await query;
        return { data, error };
    },

    // Orders
    async createOrder(orderData) {
        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
        return { data, error };
    },

    async getOrders(userId = null) {
        let query = supabase
            .from('orders')
            .select('*, customers(*), users(name, email)')
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('employee_id', userId);
        }

        const { data, error } = await query;
        return { data, error };
    },

    async updateOrderStatus(orderId, status) {
        const { data, error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
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
        const { data, error } = await supabase
            .from('customer_visits')
            .insert([visitData])
            .select();
        return { data, error };
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
};

export default supabase;

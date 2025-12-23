/**
 * 🔍 DEBUG SCRIPT - CUSTOMERS ERROR
 * Script untuk debug masalah "Error memuat data pelanggan"
 * 
 * Jalankan di Browser Console untuk diagnosa masalah
 */

console.log('🔍 Starting customers error debug...');

// 1. Check if user is logged in
const user = window.state?.getState('user');
console.log('👤 Current user:', user);

if (!user) {
    console.error('❌ No user found - user not logged in');
} else {
    console.log('✅ User logged in:', user.email);
}

// 2. Check Supabase connection
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key:', supabaseKey ? 'Present' : 'Missing');

// 3. Test database connection
async function testDatabaseConnection() {
    try {
        console.log('🧪 Testing database connection...');
        
        // Test basic connection
        const { data: testData, error: testError } = await window.db.supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (testError) {
            console.error('❌ Database connection failed:', testError);
            return false;
        }
        
        console.log('✅ Database connection successful');
        return true;
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        return false;
    }
}

// 4. Test customers table access
async function testCustomersTable() {
    try {
        console.log('🧪 Testing customers table access...');
        
        const { data, error } = await window.db.supabase
            .from('customers')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('❌ Customers table access failed:', error);
            
            // Check specific error types
            if (error.message.includes('relation "customers" does not exist')) {
                console.error('💡 SOLUTION: Run database setup SQL scripts first');
                console.log('📋 Required scripts:');
                console.log('1. add_missing_columns.sql');
                console.log('2. optimize_database_indexes.sql');
                console.log('3. safe_data_sync_fix.sql');
            }
            
            if (error.message.includes('permission denied') || error.message.includes('policy')) {
                console.error('💡 SOLUTION: RLS policy issue - run manager_visibility_policies.sql');
            }
            
            return false;
        }
        
        console.log('✅ Customers table accessible');
        console.log('📊 Sample data:', data);
        return true;
        
    } catch (error) {
        console.error('❌ Customers table test failed:', error);
        return false;
    }
}

// 5. Test getCustomers function specifically
async function testGetCustomers() {
    try {
        console.log('🧪 Testing getCustomers function...');
        
        const user = window.state?.getState('user');
        if (!user) {
            console.error('❌ No user for getCustomers test');
            return false;
        }
        
        const { data, error } = await window.db.getCustomers(user.id);
        
        if (error) {
            console.error('❌ getCustomers failed:', error);
            return false;
        }
        
        console.log('✅ getCustomers successful');
        console.log('📊 Customers data:', data);
        console.log('📈 Total customers:', data?.length || 0);
        return true;
        
    } catch (error) {
        console.error('❌ getCustomers test failed:', error);
        return false;
    }
}

// 6. Run all tests
async function runAllTests() {
    console.log('🚀 Running comprehensive debug tests...');
    
    const results = {
        userLoggedIn: !!user,
        databaseConnection: await testDatabaseConnection(),
        customersTableAccess: await testCustomersTable(),
        getCustomersFunction: await testGetCustomers()
    };
    
    console.log('📊 Debug Results:', results);
    
    // Provide solutions based on results
    if (!results.userLoggedIn) {
        console.log('💡 SOLUTION: Login first, then try again');
    } else if (!results.databaseConnection) {
        console.log('💡 SOLUTION: Check environment variables (.env file)');
        console.log('   - VITE_SUPABASE_URL');
        console.log('   - VITE_SUPABASE_ANON_KEY');
    } else if (!results.customersTableAccess) {
        console.log('💡 SOLUTION: Run database setup SQL scripts in Supabase');
    } else if (!results.getCustomersFunction) {
        console.log('💡 SOLUTION: Check RLS policies or user permissions');
    } else {
        console.log('✅ All tests passed - customers should load normally');
    }
    
    return results;
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.debugCustomers = {
    testConnection: testDatabaseConnection,
    testTable: testCustomersTable,
    testFunction: testGetCustomers,
    runAll: runAllTests
};

console.log('🔧 Debug functions available at: window.debugCustomers');
console.log('📖 Usage: window.debugCustomers.runAll()');
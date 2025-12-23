/**
 * 🔍 DEBUG SCRIPT - ADMIN DASHBOARD ERROR
 * Script untuk debug masalah halaman admin kosong
 * 
 * Jalankan di Browser Console saat di halaman admin
 */

console.log('🔍 Starting admin dashboard debug...');

// 1. Check if user is logged in and has admin/manager role
const user = window.state?.getState('user');
const profile = window.state?.getState('profile');

console.log('👤 Current user:', user);
console.log('👔 Current profile:', profile);

if (!user) {
    console.error('❌ No user found - user not logged in');
} else if (!profile || !['admin', 'manager'].includes(profile.role)) {
    console.error('❌ User does not have admin/manager role:', profile?.role);
} else {
    console.log('✅ User has proper admin/manager access');
}

// 2. Test dashboard stats query
async function testDashboardStats() {
    try {
        console.log('🧪 Testing getDashboardStats...');
        
        const { start, end } = window.getMonthDateRange ? window.getMonthDateRange() : {
            start: new Date().toISOString().substring(0, 7) + '-01',
            end: new Date().toISOString().substring(0, 10)
        };
        
        const startDate = start + ' 00:00:00';
        const endDate = end + ' 23:59:59';
        
        console.log('📅 Date range:', { startDate, endDate });
        
        const result = await window.db.getDashboardStats(
            startDate, 
            endDate, 
            profile?.role || 'admin',
            profile?.role === 'manager' ? profile?.id : null
        );
        
        if (result.error) {
            console.error('❌ getDashboardStats failed:', result.error);
            return false;
        }
        
        console.log('✅ getDashboardStats successful');
        console.log('📊 Dashboard stats:', result.data);
        return true;
        
    } catch (error) {
        console.error('❌ getDashboardStats test failed:', error);
        return false;
    }
}

// 3. Test KPI stats query
async function testKPIStats() {
    try {
        console.log('🧪 Testing getKPIStats...');
        
        const { start, end } = window.getMonthDateRange ? window.getMonthDateRange() : {
            start: new Date().toISOString().substring(0, 7) + '-01',
            end: new Date().toISOString().substring(0, 10)
        };
        
        const startDate = start + ' 00:00:00';
        const endDate = end + ' 23:59:59';
        
        const result = await window.db.getKPIStats(startDate, endDate);
        
        if (result.error) {
            console.error('❌ getKPIStats failed:', result.error);
            return false;
        }
        
        console.log('✅ getKPIStats successful');
        console.log('📈 KPI stats:', result.data);
        return true;
        
    } catch (error) {
        console.error('❌ getKPIStats test failed:', error);
        return false;
    }
}

// 4. Test recent activities query
async function testRecentActivities() {
    try {
        console.log('🧪 Testing getRecentActivities...');
        
        const result = await window.db.getRecentActivities(
            10, 
            profile?.role || 'admin', 
            profile?.role === 'manager' ? profile?.id : null
        );
        
        if (result.error) {
            console.error('❌ getRecentActivities failed:', result.error);
            return false;
        }
        
        console.log('✅ getRecentActivities successful');
        console.log('📋 Recent activities:', result.data);
        return true;
        
    } catch (error) {
        console.error('❌ getRecentActivities test failed:', error);
        return false;
    }
}

// 5. Run all tests
async function runAllAdminTests() {
    console.log('🚀 Running comprehensive admin debug tests...');
    
    const results = {
        userLoggedIn: !!user,
        hasAdminRole: profile && ['admin', 'manager'].includes(profile.role),
        dashboardStats: await testDashboardStats(),
        kpiStats: await testKPIStats(),
        recentActivities: await testRecentActivities()
    };
    
    console.log('📊 Admin Debug Results:', results);
    
    // Provide solutions based on results
    if (!results.userLoggedIn) {
        console.log('💡 SOLUTION: Login first, then try again');
    } else if (!results.hasAdminRole) {
        console.log('💡 SOLUTION: User needs admin or manager role');
    } else if (!results.dashboardStats) {
        console.log('💡 SOLUTION: Fix getDashboardStats query - likely database schema issue');
    } else if (!results.kpiStats) {
        console.log('💡 SOLUTION: Fix getKPIStats query - check KPI function');
    } else if (!results.recentActivities) {
        console.log('💡 SOLUTION: Fix getRecentActivities query - check activity queries');
    } else {
        console.log('✅ All admin tests passed - dashboard should load normally');
    }
    
    return results;
}

// Auto-run tests
runAllAdminTests();

// Export functions for manual testing
window.debugAdmin = {
    testDashboardStats: testDashboardStats,
    testKPIStats: testKPIStats,
    testRecentActivities: testRecentActivities,
    runAll: runAllAdminTests
};

console.log('🔧 Admin debug functions available at: window.debugAdmin');
console.log('📖 Usage: window.debugAdmin.runAll()');
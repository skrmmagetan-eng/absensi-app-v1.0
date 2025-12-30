-- =====================================================
-- 04. VERIFY DATA IMPORT RESULTS
-- =====================================================
-- Run this AFTER importing customers and visits
-- Comprehensive verification of all imported data

-- =====================================================
-- BASIC COUNTS
-- =====================================================

SELECT 'IMPORT SUMMARY' as section;

SELECT 
    'Customers' as data_type,
    COUNT(*) as total_records,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
FROM public.customers
UNION ALL
SELECT 
    'Visits' as data_type,
    COUNT(*) as total_records,
    MIN(check_in_time) as earliest_date,
    MAX(check_in_time) as latest_date
FROM public.attendance;

-- =====================================================
-- EMPLOYEE DISTRIBUTION
-- =====================================================

SELECT 'EMPLOYEE DISTRIBUTION' as section;

SELECT 
    u.name as employee_name,
    u.email,
    COUNT(DISTINCT c.id) as customers_assigned,
    COUNT(DISTINCT a.id) as total_visits,
    COUNT(CASE WHEN a.photo_url IS NOT NULL THEN 1 END) as visits_with_photos,
    COUNT(CASE WHEN a.latitude IS NOT NULL THEN 1 END) as visits_with_gps
FROM public.users u
LEFT JOIN public.customers c ON u.id = c.employee_id
LEFT JOIN public.attendance a ON u.id = a.employee_id
WHERE u.role = 'employee'
GROUP BY u.id, u.name, u.email
ORDER BY u.name;

-- =====================================================
-- DATA QUALITY CHECKS
-- =====================================================

SELECT 'DATA QUALITY CHECKS' as section;

-- Check for visits without customers
SELECT 
    'Visits without customers' as check_type,
    COUNT(*) as count
FROM public.attendance 
WHERE customer_id IS NULL
UNION ALL
-- Check for customers without visits
SELECT 
    'Customers without visits' as check_type,
    COUNT(*) as count
FROM public.customers c
LEFT JOIN public.attendance a ON c.id = a.customer_id
WHERE a.id IS NULL
UNION ALL
-- Check GPS coverage
SELECT 
    'Visits with GPS coordinates' as check_type,
    COUNT(*) as count
FROM public.attendance 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
UNION ALL
-- Check photo coverage
SELECT 
    'Visits with photos' as check_type,
    COUNT(*) as count
FROM public.attendance 
WHERE photo_url IS NOT NULL;

-- =====================================================
-- RECENT ACTIVITY SAMPLE
-- =====================================================

SELECT 'RECENT VISITS SAMPLE' as section;

SELECT 
    a.check_in_time,
    u.name as employee,
    c.name as customer,
    LEFT(a.notes, 50) || '...' as notes_preview,
    CASE WHEN a.photo_url IS NOT NULL THEN 'Yes' ELSE 'No' END as has_photo,
    CASE WHEN a.latitude IS NOT NULL THEN 'Yes' ELSE 'No' END as has_gps
FROM public.attendance a
JOIN public.users u ON a.employee_id = u.id
LEFT JOIN public.customers c ON a.customer_id = c.id
ORDER BY a.check_in_time DESC
LIMIT 10;

-- =====================================================
-- MONTHLY ACTIVITY SUMMARY
-- =====================================================

SELECT 'MONTHLY ACTIVITY' as section;

SELECT 
    TO_CHAR(a.check_in_time, 'YYYY-MM') as month,
    COUNT(*) as total_visits,
    COUNT(DISTINCT a.employee_id) as active_employees,
    COUNT(DISTINCT a.customer_id) as customers_visited
FROM public.attendance a
GROUP BY TO_CHAR(a.check_in_time, 'YYYY-MM')
ORDER BY month DESC;

-- =====================================================
-- SUCCESS CRITERIA
-- =====================================================

SELECT 'SUCCESS CRITERIA CHECK' as section;

WITH success_metrics AS (
    SELECT 
        (SELECT COUNT(*) FROM public.customers) as customer_count,
        (SELECT COUNT(*) FROM public.attendance) as visit_count,
        (SELECT COUNT(*) FROM public.attendance WHERE photo_url IS NOT NULL) as photos_count,
        (SELECT COUNT(*) FROM public.attendance WHERE latitude IS NOT NULL) as gps_count
)
SELECT 
    CASE 
        WHEN customer_count >= 600 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as customers_check,
    customer_count as customers_imported,
    CASE 
        WHEN visit_count >= 2500 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as visits_check,
    visit_count as visits_imported,
    CASE 
        WHEN photos_count >= 2400 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as photos_check,
    photos_count as visits_with_photos,
    CASE 
        WHEN gps_count >= 2300 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as gps_check,
    gps_count as visits_with_gps
FROM success_metrics;

-- =====================================================
-- FINAL STATUS
-- =====================================================

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM public.customers) >= 600 
         AND (SELECT COUNT(*) FROM public.attendance) >= 2500
        THEN '🎉 DATA IMPORT SUCCESSFUL! Database ready for production.'
        ELSE '⚠️  Import incomplete. Check counts above.'
    END as final_status;

-- =====================================================
-- Expected Results:
-- - Customers: ~646 records
-- - Visits: ~2,531 records  
-- - Photos: ~2,500+ visits with photos
-- - GPS: ~2,400+ visits with coordinates
-- - Date range: May 2025 - December 2025
-- =====================================================
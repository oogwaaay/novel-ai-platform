-- Test script to verify points system functionality

-- 1. Test add_user_points with positive amount (should succeed)
SELECT add_user_points('00000000-0000-0000-0000-000000000001', 100, 'TEST', 'Test adding points');

-- 2. Test add_user_points with negative amount (should fail)
SELECT add_user_points('00000000-0000-0000-0000-000000000001', -100, 'TEST', 'Test adding negative points');

-- 3. Test deduct_user_points function (should succeed if balance is sufficient)
SELECT deduct_user_points('00000000-0000-0000-0000-000000000001', 50, 'TEST', 'Test deducting points');

-- 4. Check current add_user_points function definition
\df+ add_user_points

-- 5. Check current deduct_user_points function definition
\df+ deduct_user_points

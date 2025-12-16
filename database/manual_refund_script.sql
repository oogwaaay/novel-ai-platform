-- 手动积分扣除脚本
-- 用途：用于复杂退款情况，手动扣除特定数量的积分
-- 使用方法：在Supabase SQL Editor中执行，只需修改下方的target_email和points_to_revoke变量

DO $$
DECLARE
    -- 🔧 只需修改这两个变量 🔧
    target_email TEXT := 'user@example.com'; -- 替换为目标用户邮箱
    points_to_revoke INT := 1000; -- 替换为需要扣除的积分数量
    
    -- 内部变量（无需修改）
    v_user_id UUID;
    v_wallet_id UUID;
    v_current_balance INT;
    v_new_balance INT;
BEGIN
    -- 1. 根据邮箱查找用户ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = target_email;
    
    -- 检查用户是否存在
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found for email: %', target_email;
    END IF;
    
    -- 2. 获取用户钱包信息
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM user_wallets
    WHERE user_id = v_user_id;
    
    -- 检查钱包是否存在
    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user ID: %', v_user_id;
    END IF;
    
    -- 3. 计算新余额
    v_new_balance := v_current_balance - points_to_revoke;
    
    -- 确保余额不小于0（可选，根据业务需求调整）
    -- IF v_new_balance < 0 THEN
    --     v_new_balance := 0;
    -- END IF;
    
    -- 4. 更新钱包余额
    UPDATE user_wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = v_wallet_id;
    
    -- 5. 插入交易记录
    INSERT INTO point_transactions (
        wallet_id, 
        amount, 
        type, 
        description
    ) VALUES (
        v_wallet_id, 
        -points_to_revoke, 
        'MANUAL_REFUND_DEDUCTION', 
        'Manual points deduction for refund' -- 可根据实际情况修改描述
    );
    
    -- 输出结果
    RAISE NOTICE '✅ 手动积分扣除完成';
    RAISE NOTICE '📧 用户邮箱: %', target_email;
    RAISE NOTICE '👤 用户ID: %', v_user_id;
    RAISE NOTICE '💰 原余额: %', v_current_balance;
    RAISE NOTICE '🔄 扣除积分: %', points_to_revoke;
    RAISE NOTICE '💰 新余额: %', v_new_balance;
    RAISE NOTICE '📝 交易类型: MANUAL_REFUND_DEDUCTION';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ 操作失败: %', SQLERRM;
END $$;
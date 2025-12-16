-- 积分系统 SQL 迁移代码

-- 1. 创建用户钱包表
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建积分流水表
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES user_wallets ON DELETE CASCADE,
  amount INTEGER,
  type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建新用户注册时自动创建钱包的函数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_id, balance, total_earned)
  VALUES (NEW.id, 500, 500);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，当 auth.users 表有新用户注册时触发
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. 启用 RLS 并设置策略

-- 为 user_wallets 表启用 RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的钱包
CREATE POLICY "Users can view their own wallet" 
  ON user_wallets 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 禁止用户直接修改钱包余额（必须通过后端逻辑或 RPC 函数）
CREATE POLICY "Prevent direct wallet modifications" 
  ON user_wallets 
  FOR UPDATE 
  USING (FALSE);

-- 禁止用户直接插入钱包记录（通过触发器自动创建）
CREATE POLICY "Prevent direct wallet insertion" 
  ON user_wallets 
  FOR INSERT 
  WITH CHECK (FALSE);

-- 为 point_transactions 表启用 RLS
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的积分流水
CREATE POLICY "Users can view their own transactions" 
  ON point_transactions 
  FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM user_wallets WHERE id = wallet_id));

-- 禁止用户直接插入或更新积分流水（必须通过后端逻辑或 RPC 函数）
CREATE POLICY "Prevent direct transaction modifications" 
  ON point_transactions 
  FOR ALL 
  USING (FALSE);

-- 5. 创建核心原子操作函数：扣除用户积分
CREATE OR REPLACE FUNCTION deduct_user_points(
  p_user_id UUID,
  p_amount INT,
  p_type TEXT,
  p_description TEXT
) 
RETURNS INT AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INT;
  v_new_balance INT;
BEGIN
  -- 检查参数
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- 获取用户钱包
  SELECT id, balance INTO v_wallet_id, v_current_balance 
  FROM user_wallets 
  WHERE user_id = p_user_id;
  
  -- 检查钱包是否存在
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'User wallet not found';
  END IF;
  
  -- 检查余额是否充足
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;
  
  -- 计算新余额
  v_new_balance := v_current_balance - p_amount;
  
  -- 更新钱包余额（使用事务确保原子性）
  UPDATE user_wallets 
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- 插入交易记录
  INSERT INTO point_transactions (
    wallet_id, 
    amount, 
    type, 
    description
  ) VALUES (
    v_wallet_id, 
    -p_amount, 
    p_type, 
    p_description
  );
  
  -- 返回新余额
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建添加用户积分的函数
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_type TEXT,
  p_description TEXT
) 
RETURNS INT AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INT;
  v_current_total INT;
  v_new_balance INT;
  v_new_total INT;
BEGIN
  -- 检查参数
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- 获取用户钱包
  SELECT id, balance, total_earned INTO v_wallet_id, v_current_balance, v_current_total 
  FROM user_wallets 
  WHERE user_id = p_user_id;
  
  -- 检查钱包是否存在
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'User wallet not found';
  END IF;
  
  -- 计算新余额和新总计
  v_new_balance := v_current_balance + p_amount;
  v_new_total := v_current_total + p_amount;
  
  -- 更新钱包余额和总计（使用事务确保原子性）
  UPDATE user_wallets 
  SET 
    balance = v_new_balance, 
    total_earned = v_new_total,
    updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- 插入交易记录
  INSERT INTO point_transactions (
    wallet_id, 
    amount, 
    type, 
    description
  ) VALUES (
    v_wallet_id, 
    p_amount, 
    p_type, 
    p_description
  );
  
  -- 返回新余额
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
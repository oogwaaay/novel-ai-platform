import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { getUserById, updateUser } from '../services/userStore';
import { supabaseAdmin } from '../services/supabaseClient';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // In MVP, return user info from token
    // In production, fetch from database
    res.json({
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.email.split('@')[0] // Placeholder
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get current user
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user in database
    const updatedUser = await updateUser(userId, (draft) => {
      if (name !== undefined) {
        draft.name = name?.trim() || undefined;
      }
      if (avatar !== undefined) {
        draft.avatar = avatar?.trim() || undefined;
      }
      return draft;
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt,
        subscription: updatedUser.subscription,
        usage: updatedUser.usage
      }
    });
  } catch (error: any) {
    console.error('[User] Failed to update profile:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Get usage stats
router.get('/usage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // In MVP, return placeholder data
    // In production, fetch from database
    res.json({
      generationsThisMonth: 0,
      lastResetDate: Date.now(),
      totalGenerations: 0
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch usage' });
  }
});

// Get user wallet balance (including available balance considering expired points)
router.get('/wallet', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ message: 'Database client not available' });
    }

    console.log(`[Wallet API] Fetching balance for user: ${userId}`);

    // Query user wallet from Supabase
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('id, user_id, balance, total_earned, updated_at')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error(`[Wallet API] Error fetching wallet for user ${userId}:`, walletError);
      return res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }

    // Calculate available balance (considering expired points)
    const { data: availableBalanceData, error: availableBalanceError } = await supabaseAdmin
      .rpc('calculate_available_balance', { p_user_id: userId });

    if (availableBalanceError) {
      console.error(`[Wallet API] Error calculating available balance for user ${userId}:`, availableBalanceError);
      return res.status(500).json({ message: 'Failed to calculate available balance' });
    }

    console.log(`[Wallet API] Balance fetched for user ${userId}: ${walletData.balance}, available: ${availableBalanceData}`);

    // Return wallet data with available balance
    res.json({
      ...walletData,
      available_balance: availableBalanceData
    });
  } catch (error: any) {
    console.error(`[Wallet API] Unexpected error for user ${req.user?.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get wallet transactions
router.get('/wallet/transactions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ message: 'Database client not available' });
    }

    console.log(`[Wallet API] Fetching transactions for user: ${userId}, limit: ${limit}, offset: ${offset}`);

    // First get wallet id
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error(`[Wallet API] Error fetching wallet for user ${userId}:`, walletError);
      return res.status(500).json({ message: 'Failed to fetch wallet' });
    }

    const walletId = walletData.id;

    // Then get transactions
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('point_transactions')
      .select('id, wallet_id, amount, type, source, description, created_at, expires_at, ip_address')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (transactionsError) {
      console.error(`[Wallet API] Error fetching transactions for wallet ${walletId}:`, transactionsError);
      return res.status(500).json({ message: 'Failed to fetch transactions' });
    }

    console.log(`[Wallet API] Transactions fetched for user ${userId}: ${transactions.length} records`);

    // Return transactions data
    res.json({
      transactions,
      meta: {
        limit,
        offset,
        count: transactions.length
      }
    });
  } catch (error: any) {
    console.error(`[Wallet API] Unexpected error in transactions endpoint for user ${req.user?.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Deduct points from user wallet (uses updated function that considers expired points)
router.post('/wallet/deduct', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { amount, type, description } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ message: 'Database client not available' });
    }

    console.log(`[Wallet API] Deducting ${amount} points from user: ${userId}, type: ${type}`);

    // Use updated deduct_user_points function that considers expired points
    const { data: newBalance, error: transactionError } = await supabaseAdmin
      .rpc('deduct_user_points', {
        p_user_id: userId,
        p_amount: amount, // Positive amount for deduction
        p_type: type,
        p_description: description || `Manual deduction of ${amount} points`
      });

    if (transactionError) {
      console.error(`[Wallet API] Error deducting points for user ${userId}:`, transactionError);
      // Handle specific error cases
      if (transactionError.message === 'INSUFFICIENT_FUNDS') {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      return res.status(500).json({ message: 'Failed to deduct points' });
    }

    console.log(`[Wallet API] Successfully deducted ${amount} points from user ${userId}. New available balance: ${newBalance}`);

    // Return updated wallet data with available balance
    const { data: updatedWallet } = await supabaseAdmin
      .from('user_wallets')
      .select('id, user_id, balance, total_earned, updated_at')
      .eq('user_id', userId)
      .single();

    res.json({
      success: true,
      amount_deducted: amount,
      new_available_balance: newBalance,
      wallet: {
        ...updatedWallet,
        available_balance: newBalance
      }
    });
  } catch (error: any) {
    console.error(`[Wallet API] Unexpected error in deduct endpoint for user ${req.user?.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get daily point limits for user
router.get('/wallet/daily-limits', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ message: 'Database client not available' });
    }

    console.log(`[Wallet API] Fetching daily limits for user: ${userId}`);

    // Get today's date in ISO format
    const today = new Date().toISOString().split('T')[0];

    // Query daily limits for today
    const { data: limits, error: limitsError } = await supabaseAdmin
      .from('daily_point_limits')
      .select('id, user_id, transaction_type, date, amount_earned, max_amount')
      .eq('user_id', userId)
      .eq('date', today);

    if (limitsError) {
      console.error(`[Wallet API] Error fetching daily limits for user ${userId}:`, limitsError);
      return res.status(500).json({ message: 'Failed to fetch daily limits' });
    }

    console.log(`[Wallet API] Daily limits fetched for user ${userId}: ${limits.length} records`);

    // Return daily limits data
    res.json({
      limits,
      date: today
    });
  } catch (error: any) {
    console.error(`[Wallet API] Unexpected error in daily-limits endpoint for user ${req.user?.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as userRoutes };





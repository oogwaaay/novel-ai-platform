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

// Get user wallet balance
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
    const { data, error } = await supabaseAdmin
      .from('user_wallets')
      .select('id, user_id, balance, total_earned, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`[Wallet API] Error fetching balance for user ${userId}:`, error);
      return res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }

    console.log(`[Wallet API] Balance fetched for user ${userId}: ${data.balance}`);

    // Return wallet data
    res.json(data);
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
      .select('id, wallet_id, amount, type, description, created_at')
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

// Deduct points from user wallet
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

    // First get wallet id and current balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error(`[Wallet API] Error fetching wallet for user ${userId}:`, walletError);
      return res.status(500).json({ message: 'Failed to fetch wallet' });
    }

    const walletId = walletData.id;
    const currentBalance = walletData.balance;

    // Check if user has enough balance
    if (currentBalance < amount) {
      console.error(`[Wallet API] Insufficient balance for user ${userId}: current ${currentBalance}, requested ${amount}`);
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Calculate new balance
    const newBalance = currentBalance - amount;

    // Use transaction to ensure atomic operations
    const { error: transactionError } = await supabaseAdmin
      .rpc('add_user_points', {
        p_user_id: userId,
        p_amount: -amount, // Negative amount for deduction
        p_type: type,
        p_description: description || `Manual deduction of ${amount} points`
      });

    if (transactionError) {
      console.error(`[Wallet API] Error deducting points for user ${userId}:`, transactionError);
      return res.status(500).json({ message: 'Failed to deduct points' });
    }

    console.log(`[Wallet API] Successfully deducted ${amount} points from user ${userId}. New balance: ${newBalance}`);

    // Return updated wallet data
    const { data: updatedWallet } = await supabaseAdmin
      .from('user_wallets')
      .select('id, user_id, balance, total_earned, updated_at')
      .eq('id', walletId)
      .single();

    res.json({
      success: true,
      amount_deducted: amount,
      new_balance: newBalance,
      wallet: updatedWallet
    });
  } catch (error: any) {
    console.error(`[Wallet API] Unexpected error in deduct endpoint for user ${req.user?.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as userRoutes };





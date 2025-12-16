import { getUserById } from '../services/userStore';
import { BILLING_CONFIG } from '../config/billing';
import type { ActionType } from '../config/billing';
import { supabaseAdmin } from '../services/supabaseClient';

/**
 * Structured logger for billing operations
 */
const logBillingEvent = (event: string, userId: string, details: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'billing-guard',
    event,
    userId,
    ...details
  }));
};

/**
 * Check if user has enough points and deduct them if permitted
 * @param userId User ID
 * @param action Action type from BILLING_CONFIG
 * @returns { permitted: boolean, pointsDeducted: number, remainingPoints: number }
 */
export const checkAndDeductPoints = async (userId: string, action: ActionType): Promise<{
  permitted: boolean;
  pointsDeducted: number;
  remainingPoints: number;
}> => {
  try {
    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      logBillingEvent('ERROR', userId, {
        action,
        error: 'Supabase client not initialized',
        message: 'Database client not available'
      });
      return { permitted: false, pointsDeducted: 0, remainingPoints: 0 };
    }

    // Get user details
    const user = await getUserById(userId);
    if (!user) {
      logBillingEvent('ERROR', userId, {
        action,
        error: 'User not found',
        message: 'User not authenticated'
      });
      return { permitted: false, pointsDeducted: 0, remainingPoints: 0 };
    }

    // Get action configuration
    const actionConfig = BILLING_CONFIG[action];
    if (!actionConfig) {
      logBillingEvent('ERROR', userId, {
        action,
        error: 'Invalid action',
        message: `Action ${action} not found in BILLING_CONFIG`
      });
      return { permitted: false, pointsDeducted: 0, remainingPoints: 0 };
    }

    // Check if the action is free for the user's plan
    const isFreeForPlan = actionConfig.freeForPlans.includes(user.subscription.tier as any);
    if (isFreeForPlan) {
      logBillingEvent('FREE_ACTION', userId, {
        action,
        points: actionConfig.points,
        reason: `Free for ${user.subscription.tier} plan`
      });
      
      // Get current balance for response
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      return { 
        permitted: true, 
        pointsDeducted: 0, 
        remainingPoints: wallet?.balance || 0 
      };
    }

    // Get action points
    const pointsRequired = actionConfig.points;
    
    // Get current wallet balance from database
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();
    
    if (walletError) {
      logBillingEvent('ERROR', userId, {
        action,
        error: 'Wallet fetch failed',
        message: walletError.message
      });
      return { permitted: false, pointsDeducted: 0, remainingPoints: 0 };
    }
    
    const currentBalance = wallet.balance;
    
    // Check if user has enough points
    if (currentBalance < pointsRequired) {
      logBillingEvent('INSUFFICIENT_POINTS', userId, {
        action,
        required: pointsRequired,
        current: currentBalance,
        deficit: pointsRequired - currentBalance
      });
      return { permitted: false, pointsDeducted: 0, remainingPoints: currentBalance };
    }

    // Deduct points using the existing RPC function
    const { error: transactionError } = await supabaseAdmin
      .rpc('add_user_points', {
        p_user_id: userId,
        p_amount: -pointsRequired, // Negative amount for deduction
        p_type: action,
        p_description: `AI generation: ${actionConfig.label}`
      });
    
    if (transactionError) {
      logBillingEvent('ERROR', userId, {
        action,
        error: 'Points deduction failed',
        message: transactionError.message
      });
      return { permitted: false, pointsDeducted: 0, remainingPoints: currentBalance };
    }

    // Calculate new balance
    const newBalance = currentBalance - pointsRequired;
    
    logBillingEvent('POINTS_DEDUCTED', userId, {
      action,
      deducted: pointsRequired,
      previousBalance: currentBalance,
      newBalance
    });

    return { 
      permitted: true, 
      pointsDeducted: pointsRequired, 
      remainingPoints: newBalance 
    };
  } catch (error: any) {
    logBillingEvent('ERROR', userId, {
      action,
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack
    });
    return { permitted: false, pointsDeducted: 0, remainingPoints: 0 };
  }
};

/**
 * Refund points to user
 * @param userId User ID
 * @param points Points to refund
 * @returns { success: boolean, newBalance: number }
 */
export const refundPoints = async (userId: string, points: number): Promise<{
  success: boolean;
  newBalance: number;
}> => {
  try {
    if (points <= 0) {
      logBillingEvent('ERROR', userId, {
        action: 'REFUND',
        error: 'Invalid refund amount',
        message: `Refund amount must be positive, got ${points}`
      });
      return { success: false, newBalance: 0 };
    }

    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      logBillingEvent('ERROR', userId, {
        action: 'REFUND',
        error: 'Supabase client not initialized',
        message: 'Database client not available'
      });
      return { success: false, newBalance: 0 };
    }

    // Get current wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();
    
    if (walletError) {
      logBillingEvent('ERROR', userId, {
        action: 'REFUND',
        error: 'Wallet fetch failed',
        message: walletError.message
      });
      return { success: false, newBalance: 0 };
    }
    
    const currentBalance = wallet.balance;

    // Refund points using the existing RPC function
    const { error: transactionError } = await supabaseAdmin
      .rpc('add_user_points', {
        p_user_id: userId,
        p_amount: points, // Positive amount for refund
        p_type: 'REFUND',
        p_description: `Refund for failed AI generation`
      });
    
    if (transactionError) {
      logBillingEvent('ERROR', userId, {
        action: 'REFUND',
        error: 'Refund failed',
        message: transactionError.message,
        refundAmount: points
      });
      return { success: false, newBalance: currentBalance };
    }

    // Calculate new balance
    const newBalance = currentBalance + points;
    
    logBillingEvent('POINTS_REFUNDED', userId, {
      action: 'REFUND',
      refunded: points,
      previousBalance: currentBalance,
      newBalance
    });

    return { success: true, newBalance };
  } catch (error: any) {
    logBillingEvent('ERROR', userId, {
      action: 'REFUND',
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack,
      refundAmount: points
    });
    return { success: false, newBalance: 0 };
  }
};

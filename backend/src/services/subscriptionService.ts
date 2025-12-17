import { supabaseAdmin } from './supabaseClient';
import { getUserById } from './userStore';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '../types/subscription';

/**
 * Structured logger for subscription operations
 */
const logSubscriptionEvent = (event: string, userId: string, details: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'subscription-service',
    event,
    userId,
    ...details
  }));
};

/**
 * Grant monthly points to all active subscribers
 * This function should be scheduled to run on the 1st day of each month
 */
export const grantMonthlyPoints = async (): Promise<void> => {
  try {
    logSubscriptionEvent('GRANT_MONTHLY_POINTS_START', 'system', {});
    
    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      logSubscriptionEvent('ERROR', 'system', {
        event: 'GRANT_MONTHLY_POINTS',
        error: 'Supabase client not initialized',
        message: 'Database client not available'
      });
      return;
    }
    
    // Get current month
    const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01'; // YYYY-MM-01
    
    // Get all active users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, subscription');
    
    if (usersError) {
      logSubscriptionEvent('ERROR', 'system', {
        event: 'GRANT_MONTHLY_POINTS',
        error: 'Failed to fetch users',
        message: usersError.message
      });
      return;
    }
    
    // Iterate through each user
    for (const user of users) {
      try {
        // Check if user has already been granted points for this month
        const { data: existingGrant, error: existingGrantError } = await supabaseAdmin
          .from('point_grants')
          .select('id')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .single();
        
        if (existingGrant) {
          logSubscriptionEvent('SKIP_GRANT', user.id, {
            reason: 'Already granted this month',
            month: currentMonth
          });
          continue;
        }
        
        // Get subscription tier
        const subscriptionTier = (user.subscription?.tier || 'free') as SubscriptionTier;
        
        // Get monthly points based on subscription tier
        const monthlyPoints = SUBSCRIPTION_PLANS[subscriptionTier].monthlyPoints;
        
        if (monthlyPoints <= 0) {
          logSubscriptionEvent('SKIP_GRANT', user.id, {
            reason: 'No monthly points for this tier',
            tier: subscriptionTier,
            month: currentMonth
          });
          continue;
        }
        
        // Add points to user's wallet
        const { data: newBalance, error: addPointsError } = await supabaseAdmin
          .rpc('add_user_points', {
            p_user_id: user.id,
            p_amount: monthlyPoints,
            p_type: 'MONTHLY_SUBSCRIPTION_GRANT',
            p_source: 'BONUS',
            p_description: `Monthly subscription points for ${subscriptionTier} tier`
          });
        
        if (addPointsError) {
          logSubscriptionEvent('ERROR', user.id, {
            event: 'GRANT_MONTHLY_POINTS',
            error: 'Failed to add points',
            message: addPointsError.message,
            tier: subscriptionTier,
            points: monthlyPoints,
            month: currentMonth
          });
          continue;
        }
        
        // Handle points rollover based on subscription tier
        if (subscriptionTier === 'unlimited') {
          // Extend expiry for all unexpired points by 365 days for Unlimited users
          const { error: extendError } = await supabaseAdmin
            .rpc('extend_points_expiry', {
              p_user_id: user.id,
              p_extend_days: 365
            });
          
          if (extendError) {
            logSubscriptionEvent('ERROR', user.id, {
              event: 'EXTEND_POINTS_EXPIRY',
              error: 'Failed to extend points expiry',
              message: extendError.message,
              tier: subscriptionTier,
              month: currentMonth
            });
          } else {
            logSubscriptionEvent('POINTS_ROLLOVER', user.id, {
              tier: subscriptionTier,
              extendedDays: 365,
              month: currentMonth
            });
          }
        } else {
          // For non-Unlimited users, we don't need to do anything special
          // The calculate_available_balance function already excludes expired points
          // We can optionally run clear_expired_points to ensure data consistency
          await supabaseAdmin
            .rpc('clear_expired_points', {
              p_user_id: user.id
            });
        }
        
        // Record the grant in point_grants table
        const { error: grantRecordError } = await supabaseAdmin
          .from('point_grants')
          .insert({
            user_id: user.id,
            month: currentMonth,
            points_granted: monthlyPoints,
            subscription_tier: subscriptionTier
          });
        
        if (grantRecordError) {
          logSubscriptionEvent('ERROR', user.id, {
            event: 'GRANT_MONTHLY_POINTS',
            error: 'Failed to record grant',
            message: grantRecordError.message,
            tier: subscriptionTier,
            points: monthlyPoints,
            month: currentMonth
          });
          continue;
        }
        
        logSubscriptionEvent('POINTS_GRANTED', user.id, {
          tier: subscriptionTier,
          points: monthlyPoints,
          newBalance,
          month: currentMonth
        });
      } catch (error: any) {
        logSubscriptionEvent('ERROR', user.id, {
          event: 'GRANT_MONTHLY_POINTS',
          error: 'Unexpected error',
          message: error.message
        });
      }
    }
    
    logSubscriptionEvent('GRANT_MONTHLY_POINTS_COMPLETE', 'system', {
      usersProcessed: users.length
    });
  } catch (error: any) {
    logSubscriptionEvent('ERROR', 'system', {
      event: 'GRANT_MONTHLY_POINTS',
      error: 'Unexpected error',
      message: error.message
    });
  }
};

/**
 * Get subscription details for a user
 * @param userId User ID
 * @returns Subscription details with monthly points
 */
export const getSubscriptionDetails = async (userId: string) => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return null;
    }
    
    const subscriptionTier = (user.subscription?.tier || 'free') as SubscriptionTier;
    const plan = SUBSCRIPTION_PLANS[subscriptionTier];
    
    // Get current wallet balance
    if (!supabaseAdmin) {
      logSubscriptionEvent('ERROR', userId, {
        event: 'GET_SUBSCRIPTION_DETAILS',
        error: 'Supabase client not initialized',
        message: 'Database client not available'
      });
      return {
        tier: subscriptionTier,
        plan,
        wallet: { balance: 0, available_balance: 0 }
      };
    }
    
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('balance, available_balance')
      .eq('user_id', userId)
      .single();
    
    if (walletError) {
      logSubscriptionEvent('ERROR', userId, {
        event: 'GET_SUBSCRIPTION_DETAILS',
        error: 'Failed to fetch wallet',
        message: walletError.message
      });
      return {
        tier: subscriptionTier,
        plan,
        wallet: { balance: 0, available_balance: 0 }
      };
    }
    
    return {
      tier: subscriptionTier,
      plan,
      wallet
    };
  } catch (error: any) {
    logSubscriptionEvent('ERROR', userId, {
      event: 'GET_SUBSCRIPTION_DETAILS',
      error: 'Unexpected error',
      message: error.message
    });
    return null;
  }
};

/**
 * Check if a user has unlimited text generation
 * @param userId User ID
 * @returns boolean indicating if user has unlimited text generation
 */
export const hasUnlimitedTextGeneration = async (userId: string): Promise<boolean> => {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return false;
    }
    
    const subscriptionTier = user.subscription?.tier || 'free';
    return SUBSCRIPTION_PLANS[subscriptionTier].unlimitedText;
  } catch (error: any) {
    logSubscriptionEvent('ERROR', userId, {
      event: 'CHECK_UNLIMITED_TEXT',
      error: 'Unexpected error',
      message: error.message
    });
    return false;
  }
};

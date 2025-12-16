import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

const router = Router();

// Configuration
const CREEM_API_KEY = process.env.CREEM_API_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Validate configuration
if (!CREEM_API_KEY) {
  console.error('CREEM_API_KEY environment variable is required');
}

// Creem API base URL - 使用生产环境地址
const CREEM_API_BASE = 'https://api.creem.io/v1';

// Create axios instance for Creem API with correct auth header
const creemApi = axios.create({
  baseURL: CREEM_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': CREEM_API_KEY // 👈 修正：使用 x-api-key 而非 Authorization
  }
});

// Validate request middleware
const handleValidation = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return true;
};

// API Endpoint: Create Checkout Session
// POST /api/creem/create-checkout
router.post(
  '/create-checkout',
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle')
  ],
  async (req: Request, res: Response) => {
    // Validate request
    if (!handleValidation(req, res)) {
      return;
    }

    const { productId, billingCycle } = req.body;

    try {
      // 准备请求体 - success_url 改为纯净 URL，Creem 会自动追加 checkout_id
      const requestBody = {
        product_id: productId,
        success_url: `${BASE_URL}/payment-success`,
        metadata: {
          billing_cycle: billingCycle
        }
      };
      
      // Call Creem API to create checkout session
      console.log('🚀 [DEBUG] Requesting Creem URL:', `${CREEM_API_BASE}/checkouts`);
      const response = await creemApi.post('/checkouts', requestBody);

      const { checkout_url, id: checkoutId } = response.data;

      // Return checkout URL to frontend
      return res.json({
        checkout_url,
        checkout_id: checkoutId
      });
    } catch (error: any) {
      console.error('Error creating checkout session:', error.response?.data || error.message);
      return res.status(500).json({
        error: 'Failed to create checkout session',
        details: error.response?.data || error.message
      });
    }
  }
);

// API Endpoint: Check Payment Status
// GET /api/creem/check-status?checkout_id=xxx
router.get(
  '/check-status',
  async (req: Request, res: Response) => {
    const { checkout_id } = req.query;

    if (!checkout_id) {
      return res.status(400).json({ error: 'Checkout ID is required' });
    }

    try {
      // Call Creem API to get checkout status - 使用查询参数而不是路径参数
      console.log('🚀 [DEBUG] Requesting Creem URL:', `${CREEM_API_BASE}/checkouts?checkout_id=${checkout_id}`);
      const response = await creemApi.get(`/checkouts?checkout_id=${checkout_id}`);

      const checkoutData = response.data;
      const { status } = checkoutData;

      // Determine if payment was successful - 检查 status 字段是否为 'completed' 或 'paid'
      const isSuccess = status === 'completed' || status === 'paid';

      // Return payment status
      return res.json({
        success: isSuccess,
        status,
        checkout_data: checkoutData
      });
    } catch (error: any) {
      console.error('Error checking Creem payment status:', error.response?.data || error.message);
      return res.status(500).json({
        error: 'Failed to check payment status',
        details: error.response?.data || error.message
      });
    }
  }
);

// API Endpoint: Handle Creem Webhook Events
// POST /api/creem/webhook
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    try {
      // Get webhook secret from environment variables
      const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('CREEM_WEBHOOK_SECRET environment variable is required');
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Get signature from headers
      const signature = req.headers['x-creem-signature'] as string;
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      // Get request body as string
      const rawBody = JSON.stringify(req.body);

      // Verify signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Compare signatures
      if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return res.status(403).json({ error: 'Invalid signature' });
      }

      // Get event type and data
      const { type, data } = req.body;
      console.log('✅ Webhook received:', type);

      // Handle different event types
      switch (type) {
        case 'payment.succeeded':
        case 'invoice.paid':
        case 'subscription.renewed':
          // Update database, extend user subscription and grant points
          await handleSubscriptionPayment(data);
          break;

        case 'subscription.canceled':
        case 'subscription.deleted':
          // Update database, mark subscription as canceled
          console.log('❌ Canceling subscription for user:', data.customer_id);
          // TODO: Implement database update logic
          break;

        case 'subscription.refunded':
        case 'payment.refunded':
          // Handle subscription refund - reset user balance to 0 as a safety measure
          await handleSubscriptionRefund(data);
          break;

        default:
          console.log('ℹ️  Unknown event type:', type);
      }

      // Return 200 response
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Error handling webhook:', error.message);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ error: 'Failed to handle webhook' });
    }
  }
);

// Helper function: Handle subscription payment and grant points
async function handleSubscriptionPayment(data: any) {
  try {
    // Import supabaseAdmin client inside the function to avoid circular dependency
    const { supabaseAdmin } = require('../services/supabaseClient');
    if (!supabaseAdmin) {
      console.error('Supabase client not initialized');
      return;
    }

    // Extract customer email and product ID from webhook data
    const customerEmail = data.customer_email;
    // 兼容处理：优先使用 product_id，其次使用 plan_id
    const productId = data.product_id || data.plan_id || data.product?.id;
    
    if (!customerEmail || !productId) {
      console.error('Missing customer_email or product/plan ID in webhook data');
      return;
    }

    console.log('🔄 Processing subscription payment for:', customerEmail);
    console.log('📦 Product ID:', productId);

    // 🔧 产品ID到积分的映射关系（常量对象，便于维护）
    const PLAN_REWARD_MAP = new Map([
      // Starter Plan
      ['prod_6pRi0DCl1h0fEqH3qAIX25', 5000],   // Starter 月付
      ['prod_3n19V3nvW64SzHGxHFARMe', 70000],  // Starter 年付
      // Pro Plan
      ['prod_42F3odu5moDVtV9gC9oRQ7', 2000],    // Pro 月付
      ['prod_1QTk96tAuK62ZKEMdWNpFJ', 30000],   // Pro 年付
      // Unlimited Plan
      ['prod_wWv176wMRUZsobW8J2aIB', 10000],    // Unlimited 月付
      ['prod_gccFskF10GtgbgXXG9AGd', 150000]    // Unlimited 年付
    ]);

    // Determine points to grant based on product ID
    const pointsToGrant = PLAN_REWARD_MAP.get(productId);
    
    // If product ID is not in the map, log error but return 200
    if (pointsToGrant === undefined) {
      console.error('Unknown product ID, skipping points grant:', productId);
      return; // Return without error, don't throw 500
    }

    console.log('🎁 Granting', pointsToGrant, 'points to:', customerEmail);

    // Find user by email in auth.users table
    const { data: users, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', customerEmail)
      .limit(1);

    if (userError) {
      console.error('Error finding user by email:', userError.message);
      throw userError;
    }

    if (!users || users.length === 0) {
      console.log('User not found for email:', customerEmail, ' - ignoring');
      return;
    }

    const userId = users[0].id;
    console.log('👤 Found user:', userId);

    // Use the add_user_points RPC function to grant points (atomic operation)
    const { error: rpcError } = await supabaseAdmin.rpc('add_user_points', {
      p_user_id: userId,
      p_amount: pointsToGrant,
      p_type: 'SUBSCRIPTION_RENEWAL',
      p_description: `Subscription renewal for ${productId} plan`
    });

    if (rpcError) {
      console.error('Error granting points to user:', rpcError.message);
      throw rpcError;
    }

    console.log('✅ Successfully granted', pointsToGrant, 'points to user:', userId);
  } catch (error: any) {
    console.error('Error in handleSubscriptionPayment:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Helper function: Handle subscription refund and reset balance to 0
async function handleSubscriptionRefund(data: any) {
  try {
    // Import supabaseAdmin client inside the function to avoid circular dependency
    const { supabaseAdmin } = require('../services/supabaseClient');
    if (!supabaseAdmin) {
      console.error('Supabase client not initialized');
      return;
    }

    // Extract customer email from webhook data
    const customerEmail = data.customer_email;
    
    if (!customerEmail) {
      console.error('Missing customer_email in webhook refund data');
      return;
    }

    console.log('🔄 Processing subscription refund for:', customerEmail);

    // Find user by email in auth.users table
    const { data: users, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', customerEmail)
      .limit(1);

    if (userError) {
      console.error('Error finding user by email:', userError.message);
      throw userError;
    }

    if (!users || users.length === 0) {
      console.log('User not found for email:', customerEmail, ' - ignoring');
      return;
    }

    const userId = users[0].id;
    console.log('👤 Found user:', userId);

    // Get current balance first (optional, to record the actual amount cleared)
    const { data: wallets, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .limit(1);

    if (walletError) {
      console.error('Error getting user wallet:', walletError.message);
      throw walletError;
    }

    if (!wallets || wallets.length === 0) {
      console.log('Wallet not found for user:', userId, ' - creating with 0 balance');
      // Create wallet with 0 balance if it doesn't exist
      await supabaseAdmin
        .from('user_wallets')
        .insert({
          user_id: userId,
          balance: 0,
          total_earned: 0
        });
      return;
    }

    const walletId = wallets[0].id;
    const currentBalance = wallets[0].balance;
    
    // Reset balance to 0
    const { error: updateError } = await supabaseAdmin
      .from('user_wallets')
      .update({
        balance: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId);

    if (updateError) {
      console.error('Error resetting user balance:', updateError.message);
      throw updateError;
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin
      .from('point_transactions')
      .insert({
        wallet_id: walletId,
        amount: -currentBalance, // Record the actual amount cleared
        type: 'SYSTEM_REFUND_CLEAR',
        description: `Subscription refunded. Balance reset from ${currentBalance} to 0 by system.`
      });

    if (transactionError) {
      console.error('Error recording refund transaction:', transactionError.message);
      throw transactionError;
    }

    console.log('✅ Successfully reset balance to 0 for user:', userId);
    console.log('📝 Original balance:', currentBalance);
  } catch (error: any) {
    console.error('Error in handleSubscriptionRefund:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

export { router as creemRoutes };

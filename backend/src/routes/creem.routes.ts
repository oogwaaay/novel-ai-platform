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
        case 'subscription.renewed':
          // Update database, extend user subscription
          console.log('🔄 Updating subscription for user:', data.customer_id);
          // TODO: Implement database update logic
          break;

        case 'subscription.canceled':
        case 'subscription.deleted':
          // Update database, mark subscription as canceled
          console.log('❌ Canceling subscription for user:', data.customer_id);
          // TODO: Implement database update logic
          break;

        default:
          console.log('ℹ️  Unknown event type:', type);
      }

      // Return 200 response
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Error handling webhook:', error.message);
      return res.status(500).json({ error: 'Failed to handle webhook' });
    }
  }
);

export { router as creemRoutes };

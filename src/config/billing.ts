// Billing configuration for the application
// This config is shared between frontend and backend for consistent pricing
// Focus on text generation features only (no image generation)

// Use the actual Product IDs provided earlier
export const BILLING_CONFIG = {
  // 1. Text Generation - Outline
  GENERATE_OUTLINE: {
    points: 10,
    freeForPlans: [
      // Pro plans (both monthly and yearly)
      'prod_42F3odu5moDVtV9gC9oRQ7', // Pro monthly
      'prod_1QTk96tAuK62ZKEMdWNpFJ', // Pro yearly
      // Unlimited plans (both monthly and yearly)
      'prod_wWv176wMRUZsobW8J2aIB', // Unlimited monthly
      'prod_gccFskF10GtgbgXXG9AGd'  // Unlimited yearly
    ],
    label: 'Generate Outline'
  },
  
  // 2. Text Generation - Chapter Writing
  GENERATE_CHAPTER: {
    points: 30,
    freeForPlans: [
      // Pro plans (both monthly and yearly)
      'prod_42F3odu5moDVtV9gC9oRQ7', // Pro monthly
      'prod_1QTk96tAuK62ZKEMdWNpFJ', // Pro yearly
      // Unlimited plans (both monthly and yearly)
      'prod_wWv176wMRUZsobW8J2aIB', // Unlimited monthly
      'prod_gccFskF10GtgbgXXG9AGd'  // Unlimited yearly
    ],
    label: 'Write Chapter'
  },
  
  // 3. AI Chat / Brainstorming
  AI_CHAT: {
    points: 5,
    freeForPlans: [
      // Pro plans (both monthly and yearly)
      'prod_42F3odu5moDVtV9gC9oRQ7', // Pro monthly
      'prod_1QTk96tAuK62ZKEMdWNpFJ', // Pro yearly
      // Unlimited plans (both monthly and yearly)
      'prod_wWv176wMRUZsobW8J2aIB', // Unlimited monthly
      'prod_gccFskF10GtgbgXXG9AGd'  // Unlimited yearly
    ],
    label: 'Ask AI'
  }
} as const;

// Type definition for action types
export type ActionType = keyof typeof BILLING_CONFIG;
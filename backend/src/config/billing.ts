// Billing configuration for the application
// This config is shared between frontend and backend for consistent pricing
// Focus on text generation features only (no image generation)

export const BILLING_CONFIG = {
  // 1. Text Generation - Outline
  GENERATE_OUTLINE: {
    points: 10,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Generate Outline'
  },
  
  // 2. Text Generation - Chapter Writing
  GENERATE_CHAPTER: {
    points: 30,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Write Chapter'
  },
  
  // 3. AI Chat / Brainstorming
  AI_CHAT: {
    points: 5,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Ask AI'
  }
} as const;

// Type definition for action types
export type ActionType = keyof typeof BILLING_CONFIG;

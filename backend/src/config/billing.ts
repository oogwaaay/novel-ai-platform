// Billing configuration for the application
// This config is shared between frontend and backend for consistent pricing

export const BILLING_CONFIG = {
  // 1. Text Generation - Outline
  GENERATE_OUTLINE: {
    points: 10,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Generate Outline'
  },
  
  // 2. Text Generation - Chapter Writing
  GENERATE_CHAPTER: {
    points: 10, // AI Writing: 10 Points / Chapter
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Write Chapter'
  },
  
  // 3. AI Assistant Actions
  AI_REWRITE: {
    points: 10,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Rewrite Text'
  },
  
  AI_TONE: {
    points: 10,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Adjust Tone'
  },
  
  AI_SUGGEST: {
    points: 15,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Plot Suggestions'
  },
  
  AI_DETECT: {
    points: 8,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Detect Issues'
  },
  
  AI_STORY_TREE: {
    points: 20,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Story Structure'
  },
  
  AI_SCENE_BEATS: {
    points: 18,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Scene Beats'
  },
  
  AI_CHARACTER_ARC: {
    points: 15,
    freeForPlans: ['pro', 'unlimited'], // Free for Pro and Unlimited tiers
    label: 'Character Arcs'
  },
  
  // 4. Deep Thinking (Advanced AI Analysis)
  DEEP_THINKING: {
    points: 50, // Deep Thinking: 50 Points / Chapter
    freeForPlans: ['unlimited'], // Only free for Unlimited tier
    label: 'Deep Thinking Analysis'
  },
  
  // 5. AI Art Generation
  GENERATE_AI_ART: {
    points: 50, // AI Art: 50 Points / Image
    freeForPlans: ['unlimited'], // Only free for Unlimited tier
    label: 'Generate AI Art'
  }
} as const;

// Type definition for action types
export type ActionType = keyof typeof BILLING_CONFIG;

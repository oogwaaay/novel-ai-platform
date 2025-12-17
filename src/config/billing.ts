// Billing configuration for the application
// This config is shared between frontend and backend for consistent pricing

export const AI_ACTION_POINT_COSTS = {
  rewrite: 10,
  tone: 10,
  suggest: 15,
  detect: 8,
  storyTree: 20,
  sceneBeats: 18,
  characterArc: 15
};

export type AiActionType = keyof typeof AI_ACTION_POINT_COSTS;

// Generate costs
const BILLING_CONFIG = {
  GENERATE_CHAPTER: {
    points: 15
  },
  GENERATE_OUTLINE: {
    points: 10
  }
};

export { BILLING_CONFIG };

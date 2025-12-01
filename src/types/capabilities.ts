import type { SubscriptionTier } from './subscription';

export type CapabilityKey =
  | 'styleMemory'
  | 'characterManagement'
  | 'knowledgeBase'
  | 'aiAssistant'
  | 'versionHistory'
  | 'collaboration'
  | 'analytics'
  | 'templateLibrary';

export interface CapabilityProfile {
  tier: SubscriptionTier;
  limits: {
    generationsPerMonth: number;
    maxPages: number;
  };
  exportFormats: string[];
  features: Record<CapabilityKey, boolean>;
}




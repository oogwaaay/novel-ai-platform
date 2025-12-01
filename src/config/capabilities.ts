export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'unlimited';

export interface CapabilityProfile {
  tier: SubscriptionTier;
  label: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount: number;
  badge?: string;
  description: string;
  ctaLabel: string;
  features: string[];
  flags: {
    styleMemory: boolean;
    characterManagement: boolean;
    aiAssistant: boolean;
    knowledgeBase: boolean;
    versionHistory: boolean;
    realtimeCollab: boolean;
    prioritySupport: boolean;
  };
}

export const CAPABILITY_PROFILES: Record<Exclude<SubscriptionTier, 'free'>, CapabilityProfile> = {
  starter: {
    tier: 'starter',
    label: 'Starter',
    monthlyPrice: 12,
    yearlyPrice: 108,
    yearlyDiscount: 25,
    badge: 'Best for testing',
    description: 'Launch your first AI-assisted manuscript',
    ctaLabel: 'Get started',
    features: [
      '300 AI novel generations / month',
      'Foundational AI novel writer',
      'Story outline generator',
      'Export to PDF / Markdown',
      'Basic style presets (3 styles)',
      'Chapter management'
    ],
    flags: {
      styleMemory: false,
      characterManagement: false,
      aiAssistant: false,
      knowledgeBase: false,
      versionHistory: false,
      realtimeCollab: false,
      prioritySupport: false
    }
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    monthlyPrice: 25,
    yearlyPrice: 240,
    yearlyDiscount: 20,
    badge: 'Most popular',
    description: 'Full-featured studio for active writers',
    ctaLabel: 'Start Pro trial',
    features: [
      '500 AI novel generations / month',
      'Advanced AI novel writer + style memory',
      'Story character management & chapter organization',
      'AI writing assistant (rewrite, tone adjustment, plot suggestions)',
      'Style training system',
      'Context optimization (8000+ words)',
      'Version history',
      'Export to DOCX / EPUB / PDF / Markdown',
      'Priority support and faster processing'
    ],
    flags: {
      styleMemory: true,
      characterManagement: true,
      aiAssistant: true,
      knowledgeBase: false,
      versionHistory: true,
      realtimeCollab: false,
      prioritySupport: true
    }
  },
  unlimited: {
    tier: 'unlimited',
    label: 'Unlimited',
    monthlyPrice: 35,
    yearlyPrice: 336,
    yearlyDiscount: 20,
    badge: 'For power users',
    description: 'Unlimited drafting with collaboration tools',
    ctaLabel: 'Start Unlimited trial',
    features: [
      'Unlimited AI novel generations',
      'Everything in Pro',
      'Real-time collaboration (multi-user editing)',
      'Comment system',
      'Advanced version control (Git-like)',
      'Knowledge base system',
      'Writing statistics & analytics',
      'Advanced template library (20+ templates)',
      'Priority queue and dedicated support'
    ],
    flags: {
      styleMemory: true,
      characterManagement: true,
      aiAssistant: true,
      knowledgeBase: true,
      versionHistory: true,
      realtimeCollab: true,
      prioritySupport: true
    }
  }
};



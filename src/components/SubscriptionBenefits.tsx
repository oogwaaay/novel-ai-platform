import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';

const tierOrder = ['free', 'starter', 'pro', 'unlimited'] as const;

type Tier = (typeof tierOrder)[number];

interface FeatureDefinition {
  id: string;
  label: string;
  description: string;
  availableFrom: Tier;
}

const FEATURE_MATRIX: FeatureDefinition[] = [
  {
    id: 'workspace',
    label: 'Outline + Draft workspace',
    description: 'Generate chapters with synced outline + reader/editor modes.',
    availableFrom: 'free'
  },
  {
    id: 'exports',
    label: 'Advanced export formats',
    description: 'Export polished manuscripts to PDF / DOCX / EPUB.',
    availableFrom: 'starter'
  },
  {
    id: 'usage',
    label: 'Higher AI generation quota',
    description: 'Up to 1,000 AI generations every month with Pro.',
    availableFrom: 'pro'
  },
  {
    id: 'role-style',
    label: 'Character & style memory',
    description: 'Manage story characters and keep their traits, tone, and pacing consistent across chapters.',
    availableFrom: 'pro'
  },
  {
    id: 'priority',
    label: 'Priority queue & support',
    description: 'Jump the queue and get dedicated guidance from our team.',
    availableFrom: 'pro'
  },
  {
    id: 'unlimited-length',
    label: 'Unlimited novel length',
    description: 'Write epics without page limits on the Unlimited plan.',
    availableFrom: 'unlimited'
  }
];

const getTierIndex = (tier: Tier) => tierOrder.indexOf(tier);

export default function SubscriptionBenefits() {
  const { tier, plan } = useSubscription();
  const currentIndex = getTierIndex(tier);

  const unlocked = FEATURE_MATRIX.filter(
    (feature) => getTierIndex(feature.availableFrom) <= currentIndex
  );
  const locked = FEATURE_MATRIX.filter(
    (feature) => getTierIndex(feature.availableFrom) > currentIndex
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 space-y-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Your plan</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-light text-slate-900 capitalize">{plan.name}</h3>
            <p className="text-xs text-slate-500">
            {tier === 'free'
                ? '30 free generations / month'
                : `${plan.limits.maxGenerationsPerMonth === Infinity ? 'Unlimited' : plan.limits.maxGenerationsPerMonth} generations / month`}
            </p>
          </div>
          <Link
            to="/pricing"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            View plans
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">Included</h4>
        <ul className="space-y-3">
          {unlocked.map((feature) => (
            <li key={feature.id} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">{feature.label}</p>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {locked.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
            Unlock with upgrade
          </h4>
          <ul className="space-y-3">
            {locked.map((feature) => (
              <li key={feature.id} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-6V7a5 5 0 0110 0v2m-9 4h8"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{feature.label}</p>
                  <p className="text-xs text-slate-500">{feature.description}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Available on {feature.availableFrom.charAt(0).toUpperCase() + feature.availableFrom.slice(1)} plan
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}



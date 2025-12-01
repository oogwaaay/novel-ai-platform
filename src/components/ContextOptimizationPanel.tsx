import { useMemo, useState } from 'react';
import type { SubscriptionTier } from '../types/subscription';
import UpgradePrompt from './UpgradePrompt';

type ContextStrategy = 'precision' | 'balanced' | 'extended';

interface ContextOptimizationPanelProps {
  strategy: ContextStrategy;
  onStrategyChange: (value: ContextStrategy) => void;
  planLimitWords: number;
  currentTier: SubscriptionTier;
  extendedRequiredTier: SubscriptionTier;
  draftWordCount?: number; // For smart recommendation
  contextMetadata?: {
    selectedParagraphs: number;
    totalParagraphs: number;
    selectedWords: number;
    totalWords: number;
    strategy: string;
  } | null; // For real-time preview
}

const STRATEGY_COPY: Array<{
  value: ContextStrategy;
  title: string;
  description: string;
  defaultWords: number;
}> = [
  {
    value: 'precision',
    title: 'Precision · 2K words',
    description: 'Focus on the most recent paragraphs. Ideal for line edits and short scenes.',
    defaultWords: 2000
  },
  {
    value: 'balanced',
    title: 'Balanced · 4K words',
    description: 'Use your plan’s default context window. Recommended for most drafts.',
    defaultWords: 4000
  },
  {
    value: 'extended',
    title: 'Extended · 8K+ words',
    description: 'Pull long-term context for sprawling chapters and multi-threaded plots.',
    defaultWords: 8000
  }
];

const formatWords = (words: number, precise: boolean = false) => {
  if (words >= 1000) {
    return precise ? `${(words / 1000).toFixed(1)}K` : `${Math.round(words / 1000)}K`;
  }
  return words.toString();
};

export default function ContextOptimizationPanel({
  strategy,
  onStrategyChange,
  planLimitWords,
  currentTier,
  extendedRequiredTier,
  draftWordCount = 0,
  contextMetadata = null
}: ContextOptimizationPanelProps) {
  const extendedAvailable = planLimitWords >= 8000;
  const normalizedPlanLimit = planLimitWords || 4000;
  const [showPreview, setShowPreview] = useState(false);

  // Smart recommendation based on document length
  const recommendedStrategy = useMemo((): ContextStrategy | null => {
    if (draftWordCount === 0) return null;
    if (draftWordCount < 1000) return 'precision';
    if (draftWordCount < 5000) return 'balanced';
    return 'extended';
  }, [draftWordCount]);

  return (
    <div className="space-y-4">
      {/* Usage Scenarios Guide */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-[0.2em]">When to use each mode</p>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-indigo-600 font-semibold mt-0.5">📝</span>
            <div>
              <p className="font-semibold text-slate-900">Precision (2K words)</p>
              <p className="text-slate-600">Editing recent paragraphs • Short scenes (&lt; 1000 words) • Quick dialogue fixes</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-indigo-600 font-semibold mt-0.5">✨</span>
            <div>
              <p className="font-semibold text-slate-900">Balanced (4K words) - Recommended</p>
              <p className="text-slate-600">Daily writing • Medium chapters • Most situations</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-indigo-600 font-semibold mt-0.5">📚</span>
            <div>
              <p className="font-semibold text-slate-900">Extended (8K+ words)</p>
              <p className="text-slate-600">Long chapters (&gt; 3000 words) • Complex plots • Multiple characters</p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Recommendation */}
      {recommendedStrategy && recommendedStrategy !== strategy && draftWordCount > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-sm">💡</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-900 mb-1">Smart Recommendation</p>
              <p className="text-xs text-blue-700">
                Your document has {formatWords(draftWordCount, true)} words. We recommend using <strong>{recommendedStrategy}</strong> for better consistency.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Options */}
      <div className="space-y-3">
        {STRATEGY_COPY.map((option) => {
          const isExtended = option.value === 'extended';
          const isDisabled = isExtended && !extendedAvailable;
          const effectiveWords =
            option.value === 'precision'
              ? 2000
              : option.value === 'balanced'
              ? Math.min(4000, normalizedPlanLimit)
              : Math.min(normalizedPlanLimit, 16000);
          const label =
            option.value === 'precision'
              ? `Precision · ${formatWords(effectiveWords)} words`
              : option.value === 'balanced'
              ? `Balanced · ${formatWords(effectiveWords)} words`
              : `Extended · ${formatWords(effectiveWords)} words`;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onStrategyChange(option.value)}
              className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                strategy === option.value
                  ? 'border-slate-900 bg-slate-50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    {label}
                    {strategy === option.value && (
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em]">
                        Active
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    strategy === option.value ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                  }`}
                >
                  {strategy === option.value && <span className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              {isDisabled && (
                <p className="text-xs text-amber-600 mt-2">
                  Available on {extendedRequiredTier.toUpperCase()} plan for 8K+ context window.
                </p>
              )}
            </button>
          );
        })}

        <div className="text-xs text-slate-500 mt-2">
          Current plan limit: {formatWords(normalizedPlanLimit)} words per context window.
        </div>

        {/* Real-time Preview (Lazy Loaded) */}
        {contextMetadata && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="text-xs font-semibold text-slate-900 mb-1">Last AI Generation Preview</p>
                <p className="text-xs text-slate-600">
                  AI considered {contextMetadata.selectedParagraphs} of {contextMetadata.totalParagraphs} paragraphs
                  ({formatWords(contextMetadata.selectedWords)} of {formatWords(contextMetadata.totalWords)} words)
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${showPreview ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPreview && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-slate-500 mb-1">Selected</p>
                    <p className="font-semibold text-slate-900">
                      {contextMetadata.selectedParagraphs} / {contextMetadata.totalParagraphs} paragraphs
                    </p>
                    <p className="text-slate-500 mt-1">
                      {formatWords(contextMetadata.selectedWords)} words
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-slate-500 mb-1">Total</p>
                    <p className="font-semibold text-slate-900">
                      {contextMetadata.totalParagraphs} paragraphs
                    </p>
                    <p className="text-slate-500 mt-1">
                      {formatWords(contextMetadata.totalWords)} words
                    </p>
                  </div>
                </div>
                <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                  <p className="text-xs font-semibold text-indigo-900 mb-1">Strategy Used</p>
                  <p className="text-xs text-indigo-700 capitalize">
                    {contextMetadata.strategy === 'recent' && 'Recent paragraphs (most recent content)'}
                    {contextMetadata.strategy === 'relevant' && 'Relevant paragraphs (character mentions, dialogue, action)'}
                    {contextMetadata.strategy === 'mixed' && 'Mixed strategy (recent + relevant)'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!extendedAvailable && (
          <div className="mt-3">
            <UpgradePrompt
              currentTier={currentTier}
              requiredTier={extendedRequiredTier}
              featureName="8K+ Context Window"
              variant="banner"
            />
          </div>
        )}
      </div>
    </div>
  );
}



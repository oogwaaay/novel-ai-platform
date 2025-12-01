import { useState, useEffect } from 'react';
import type { ContextMetadata } from '../api/novelApi';
import { GlassCard } from './ui/GlassCard';

interface ContextManagerPanelProps {
  contextMetadata: ContextMetadata | null;
  fullContext: string;
  selectedContext: string;
}

export default function ContextManagerPanel({
  contextMetadata,
  fullContext,
  selectedContext
}: ContextManagerPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!contextMetadata) {
    return null;
  }

  const selectionRatio = contextMetadata.totalWords > 0
    ? ((contextMetadata.selectedWords / contextMetadata.totalWords) * 100).toFixed(1)
    : '0';

  const strategyLabels = {
    recent: 'Recent paragraphs (most recent content)',
    relevant: 'Relevant paragraphs (character mentions, dialogue, action)',
    mixed: 'Mixed strategy (recent + relevant)'
  };

  return (
    <GlassCard className="p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Context Selection</p>
          <p className="text-sm text-slate-600 mt-1">
            Using {contextMetadata.strategy} strategy
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          {expanded ? 'Hide' : 'Show'} details
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Selected</p>
              <p className="text-sm font-semibold text-slate-900">
                {contextMetadata.selectedParagraphs} / {contextMetadata.totalParagraphs} paragraphs
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {contextMetadata.selectedWords.toLocaleString()} words ({selectionRatio}%)
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Total</p>
              <p className="text-sm font-semibold text-slate-900">
                {contextMetadata.totalParagraphs} paragraphs
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {contextMetadata.totalWords.toLocaleString()} words
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-indigo-900 mb-1">Strategy</p>
            <p className="text-sm text-indigo-700">
              {strategyLabels[contextMetadata.strategy]}
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-auto">
            <p className="text-xs text-slate-500 mb-2">Selected context preview:</p>
            <p className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
              {selectedContext.slice(0, 500)}
              {selectedContext.length > 500 ? '...' : ''}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}




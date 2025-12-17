import { useEffect, useRef, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AiAction } from '../api/novelApi';
import type { SubscriptionTier } from '../types/subscription';

interface AIActionMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: AiAction) => void;
  canUseAssistant: boolean;
  requiredTier: SubscriptionTier;
  currentTier?: SubscriptionTier | null;
  minSelectionMet: boolean;
  minSelectionChars: number;
  canUseCollaboration?: boolean;
  onAddComment?: () => void;
}

// SVG Icons for actions - Apple-style minimal icons
const ActionIcons: Record<AiAction, JSX.Element> = {
  rewrite: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  tone: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
  suggest: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  detect: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  storyTree: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6-6 6 6M6 15l6 6 6-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9v6m12-6v6" />
    </svg>
  ),
  sceneBeats: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h3m4 0h9M4 16h6m4 0h6M8 4v4m8 4v4" />
      <circle cx="7" cy="8" r="1.5" />
      <circle cx="15" cy="16" r="1.5" />
    </svg>
  ),
  characterArc: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c-3.866 0-7 1.79-7 4v2h14v-2c0-2.21-3.134-4-7-4z" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
};

const ACTION_COPY: Array<{ id: AiAction; label: string; description: string }> = [
  { id: 'rewrite', label: 'Rewrite paragraph', description: 'Clean up pacing, clarity, and style.' },
  { id: 'tone', label: 'Adjust tone', description: 'Shift the emotional voice without changing plot beats.' },
  { id: 'suggest', label: 'Plot suggestions', description: 'Get three ideas for what should happen next.' },
  { id: 'detect', label: 'Detect conflicts', description: 'Surface continuity or character inconsistencies.' },
  { id: 'storyTree', label: 'Story tree', description: 'Map acts and major beats across the narrative.' },
  { id: 'sceneBeats', label: 'Scene beats', description: 'Summarize beat tension and pacing for the passage.' },
  { id: 'characterArc', label: 'Character arcs', description: 'Track each character’s goal, obstacle, and next move.' }
];

const tierLabelMap: Record<SubscriptionTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  unlimited: 'Unlimited'
};

export default function AIActionMenu({
  selectedText,
  position,
  onClose,
  onAction,
  canUseAssistant,
  requiredTier,
  currentTier,
  minSelectionMet,
  minSelectionChars,
  canUseCollaboration = false,
  onAddComment
}: AIActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ left: number; top: number; transform: string }>({
    left: position.x,
    top: position.y,
    transform: 'translate(-50%, calc(-100% - 8px))'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = menu?.offsetWidth ?? 0;
    const height = menu?.offsetHeight ?? 0;
    let left = position.x;
    let top = position.y;
    left = Math.min(viewportWidth - margin, Math.max(margin, left));
    top = Math.min(viewportHeight - margin, Math.max(margin, top));
    let transform = 'translate(-50%, calc(-100% - 8px))';
    const projectedTop = top - height - 8;
    if (projectedTop < margin) {
      transform = 'translate(-50%, 8px)';
    }
    if (left - width / 2 < margin) {
      left = Math.max(margin + width / 2, left);
    }
    if (left + width / 2 > viewportWidth - margin) {
      left = Math.min(viewportWidth - margin - width / 2, left);
    }
    setMenuStyle({ left, top, transform });
  }, [position.x, position.y, selectedText, canUseAssistant, minSelectionMet]);

  const lockedTierLabel = tierLabelMap[requiredTier] || 'Pro';
  const isActionEnabled = canUseAssistant && minSelectionMet;

  return (
    <div
          ref={menuRef}
          className="fixed z-50 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-2xl py-1.5 min-w-[280px] overflow-hidden"
          style={{
            left: `${menuStyle.left}px`,
            top: `${menuStyle.top}px`,
            transform: menuStyle.transform
          }}
        >
      {ACTION_COPY.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={!isActionEnabled}
          onClick={() => {
            if (!isActionEnabled) return;
            onAction(action.id);
            onClose();
          }}
          className={`w-full text-left px-5 py-3 text-sm transition-all duration-200 flex flex-col gap-1 group ${isActionEnabled
              ? 'text-slate-700 hover:bg-slate-50/80 hover:translate-x-1'
              : 'text-slate-400 cursor-not-allowed opacity-70'}`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`${isActionEnabled ? 'text-indigo-500 group-hover:text-indigo-600' : 'text-slate-400'} transition-all duration-200 group-hover:scale-110`}
            >
              {ActionIcons[action.id]}
            </span>
            <span className="font-medium">{action.label}</span>
          </div>
          <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">{action.description}</p>
        </button>
      ))}

      {!minSelectionMet && (
        <div className="px-4 py-3 border-t border-slate-100 text-xs font-medium text-amber-600 bg-amber-50/80">
          Select at least {minSelectionChars} characters to unlock AI suggestions.
        </div>
      )}

      {/* Points Consumption Notice for Free/Starter plans */}
      {minSelectionMet && canUseAssistant && (currentTier === 'free' || currentTier === 'starter') && (
        <div className="px-4 py-3 border-t border-slate-100 bg-amber-50/80 text-xs font-medium text-amber-600 space-y-1">
          <p className="font-medium">AI Action Costs:</p>
          <div className="grid grid-cols-2 gap-1">
            <div>Rewrite: <strong>10 points</strong></div>
            <div>Adjust Tone: <strong>10 points</strong></div>
            <div>Plot Suggestions: <strong>15 points</strong></div>
            <div>Detect Issues: <strong>8 points</strong></div>
            <div>Story Structure: <strong>20 points</strong></div>
            <div>Scene Beats: <strong>18 points</strong></div>
            <div>Character Arcs: <strong>15 points</strong></div>
          </div>
        </div>
      )}
      
      {/* Original canUseAssistant check (should rarely show now) */}
      {minSelectionMet && !canUseAssistant && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/90 text-sm text-slate-600 space-y-2">
          <p>
            AI Assistant is available on the <span className="font-semibold">{lockedTierLabel}</span> plan.
          </p>
          <Link
            to="/pricing?feature=ai-assistant"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            onClick={onClose}
          >
            Upgrade to {lockedTierLabel}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {/* Add Comment option for collaboration users */}
      {canUseCollaboration && onAddComment && minSelectionMet && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onAddComment();
              onClose();
            }}
            className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 text-slate-700 hover:bg-indigo-50/80 group"
          >
            <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div className="flex-1">
              <div className="font-medium">Add comment</div>
              <p className="text-xs text-slate-500">Start a discussion on this selection</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
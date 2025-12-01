import { useState } from 'react';
import type { UserPreferences } from '../utils/userPreferences';

interface BriefPanelProps {
  genre: string;
  onGenreChange: (genre: string) => void;
  idea: string;
  onIdeaChange: (idea: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  length: number;
  onLengthChange: (length: number) => void;
  minLength: number;
  maxLength: number;
  loading: boolean;
  error: string | null;
  progress: string;
  progressValue: number;
  prefillNotice: string | null;
  plan: {
    name: string;
    limits: {
      maxNovelLength: number;
      maxGenerationsPerMonth: number;
    };
  };
  tier: string;
  usage: {
    generationsThisMonth: number;
  };
  getRemainingGenerations: () => number;
  onGenerate: () => void;
  onGenerateOutline: () => void;
  onShowHistory: () => void;
  onShowPlanDrawer: () => void;
  storedPref: UserPreferences | null;
  onApplyStoredPreference: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const LANGUAGE_CHOICES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Español' },
  { value: 'chinese', label: '中文' },
  { value: 'japanese', label: '日本語' },
  { value: 'auto', label: 'Auto' }
];

export default function BriefPanel({
  genre,
  onGenreChange,
  idea,
  onIdeaChange,
  language,
  onLanguageChange,
  length,
  onLengthChange,
  minLength,
  maxLength,
  loading,
  error,
  progress,
  progressValue,
  prefillNotice,
  plan,
  tier,
  usage,
  getRemainingGenerations,
  onGenerate,
  onGenerateOutline,
  onShowHistory,
  onShowPlanDrawer,
  storedPref,
  onApplyStoredPreference,
  isCollapsed = false,
  onToggleCollapse
}: BriefPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Story brief</p>
          <p className="text-sm text-slate-500">Configure your story</p>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
            aria-label={isCollapsed ? 'Expand brief' : 'Collapse brief'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {storedPref && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Saved preset</p>
                <p className="text-sm text-slate-900">{storedPref.templateTitle}</p>
              </div>
              <button
                onClick={onApplyStoredPreference}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Apply
              </button>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Genre</label>
            <select
              value={genre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
            >
              <option value="general-fiction">General Fiction</option>
              <option value="literary-fiction">Literary Fiction</option>
              <option value="historical-fiction">Historical Fiction</option>
              <option value="mystery">Mystery</option>
              <option value="thriller">Thriller</option>
              <option value="horror">Horror / Suspense</option>
              <option value="romance">Romance</option>
              <option value="fantasy">Fantasy</option>
              <option value="science-fiction">Science Fiction</option>
              <option value="dystopian">Dystopian</option>
              <option value="adventure">Adventure</option>
              <option value="young-adult">Young Adult (YA)</option>
              <option value="comedy">Comedy / Humor</option>
              <option value="ai-themed">AI Themed / Novels About AI</option>
              <option value="fan-fiction">Fan Fiction</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Idea</label>
            <textarea
              value={idea}
              onChange={(e) => onIdeaChange(e.target.value)}
              placeholder="Describe your story idea..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 min-h-[120px] transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_CHOICES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onLanguageChange(option.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    language === option.value
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Length</label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 w-12 text-right">{minLength}</span>
              <input
                type="range"
                min={minLength}
                max={maxLength}
                value={length}
                onChange={(e) => onLengthChange(Number(e.target.value))}
                className="flex-1 accent-slate-900"
              />
              <span className="text-xs text-slate-400 w-12">{maxLength}</span>
            </div>
            <p className="text-sm text-slate-600 text-center">{length} pages</p>
          </div>

          {prefillNotice && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              {prefillNotice}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {(loading || progressValue > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                <span className="font-medium">{progress || 'Working...'}</span>
              </div>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(progressValue, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-slate-100/80 p-2 flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={loading || idea.length < 30}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? 'Generating...' : 'Generate draft'}
            </button>
            <button
              onClick={onGenerateOutline}
              disabled={loading || idea.length < 30}
              className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm"
            >
              Outline
            </button>
            <button
              onClick={onShowHistory}
              className="rounded-xl bg-white px-3 py-2.5 text-slate-500 hover:text-slate-700 border border-slate-200 transition shadow-sm"
              title="History"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {plan.limits.maxNovelLength !== Infinity && length > plan.limits.maxNovelLength && (
              <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600 text-center leading-relaxed">
                Your current plan supports up to {plan.limits.maxNovelLength} pages.{' '}
                <button onClick={onShowPlanDrawer} className="text-indigo-600 font-semibold hover:text-indigo-700">
                  Upgrade for longer drafts
                </button>
              </p>
            )}
            {plan.limits.maxNovelLength !== Infinity && length <= plan.limits.maxNovelLength && tier === 'free' && (
              <p className="rounded-2xl bg-slate-100/50 px-4 py-3 text-xs text-slate-500 text-center leading-relaxed">
                Free plan: up to {plan.limits.maxNovelLength} pages.{' '}
                <button onClick={onShowPlanDrawer} className="text-indigo-600 font-semibold hover:text-indigo-700">
                  View plans
                </button>
              </p>
            )}
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex flex-col">
                  <span className="font-semibold uppercase tracking-[0.2em]">Plan</span>
                  <span className="text-sm text-slate-900 capitalize">
                    {plan.name}
                    {tier === 'free' && <span className="text-xs text-slate-400 ml-1">· 30 free generations</span>}
                  </span>
                </div>
                <button
                  onClick={onShowPlanDrawer}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  View plan
                </button>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Monthly usage</span>
                  <span>
                    {plan.limits.maxGenerationsPerMonth === Infinity || 
                     plan.limits.maxGenerationsPerMonth === Number.MAX_SAFE_INTEGER
                      ? 'Unlimited'
                      : `${usage.generationsThisMonth} / ${plan.limits.maxGenerationsPerMonth}`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{
                      width:
                        plan.limits.maxGenerationsPerMonth === Infinity || 
                        plan.limits.maxGenerationsPerMonth === Number.MAX_SAFE_INTEGER
                          ? '100%'
                          : `${Math.min(
                              (usage.generationsThisMonth / plan.limits.maxGenerationsPerMonth) * 100,
                              100
                            )}%`
                    }}
                  />
                </div>
                {tier !== 'unlimited' && getRemainingGenerations() <= 5 && getRemainingGenerations() > 0 && (
                  <p className="text-xs text-amber-600 text-right">{getRemainingGenerations()} generations left</p>
                )}
                {tier !== 'unlimited' && getRemainingGenerations() === 0 && (
                  <p className="text-xs text-rose-500 text-right">
                    Monthly limit reached.{' '}
                    <button
                      onClick={onShowPlanDrawer}
                      className="font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Upgrade
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}



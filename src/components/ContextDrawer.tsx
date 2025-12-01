import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import BriefPanel from './BriefPanel';
import CharacterPanel from './CharacterPanel';
import StyleMemoryPanel from './StyleMemoryPanel';
import KnowledgeDock from './KnowledgeDock';
import StyleTemplateLibrary from './StyleTemplateLibrary';
import ContextOptimizationPanel from './ContextOptimizationPanel';
import type { Character } from '../types/character';
import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';
import type { StyleTemplate } from '../types/templates';
import { useSubscription } from '../hooks/useSubscription';
import { useCapabilities } from '../hooks/useCapabilities';
import UpgradePrompt from './UpgradePrompt';

interface ContextDrawerProps {
  open: boolean;
  onClose: () => void;
  // Brief props
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
  onGenerate: () => void;
  onGenerateOutline: () => void;
  onShowHistory: () => void;
  onShowPlanDrawer: () => void;
  storedPref: any;
  onApplyStoredPreference: () => void;
  // Character props
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
  // Style props
  writingStyle: WritingStyle | null;
  onStyleChange: (style: WritingStyle | null) => void;
  existingContent: string | null;
  // Knowledge props
  knowledgeEntries: KnowledgeEntry[];
  onKnowledgeChange: (entries: KnowledgeEntry[]) => void;
  sourceText?: string; // Optional text to extract knowledge from
  // Template props
  styleTemplates: StyleTemplate[];
  onStyleTemplatesChange: (templates: StyleTemplate[]) => void;
  onApplyStyleTemplate: (template: StyleTemplate) => void;
  onSaveStyleTemplate: () => void;
  // Knowledge reuse props
  currentProjectId?: string | null;
  // Context optimization
  contextStrategy: 'precision' | 'balanced' | 'extended';
  onContextStrategyChange: (value: 'precision' | 'balanced' | 'extended') => void;
  // For smart recommendation and preview
  draftWordCount?: number;
  contextMetadata?: {
    selectedParagraphs: number;
    totalParagraphs: number;
    selectedWords: number;
    totalWords: number;
    strategy: string;
  } | null;
}

export default function ContextDrawer({
  open,
  onClose,
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
  onGenerate,
  onGenerateOutline,
  onShowHistory,
  onShowPlanDrawer,
  storedPref,
  onApplyStoredPreference,
  characters,
  onCharactersChange,
  writingStyle,
  onStyleChange,
  existingContent,
  knowledgeEntries,
  onKnowledgeChange,
  styleTemplates,
  onStyleTemplatesChange,
  onApplyStyleTemplate,
  onSaveStyleTemplate,
  sourceText,
  currentProjectId,
  contextStrategy,
  onContextStrategyChange,
  draftWordCount,
  contextMetadata
}: ContextDrawerProps) {
  const { plan, tier, usage, getRemainingGenerations } = useSubscription();
  const { hasFeature, getRequiredTier } = useCapabilities();
  const [isBriefCollapsed, setIsBriefCollapsed] = useState(false);
  const [isCharactersCollapsed, setIsCharactersCollapsed] = useState(true);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(true);
  const [isTemplatesCollapsed, setIsTemplatesCollapsed] = useState(true);
  const [isKnowledgeCollapsed, setIsKnowledgeCollapsed] = useState(true);
  const [isContextOptimizationCollapsed, setIsContextOptimizationCollapsed] = useState(false);

  const contextBlocks = useMemo(() => {
    const blocks: Array<{ id: string; content: ReactNode }> = [
      {
        id: 'brief',
        content: (
          <BriefPanel
            genre={genre}
            onGenreChange={onGenreChange}
            idea={idea}
            onIdeaChange={onIdeaChange}
            language={language}
            onLanguageChange={onLanguageChange}
            length={length}
            onLengthChange={onLengthChange}
            minLength={minLength}
            maxLength={maxLength}
            loading={loading}
            error={error}
            progress={progress}
            progressValue={progressValue}
            prefillNotice={prefillNotice}
            plan={plan}
            tier={tier}
            usage={usage}
            getRemainingGenerations={getRemainingGenerations}
            onGenerate={onGenerate}
            onGenerateOutline={onGenerateOutline}
            onShowHistory={onShowHistory}
            onShowPlanDrawer={onShowPlanDrawer}
            storedPref={storedPref}
            onApplyStoredPreference={onApplyStoredPreference}
            isCollapsed={isBriefCollapsed}
            onToggleCollapse={() => setIsBriefCollapsed(!isBriefCollapsed)}
          />
        )
      }
    ];

    if (hasFeature('characterManagement')) {
      blocks.push({
        id: 'characters',
        content: (
          <CharacterPanel
            characters={characters}
            onCharactersChange={onCharactersChange}
            isCollapsed={isCharactersCollapsed}
            onToggleCollapse={() => setIsCharactersCollapsed(!isCharactersCollapsed)}
          />
        )
      });
    } else {
      blocks.push({
        id: 'characters-upgrade',
        content: (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
            <UpgradePrompt
              currentTier={tier}
              requiredTier={getRequiredTier('characterManagement')}
              featureName="Character Manager"
            />
          </section>
        )
      });
    }

    const planContextLimit = plan?.limits?.contextWindowWords ?? 4000;

    if (hasFeature('styleMemory')) {
      blocks.push({
        id: 'style-memory',
        content: (
          <StyleMemoryPanel
            style={writingStyle}
            onStyleChange={onStyleChange}
            existingContent={existingContent}
            isCollapsed={isVoiceCollapsed}
            onToggleCollapse={() => setIsVoiceCollapsed(!isVoiceCollapsed)}
          />
        )
      });
    } else {
      blocks.push({
        id: 'style-upgrade',
        content: (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
            <UpgradePrompt
              currentTier={tier}
              requiredTier={getRequiredTier('styleMemory')}
              featureName="Style Memory"
            />
          </section>
        )
      });
    }

    blocks.push({
      id: 'context-optimization',
      content: (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Context optimization</p>
              <p className="text-sm text-slate-600">
                Choose how much story history the AI should consider before drafting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsContextOptimizationCollapsed((prev) => !prev)}
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition"
              aria-label={isContextOptimizationCollapsed ? 'Expand context optimization' : 'Collapse context optimization'}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isContextOptimizationCollapsed ? '' : 'rotate-180'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {!isContextOptimizationCollapsed && (
            <div className="px-4 py-4">
              <ContextOptimizationPanel
                strategy={contextStrategy}
                onStrategyChange={onContextStrategyChange}
                planLimitWords={planContextLimit}
                currentTier={tier ?? 'free'}
                extendedRequiredTier="pro"
                draftWordCount={draftWordCount}
                contextMetadata={contextMetadata}
              />
            </div>
          )}
        </section>
      )
    });

    if (hasFeature('templateLibrary')) {
      blocks.push({
        id: 'templates',
        content: (
          <StyleTemplateLibrary
            customTemplates={styleTemplates}
            onChange={onStyleTemplatesChange}
            onApply={onApplyStyleTemplate}
            onSaveCurrent={onSaveStyleTemplate}
            canSaveCurrent={Boolean(writingStyle)}
            isCollapsed={isTemplatesCollapsed}
            onToggle={() => setIsTemplatesCollapsed(!isTemplatesCollapsed)}
          />
        )
      });
    } else {
      blocks.push({
        id: 'templates-upgrade',
        content: (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
            <UpgradePrompt
              currentTier={tier}
              requiredTier={getRequiredTier('templateLibrary')}
              featureName="Template Library"
            />
          </section>
        )
      });
    }

    if (hasFeature('knowledgeBase')) {
      blocks.push({
        id: 'knowledge',
        content: (
          <KnowledgeDock
            entries={knowledgeEntries}
            onChange={onKnowledgeChange}
            isCollapsed={isKnowledgeCollapsed}
            onToggle={() => setIsKnowledgeCollapsed(!isKnowledgeCollapsed)}
            sourceText={sourceText}
            genre={genre}
            currentProjectId={currentProjectId}
          />
        )
      });
    } else {
      blocks.push({
        id: 'knowledge-upgrade',
        content: (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
            <UpgradePrompt
              currentTier={tier}
              requiredTier={getRequiredTier('knowledgeBase')}
              featureName="Knowledge Dock"
            />
          </section>
        )
      });
    }

    return blocks;
  }, [
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
    isBriefCollapsed,
    hasFeature,
    characters,
    onCharactersChange,
    isCharactersCollapsed,
    writingStyle,
    onStyleChange,
    existingContent,
    isVoiceCollapsed,
    styleTemplates,
    onStyleTemplatesChange,
    onApplyStyleTemplate,
    onSaveStyleTemplate,
    isTemplatesCollapsed,
    knowledgeEntries,
    onKnowledgeChange,
    isKnowledgeCollapsed,
    getRequiredTier,
    contextStrategy,
    onContextStrategyChange,
    draftWordCount,
    contextMetadata,
    isContextOptimizationCollapsed
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-slate-900">Context</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {contextBlocks.map((block) => (
            <div key={block.id}>{block.content}</div>
          ))}
        </div>
      </div>
    </div>
  );
}


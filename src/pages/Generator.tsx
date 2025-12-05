import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import {
  generateNovel,
  Chapter,
  assistWithText,
  AiAction,
  analyzeReadingInsights,
  type StoryTreeAct,
  type SceneBeatSummary,
  type CharacterArcSummary
} from '../api/novelApi';
import {
  createProject,
  updateProject as updateProjectRequest,
  getProject,
  getProjectComments,
  getProjectActivities,
  addProjectComment,
  updateProjectCommentStatus,
  type ProjectComment,
  type ProjectCommentSelection,
  type ProjectActivity
} from '../api/projectApi';
import { updateProjectContext, getProjectContext } from '../api/contextApi';
import StoryEditor, { type StoryEditorRef } from '../components/StoryEditor';
import { SEO } from '../components/SEO';
import OutlinePreview, { OutlineMapPayload } from '../components/OutlinePreview';
import HistoryDrawer, { DraftSnapshot } from '../components/HistoryDrawer';
import VersionHistoryDrawer from '../components/VersionHistoryDrawer';
import OutlineMapDrawer from '../components/OutlineMapDrawer';
import { loadUserPreferences, UserPreferences } from '../utils/userPreferences';
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionStore } from '../store/subscriptionStore';
import SubscriptionBenefits from '../components/SubscriptionBenefits';
import PlanDrawer from '../components/PlanDrawer';
import type { Character } from '../types/character';
import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';
import type { StyleTemplate } from '../types/templates';
import PublishModal from '../components/PublishModal';
import CollaborationPanel, { type CollaborationParticipant } from '../components/CollaborationPanel';
import CollaborationActivityTimeline from '../components/CollaborationActivityTimeline';
import { buildEpub } from '../utils/epub';
import { showToast } from '../utils/toast';
import ContextDrawer from '../components/ContextDrawer';
import { threeWayMerge } from '../utils/conflictResolution';
import ContextManagerPanel from '../components/ContextManagerPanel';
import EmptyProjectGuide from '../components/EmptyProjectGuide';
import LoginModal from '../components/LoginModal';
import AIActionMenu from '../components/AIActionMenu';
import UpgradePrompt from '../components/UpgradePrompt';
import { fetchUsage } from '../api/authApi';
import { useCapabilities } from '../hooks/useCapabilities';
import type { SubscriptionTier } from '../types/subscription';
import { GlassCard } from '../components/ui/GlassCard';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { io, type Socket } from 'socket.io-client';
import type { Sources } from 'quill';
import DiffMatchPatch from 'diff-match-patch';
import { getKeyValue, setKeyValue } from '../utils/offlineDb';
import { buildUserHandle, deriveMentionsFromText, normalizeHandle } from '../utils/handle';

const getCollaborationBaseUrl = () => {
  const explicit = (import.meta.env.VITE_COLLAB_URL as string | undefined)?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl && !apiUrl.startsWith('/')) {
    return apiUrl.replace(/\/api$/, '').replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  // 生产环境使用环境变量，开发环境使用 localhost
  return import.meta.env.VITE_BACKEND_URL || 
    (import.meta.env.DEV ? 'http://localhost:3001' : '');
};
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useExecutionGraph } from '../hooks/useExecutionGraph';
import { countWords } from '../utils/wordCount';

type StoredSnapshot = Omit<DraftSnapshot, 'label'> & { label?: string };

type SectionLockState = {
  id: string;
  projectId: string;
  sectionId: string;
  range: { start: number; end: number };
  userId: string;
  userName: string;
  expiresAt: number;
};

const TypingIndicator: React.FC = () => {
  const frames = ['t', 'th', 'thi', 'thin', 'think', 'thinki', 'thinkin', 'thinking'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % frames.length);
    }, 140);
    return () => window.clearInterval(timer);
  }, []);

  return <span>{frames[index]}</span>;
};

const HISTORY_KEY = 'novel-ai-history';
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const buildSnapshotLabel = (idea: string, timestamp: number) => {
  const trimmed = idea.trim().replace(/\s+/g, ' ');
  const base = trimmed ? (trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed) : 'AI novel draft';
  return `${base} · ${dateFormatter.format(timestamp)}`;
};

const buildFilenameBase = (idea: string) => {
  const sanitized = idea
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'ai-novel-draft';
};

const TONE_KEYWORDS = [
  { tone: 'tense', words: ['threat', 'panic', 'urgent', 'attack', 'fear', 'blood', 'storm'] },
  { tone: 'hopeful', words: ['hope', 'promise', 'dawn', 'renewal', 'future', 'light'] },
  { tone: 'somber', words: ['grief', 'mourning', 'loss', 'grave', 'ashes', 'funeral'] },
  { tone: 'lyrical', words: ['dream', 'memory', 'whisper', 'poetic', 'silken'] },
  { tone: 'analytical', words: ['strategy', 'analysis', 'protocol', 'system', 'data'] }
];

const GENERIC_PROPER_NOUNS = new Set([
  'Chapter',
  'Chapters',
  'Part',
  'Parts',
  'Pages',
  'Page',
  'Outline',
  'Notes',
  'Focus',
  'Mode',
  'Key',
  'Plot',
  'Points',
  'Main',
  'Scene',
  'Story',
  'Draft'
]);

const NON_CHARACTER_TOKENS = new Set([
  'the',
  'a',
  'an',
  'and',
  'but',
  'then',
  'this',
  'that',
  'there',
  'here',
  'engineer',
  'scientist',
  'doctor',
  'captain',
  'soldier',
  'pilot',
  'author',
  'reader',
  'people',
  'figure',
  'citizen',
  'leader'
]);

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const summarizePacing = (content: string) => {
  const wordCount = countWords(content) || 1;
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  const sentenceCount = sentences.length || 1;
  const avgSentenceLength = wordCount / sentenceCount;
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  const shortParagraphRatio =
    paragraphs.length > 0 ? paragraphs.filter((p) => countWords(p) < 40).length / paragraphs.length : 0;

  let summary: string = 'Pacing stays balanced with varied beats';
  if (avgSentenceLength <= 12 && shortParagraphRatio > 0.6) {
    summary = 'Pacing feels fast and punchy';
  } else if (avgSentenceLength <= 20) {
    summary = 'Pacing stays balanced with varied beats';
  } else {
    summary = 'Pacing slows into long descriptive beats';
  }

  const detail = `Avg sentence ${avgSentenceLength.toFixed(1)} words · ${Math.round(
    shortParagraphRatio * 100
  )}% short paragraphs`;

  return { summary, detail };
};

const summarizeTone = (content: string) => {
  const lower = content.toLowerCase();
  let bestMatch: { tone: string; score: number } = { tone: 'neutral', score: 0 };

  TONE_KEYWORDS.forEach((bucket) => {
    const score = bucket.words.reduce((sum, keyword) => (lower.includes(keyword) ? sum + 1 : sum), 0);
    if (score > bestMatch.score) {
      bestMatch = { tone: bucket.tone, score };
    }
  });

  let summary: string;
  let detail: string;

  if (bestMatch.score === 0) {
    const exclamationDensity = (content.match(/!/g) || []).length / Math.max(content.length / 1000, 1);
    if (exclamationDensity > 1) {
      summary = 'Tone spikes into energetic emphasis';
      detail = 'Multiple exclamations per thousand characters';
      return { summary, detail };
    }
    summary = 'Tone reads neutral';
    detail = 'No dominant emotional keywords detected';
    return { summary, detail };
  }

  summary = `Tone leans ${bestMatch.tone}`;
  const matchedKeywords = TONE_KEYWORDS.find((bucket) => bucket.tone === bestMatch.tone)
    ?.words.filter((word) => lower.includes(word))
    .join(', ') || 'none';
  detail = `Triggered by keywords: ${matchedKeywords}`;

  return { summary, detail };
};

const buildCharacterInsight = (content: string, knownCharacters: Character[]) => {
  const lowerContent = content.toLowerCase();
  const mentionScores: Array<{ name: string; count: number }> = [];

  knownCharacters
    .filter((char) => char.name?.trim())
    .forEach((char) => {
      const normalized = char.name.trim();
      const pattern = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'gi');
      const matches = lowerContent.match(pattern);
      if (matches && matches.length > 0) {
        mentionScores.push({ name: normalized, count: matches.length });
      }
    });

  if (mentionScores.length === 0) {
    const fallbackMatches = content.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    const counts = fallbackMatches.reduce<Record<string, number>>((acc, name) => {
      if (GENERIC_PROPER_NOUNS.has(name)) return acc;
      const lower = name.toLowerCase();
      if (NON_CHARACTER_TOKENS.has(lower)) return acc;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([name, count]) => mentionScores.push({ name, count }));
  }

  if (mentionScores.length === 0) {
    return {
      summary: 'No consistent character anchors detected',
      detail: 'Name mentions are either missing or too generic'
    };
  }

  const sorted = [...mentionScores].sort((a, b) => b.count - a.count);
  const formatted = sorted
    .slice(0, 4)
    .map((entry) => (entry.count > 1 ? `${entry.name} (${entry.count})` : entry.name));

  const totalMentions = mentionScores.reduce((sum, entry) => sum + entry.count, 0);
  const topFocus = sorted[0];

  return {
    summary: `Active characters: ${formatted.map((name) => name.replace(/\s*\(\d+\)$/, '')).join(', ')}`,
    detail: `${totalMentions} total mentions · ${topFocus.name} appears ${topFocus.count}x`
  };
};

const LANGUAGE_CHOICES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Español' },
  { value: 'chinese', label: '中文' },
  { value: 'japanese', label: '日本語' },
  { value: 'auto', label: 'Auto' }
];

// Status Dropdown Component
const StatusDropdown = ({ 
  chapterIndex, 
  currentStatus, 
  onStatusChange 
}: { 
  chapterIndex: number; 
  currentStatus: 'drafting' | 'reviewing' | 'done'; 
  onStatusChange: (index: number, status: 'drafting' | 'reviewing' | 'done') => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusConfig = {
    drafting: { label: 'Drafting', color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-500' },
    reviewing: { label: 'Reviewing', color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-500' },
    done: { label: 'Done', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' }
  };

  const config = statusConfig[currentStatus];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${config.bg} hover:opacity-80 transition cursor-pointer`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[120px]">
          {(['drafting', 'reviewing', 'done'] as const).map((s) => {
            const sConfig = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => {
                  onStatusChange(chapterIndex, s);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                  currentStatus === s ? sConfig.color : 'text-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sConfig.dot}`} />
                {sConfig.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


export default function Generator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [genre, setGenre] = useState('general-fiction');
  const [idea, setIdea] = useState('');
  
  // Subscription management
  const {
    tier,
    plan,
    usage,
    canGenerate,
    getRemainingGenerations,
    incrementUsage,
    setSubscription
  } = useSubscription();
  const { isAuthenticated, user } = useAuthStore();
  const {
    currentProject,
    projects,
    setCurrentProject,
    setProjects,
    updateProject: updateProjectState
  } = useProjectStore();
  const execution = useExecutionGraph();
  const { hasFeature, getRequiredTier } = useCapabilities();
  const canUseStyleMemory = hasFeature('styleMemory');
  const canUseCharacters = hasFeature('characterManagement');
  const canUseKnowledge = hasFeature('knowledgeBase');
  const canUseTemplates = hasFeature('templateLibrary');
  const canUseAIAssistant = hasFeature('aiAssistant');
  const canUseVersionHistory = hasFeature('versionHistory');
  const canUseCollaboration = hasFeature('collaboration');
  const collabBaseUrl = useMemo(() => getCollaborationBaseUrl(), []);

  // Debug: Log subscription state on mount (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Generator] ========== Subscription Debug ==========');
      console.log('[Generator] Current tier:', tier);
      console.log('[Generator] Plan features:', plan.features);
      console.log('[Generator] aiAssistant feature:', plan.features.aiAssistant);
      console.log('[Generator] canUseAIAssistant:', canUseAIAssistant);
      console.log('[Generator] ========================================');
    }
  }, [tier, plan.features, canUseAIAssistant]);

  // Calculate min/max based on user's plan
  const minLength = 10; // Minimum for all plans
  const maxLength = plan.limits.maxNovelLength === Infinity ? 300 : plan.limits.maxNovelLength;
  
  // Calculate current project total pages
  const calculateProjectTotalPages = useCallback((project: typeof currentProject): number => {
    if (!project) return 0;
    const wordCount = project.chapters.length > 0
      ? project.chapters.reduce((sum, ch) => sum + countWords(ch.content || ''), 0)
      : countWords(project.content || '');
    return Math.ceil(wordCount / 250);
  }, []);
  
  const currentProjectTotalPages = useMemo(() => calculateProjectTotalPages(currentProject), [currentProject, calculateProjectTotalPages]);
  
  // Initialize length based on plan limit, but ensure it's within bounds
  const [length, setLength] = useState(() => {
    const defaultLength = Math.min(30, maxLength); // Default to 30 or plan max, whichever is lower
    return Math.max(minLength, Math.min(defaultLength, maxLength));
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPartial, setIsPartial] = useState(false);
  const [actualLength, setActualLength] = useState<number | null>(null);
  const [outline, setOutline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<{ reason: 'generations' | 'length' | 'totalLength'; requiredTier?: SubscriptionTier } | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [progressValue, setProgressValue] = useState(0);
  const [history, setHistory] = useState<DraftSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showOutlineMap, setShowOutlineMap] = useState(false);
const [outlineMapData, setOutlineMapData] = useState<OutlineMapPayload | null>(null);
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);
  const [isCollabPanelOpen, setIsCollabPanelOpen] = useState(false);
  // Project creation lock to prevent concurrent creation
  const projectCreationLockRef = useRef(false);
  const prefillAppliedRef = useRef(false);
  const autoRunRef = useRef(false);
  const aiAssistantButtonRef = useRef<HTMLButtonElement>(null);
  const [autoRunMode, setAutoRunMode] = useState<'outline' | 'draft' | null>(null);
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);
  const [storedPref, setStoredPref] = useState<UserPreferences | null>(() => loadUserPreferences());
  const [chapterStatuses, setChapterStatuses] = useState<Map<number, 'drafting' | 'reviewing' | 'done'>>(new Map());
  // Character management (Pro+ feature)
  const [characters, setCharacters] = useState<Character[]>([]);
  // Style memory (Pro+ feature)
  const [writingStyle, setWritingStyle] = useState<WritingStyle | null>(null);
  
  // Auto-save writing style to backend when it changes
  useEffect(() => {
    if (!isAuthenticated || !currentProject?.id || !canUseStyleMemory) {
      return;
    }
    
    // Debounce style save: wait 2 seconds after style changes
    const timeoutId = setTimeout(async () => {
      try {
        await updateProjectContext(currentProject.id, {
          writingStyle: writingStyle
        });
        if (import.meta.env.DEV) console.log('[Generator] Writing style saved to backend');
      } catch (error) {
        console.error('[Generator] Failed to save writing style to backend:', error);
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [writingStyle, currentProject?.id, isAuthenticated, canUseStyleMemory]);
  
  // Load writing style from backend when project changes
  useEffect(() => {
    if (!isAuthenticated || !currentProject?.id || !canUseStyleMemory) {
      return;
    }
    
    const loadStyleFromBackend = async () => {
      try {
        const context = await getProjectContext(currentProject.id);
        if (context.writingStyle) {
          setWritingStyle(context.writingStyle);
          if (import.meta.env.DEV) console.log('[Generator] Writing style loaded from backend');
        }
      } catch (error) {
        console.error('[Generator] Failed to load writing style from backend:', error);
      }
    };
    
    loadStyleFromBackend();
  }, [currentProject?.id, isAuthenticated, canUseStyleMemory]);
  
  const [language, setLanguage] = useState<string>('english');
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Mutual exclusion: close collaboration panel when context drawer opens
  useEffect(() => {
    if (showContextDrawer && isCollabPanelOpen) {
      setIsCollabPanelOpen(false);
    }
  }, [showContextDrawer, isCollabPanelOpen]);
  
  const [selectedText, setSelectedText] = useState<string>('');
  const [aiMenuPosition, setAiMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentSelectionDetail, setCurrentSelectionDetail] = useState<{
    text: string;
    range?: { index: number; length: number };
  } | null>(null);
  const [shouldQuickStart, setShouldQuickStart] = useState<{ mode: 'outline' | 'draft' } | null>(null);
  const [collabParticipants, setCollabParticipants] = useState<CollaborationParticipant[]>([]);
  const [collabComments, setCollabComments] = useState<ProjectComment[]>([]);
  const [collabActivities, setCollabActivities] = useState<ProjectActivity[]>([]);
  const [isCollabConnected, setIsCollabConnected] = useState(false);
  const [mentionNotice, setMentionNotice] = useState<ProjectComment | null>(null);
  useEffect(() => {
    setMentionNotice(null);
  }, [currentProject?.id]);
  const [sectionLocks, setSectionLocks] = useState<SectionLockState[]>([]);
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const lockRenewIntervalRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const dmpRef = useRef(new DiffMatchPatch());
  const chaptersRef = useRef(chapters);
  const resultRef = useRef(result);
  const sectionContentRef = useRef('');
  const activeSectionRef = useRef('draft');
  const isApplyingRemoteUpdateRef = useRef(false);
  const pendingContentRef = useRef<{ sectionId: string; patch: string; content: string } | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const currentUserHandle = useMemo(
    () => buildUserHandle(user?.name, user?.email, user?.id),
    [user?.name, user?.email, user?.id]
  );
  const normalizedCurrentHandle = useMemo(() => normalizeHandle(currentUserHandle), [currentUserHandle]);
  const participantHandles = useMemo(
    () => collabParticipants.map((participant) => participant.handle).filter(Boolean),
    [collabParticipants]
  );
  const currentSectionId = useMemo(
    () => (chapters.length > 0 ? `chapter-${activeChapterIndex}` : 'draft'),
    [chapters.length, activeChapterIndex]
  );
  const activeLock = useMemo(
    () =>
      sectionLocks.find(
        (lock) => lock.sectionId === currentSectionId && lock.userId === (user?.id || 'guest-user')
      ) || null,
    [sectionLocks, currentSectionId, user?.id]
  );
  const lockedRangesForEditor = useMemo(
    () =>
      sectionLocks
        .filter(
          (lock) => lock.sectionId === currentSectionId && lock.userId !== (user?.id || 'guest-user')
        )
        .map((lock) => ({
          start: lock.range.start,
          end: lock.range.end,
          userName: lock.userName
        })),
    [sectionLocks, currentSectionId, user?.id]
  );

  const stopLockRenewal = useCallback(() => {
    if (lockRenewIntervalRef.current) {
      window.clearInterval(lockRenewIntervalRef.current);
      lockRenewIntervalRef.current = null;
    }
  }, []);

  const releaseActiveLock = useCallback(() => {
    if (!activeLock || !currentProject?.id) {
      return;
    }
    stopLockRenewal();
    if (socketRef.current) {
      socketRef.current.emit('collab:lock-release', {
        projectId: currentProject.id,
        lockId: activeLock.id
      });
    }
    setLockWarning(null);
  }, [activeLock, currentProject?.id, stopLockRenewal]);

  const requestLockForRange = useCallback(
    (range?: { index: number; length: number }) => {
      if (
        !canUseCollaboration ||
        !currentProject?.id ||
        !socketRef.current ||
        !range ||
        range.length <= 0
      ) {
        return;
      }
      const start = range.index;
      const end = range.index + range.length;
      if (
        activeLock &&
        activeLock.sectionId === currentSectionId &&
        Math.max(activeLock.range.start, start) < Math.min(activeLock.range.end, end)
      ) {
        return;
      }
      setLockWarning(null);
      socketRef.current.emit('collab:lock-request', {
        projectId: currentProject.id,
        sectionId: currentSectionId,
        range: { start, end },
        userId: user?.id || 'guest-user',
        userName: user?.name || user?.email || 'Guest'
      });
    },
    [
      canUseCollaboration,
      currentProject?.id,
      currentSectionId,
      socketRef,
      user?.id,
      user?.name,
      user?.email,
      activeLock
    ]
  );

  const handleLockedSelectionAttempt = useCallback((lock: { userName?: string }) => {
    setLockWarning(`该段已被 ${lock.userName || '其他成员'} 锁定，等待对方释放。`);
  }, []);

  const enhanceParticipants = useCallback(
    (incoming: CollaborationParticipant[]): CollaborationParticipant[] =>
      incoming.map((participant, index) => ({
        ...participant,
        handle:
          participant.handle ||
          buildUserHandle(participant.userName, undefined, `${participant.userId || 'participant'}-${index}`)
      })),
    []
  );

  useEffect(() => {
    activeSectionRef.current = chapters.length > 0 ? `chapter-${activeChapterIndex}` : 'draft';
  }, [chapters.length, activeChapterIndex]);
  const [isBriefCollapsed, setIsBriefCollapsed] = useState(false);
  const [isCharactersCollapsed, setIsCharactersCollapsed] = useState(true);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(true);
  const [isTemplatesCollapsed, setIsTemplatesCollapsed] = useState(true);
  const [isKnowledgeCollapsed, setIsKnowledgeCollapsed] = useState(true);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [knowledgeReady, setKnowledgeReady] = useState(false);
  const knowledgePersistRef = useRef<string>('');
  const focusPanelRef = useRef<HTMLDivElement | null>(null);
  const [showReadingPreview, setShowReadingPreview] = useState(false);
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(true);
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([]);
  const [styleTemplatesLoaded, setStyleTemplatesLoaded] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [aiAssistResult, setAiAssistResult] = useState<{
    status: 'loading' | 'success' | 'error';
    action: AiAction;
    input: string;
    output?:
      | string
      | string[]
      | Array<{ title: string; description: string }>
      | Array<{ type: string; severity: string; message: string }>
      | StoryTreeAct[]
      | SceneBeatSummary[]
      | CharacterArcSummary[];
    tokens?: number;
    knowledgeUsed?: string[];
    charactersUsed?: number; // Number of characters applied
    styleApplied?: string; // Style preset name
    error?: string;
  } | null>(null);
  const storyEditorRef = useRef<StoryEditorRef>(null);
  const [showAiAvailableHint, setShowAiAvailableHint] = useState(false);
  const [contextStrategy, setContextStrategy] = useState<'precision' | 'balanced' | 'extended'>('balanced');

  useEffect(() => {
    const planLimit = plan?.limits?.contextWindowWords ?? 4000;
    if (contextStrategy === 'extended' && planLimit < 8000) {
      setContextStrategy('balanced');
    }
  }, [plan?.limits?.contextWindowWords, contextStrategy]);

  const resolveContextWindow = useCallback(
    (strategy: 'precision' | 'balanced' | 'extended') => {
      const planLimit = plan?.limits?.contextWindowWords ?? 4000;
      if (strategy === 'precision') return 2000;
      if (strategy === 'balanced') return Math.min(4000, planLimit);
      return Math.min(planLimit, 16000);
    },
    [plan?.limits?.contextWindowWords]
  );

  const effectiveContextWindow = useMemo(
    () => resolveContextWindow(contextStrategy),
    [contextStrategy, resolveContextWindow]
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getKeyValue<KnowledgeEntry[]>('novel-ai-knowledge', []);
      if (cancelled) return;
      if (Array.isArray(stored)) {
        setKnowledgeEntries(stored);
      }
      setKnowledgeReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load knowledge entries from backend (with local fallback)
  useEffect(() => {
    let cancelled = false;

    const loadKnowledge = async () => {
      if (isAuthenticated && currentProject?.id && canUseKnowledge) {
        try {
          const context = await getProjectContext(currentProject.id);
          if (cancelled) return;
          const backendEntries = context.knowledgeEntries ?? [];
          setKnowledgeEntries(backendEntries);
          setKnowledgeReady(true);
          knowledgePersistRef.current = JSON.stringify(backendEntries);
          await setKeyValue('novel-ai-knowledge', backendEntries);
          return;
        } catch (error) {
          if (import.meta.env.DEV) console.warn('[Generator] Failed to load knowledge from backend, falling back to local cache', error);
        }
      }

      const stored = await getKeyValue<KnowledgeEntry[]>('novel-ai-knowledge', []);
      if (cancelled) return;
      setKnowledgeEntries(stored || []);
      setKnowledgeReady(true);
      knowledgePersistRef.current = JSON.stringify(stored || []);
    };

    loadKnowledge();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentProject?.id, canUseKnowledge]);

  // Persist knowledge entries locally for offline use
  useEffect(() => {
    if (!knowledgeReady) return;
    setKeyValue('novel-ai-knowledge', knowledgeEntries);
  }, [knowledgeEntries, knowledgeReady]);

  // Sync knowledge entries to backend when they change
  useEffect(() => {
    if (!knowledgeReady || !isAuthenticated || !currentProject?.id || !canUseKnowledge) return;
    const serialized = JSON.stringify(knowledgeEntries);
    if (serialized === knowledgePersistRef.current) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        await updateProjectContext(currentProject.id, {
          knowledgeEntries
        });
        knowledgePersistRef.current = serialized;
        if (import.meta.env.DEV) console.log('[Generator] Knowledge entries synced to backend');
      } catch (error) {
        console.error('[Generator] Failed to sync knowledge entries:', error);
      }
    }, 1500);

    return () => {
      clearTimeout(timeout);
    };
  }, [knowledgeEntries, knowledgeReady, isAuthenticated, currentProject?.id, canUseKnowledge]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getKeyValue<StyleTemplate[]>('novel-ai-style-templates', []);
      if (cancelled) return;
      if (Array.isArray(stored) && stored.length > 0) {
        setStyleTemplates(stored);
      }
      setStyleTemplatesLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save style templates to backend when they change
  useEffect(() => {
    if (!styleTemplatesLoaded) return;

    if (!isAuthenticated || !currentProject?.id || !canUseTemplates) {
      setKeyValue('novel-ai-style-templates', styleTemplates);
      return;
    }
    
    setKeyValue('novel-ai-style-templates', styleTemplates);
    
    // Debounce template save to backend: wait 2 seconds after templates change
    const timeoutId = setTimeout(async () => {
      try {
        await updateProjectContext(currentProject.id, {
          styleTemplates: styleTemplates
        });
        if (import.meta.env.DEV) console.log('[Generator] Style templates saved to backend');
      } catch (error) {
        console.error('[Generator] Failed to save style templates to backend:', error);
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [styleTemplates, currentProject?.id, isAuthenticated, canUseTemplates, styleTemplatesLoaded]);
  
  // Load style templates from backend when project changes
  useEffect(() => {
    if (!isAuthenticated || !currentProject?.id || !canUseTemplates) {
      return;
    }
    
    const loadTemplatesFromBackend = async () => {
      try {
        const context = await getProjectContext(currentProject.id);
        const backendTemplates = context.styleTemplates ?? [];
        if (backendTemplates.length > 0) {
          // Merge with offline templates (backend takes priority, avoid duplicates)
          setStyleTemplates((prev) => {
            const backendIds = new Set(backendTemplates.map((t) => t.id));
            const uniqueLocalTemplates = prev.filter((lt) => !backendIds.has(lt.id));
            const mergedTemplates = [...backendTemplates, ...uniqueLocalTemplates];
            setKeyValue('novel-ai-style-templates', mergedTemplates);
            return mergedTemplates;
          });
          if (import.meta.env.DEV) console.log('[Generator] Style templates loaded from backend');
        }
      } catch (error) {
        console.error('[Generator] Failed to load style templates from backend:', error);
      }
    };
    
    loadTemplatesFromBackend();
  }, [currentProject?.id, isAuthenticated, canUseTemplates]);

  const pinnedKnowledge = useMemo(
    () => (canUseKnowledge ? knowledgeEntries.filter((entry) => entry.pinned).slice(0, 6) : []),
    [knowledgeEntries, canUseKnowledge]
  );

  useEffect(() => {
    if (!canUseCollaboration || !currentProject?.id) {
      setCollabComments([]);
      return;
    }
    getProjectComments(currentProject.id)
      .then((data) => setCollabComments(data))
      .catch((err) => console.error('[Generator] Failed to load collaboration comments', err));
  }, [canUseCollaboration, currentProject?.id]);

  useEffect(() => {
    if (!canUseCollaboration || !currentProject?.id) {
      setCollabActivities([]);
      return;
    }
    getProjectActivities(currentProject.id)
      .then((data) => setCollabActivities(data))
      .catch((err) => console.error('[Generator] Failed to load collaboration activities', err));
  }, [canUseCollaboration, currentProject?.id]);

  useEffect(() => {
    if (!canUseCollaboration || !user || isCollabConnected) {
      return;
    }
    setCollabParticipants(
      enhanceParticipants([
        {
          userId: user.id ?? user.email ?? 'solo-user',
          userName: user.name || user.email || 'You',
          color: '#0f172a',
          handle: ''
        }
      ])
    );
  }, [canUseCollaboration, user, isCollabConnected, enhanceParticipants]);

  // Calculate current draft content for knowledge extraction (plain text version, without markdown headers)
  const currentDraftContentForExtraction = useMemo(() => {
    if (chapters.length > 0) {
      return chapters.map(ch => ch.content).join('\n\n');
    }
    return result || '';
  }, [chapters, result]);
  const AI_ACTION_LABELS: Record<AiAction, string> = {
    rewrite: 'Rewrite',
    tone: 'Tone adjustment',
    suggest: 'Plot suggestions',
    detect: 'Conflict check',
    storyTree: 'Story tree',
    sceneBeats: 'Scene beats',
    characterArc: 'Character arcs'
  };
  const MIN_SELECTION_CHARS = 12;
  const aiAssistantRequiredTier = getRequiredTier('aiAssistant');

  const handleSaveStyleTemplate = () => {
    if (!canUseTemplates || !writingStyle) return;
    const safeStyle = JSON.parse(JSON.stringify(writingStyle)) as WritingStyle;
    safeStyle.updatedAt = Date.now();
    // Generate a meaningful name based on style characteristics
    const styleName = safeStyle.name?.trim() || 
      (safeStyle.preset === 'literary' ? 'Literary Style' :
       safeStyle.preset === 'commercial' ? 'Commercial Style' :
       safeStyle.preset === 'experimental' ? 'Experimental Style' :
       `Custom Style ${styleTemplates.filter(t => !t.builtIn).length + 1}`);
    const templateName = styleName;
    const description = safeStyle.customTraits?.slice(0, 2).join(', ') || 
      (safeStyle.preset ? `${safeStyle.preset.charAt(0).toUpperCase() + safeStyle.preset.slice(1)} writing style` : 'Saved from current style');
    
    const newTemplate: StyleTemplate = {
      id: crypto.randomUUID(),
      name: templateName,
      description: description,
      style: safeStyle,
      createdAt: Date.now()
    };
    setStyleTemplates((prev) => [newTemplate, ...prev]);
    if (import.meta.env.DEV) console.log('[Generator] Style template saved:', templateName);
  };

  const handleAiAssistAction = useCallback(
    async (action: AiAction) => {
      if (!canUseAIAssistant || selectedText.trim().length < MIN_SELECTION_CHARS) return;
      const input = selectedText.trim();
      setAiAssistResult({ status: 'loading', action, input });
      try {
        const response = await assistWithText(action, input, {
          language,
          characters:
            canUseCharacters && characters.length > 0
              ? characters.map((c) => ({ name: c.name, description: c.description }))
              : undefined,
          style: canUseStyleMemory ? writingStyle : undefined,
          knowledge: canUseKnowledge ? pinnedKnowledge : undefined,
          contextStrategy,
          contextWindowWords: effectiveContextWindow
        });

        let output:
          | string
          | string[]
          | Array<{ title: string; description: string }>
          | Array<{ type: string; severity: string; message: string }>
          | StoryTreeAct[]
          | SceneBeatSummary[]
          | CharacterArcSummary[];

        const result = response.result;

        if (action === 'rewrite') {
          output = Array.isArray(result) ? (result as string[]) : [String(result)];
        } else if (action === 'suggest') {
          if (Array.isArray(result)) {
            output = result as Array<{ title: string; description: string }>;
          } else {
            output = [{ title: 'Suggestion', description: String(result) }];
          }
        } else if (action === 'detect') {
          if (Array.isArray(result)) {
            output = result as Array<{ type: string; severity: string; message: string }>;
          } else {
            output = [{ type: 'warning', severity: 'medium', message: String(result) }];
          }
        } else if (action === 'storyTree') {
          output = Array.isArray(result) ? (result as StoryTreeAct[]) : [result as unknown as StoryTreeAct];
        } else if (action === 'sceneBeats') {
          output = Array.isArray(result)
            ? (result as SceneBeatSummary[])
            : [result as unknown as SceneBeatSummary];
        } else if (action === 'characterArc') {
          output = Array.isArray(result)
            ? (result as CharacterArcSummary[])
            : [result as unknown as CharacterArcSummary];
        } else {
          output = typeof result === 'string' ? result : JSON.stringify(result);
        }

        setAiAssistResult({
          status: 'success',
          action,
          input,
          output,
          tokens: response.usage?.tokens,
          knowledgeUsed: response.knowledgeUsed,
          charactersUsed: canUseCharacters && characters.length > 0 ? characters.length : undefined,
          styleApplied: canUseStyleMemory && writingStyle ? (writingStyle.preset || 'Custom') : undefined
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setAiAssistResult({
          status: 'error',
          action,
          input,
          error: errorMessage
        });
      } finally {
        setAiMenuPosition(null);
        setSelectedText('');
      }
    },
    [
      canUseAIAssistant,
      selectedText,
      language,
      canUseCharacters,
      characters,
      canUseStyleMemory,
      writingStyle,
      canUseKnowledge,
      pinnedKnowledge,
      contextStrategy,
      effectiveContextWindow
    ]
  );

  const handleCopyAiOutput = useCallback(() => {
    if (aiAssistResult?.status !== 'success' || !aiAssistResult.output) return;
    if (typeof aiAssistResult.output === 'string') {
      navigator?.clipboard?.writeText(aiAssistResult.output).catch(() => {
        /* ignore */
      });
    }
  }, [aiAssistResult]);

  const handleInsertAiOutput = useCallback(() => {
    if (aiAssistResult?.status !== 'success' || !aiAssistResult.output) return;
    // Only handle string output for text insertion
    if (typeof aiAssistResult.output !== 'string') return;
    const range = storyEditorRef.current?.getSelectedRange();
    if (range && range.length > 0) {
      // Replace selected text
      storyEditorRef.current?.replaceSelectedText(aiAssistResult.output);
    } else {
      // Insert at cursor
      storyEditorRef.current?.insertTextAtCursor(aiAssistResult.output);
    }
    setAiAssistResult(null);
    setSelectedText('');
    setAiMenuPosition(null);
  }, [aiAssistResult]);

  const handleApplyStyleTemplate = (template: StyleTemplate) => {
    if (!canUseTemplates || !template.style) return;
    const safeStyle = JSON.parse(JSON.stringify(template.style)) as WritingStyle;
    safeStyle.updatedAt = Date.now();
    setWritingStyle(safeStyle);
  };

  const getSectionContent = useCallback((section: string) => {
    if (section && section.startsWith('chapter-')) {
      const index = Number(section.split('-')[1]);
      if (!Number.isNaN(index)) {
        return chaptersRef.current[index]?.content || '';
      }
    }
    return resultRef.current || '';
  }, []);

  const scheduleContentSync = useCallback(
    (sectionId: string, patch: string, content: string) => {
      if (!socketRef.current || !currentProject?.id) return;
      pendingContentRef.current = { sectionId, patch, content };
      if (syncTimeoutRef.current) {
        return;
      }
      const timeoutId = window.setTimeout(() => {
        if (pendingContentRef.current && socketRef.current) {
          socketRef.current.emit('collab:content-update', {
            projectId: currentProject.id,
            sectionId: pendingContentRef.current.sectionId,
            patch: pendingContentRef.current.patch,
            content: pendingContentRef.current.content
          });
          pendingContentRef.current = null;
        }
        if (syncTimeoutRef.current) {
          window.clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
      }, 350);
      syncTimeoutRef.current = timeoutId;
    },
    [currentProject?.id]
  );

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, []);

  const applyRemoteContent = useCallback(
    (sectionId: string, patchText?: string, fallbackContent?: string, baseContent?: string) => {
      const targetSection = sectionId || 'draft';
      const existing = getSectionContent(targetSection);
      let nextContent: string | undefined = fallbackContent;

      if (patchText) {
        try {
          const patches = dmpRef.current.patch_fromText(patchText);
          const [patched, results] = dmpRef.current.patch_apply(patches, existing);
          if (results.every(Boolean)) {
            nextContent = patched;
          } else if (!fallbackContent) {
            return;
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn('[Collaboration] patch apply failed', error);
          if (!fallbackContent) {
            return;
          }
        }
      }

      // Three-way merge if base content is provided (for conflict resolution)
      if (baseContent && nextContent && existing !== baseContent && existing !== nextContent) {
        try {
          const mergeResult = threeWayMerge(baseContent, existing, nextContent);
          if (!mergeResult.hasConflicts) {
            nextContent = mergeResult.merged;
          } else {
            if (import.meta.env.DEV) console.warn('[Collaboration] Conflicts detected, using local version:', mergeResult.conflicts);
            // For now, prefer local version if conflicts exist
            // In future, show conflict resolution UI
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn('[Collaboration] Three-way merge failed, using fallback:', error);
        }
      }

      if (nextContent === undefined || existing === nextContent) {
        return;
      }

      isApplyingRemoteUpdateRef.current = true;
      if (targetSection.startsWith('chapter-')) {
        const index = Number(targetSection.split('-')[1]);
        if (!Number.isNaN(index)) {
          setChapters((prev) => {
            if (!prev[index]) return prev;
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              content: nextContent as string
            };
            return updated;
          });
        }
      } else {
        setResult(nextContent);
      }

      if (targetSection === currentSectionId) {
        sectionContentRef.current = nextContent;
        storyEditorRef.current?.highlightRange({
          start: Math.max(0, nextContent.length - 1),
          length: 1
        });
      }

      requestAnimationFrame(() => {
        isApplyingRemoteUpdateRef.current = false;
      });
    },
    [currentSectionId, getSectionContent, setChapters, setResult]
  );

  const computeViewportPositionForRange = useCallback(
    (range?: { index: number; length: number }) => {
      if (!range) return null;
      const editor = storyEditorRef.current;
      if (!editor) return null;
      return editor.getSelectionViewportPosition(range);
    },
    []
  );

  const handleEditorSelection = useCallback(
    (payload: { text: string; position: { x: number; y: number }; range?: { index: number; length: number } } | null) => {
      if (!payload || !payload.range || payload.range.length === 0) {
        setSelectedText('');
        setAiMenuPosition(null);
        setShowAiAvailableHint(false);
        setCurrentSelectionDetail(null);
        releaseActiveLock();
        if (socketRef.current && currentProject?.id) {
          socketRef.current.emit('collab:cursor', {
            projectId: currentProject.id,
            userId: user?.id || 'guest-user',
            sectionId: currentSectionId,
            range: null
          });
        }
        return;
      }

      const trimmedText = payload.text.trim();
      const normalizedText = trimmedText.length > 0 ? trimmedText : payload.text;
      setCurrentSelectionDetail({
        text: normalizedText,
        range: payload.range
      });
      requestLockForRange(payload.range);

      if (!canUseAIAssistant) {
        setSelectedText('');
        setAiMenuPosition(null);
        setShowAiAvailableHint(false);
        return;
      }

      if (trimmedText.length < MIN_SELECTION_CHARS) {
        setSelectedText('');
        setAiMenuPosition(null);
        setShowAiAvailableHint(false);
        return;
      }

      setSelectedText(trimmedText);
      const viewportPosition = computeViewportPositionForRange(payload.range) ?? payload.position;
      setAiMenuPosition(viewportPosition);
      setShowAiAvailableHint(true);
      setTimeout(() => setShowAiAvailableHint(false), 2000);
      if (socketRef.current && currentProject?.id) {
        socketRef.current.emit('collab:cursor', {
          projectId: currentProject.id,
          userId: user?.id || 'guest-user',
          sectionId: currentSectionId,
          range: payload.range
        });
      }
    },
    [canUseAIAssistant, computeViewportPositionForRange, currentProject?.id, currentSectionId, requestLockForRange, releaseActiveLock, user?.id]
  );

  const handleEditorContentChange = useCallback(
    (newContent: string, _delta: unknown, source: Sources = 'api') => {
      const targetSectionId = chapters.length > 0 ? `chapter-${activeChapterIndex}` : 'draft';
      if (chapters.length > 0) {
        setChapters((prev) => {
          if (!prev[activeChapterIndex]) return prev;
          const updated = [...prev];
          updated[activeChapterIndex] = {
            ...updated[activeChapterIndex],
            content: newContent
          };
          return updated;
        });
      } else {
        setResult(newContent);
      }

      if (sectionContentRef.current !== newContent && targetSectionId === currentSectionId) {
        sectionContentRef.current = newContent;
      }

      if (
        canUseCollaboration &&
        source === 'user' &&
        !isApplyingRemoteUpdateRef.current
      ) {
        const previousContent = getSectionContent(targetSectionId);
        const patches = dmpRef.current.patch_make(previousContent, newContent);
        const patchText = dmpRef.current.patch_toText(patches);
        sectionContentRef.current = newContent;
        if (patchText && patchText.length > 0) {
          scheduleContentSync(targetSectionId, patchText, newContent);
        }
      }
    },
    [
      chapters.length,
      activeChapterIndex,
      canUseCollaboration,
      scheduleContentSync,
      currentSectionId,
      getSectionContent
    ]
  );

  useEffect(() => {
    if (!currentProject?.id || !activeLock) {
      stopLockRenewal();
      return;
    }
    stopLockRenewal();
    lockRenewIntervalRef.current = window.setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit('collab:lock-renew', {
          projectId: currentProject.id,
          lockId: activeLock.id
        });
      }
    }, 15000);
    return () => {
      stopLockRenewal();
    };
  }, [activeLock?.id, currentProject?.id, stopLockRenewal]);

  useEffect(() => {
    return () => {
      releaseActiveLock();
    };
  }, [releaseActiveLock]);

  useEffect(() => {
    if (activeLock && activeLock.sectionId !== currentSectionId) {
      releaseActiveLock();
    }
  }, [activeLock, currentSectionId, releaseActiveLock]);

  useEffect(() => {
    if (!canUseCollaboration) {
      releaseActiveLock();
      setSectionLocks([]);
    }
  }, [canUseCollaboration, releaseActiveLock]);

  // Auto-save state (setters used in auto-save effect, values not displayed in simplified UI)
  const [_lastSaved, setLastSaved] = useState<number | null>(null);
  const [_isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!aiMenuPosition || !currentSelectionDetail?.range) {
      return;
    }
    const handleReposition = () => {
      const next = computeViewportPositionForRange(currentSelectionDetail.range);
      if (next) {
        setAiMenuPosition(next);
      }
    };
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [aiMenuPosition, computeViewportPositionForRange, currentSelectionDetail?.range]);

  // Ensure length stays within plan limits when plan changes
  useEffect(() => {
    const currentMax = plan.limits.maxNovelLength === Infinity ? 300 : plan.limits.maxNovelLength;
    if (length > currentMax) {
      setLength(currentMax);
    }
  }, [plan.limits.maxNovelLength, length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getKeyValue<StoredSnapshot[]>(HISTORY_KEY, []);
      if (cancelled) return;
      if (Array.isArray(stored) && stored.length > 0) {
        const parsed: DraftSnapshot[] = stored.map((item) => ({
          ...item,
          label: item.label || buildSnapshotLabel(item.idea, item.timestamp)
        }));
        setHistory((prev) => {
          if (prev.length === 0) {
            return parsed;
          }
          const existingIds = new Set(prev.map((snap) => snap.id));
          const merged = [...prev];
          parsed.forEach((snap) => {
            if (!existingIds.has(snap.id)) {
              merged.push(snap);
            }
          });
          return merged.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const entry = searchParams.get('entry');
    
    // Handle imported content
    if (entry === 'import') {
      const importedData = sessionStorage.getItem('importedContent');
      if (importedData) {
        try {
          const content = JSON.parse(importedData);
          if (content.chapters && content.chapters.length > 0) {
            setChapters(content.chapters);
            setResult(content.text);
            setActiveChapterIndex(0);
          } else {
            setResult(content.text);
            setChapters([]);
          }
          if (content.title) {
            setIdea(`Imported: ${content.title}`);
          }
          setPrefillNotice('Imported draft loaded successfully. You can now edit and continue writing.');
          sessionStorage.removeItem('importedContent');
          prefillAppliedRef.current = true;
          return;
        } catch (err) {
          console.error('Failed to parse imported content:', err);
        }
      }
    }
    
    // 处理 project 参数（项目加载）
    const projectId = searchParams.get('project');
    if (projectId) {
      // 项目加载逻辑在另一个 useEffect 中处理，这里跳过
      prefillAppliedRef.current = true;
      return;
    }
    
    if (entry !== 'hero' && entry !== 'flow-guide') return;

    const incomingIdea = searchParams.get('idea');
    const incomingMode = searchParams.get('mode');
    const incomingGenre = searchParams.get('genre');
    const quickStart = searchParams.get('quickStart') === 'true';

    if (incomingIdea) {
      setIdea(incomingIdea);
    }
    if (incomingGenre) {
      setGenre(incomingGenre);
    }
    setAutoRunMode(incomingMode === 'outline' ? 'outline' : 'draft');
    
    if (quickStart) {
      setPrefillNotice('Quick start: Template loaded. Ready to generate!');
      setShouldQuickStart({ mode: incomingMode === 'outline' ? 'outline' : 'draft' });
    } else {
      setPrefillNotice(
        incomingMode === 'outline'
          ? 'Loaded your outline request. Review the idea or sit tight—we will start automatically.'
          : 'Loaded your draft request. Review the idea or sit tight—we will start automatically.'
      );
    }

    prefillAppliedRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const stored = loadUserPreferences();
    if (!stored) return;
    setStoredPref(stored);
    setGenre(stored.genre);
    if (!idea) {
      setIdea(stored.sampleIdea);
    }
    const flowLabel =
      stored.flowMode === 'outline' ? 'Outline-first' : stored.flowMode === 'draft' ? 'Draft-first' : 'Hybrid';
    setPrefillNotice(`Loaded your saved template: ${stored.templateTitle} · ${flowLabel}`);
    prefillAppliedRef.current = true;
  }, [idea]);

  // 检查登录状态：如果有项目 ID 但用户未登录，显示登录模态框
  useEffect(() => {
    const projectId = searchParams.get('project');
    
    if (projectId && !isAuthenticated) {
      if (import.meta.env.DEV) console.log('[Generator] User not authenticated with project ID, showing login modal');
      setShowLoginModal(true);
    }
  }, [searchParams.get('project'), isAuthenticated]);

  // 加载项目数据（当 URL 中有 project 参数时）
  useEffect(() => {
    const projectId = searchParams.get('project');
    const isNewProject = searchParams.get('new') === 'true';
    
    if (import.meta.env.DEV) console.log('[Generator] Project loading effect triggered:', { projectId, isNewProject, isAuthenticated, currentProjectId: currentProject?.id });
    
    if (!projectId) return;
    
    // 如果未登录，不加载项目数据，但引导仍然可以显示（基于 URL 参数）
    if (!isAuthenticated) {
      if (import.meta.env.DEV) console.log('[Generator] User not authenticated, skipping project load');
      return;
    }
    
    // 如果 currentProject 已设置且 ID 匹配，直接填充数据
    if (currentProject?.id === projectId) {
      // 确保数据已填充（避免重复填充）
      if (currentProject.genre && genre !== currentProject.genre) setGenre(currentProject.genre);
      if (currentProject.length && length !== currentProject.length) setLength(currentProject.length);
      if (currentProject.language && language !== currentProject.language) setLanguage(currentProject.language);
      if (currentProject.content && result !== currentProject.content) setResult(currentProject.content);
      if (currentProject.chapters && currentProject.chapters.length > 0 && chapters.length === 0) {
        setChapters(currentProject.chapters);
        setActiveChapterIndex(0);
      }
      // 从 URL 参数中获取 idea（如果创建项目时提供了）
      const urlIdea = searchParams.get('idea');
      if (urlIdea && idea !== urlIdea) {
        setIdea(urlIdea);
      }
      // 注意：引导的显示由组件渲染逻辑控制
      return;
    }
    
    // 否则从后端加载项目
    let cancelled = false;
    (async () => {
      try {
        if (import.meta.env.DEV) console.log('[Generator] Loading project from backend:', projectId);
        const project = await getProject(projectId);
        if (cancelled) {
          if (import.meta.env.DEV) console.log('[Generator] Project load cancelled');
          return;
        }
        
        console.log('[Generator] Project loaded:', project);
        setCurrentProject(project);
        
        // 填充项目数据到表单
        if (project.genre) setGenre(project.genre);
        if (project.length) setLength(project.length);
        if (project.language) setLanguage(project.language);
        
        // 从 URL 参数中获取 idea（如果创建项目时提供了）
        const urlIdea = searchParams.get('idea');
        if (urlIdea) {
          console.log('[Generator] Setting idea from URL:', urlIdea);
          setIdea(urlIdea);
        }
        
        // 加载内容
        if (project.content) {
          console.log('[Generator] Project has content, setting result');
          setResult(project.content);
        }
        if (project.chapters && project.chapters.length > 0) {
          console.log('[Generator] Project has chapters:', project.chapters.length);
          setChapters(project.chapters);
          setActiveChapterIndex(0);
        }
        
        console.log('[Generator] Project data loaded successfully');
      } catch (err) {
        if (cancelled) return;
        console.error('[Generator] Failed to load project:', err);
        setPrefillNotice('项目加载失败，请检查网络连接或刷新页面重试。');
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [searchParams, isAuthenticated, currentProject?.id, setCurrentProject]);

  // 保持URL与currentProject同步：如果currentProject存在但URL中没有project参数，添加它
  useEffect(() => {
    if (!isAuthenticated || !currentProject?.id) return;
    const projectId = searchParams.get('project');
    if (currentProject.id && projectId !== currentProject.id) {
      // 如果URL中没有project参数或参数不匹配，更新URL
      const newParams = new URLSearchParams(searchParams);
      newParams.set('project', currentProject.id);
      navigate(`/generator?${newParams.toString()}`, { replace: true });
    }
  }, [currentProject?.id, isAuthenticated, searchParams, navigate]);

  useEffect(() => {
    if (autoRunRef.current) return;
    const mode = autoRunMode;
    if (!mode) return;
    if (idea.trim().split(/\s+/).length < 20) return;
    autoRunRef.current = true;
    if (mode === 'outline') {
      handleGenerateOutline();
    } else {
      handleGenerate();
    }
  }, [idea, autoRunMode]);

  const applyStoredPreference = () => {
    if (!storedPref) return;
    setGenre(storedPref.genre);
    setIdea(storedPref.sampleIdea);
    setPrefillNotice(`Applied ${storedPref.templateTitle}. Click generate or wait for auto-run.`);
    setAutoRunMode(storedPref.flowMode === 'outline' ? 'outline' : 'draft');
    autoRunRef.current = false;
  };

  const [lastContextMetadata, setLastContextMetadata] = useState<import('../api/novelApi').ContextMetadata | null>(null);

  const handleContinueComplete = (targetChapterIndex: number | null) => (_newContent: string, _addedWords: number, contextMetadata?: import('../api/novelApi').ContextMetadata) => {
    if (targetChapterIndex !== null) {
      setActiveChapterIndex(targetChapterIndex);
    }

    // Store context metadata for display
    if (contextMetadata) {
      setLastContextMetadata(contextMetadata);
    }

    requestAnimationFrame(() => {
      if (focusPanelRef.current) {
        focusPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const saveSnapshot = useCallback((snapshot: StoredSnapshot) => {
    const finalized: DraftSnapshot = {
      ...snapshot,
      label: snapshot.label || buildSnapshotLabel(snapshot.idea, snapshot.timestamp)
    };
    setHistory((prev) => {
      const next = [finalized, ...prev].slice(0, 5);
      setKeyValue(HISTORY_KEY, next);
      return next;
    });
  }, []);

  type SyncReason = 'auto' | 'generate' | 'outline';

  const syncProjectSnapshot = useCallback(
    async (snapshot: StoredSnapshot, reason: SyncReason = 'auto') => {
      const localStepId = execution.startStep('autosave-local', { reason });
      try {
        saveSnapshot(snapshot);
        execution.finishStep(localStepId, 'success');
      } catch (error: any) {
        execution.finishStep(localStepId, 'error', { error: error?.message || 'Failed to save locally' });
      }

      if (!isAuthenticated) {
        return;
      }

      const remoteStepId = execution.startStep('autosave-cloud', {
        reason,
        projectId: currentProject?.id || null
      });

      try {
        let projectRecord = currentProject;

        if (!projectRecord) {
          const inferredTitle =
            snapshot.label ||
            (snapshot.idea ? snapshot.idea.slice(0, 80) : 'Untitled project');

          const created = await createProject({
            title: inferredTitle || 'Untitled project',
            genre,
            length: snapshot.length,
            language,
            idea: snapshot.idea
          });
          projectRecord = created;
          setCurrentProject(created);
          if (!projects.some((p) => p.id === created.id)) {
            setProjects([...projects, created]);
          }
          
          // Update URL to include project ID
          const newUrl = `/generator?project=${created.id}`;
          navigate(newUrl, { replace: true });
        }

        if (!projectRecord) {
          throw new Error('Project initialization failed');
        }

        const updated = await updateProjectRequest(projectRecord.id, {
          content: snapshot.content,
          chapters: snapshot.chapters,
          genre,
          length: snapshot.length,
          language,
          outline: snapshot.outline
        });
        updateProjectState(projectRecord.id, updated);
        execution.finishStep(remoteStepId, 'success', { projectId: projectRecord.id });
      } catch (error: any) {
        execution.finishStep(remoteStepId, 'error', { error: error?.message || 'Failed to sync project' });
      }
    },
    [
      currentProject,
      execution,
      genre,
      isAuthenticated,
      language,
      projects,
      saveSnapshot,
      setCurrentProject,
      setProjects,
      updateProjectState,
      navigate
    ]
  );

  // Ensure project exists (with concurrent lock mechanism)
  const ensureProject = useCallback(async (): Promise<typeof currentProject> => {
    // If already have a project, return it
    if (currentProject) {
      return currentProject;
    }

    // If not authenticated, return null (will show login modal)
    if (!isAuthenticated) {
      return null;
    }

    // If no content to save, return null
    const hasContent = (result && result.trim().length >= 50) || chapters.length > 0;
    if (!hasContent) {
      return null;
    }

    // Wait if another creation is in progress
    if (projectCreationLockRef.current) {
      // Poll until lock is released
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!projectCreationLockRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
          // If project was created by another process, return early
          if (currentProject) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      // Check again after lock is released
      if (currentProject) {
        return currentProject;
      }
    }

    // Acquire lock
    projectCreationLockRef.current = true;

    try {
      // Double-check after acquiring lock
      if (currentProject) {
        return currentProject;
      }

      // Create project
      const inferredTitle = idea ? idea.slice(0, 80) : 'Untitled project';
      const created = await createProject({
        title: inferredTitle || 'Untitled project',
        genre,
        length,
        language,
        idea: idea || undefined
      });

      setCurrentProject(created);
      if (!projects.some((p) => p.id === created.id)) {
        setProjects([...projects, created]);
      }

      // Update URL to include project ID
      const newUrl = `/generator?project=${created.id}`;
      navigate(newUrl, { replace: true });

      return created;
    } catch (error) {
      console.error('[Generator] Failed to create project:', error);
      throw error;
    } finally {
      // Release lock
      projectCreationLockRef.current = false;
    }
  }, [
    currentProject,
    isAuthenticated,
    result,
    chapters,
    idea,
    genre,
    length,
    language,
    setCurrentProject,
    projects,
    setProjects,
    navigate
  ]);

  const loadSnapshot = (snapshot: DraftSnapshot) => {
    setIdea(snapshot.idea);
    setLength(snapshot.length);
    setResult(snapshot.content);
    setChapters(snapshot.chapters);
    setActiveChapterIndex(0);
    setIsPartial(false);
    setActualLength(snapshot.length);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeSnapshot = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setKeyValue(HISTORY_KEY, next);
      return next;
    });
  };

  const renameSnapshot = (id: string, label: string) => {
    setHistory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, label } : item));
      setKeyValue(HISTORY_KEY, next);
      return next;
    });
  };

  const cleanInlineFormatting = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`/g, '')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .trim();

  const paragraphs = useMemo(() => {
    const source = chapters.length
      ? chapters[activeChapterIndex]?.content
      : result;
    if (!source) return [];
    return source
      .split(/\n{2,}/)
      .map((p) => cleanInlineFormatting(p.trim()))
      .filter(Boolean);
  }, [chapters, activeChapterIndex, result]);

  const currentDraftContent = useMemo(() => {
    if (chapters.length > 0) {
      return chapters.map((chapter) => `### ${chapter.title}\n\n${chapter.content}`).join('\n\n');
    }
    return result || '';
  }, [chapters, result]);

  // Memoized word count for smart recommendation (performance optimization)
  const draftWordCount = useMemo(() => {
    if (!currentDraftContent || currentDraftContent.trim().length === 0) return 0;
    return countWords(currentDraftContent);
  }, [currentDraftContent]);

  // Detect character mentions in content for smart suggestions
  const detectedCharacterMentions = useMemo(() => {
    if (!currentDraftContent || characters.length === 0) return [];
    const contentLower = currentDraftContent.toLowerCase();
    return characters.filter(char => {
      if (!char.name) return false;
      const nameLower = char.name.toLowerCase();
      // Check if character name appears in content (at least 2 times to avoid false positives)
      const matches = (contentLower.match(new RegExp(`\\b${nameLower}\\b`, 'g')) || []).length;
      return matches >= 2;
    });
  }, [currentDraftContent, characters]);

  // Detect potential character names (capitalized words that appear multiple times)
  const potentialCharacterNames = useMemo(() => {
    if (!currentDraftContent || currentDraftContent.trim().length < 100) return [];
    const words = currentDraftContent.split(/\s+/);
    const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));
    const wordCounts = new Map<string, number>();
    capitalizedWords.forEach(w => {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    });
    // Find words that appear 3+ times and are not already in characters
    const existingNames = new Set(characters.map(c => c.name.toLowerCase()));
    return Array.from(wordCounts.entries())
      .filter(([name, count]) => count >= 3 && !existingNames.has(name.toLowerCase()))
      .map(([name]) => name)
      .slice(0, 3); // Limit to 3 suggestions
  }, [currentDraftContent, characters]);

  // First-time usage hints (lightweight toasts)
  useEffect(() => {
    if (!canUseCharacters) return;
    
    // First character added
    if (characters.length === 1) {
      const hasSeenHint = localStorage.getItem('hasSeenCharacterHint') === 'true';
      if (!hasSeenHint) {
        showToast('Characters will be used in AI generation for consistency', 'info', 4000);
        localStorage.setItem('hasSeenCharacterHint', 'true');
      }
    }
  }, [characters.length, canUseCharacters]);

  useEffect(() => {
    if (!canUseStyleMemory) return;
    
    // First style learned
    if (writingStyle && writingStyle.preset === 'custom') {
      const hasSeenHint = localStorage.getItem('hasSeenStyleHint') === 'true';
      if (!hasSeenHint) {
        showToast('Writing voice will be applied to all AI generations', 'info', 4000);
        localStorage.setItem('hasSeenStyleHint', 'true');
      }
    }
  }, [writingStyle, canUseStyleMemory]);

  useEffect(() => {
    if (!canUseKnowledge) return;
    
    // First knowledge entry pinned
    const pinnedCount = knowledgeEntries.filter(e => e.pinned).length;
    if (pinnedCount === 1) {
      const hasSeenHint = localStorage.getItem('hasSeenKnowledgeHint') === 'true';
      if (!hasSeenHint) {
        showToast('Pinned knowledge entries will be used as context in AI generation', 'info', 4000);
        localStorage.setItem('hasSeenKnowledgeHint', 'true');
      }
    }
  }, [knowledgeEntries, canUseKnowledge]);

  // Smart suggestion: detect potential character names
  useEffect(() => {
    if (!canUseCharacters || potentialCharacterNames.length === 0) return;
    
    // Only show suggestion once per session
    const suggestionKey = `characterSuggestion-${potentialCharacterNames.join('-')}`;
    const hasShownSuggestion = sessionStorage.getItem(suggestionKey) === 'true';
    
    if (!hasShownSuggestion && potentialCharacterNames.length > 0) {
      // Debounce: wait 3 seconds after content stops changing
      const timeoutId = setTimeout(() => {
        showToast(
          `Found potential characters: ${potentialCharacterNames.slice(0, 2).join(', ')}. Add them to Characters?`,
          'info',
          5000
        );
        sessionStorage.setItem(suggestionKey, 'true');
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [potentialCharacterNames, canUseCharacters]);

  // Auto-save to backend when content changes (debounced)
  useEffect(() => {
    if (!currentDraftContent || currentDraftContent.trim().length < 50) {
      return; // Don't save empty or very short content
    }

    const snapshot: StoredSnapshot = {
      id: `auto-${Date.now()}`,
      idea: idea,
      content: currentDraftContent,
      chapters: chapters,
      length: length,
      timestamp: Date.now(),
      outline: outline || undefined
    };

    // Debounce auto-save: wait 3 seconds after user stops typing
    const timeoutId = setTimeout(() => {
      void syncProjectSnapshot(snapshot, 'auto');
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [currentDraftContent, idea, chapters, length, outline, syncProjectSnapshot]);

  const [readingInsights, setReadingInsights] = useState<Array<{ label: string; value: string; detail?: string }>>([
    { label: 'Pacing', value: 'Add text to analyze pacing.', detail: 'Start writing to see live insights.' },
    { label: 'Tone', value: 'Add text to analyze tone.', detail: 'Start writing to see live insights.' },
    { label: 'Characters', value: 'Add text to analyze characters.', detail: 'Start writing to see live insights.' }
  ]);
  const [isAnalyzingInsights, setIsAnalyzingInsights] = useState(false);

  useEffect(() => {
    const content = currentDraftContent || '';
    if (!content.trim()) {
      setReadingInsights([
        { label: 'Pacing', value: 'Add text to analyze pacing.', detail: 'Start writing to see live insights.' },
        { label: 'Tone', value: 'Add text to analyze tone.', detail: 'Start writing to see live insights.' },
        { label: 'Characters', value: 'Add text to analyze characters.', detail: 'Start writing to see live insights.' }
      ]);
      setIsAnalyzingInsights(false);
      return;
    }

    // Calculate metrics first (always show these immediately)
    const pacing = summarizePacing(content);
    const tone = summarizeTone(content);
    const charactersInsight = buildCharacterInsight(content, characters);

    // Show local summaries immediately
    setReadingInsights([
      { label: 'Pacing', value: pacing.summary, detail: pacing.detail },
      { label: 'Tone', value: tone.summary, detail: tone.detail },
      { label: 'Characters', value: charactersInsight.summary, detail: charactersInsight.detail }
    ]);

    // Debounce: Wait 2 seconds after user stops typing before calling LLM
    setIsAnalyzingInsights(true);
    const timeoutId = setTimeout(() => {
      // Only call LLM if content is substantial (at least 100 chars)
      if (content.trim().length < 100) {
        setIsAnalyzingInsights(false);
        return;
      }

      console.log('[Reading Insights] Calling LLM for literary summaries...');
      analyzeReadingInsights(pacing, tone, charactersInsight, content)
        .then((analysis) => {
          console.log('[Reading Insights] LLM analysis received:', analysis);
          setReadingInsights([
            { label: 'Pacing', value: analysis.pacing.summary, detail: analysis.pacing.detail },
            { label: 'Tone', value: analysis.tone.summary, detail: analysis.tone.detail },
            { label: 'Characters', value: analysis.characters.summary, detail: analysis.characters.detail }
          ]);
          setIsAnalyzingInsights(false);
        })
        .catch((error) => {
          console.error('[Reading Insights] LLM failed, using local summaries:', error);
          // Keep local summaries (already set above)
          setIsAnalyzingInsights(false);
        });
    }, 2000); // 2 second debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentDraftContent, characters]);

  const markdownDocument = useMemo(() => {
    const hasChapters = chapters.length > 0;
    const body = hasChapters
      ? chapters
          .map((chapter, index) => {
            const title = chapter.title || `Chapter ${index + 1}`;
            const content = (chapter.content || '').trim();
            return `## ${title}\n\n${content}`;
          })
          .join('\n\n')
      : (result || '').trim();

    if (!body) {
      return '';
    }

    const titleLine = `# ${idea.trim().slice(0, 80) || 'AI Novel Draft'}`;
    const metadata = [
      `- Genre: ${genre.replace(/-/g, ' ')}`,
      `- Target length: ${length} pages`,
      `- Exported: ${dateFormatter.format(Date.now())}`
    ].join('\n');

    return `${titleLine}\n\n${metadata}\n\n${body}`.trim();
  }, [chapters, result, idea, genre, length]);

  const exportFilenameBase = useMemo(() => buildFilenameBase(idea), [idea]);
  const hasExportableContent = Boolean(markdownDocument);

  const chapterWordCount = (content: string) => countWords(content);

  const convertChapterToOutline = (chapter: Chapter): string[] => {
    const paragraphs = chapter.content.split(/\n{2,}/).filter(Boolean);
    return paragraphs.map((para) => {
      const trimmed = para.trim();
      if (trimmed.length < 50) return trimmed;
      const firstSentence = trimmed.match(/^[^.!?]+[.!?]/)?.[0] || trimmed.slice(0, 80);
      return firstSentence.length < trimmed.length ? `${firstSentence}...` : trimmed;
    });
  };

  const updateChapterStatus = (chapterIndex: number, status: 'drafting' | 'reviewing' | 'done') => {
    setChapterStatuses((prev) => {
      const next = new Map(prev);
      next.set(chapterIndex, status);
      return next;
    });
  };

  const ideaRef = useRef(idea);
  const lengthRef = useRef(length);
  const outlineRef = useRef(outline);

  useEffect(() => {
    chaptersRef.current = chapters;
    resultRef.current = result;
    ideaRef.current = idea;
    lengthRef.current = length;
    outlineRef.current = outline;
    sectionContentRef.current = getSectionContent(currentSectionId);
  });

  useEffect(() => {
    if (chapters.length > 0 || result) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(() => {
        if (chaptersRef.current.length > 0 || resultRef.current) {
          const payload: StoredSnapshot = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            idea: ideaRef.current,
            length: lengthRef.current,
            content: resultRef.current || '',
            chapters: chaptersRef.current,
            outline: outlineRef.current || undefined
          };
          void syncProjectSnapshot(payload, 'auto');
          setLastSaved(Date.now());
        }
        setIsSaving(false);
      }, 2000);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chapters.length, result, syncProjectSnapshot, idea, length]);

  const resetResults = () => {
    setResult(null);
    setChapters([]);
    setActiveChapterIndex(0);
    setIsPartial(false);
    setActualLength(null);
    setOutline(null);
  };

  const handleDownloadMarkdown = () => {
    if (!markdownDocument) return;
    const blob = new Blob([markdownDocument], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilenameBase}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    // Check if user has access to PDF export
    if (!plan.features.exportFormats.includes('pdf')) {
      setError('PDF export is available on Starter plan and above. Upgrade to unlock this feature.');
      return;
    }
    if (!markdownDocument) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const plainText = markdownDocument
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`/g, '');
    const lines = doc.splitTextToSize(plainText, 520);
    let cursorY = 60;

    lines.forEach((line: string) => {
      if (cursorY > 760) {
        doc.addPage();
        cursorY = 60;
      }
      doc.text(line, 40, cursorY);
      cursorY += 16;
    });

    doc.save(`${exportFilenameBase}.pdf`);
  };

  const handleDownloadEpub = async () => {
    if (!hasExportableContent) {
      alert('Generate or edit your draft before exporting.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await buildEpub({
        title: idea.trim().slice(0, 80) || 'AI Novel Draft',
        author: 'Scribely Writer',
        chapters: chapters.length > 0 ? chapters : undefined,
        fallbackText: result || ''
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportFilenameBase}.epub`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowPublishModal(false);
    } catch (error: any) {
      console.error('Failed to export ePub:', error);
      alert('Failed to export ePub. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAudioScript = () => {
    if (!hasExportableContent) {
      alert('Generate or edit your draft before exporting.');
      return;
    }
    const lines: string[] = [];
    lines.push(`# Audiobook Script · ${idea.slice(0, 80) || 'AI Novel'}`);
    lines.push('');
    const sourceChapters =
      chapters.length > 0
        ? chapters
        : [{ title: 'Part 1', content: result || '' }];
    sourceChapters.forEach((chapter, index) => {
      lines.push(`## Chapter ${index + 1}: ${chapter.title}`);
      lines.push('[Pause 2s]');
      chapter.content
        .split(/\n{2,}/)
        .map((para) => para.trim())
        .filter(Boolean)
        .forEach((para) => {
          lines.push(para);
          lines.push('[Short pause]');
        });
      lines.push('');
    });
    lines.push('---');
    lines.push('Generated by Scribely Focus Mode · Add room tone and intro music as needed.');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilenameBase}-audiobook-script.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowPublishModal(false);
  };

  const handleSelectChapter = (index: number) => {
    setActiveChapterIndex(index);
    requestAnimationFrame(() => {
      if (focusPanelRef.current) {
        focusPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  type AddCommentInput = { text: string; threadId?: string; parentId?: string | null };

  const handleAddComment = useCallback(
    async ({ text, threadId, parentId }: AddCommentInput) => {
      // Ensure project exists before adding comment
      if (!isAuthenticated) {
        setShowLoginModal(true);
        return;
      }
      
      let project = currentProject;
      if (!project) {
        project = await ensureProject();
        if (!project) {
          alert('Please add some content before adding comments.');
          return;
        }
      }

      let selectionPayload: ProjectCommentSelection | undefined;
      if (currentSelectionDetail?.range) {
        selectionPayload = {
          start: currentSelectionDetail.range.index,
          end: currentSelectionDetail.range.index + currentSelectionDetail.range.length,
          text: currentSelectionDetail.text,
          sectionId: currentSectionId
        };
      } else if (threadId) {
        const threadRoot = collabComments.find(
          (comment) => comment.threadId === threadId && (!comment.parentId || comment.parentId === null)
        );
        selectionPayload = threadRoot?.selection;
      }

      if (!selectionPayload) {
        alert('Please select some text before adding a comment.');
        return;
      }

      const derivedMentions = deriveMentionsFromText(text, participantHandles);
      const normalizedMentions = derivedMentions
        .map((handle) => normalizeHandle(handle))
        .filter((handle): handle is string => Boolean(handle));

      if (socketRef.current && isCollabConnected) {
        socketRef.current.emit('collab:comment-add', {
          projectId: project.id,
          text,
          selection: selectionPayload,
          userId: user?.id || 'guest-user',
          userName: user?.name || user?.email || 'Guest',
          mentions: normalizedMentions,
          threadId,
          parentId
        });
        return;
      }

      try {
        const created = await addProjectComment(project.id, {
          text,
          selection: selectionPayload,
          mentions: normalizedMentions,
          threadId,
          parentId
        });
        setCollabComments((prev) => [...prev, created]);
        if (!currentProject?.id) return;
        setCollabActivities((prev) =>
          [
            {
              id: `local-${created.id}`,
              projectId: currentProject.id,
              type: 'comment_added' as const,
              userId: user?.id,
              userName: user?.name || user?.email || 'You',
              threadId: created.threadId,
              commentId: created.id,
              sectionId: created.selection?.sectionId,
              text: created.text,
              createdAt: Date.now()
            },
            ...prev
          ].slice(0, 200)
        );
      } catch (error) {
        console.error('[Generator] Failed to add comment via API', error);
        alert('Failed to add comment. Please try again.');
      }
    },
    [
      isAuthenticated,
      currentProject,
      ensureProject,
      currentSelectionDetail,
      currentSectionId,
      collabComments,
      user,
      isCollabConnected,
      participantHandles,
      user?.id,
      user?.name,
      user?.email
    ]
  );

  const handleUpdateCommentStatus = useCallback(
    async (threadId: string, status: 'open' | 'resolved') => {
      if (!currentProject?.id) return;
      const rootComment = collabComments.find(
        (comment) => comment.threadId === threadId && (!comment.parentId || comment.parentId === null)
      );
      if (!rootComment) return;

      if (socketRef.current && isCollabConnected) {
        socketRef.current.emit('collab:comment-update', {
          projectId: currentProject.id,
          commentId: rootComment.id,
          status,
          userId: user?.id
        });
        return;
      }

      try {
        const updated = await updateProjectCommentStatus(currentProject.id, rootComment.id, status);
        setCollabComments((prev) => prev.map((comment) => (comment.id === updated.id ? updated : comment)));
        if (status === 'resolved') {
          setCollabActivities((prev) =>
            [
              {
                id: `local-activity-${updated.id}`,
                projectId: currentProject.id,
                type: 'comment_resolved' as const,
                userId: user?.id,
                userName: user?.name || user?.email || 'You',
                threadId: updated.threadId,
                commentId: updated.id,
                sectionId: updated.selection?.sectionId,
                text: updated.text,
                createdAt: Date.now()
              },
              ...prev
            ].slice(0, 200)
          );
        }
      } catch (error) {
        console.error('[Generator] Failed to update comment status', error);
        alert('无法更新评论状态，请稍后再试。');
      }
    },
    [collabComments, currentProject?.id, isCollabConnected, user]
  );

  const handleHighlightComment = useCallback(
    (comment: ProjectComment) => {
      if (!comment.selection) return;
      const targetSection = comment.selection.sectionId || 'draft';
      const highlight = () => {
        const selection = comment.selection;
        if (!selection) return;
        const length = Math.max(0, (selection.end || 0) - (selection.start || 0));
        if (length > 0 && selection.start !== undefined) {
          storyEditorRef.current?.highlightRange({
            start: selection.start,
            length
          });
        }
      };

      if (targetSection !== currentSectionId && targetSection.startsWith('chapter-')) {
        const index = Number(targetSection.split('-')[1]);
        if (!Number.isNaN(index) && index >= 0 && index < chaptersRef.current.length) {
          handleSelectChapter(index);
          setTimeout(highlight, 250);
          return;
        }
      }

      highlight();
    },
    [currentSectionId, handleSelectChapter]
  );

  useEffect(() => {
    if (!canUseCollaboration || !currentProject?.id || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setCollabParticipants([]);
      setIsCollabConnected(false);
      setSectionLocks([]);
      setCollabActivities([]);
      releaseActiveLock();
      return;
    }

    const socket = io(collabBaseUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsCollabConnected(true));
    socket.on('disconnect', () => setIsCollabConnected(false));

    const joinSectionId = activeSectionRef.current || currentSectionId;

    const projectId = currentProject.id;
    const userId = user.id;
    const displayName = user.name || user.email || 'Guest';

    socket.emit('collab:join', {
      projectId,
      userId,
      userName: displayName,
      userEmail: user.email,
      sectionId: joinSectionId,
      content: getSectionContent(joinSectionId)
    });

    socket.on('collab:sync', ({ participants, comments, content, sectionId, locks, activities }) => {
      if (Array.isArray(participants)) {
        setCollabParticipants(enhanceParticipants(participants));
      }
      if (Array.isArray(comments)) {
        setCollabComments(comments);
      }
      if (Array.isArray(activities)) {
        setCollabActivities(activities);
      }
      if (Array.isArray(locks)) {
        setSectionLocks(locks);
      }
      if (sectionId && typeof content === 'string') {
        applyRemoteContent(sectionId, undefined, content);
      }
    });

    socket.on('collab:participants', ({ participants }) => {
      if (Array.isArray(participants)) {
        setCollabParticipants(enhanceParticipants(participants));
      }
    });

    socket.on('collab:content-update', ({ sectionId, patch, content }) => {
      if (sectionId) {
        applyRemoteContent(sectionId, patch, content);
      }
    });

    socket.on('collab:section-sync', ({ sectionId, content }) => {
      if (sectionId && typeof content === 'string') {
        applyRemoteContent(sectionId, undefined, content);
      }
    });

    socket.on('collab:comment-added', (comment: ProjectComment) => {
      setCollabComments((prev) => {
        if (prev.some((existing) => existing.id === comment.id)) {
          return prev;
        }
        return [...prev, comment];
      });
      if (
        normalizedCurrentHandle &&
        comment.userId !== userId &&
        comment.mentions?.some((mention) => normalizeHandle(mention) === normalizedCurrentHandle)
      ) {
        setMentionNotice(comment);
      }
    });

    socket.on('collab:comment-updated', (comment: ProjectComment) => {
      setCollabComments((prev) => prev.map((existing) => (existing.id === comment.id ? comment : existing)));
    });

    socket.on('collab:activity', (activity: ProjectActivity) => {
      setCollabActivities((prev) => {
        const deduped = prev.filter((entry) => entry.id !== activity.id);
        return [activity, ...deduped].slice(0, 200);
      });
    });

    socket.on('collab:locks', (locks: SectionLockState[]) => {
      if (Array.isArray(locks)) {
        setSectionLocks(locks);
      }
    });

    socket.on('collab:lock-granted', ({ lock }: { lock: SectionLockState }) => {
      if (lock && lock.userId === (userId || 'guest-user')) {
        setLockWarning(null);
      }
    });

    socket.on('collab:lock-rejected', ({ reason, conflict }) => {
      if (reason === 'locked' && conflict) {
        setLockWarning(`该段已被 ${conflict.userName || '其他成员'} 锁定`);
      } else {
        setLockWarning('无法获取锁，请稍候重试');
      }
    });

    socket.on('collab:cursor', ({ userId: remoteUserId, sectionId, range }) => {
      if (!remoteUserId || remoteUserId === userId) {
        return;
      }
      const activeSection = activeSectionRef.current || currentSectionId;
      if (sectionId !== activeSection || !range || typeof range.index !== 'number') {
        return;
      }
      storyEditorRef.current?.highlightRange({
        start: range.index,
        length: Math.max(1, range.length || 1)
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsCollabConnected(false);
      setCollabParticipants([]);
      setSectionLocks([]);
      setCollabActivities([]);
    };
  }, [
    canUseCollaboration,
    currentProject?.id,
    user?.id,
    user?.email,
    user?.name,
    getSectionContent,
    applyRemoteContent,
    collabBaseUrl,
    enhanceParticipants,
    normalizedCurrentHandle,
    releaseActiveLock
  ]);

  useEffect(() => {
    if (!canUseCollaboration || !currentProject?.id || !socketRef.current) {
      return;
    }
    socketRef.current.emit('collab:section-change', {
      projectId: currentProject.id,
      sectionId: currentSectionId,
      content: getSectionContent(currentSectionId)
    });
  }, [canUseCollaboration, currentProject?.id, currentSectionId, getSectionContent]);


  const handleGenerate = async () => {
    if (!idea.trim() || idea.length < 30) {
      setError('Please provide at least 30 words for your novel idea');
      return;
    }

    // Check subscription limits
    const remaining = getRemainingGenerations();
    const wouldExceedTotalLength = plan.limits.maxNovelLength !== Infinity && 
      (currentProjectTotalPages + length) > plan.limits.maxNovelLength;
    
    if (remaining === 0) {
      setError(`You've reached your monthly limit of ${plan.limits.maxGenerationsPerMonth} generations.`);
      setShowUpgradePrompt({ reason: 'generations', requiredTier: tier === 'free' ? 'starter' : tier === 'starter' ? 'pro' : 'unlimited' });
      return;
    }
    
    if (length > plan.limits.maxNovelLength) {
      setError(`Your plan supports up to ${plan.limits.maxNovelLength} pages per generation.`);
      setShowUpgradePrompt({ reason: 'length', requiredTier: tier === 'free' ? 'starter' : tier === 'starter' ? 'pro' : 'unlimited' });
      return;
    }
    
    if (wouldExceedTotalLength) {
      setError(`Adding ${length} pages would exceed your plan's limit of ${plan.limits.maxNovelLength} pages total. Current project: ${currentProjectTotalPages} pages.`);
      setShowUpgradePrompt({ reason: 'totalLength', requiredTier: tier === 'free' ? 'starter' : tier === 'starter' ? 'pro' : 'unlimited' });
      return;
    }
    
    if (!canGenerate(length)) {
      setError('Unable to generate. Please check your subscription limits.');
      return;
    }
    
    // Clear upgrade prompt if generation can proceed
    setShowUpgradePrompt(null);

    setLoading(true);
    setError(null);
    setProgress('Connecting to the AI service…');
    setProgressValue(15);
    resetResults();

    const generationStepId = execution.startStep('generate-draft', {
      genre,
      length
    });
    
    try {
      // Rough estimate: ~20 pages per minute
      const estimatedTime = Math.ceil(length / 20);
      setProgress(`Estimated time: ${estimatedTime}-${estimatedTime + 1} min. Please hold on…`);
      setProgressValue(35);
      
      const novel = await generateNovel({
        genre,
        idea,
        length,
        characters: canUseCharacters && characters.length > 0
          ? characters.map(c => ({ name: c.name, description: c.description }))
          : undefined,
        style: canUseStyleMemory && writingStyle ? writingStyle : undefined,
        knowledge: canUseKnowledge ? pinnedKnowledge : undefined,
        language,
        contextStrategy,
        contextWindowWords: effectiveContextWindow
      });
      
      setProgress('Draft ready!');
      setProgressValue(95);
      setResult(novel.content);
      setChapters(novel.chapters || []);
      setActiveChapterIndex(0);
      setIsPartial(Boolean(novel.isPartial));
      setActualLength(novel.actualLength || length);

      // Increment usage counter (local)
      incrementUsage();
      
      // Sync usage to backend
      if (isAuthenticated) {
        try {
          const usageData = await fetchUsage();
          const { applyRemoteSubscription } = useSubscriptionStore.getState();
          applyRemoteSubscription(
            {
              tier: tier,
              billingCycle: 'monthly',
              status: 'active',
              limits: usageData.limits
            },
            {
              generationsUsed: usageData.usage.generationsUsed,
              pagesUsed: usageData.usage.pagesUsed,
              tokensUsed: usageData.usage.tokensUsed,
              lastResetAt: usageData.usage.lastResetAt
            }
          );
        } catch (err) {
          console.warn('Failed to sync usage to backend:', err);
          // Continue even if sync fails
        }
      }

      execution.finishStep(generationStepId, 'success', {
        actualLength: novel.actualLength || length
      });

      await syncProjectSnapshot(
        {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        idea,
        length,
        content: novel.content,
        chapters: novel.chapters || [],
        outline: novel.outline
        },
        'generate'
      );
    } catch (err: any) {
      execution.finishStep(generationStepId, 'error', { error: err?.message || 'Failed to generate draft' });
      setError(err.message || 'Failed to generate novel');
      setProgress('');
      setProgressValue(0);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(''), 2000);
      setTimeout(() => setProgressValue(0), 800);
    }
  };

  const mergeOutlineIntoDraft = (incoming: Chapter[], mode: 'replace' | 'append') => {
    setChapters((prev) => {
      const combined = mode === 'append' ? [...prev, ...incoming] : incoming;
      setResult(combined.map((chapter) => `### ${chapter.title}\n\n${chapter.content}`).join('\n\n'));
      setActiveChapterIndex(mode === 'append' ? prev.length : 0);
      setIsPartial(false);
      setActualLength(Math.max(length, combined.length * 5));
      setOutline(null);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      void syncProjectSnapshot(
        {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        idea,
        length,
        content: combined.map((chapter) => `### ${chapter.title}\n\n${chapter.content}`).join('\n\n'),
        chapters: combined,
        outline: outline || undefined
        },
        'outline'
      );
      return combined;
    });
  };

  // Handle quick start after functions are defined
  useEffect(() => {
    if (!shouldQuickStart || !idea.trim()) return;
    
    const timeoutId = setTimeout(() => {
      if (shouldQuickStart.mode === 'outline') {
        handleGenerateOutline();
      } else {
        handleGenerate();
      }
      setShouldQuickStart(null);
    }, 800);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldQuickStart, idea]);

  const handleGenerateOutline = async () => {
    if (!idea.trim() || idea.length < 30) {
      setError('Please provide at least 30 words for your novel idea');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('Generating chapter outline…');
    setProgressValue(25);
    resetResults();

    const outlineStepId = execution.startStep('generate-outline', {
      genre,
      length
    });

    try {
      const outlineResult = await generateNovel({
        genre,
        idea,
        length,
        type: 'outline',
        style: canUseStyleMemory && writingStyle ? writingStyle : undefined,
        knowledge: canUseKnowledge ? pinnedKnowledge : undefined,
        language,
        contextStrategy,
        contextWindowWords: effectiveContextWindow
      });
      setOutline(outlineResult.outline || 'Outline generation returned empty content.');
      setProgress('Outline ready.');
      setProgressValue(95);
      execution.finishStep(outlineStepId, 'success', {
        hasOutline: Boolean(outlineResult.outline)
      });
    } catch (err: any) {
      execution.finishStep(outlineStepId, 'error', { error: err?.message || 'Failed to generate outline' });
      setError(err.message || 'Failed to generate outline');
      setProgress('');
      setProgressValue(0);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(''), 2000);
      setTimeout(() => setProgressValue(0), 800);
    }
  };

  // 登录成功后的处理
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // 登录成功后，项目加载逻辑会自动触发（因为 isAuthenticated 变化）
    // 重新加载项目数据
    const projectId = searchParams.get('project');
    if (projectId) {
      // 触发项目重新加载
      window.location.reload();
    }
  };

  return (
    <>
    <div className="py-10">
      <SEO
        title="AI Novel Generator - Create Complete Novels with AI | Scribely"
        description="Use our free AI novel generator to create complete novels in minutes with Scribely. Generate novels about AI, fantasy, romance, mystery, and more. Best novel ai style writer tool."
        keywords="ai novel generator, novel ai, ai novel writer, novels about ai, free ai novel generator, ai story generator, ai book generator"
        image="https://scribelydesigns.top/brand1090.png"
      />
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Editor Area - Full Width */}
        <main className="space-y-6">
          <h1 className="sr-only">AI Novel Generator - Create Complete Novels with AI</h1>
          {/* Empty Project Guide - Show when project is new and empty */}
          {(() => {
            const projectId = searchParams.get('project');
            const isNewProject = searchParams.get('new') === 'true';
            const isEmpty = !result && chapters.length === 0 && !idea.trim();
            // Show guide if: new project flag is set, empty content, and projectId exists in URL
            // We show it even if currentProject is not loaded yet, as long as we have projectId
            const shouldShow = isNewProject && isEmpty && !!projectId;
            
            console.log('[Generator] Guide check:', { isNewProject, isEmpty, projectId, shouldShow, currentProject: currentProject?.title });
            
            if (!shouldShow) return null;
            
            return (
              <EmptyProjectGuide
                projectTitle={currentProject?.title || '新项目'}
                onStartWriting={() => {
                  // Scroll to Brief panel or focus on idea input
                  const ideaInput = document.querySelector('textarea[placeholder*="idea" i], textarea[placeholder*="想法" i], textarea[placeholder*="Describe" i]');
                  if (ideaInput) {
                    ideaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => {
                      (ideaInput as HTMLTextAreaElement).focus();
                    }, 300);
                  } else {
                    // Fallback: open context drawer to show Brief panel
                    setShowContextDrawer(true);
                  }
                }}
              />
            );
          })()}
          
          {/* Top Toolbar */}
          <GlassCard className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Debug: Temporary subscription switcher */}
            {import.meta.env.DEV && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                <p className="text-yellow-800 font-semibold mb-1">Debug: Current tier = {tier}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubscription('free')}
                    className="px-2 py-1 bg-slate-200 rounded text-slate-700 hover:bg-slate-300"
                  >
                    Free
                  </button>
                  <button
                    onClick={() => setSubscription('starter')}
                    className="px-2 py-1 bg-slate-200 rounded text-slate-700 hover:bg-slate-300"
                  >
                    Starter
                  </button>
                  <button
                    onClick={() => setSubscription('pro')}
                    className="px-2 py-1 bg-indigo-200 rounded text-indigo-700 hover:bg-indigo-300 font-semibold"
                  >
                    Pro (AI Assistant)
                  </button>
                  <button
                    onClick={() => setSubscription('unlimited')}
                    className="px-2 py-1 bg-purple-200 rounded text-purple-700 hover:bg-purple-300"
                  >
                    Unlimited
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setShowContextDrawer(true)}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Context</span>
              </SecondaryButton>
              {canUseVersionHistory && (
                <SecondaryButton 
                  onClick={async () => {
                    // Check if user is authenticated
                    if (!isAuthenticated) {
                      setShowLoginModal(true);
                      return;
                    }
                    
                    // Ensure project exists
                    const project = await ensureProject();
                    if (project) {
                      setShowVersionHistory(true);
                    } else {
                      // No content to create project from
                      alert('Please add some content before using version history.');
                    }
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Project Versions</span>
                </SecondaryButton>
              )}
              {canUseCollaboration && (
                <SecondaryButton 
                  onClick={async () => {
                    // Check if user is authenticated
                    if (!isAuthenticated) {
                      setShowLoginModal(true);
                      return;
                    }
                    
                    // Ensure project exists before opening collaboration
                    const project = await ensureProject();
                    if (project) {
                      setIsCollabPanelOpen(!isCollabPanelOpen);
                      // Close ContextDrawer if open (mutual exclusion)
                      if (showContextDrawer) {
                        setShowContextDrawer(false);
                      }
                    } else {
                      // No content to create project from, but still allow opening panel
                      // (will show placeholder)
                      setIsCollabPanelOpen(!isCollabPanelOpen);
                      if (showContextDrawer) {
                        setShowContextDrawer(false);
                      }
                    }
                  }}
                  className={isCollabPanelOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Collaboration</span>
                  {isCollabPanelOpen && <span className="ml-1">▼</span>}
                  {!isCollabPanelOpen && <span className="ml-1">▶</span>}
                </SecondaryButton>
              )}
              {canUseAIAssistant && (
                <SecondaryButton
                  ref={aiAssistantButtonRef}
                  onClick={(e) => {
                    if (!selectedText || selectedText.length < MIN_SELECTION_CHARS) {
                      // Show hint to select text first - positioned near the button
                      const button = e.currentTarget as HTMLButtonElement;
                      const buttonRect = button.getBoundingClientRect();
                      const hint = document.createElement('div');
                      hint.className = 'fixed z-50 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm shadow-xl';
                      hint.textContent = 'Please select at least 12 characters of text first';
                      // Position hint above the button, centered horizontally
                      hint.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
                      hint.style.top = `${buttonRect.top - 50}px`;
                      hint.style.transform = 'translateX(-50%)';
                      document.body.appendChild(hint);
                      setTimeout(() => {
                        hint.style.opacity = '0';
                        hint.style.transition = 'opacity 0.3s';
                        setTimeout(() => document.body.removeChild(hint), 300);
                      }, 2000);
                    } else {
                      // If text is selected, show the menu at the selection position
                      const range = storyEditorRef.current?.getSelectedRange();
                      if (range && aiMenuPosition) {
                        // Menu should already be visible, but we can ensure it is
                        setAiMenuPosition(aiMenuPosition);
                      }
                    }
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI assistant</span>
                </SecondaryButton>
              )}
              </div>
                <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setShowHistory(true)} title="Draft History">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Draft History</span>
              </SecondaryButton>
          </div>
          </GlassCard>

          {/* Focus Mode Editor */}
          <GlassCard className="focus-editor-anchor">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Focus mode</p>
                <h2 className="text-2xl font-light text-slate-900">
                  {chapters.length > 0
                    ? chapters[activeChapterIndex]?.title || `Chapter ${activeChapterIndex + 1}`
                    : 'Draft'}
                </h2>
                <p className="text-sm text-slate-500">
                  {chapters.length > 0
                    ? `Chapter ${activeChapterIndex + 1} of ${chapters.length}`
                    : actualLength
                      ? `Generated ${actualLength} pages`
                      : `Target ${length} pages`}
                </p>
                  </div>
              <div className="flex flex-wrap items-center gap-2">
                  {chapters.length > 1 && (
                    <>
                  <button
                        onClick={() => handleSelectChapter(Math.max(0, activeChapterIndex - 1))}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        disabled={activeChapterIndex === 0}
                  >
                        Previous
                  </button>
                      <button
                        onClick={() => handleSelectChapter(Math.min(chapters.length - 1, activeChapterIndex + 1))}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        disabled={activeChapterIndex === chapters.length - 1}
                      >
                        Next
                      </button>
                    </>
                  )}
                  {(chapters.length > 0 || result) && (
                  <button
                      onClick={() => setShowReadingPreview(true)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                      Reading preview
                  </button>
                        )}
              {hasExportableContent && (
                    <>
                    <button
                      onClick={handleDownloadMarkdown}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Download .md
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                        PDF
                    </button>
                          <button
                        onClick={() => setShowPublishModal(true)}
                        className="rounded-xl border border-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-900 hover:text-white transition"
                          >
                        Publish
                          </button>
                    </>
                        )}
                      </div>
                                </div>

              {isPartial && (
                <div className="border-b border-slate-100 bg-indigo-50/60 px-6 py-3 text-xs text-indigo-700">
                Generated first {actualLength} pages. Use “Continue writing” to extend.
                                </div>
                    )}

              <div className="p-6">
                {!result && chapters.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-16 text-center text-slate-400">
                    <p className="text-sm">Start writing or generate your first draft</p>
                              </div>
                ) : (
                                  <StoryEditor
                    ref={storyEditorRef}
                    variant="focus"
                    initialContent={
                      chapters.length > 0
                        ? chapters[activeChapterIndex]?.content || ''
                        : result || ''
                    }
                          onSelectionChange={handleEditorSelection}
                    lockedRanges={lockedRangesForEditor}
                    onLockedSelectionAttempt={handleLockedSelectionAttempt}
                                    context={
                            chapters.length > 0 && activeChapterIndex > 0
                                        ? chapters
                                  .slice(0, activeChapterIndex)
                                            .map((ch) => `${ch.title}\n\n${ch.content}`)
                                            .join('\n\n')
                                        : ''
                                    }
                                    characters={
                            canUseCharacters && characters.length > 0
                              ? characters.map((c) => ({ name: c.name, description: c.description }))
                                        : undefined
                                    }
                          style={canUseStyleMemory && writingStyle ? writingStyle : undefined}
                    language={language}
                    knowledge={canUseKnowledge ? pinnedKnowledge : undefined}
                    onContentChange={handleEditorContentChange}
                    onContinueComplete={handleContinueComplete(chapters.length > 0 ? activeChapterIndex : null)}
                                  />
                            )}
                          </div>
          </GlassCard>

            {/* Context Manager Panel */}
            {lastContextMetadata && canUseVersionHistory && (
              <ContextManagerPanel
                contextMetadata={lastContextMetadata}
                fullContext={currentDraftContent}
                selectedContext={currentDraftContent} // This would be the selected context, but we'll use full for now
              />
            )}

            {/* Reading Insights */}
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reading insights</p>
                  <p className="text-sm text-slate-500">
                    {isAnalyzingInsights ? 'Analyzing with AI...' : 'Live analysis from current draft'}
                  </p>
                                </div>
                                    <button
                  onClick={() => focusPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Refresh
                                    </button>
                                  </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {readingInsights.map((insight) => (
                  <div key={insight.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 relative">
                    {isAnalyzingInsights && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                      </div>
                    )}
                    <p className="text-xs font-semibold tracking-[0.3em] text-slate-500">{insight.label}</p>
                    <p className="text-sm text-slate-800 mt-2">{insight.value}</p>
                    {insight.detail && (
                      <p className="text-xs text-slate-500 mt-1">{insight.detail}</p>
                    )}
                  </div>
                ))}
                            </div>
            </section>

            {canUseCollaboration && currentProject && (
              <div className="mt-6" id="collaboration">
                {lockWarning && (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    {lockWarning}
                  </div>
                )}
                <CollaborationPanel
                  participants={collabParticipants}
                  comments={collabComments}
                  selectedText={currentSelectionDetail?.text}
                  canAddComment
                  isConnected={isCollabConnected}
                  onAddComment={handleAddComment}
                  onCommentSelect={handleHighlightComment}
                  mentionNotice={mentionNotice}
                  onDismissMention={() => setMentionNotice(null)}
                  currentHandle={currentUserHandle}
                  onUpdateThreadStatus={handleUpdateCommentStatus}
                />
                {collabActivities.length > 0 && (
                  <CollaborationActivityTimeline activities={collabActivities.slice(0, 30)} />
                )}
              </div>
            )}
            {canUseCollaboration && !currentProject && (
              <GlassCard className="mt-6 p-6 border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white" id="collaboration">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">Ready for collaboration</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Open or create a project to start collaborating with real-time comments, mentions, and shared cursors.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PrimaryButton onClick={() => navigate('/dashboard')} className="text-sm">
                        Browse projects
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => navigate('/dashboard?create=true')}
                        className="text-sm"
                      >
                        New project
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Outline */}
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Outline</p>
                  <p className="text-sm text-slate-500">
                    {chapters.length > 0 ? `${chapters.length} chapters` : 'No chapters yet'}
                  </p>
                            </div>
                <div className="flex items-center gap-2">
                  {outline && (
                                  <button
                      onClick={() => setShowOutlineMap(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                  >
                      View map
                                  </button>
                  )}
                                <button
                    onClick={() => setIsOutlineCollapsed((prev) => !prev)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
                    aria-label={isOutlineCollapsed ? 'Expand outline' : 'Collapse outline'}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isOutlineCollapsed ? '' : 'rotate-180'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                                </button>
                              </div>
                      </div>
              {!isOutlineCollapsed && (
                <div className="p-4 space-y-3">
                  {chapters.length === 0 && (
                    <p className="text-sm text-slate-500">Generate a draft to see chapters here.</p>
                  )}
                  {chapters.length > 0 && (
                    <ul className="space-y-2">
                      {chapters.map((chapter, index) => (
                        <li
                          key={`${chapter.title}-${index}`}
                          className={`rounded-2xl border px-3 py-2 transition ${
                            activeChapterIndex === index
                              ? 'border-slate-900 bg-white shadow-sm'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex w-full items-start justify-between gap-3">
                            <button
                              onClick={() => handleSelectChapter(index)}
                              className="flex-1 text-left"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {chapter.title || `Chapter ${index + 1}`}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {chapterWordCount(chapter.content)} words
                              </p>
                            </button>
                            <div className="flex-shrink-0">
                              <StatusDropdown
                                chapterIndex={index}
                                currentStatus={chapterStatuses.get(index) || 'drafting'}
                                onStatusChange={updateChapterStatus}
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {!canUseCollaboration && (
              <GlassCard
                className="mt-6 p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white"
                id="collaboration"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">Unlock real-time collaboration</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Upgrade to <span className="font-semibold text-indigo-600">Unlimited</span> to collaborate with your team:
                    </p>
                    <ul className="mt-3 text-sm text-slate-600 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Real-time comments and @mentions
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Shared cursors and section locks
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Activity timeline and notifications
                      </li>
                    </ul>
                    <div className="mt-4">
                      <PrimaryButton onClick={() => navigate('/pricing')} className="text-sm">
                        Upgrade to Unlimited
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Outline Preview */}
                {outline && (
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4">
                  <OutlinePreview
                    rawOutline={outline}
                    onSendToDraft={(data) => mergeOutlineIntoDraft(data, 'replace')}
                    onViewMap={(payload) => {
                      setOutlineMapData(payload);
                      setShowOutlineMap(true);
                    }}
                  />
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Version History Drawer */}
      {canUseVersionHistory && (
        <VersionHistoryDrawer
          open={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          projectId={currentProject?.id || null}
          currentContent={result || ''}
          currentChapters={chapters}
          onRestore={(content, restoredChapters) => {
            if (restoredChapters.length > 0) {
              setChapters(restoredChapters);
              setResult('');
              setActiveChapterIndex(0);
            } else {
              setResult(content);
              setChapters([]);
            }
            setShowVersionHistory(false);
            // Reload project to get updated data
            if (currentProject?.id) {
              // Trigger a refresh by updating project state
              updateProjectState(currentProject.id, { content, chapters: restoredChapters });
            }
          }}
        />
      )}

      {/* Upgrade Prompt for Limit Exceeded */}
      {showUpgradePrompt && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <UpgradePrompt
            currentTier={tier}
            requiredTier={showUpgradePrompt.requiredTier || 'starter'}
            featureName={
              showUpgradePrompt.reason === 'generations' 
                ? 'More Generations' 
                : showUpgradePrompt.reason === 'length'
                ? 'Longer Novels'
                : 'More Project Pages'
            }
            variant="banner"
            onDismiss={() => setShowUpgradePrompt(null)}
          />
        </div>
      )}

      {/* Collaboration Sidebar */}
      {canUseCollaboration && (
        <div 
          className={`hidden lg:block fixed right-0 top-0 h-screen z-30 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 overflow-hidden ${
            isCollabPanelOpen ? 'w-80' : 'w-0'
          }`}
        >
          {isCollabPanelOpen && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold text-slate-900">Collaboration</h2>
                <button
                  onClick={() => setIsCollabPanelOpen(false)}
                  className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  aria-label="Close collaboration panel"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {currentProject ? (
                  <div className="p-4">
                    <CollaborationPanel
                      participants={collabParticipants}
                      comments={collabComments}
                      selectedText={currentSelectionDetail?.text}
                      canAddComment
                      isConnected={isCollabConnected}
                      onAddComment={handleAddComment}
                      onCommentSelect={handleHighlightComment}
                      mentionNotice={mentionNotice}
                      onDismissMention={() => setMentionNotice(null)}
                      currentHandle={currentUserHandle}
                      onUpdateThreadStatus={handleUpdateCommentStatus}
                    />
                    {collabActivities.length > 0 && (
                      <div className="mt-6">
                        <CollaborationActivityTimeline activities={collabActivities.slice(0, 30)} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 text-center">
                      <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Collaborating</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Create or open a project to start collaborating with others.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                          Browse Projects
                        </button>
                        <button
                          onClick={() => navigate('/dashboard?create=true')}
                          className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
                        >
                          New Project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Context Drawer */}
      <ContextDrawer
        open={showContextDrawer}
        onClose={() => {
          setShowContextDrawer(false);
          // Close collaboration panel when context drawer opens (mutual exclusion)
          if (isCollabPanelOpen) {
            setIsCollabPanelOpen(false);
          }
        }}
        genre={genre}
        onGenreChange={setGenre}
        idea={idea}
        onIdeaChange={setIdea}
        language={language}
        onLanguageChange={setLanguage}
        length={length}
        onLengthChange={setLength}
        minLength={minLength}
        maxLength={maxLength}
        loading={loading}
        error={error}
        progress={progress}
        progressValue={progressValue}
        prefillNotice={prefillNotice}
        onGenerate={handleGenerate}
        onGenerateOutline={handleGenerateOutline}
        onShowHistory={() => setShowHistory(true)}
        onShowPlanDrawer={() => setShowPlanDrawer(true)}
        storedPref={storedPref}
        onApplyStoredPreference={applyStoredPreference}
        characters={characters}
        onCharactersChange={setCharacters}
        writingStyle={writingStyle}
        onStyleChange={setWritingStyle}
        existingContent={result}
        knowledgeEntries={knowledgeEntries}
        onKnowledgeChange={setKnowledgeEntries}
        styleTemplates={styleTemplates}
        onStyleTemplatesChange={setStyleTemplates}
        onApplyStyleTemplate={handleApplyStyleTemplate}
        onSaveStyleTemplate={handleSaveStyleTemplate}
        sourceText={currentDraftContentForExtraction}
        currentProjectId={currentProject?.id || null}
        contextStrategy={contextStrategy}
        onContextStrategyChange={setContextStrategy}
        draftWordCount={draftWordCount}
        contextMetadata={lastContextMetadata}
      />

      {/* AI Available Hint - Show near AI assistant button */}
      {showAiAvailableHint && canUseAIAssistant && aiAssistantButtonRef.current && (
        <div
          className="fixed z-40 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg pointer-events-none"
          style={{
            left: `${aiAssistantButtonRef.current.getBoundingClientRect().right + 8}px`,
            top: `${aiAssistantButtonRef.current.getBoundingClientRect().top}px`,
          }}
        >
          AI available
        </div>
      )}

      {/* AI Action Menu */}
      {aiMenuPosition && selectedText && (
        <AIActionMenu
          selectedText={selectedText}
          position={aiMenuPosition}
          onClose={() => {
            setAiMenuPosition(null);
            setSelectedText('');
            setShowAiAvailableHint(false);
          }}
          onAction={handleAiAssistAction}
          canUseAssistant={canUseAIAssistant}
          requiredTier={aiAssistantRequiredTier}
          currentTier={tier ?? 'free'}
          minSelectionMet={selectedText.trim().length >= MIN_SELECTION_CHARS}
          minSelectionChars={MIN_SELECTION_CHARS}
          canUseCollaboration={canUseCollaboration}
          onAddComment={async () => {
            // Ensure project exists before adding comment
            if (!isAuthenticated) {
              setShowLoginModal(true);
              return;
            }
            
            const project = await ensureProject();
            if (project) {
              // Open collaboration panel and scroll to comment input
              setIsCollabPanelOpen(true);
              // Close context drawer if open (mutual exclusion)
              if (showContextDrawer) {
                setShowContextDrawer(false);
              }
              // The comment will be added when user types in the panel
            } else {
              alert('Please add some content before adding comments.');
            }
          }}
        />
      )}

      {aiAssistResult && (
        <div className="fixed bottom-6 right-6 z-40 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <GlassCard className="p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI Assistant</p>
                <h4 className="text-base font-semibold text-slate-900">
                  {AI_ACTION_LABELS[aiAssistResult.action]}
                </h4>
              </div>
              <button
                onClick={() => setAiAssistResult(null)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                aria-label="Close AI assistant result"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Selected text</p>
              <p className="text-sm text-slate-900 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-auto">
                {aiAssistResult.input}
              </p>
        </div>

            {aiAssistResult.status === 'loading' && (
              <p className="text-sm text-slate-500">
                <TypingIndicator />
              </p>
            )}

            {aiAssistResult.status === 'success' && (
              <>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                    {aiAssistResult.action === 'rewrite'
                      ? 'Rewrite Options'
                      : aiAssistResult.action === 'suggest'
                      ? 'Plot Suggestions'
                      : aiAssistResult.action === 'detect'
                      ? 'Issues Found'
                      : aiAssistResult.action === 'storyTree'
                      ? 'Story Structure'
                      : aiAssistResult.action === 'sceneBeats'
                      ? 'Scene Beats'
                      : aiAssistResult.action === 'characterArc'
                      ? 'Character Arcs'
                      : 'Result'}
                  </p>
                  
                  {/* Rewrite: Multiple options */}
                  {aiAssistResult.action === 'rewrite' && Array.isArray(aiAssistResult.output) && (
                    <div className="space-y-2">
                      {(aiAssistResult.output as string[]).map((option, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">Option {idx + 1}</p>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{option}</p>
                          <button
                            onClick={() => {
                              const range = storyEditorRef.current?.getSelectedRange();
                              if (range && range.length > 0) {
                                storyEditorRef.current?.replaceSelectedText(option);
                              } else {
                                storyEditorRef.current?.insertTextAtCursor(option);
                              }
                              setAiAssistResult(null);
                            }}
                            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Use this version
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Suggest: Structured suggestions */}
                  {aiAssistResult.action === 'suggest' && Array.isArray(aiAssistResult.output) && (
                    <div className="space-y-2">
                      {aiAssistResult.output.map((suggestion, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            {typeof suggestion === 'object' && 'title' in suggestion ? suggestion.title : `Suggestion ${idx + 1}`}
                          </p>
                          <p className="text-sm text-slate-700">
                            {typeof suggestion === 'object' && 'description' in suggestion ? suggestion.description : String(suggestion)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Detect: Structured conflicts */}
                  {aiAssistResult.action === 'detect' && Array.isArray(aiAssistResult.output) && (
                    <div className="space-y-2">
                      {aiAssistResult.output.length === 0 ? (
                        <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3">✅ No issues found!</p>
                      ) : (
                        aiAssistResult.output.map((issue, idx) => {
                          const severity = typeof issue === 'object' && 'severity' in issue ? issue.severity : 'medium';
                          const bgColor = severity === 'high' ? 'bg-red-50 border-red-200' : severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
                          const textColor = severity === 'high' ? 'text-red-800' : severity === 'medium' ? 'text-yellow-800' : 'text-blue-800';
                          return (
                            <div key={idx} className={`border rounded-lg p-3 ${bgColor}`}>
                              <div className="flex items-start gap-2">
                                <span className={`text-xs font-semibold uppercase ${textColor}`}>
                                  {typeof issue === 'object' && 'type' in issue ? issue.type : 'issue'}
                                </span>
                                <span className={`text-xs ${textColor}`}>
                                  ({severity})
                                </span>
                              </div>
                              <p className={`text-sm mt-1 ${textColor}`}>
                                {typeof issue === 'object' && 'message' in issue ? issue.message : String(issue)}
                              </p>
                              <button
                                onClick={() => {
                                  const message =
                                    typeof issue === 'object' && 'message' in issue
                                      ? issue.message
                                      : String(issue);
                                  handleAddComment({ text: `AI issue (${severity}): ${message}` });
                                }}
                                className="mt-2 text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                              >
                                Create comment from this issue
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Story tree visualization */}
                  {aiAssistResult.action === 'storyTree' &&
                    Array.isArray(aiAssistResult.output) &&
                    (aiAssistResult.output as StoryTreeAct[]).length > 0 && (
                      <div className="space-y-3">
                        {(aiAssistResult.output as StoryTreeAct[]).map((act, index) => (
                          <div key={index} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-900">{act.act}</p>
                              <span className="text-xs text-slate-500">Beats: {act.beats?.length ?? 0}</span>
                            </div>
                            <p className="text-sm text-slate-700">{act.summary}</p>
                            {act.beats && act.beats.length > 0 && (
                              <div className="space-y-1">
                                {act.beats.map((beat, beatIdx) => (
                                  <div
                                    key={beatIdx}
                                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                                  >
                                    <p className="font-semibold text-slate-800">{beat.title}</p>
                                    <p>Conflict: {beat.conflict}</p>
                                    <p>Outcome: {beat.outcome}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        onClick={() => {
                                          const snippet = `${beat.title} — ${beat.outcome}`;
                                          const range = storyEditorRef.current?.getSelectedRange();
                                          if (range && range.length > 0) {
                                            storyEditorRef.current?.replaceSelectedText(snippet);
                                          } else {
                                            storyEditorRef.current?.insertTextAtCursor(`\n${snippet}\n`);
                                          }
                                        }}
                                        className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium"
                                      >
                                        Insert beat into draft
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleAddComment({
                                            text: `Story beat: ${beat.title}\nConflict: ${beat.conflict}\nOutcome: ${beat.outcome}`
                                          })
                                        }
                                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                                      >
                                        Create comment
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Scene beats */}
                  {aiAssistResult.action === 'sceneBeats' &&
                    Array.isArray(aiAssistResult.output) &&
                    (aiAssistResult.output as SceneBeatSummary[]).length > 0 && (
                      <div className="space-y-2">
                        {(aiAssistResult.output as SceneBeatSummary[]).map((beat, idx) => (
                          <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1">
                            <div className="flex items-center justify-between text-slate-900">
                              <p className="font-semibold text-sm">{beat.beat}</p>
                              <span className="text-[11px] text-slate-500">Tension: {beat.tension}</span>
                            </div>
                            <p>Pacing: {beat.pacing}</p>
                            <p>Recommendation: {beat.recommendation}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  const snippet = `${beat.beat} — ${beat.recommendation}`;
                                  const range = storyEditorRef.current?.getSelectedRange();
                                  if (range && range.length > 0) {
                                    storyEditorRef.current?.replaceSelectedText(snippet);
                                  } else {
                                    storyEditorRef.current?.insertTextAtCursor(`\n${snippet}\n`);
                                  }
                                }}
                                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium"
                              >
                                Insert beat into draft
                              </button>
                              <button
                                onClick={() =>
                                  handleAddComment({
                                    text: `Scene beat: ${beat.beat}\nTension: ${beat.tension}\nPacing: ${beat.pacing}\nRecommendation: ${beat.recommendation}`
                                  })
                                }
                                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                              >
                                Create comment
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Character arcs */}
                  {aiAssistResult.action === 'characterArc' &&
                    Array.isArray(aiAssistResult.output) &&
                    (aiAssistResult.output as CharacterArcSummary[]).length > 0 && (
                      <div className="space-y-2">
                        {(aiAssistResult.output as CharacterArcSummary[]).map((arc, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{arc.character}</p>
                            <p>Goal: {arc.goal}</p>
                            <p>Obstacle: {arc.obstacle}</p>
                            <p>Emotional state: {arc.emotionalState}</p>
                            <p className="text-indigo-700 font-semibold">Next step: {arc.nextStep}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  const snippet = `${arc.character} — next step: ${arc.nextStep}`;
                                  const range = storyEditorRef.current?.getSelectedRange();
                                  if (range && range.length > 0) {
                                    storyEditorRef.current?.replaceSelectedText(snippet);
                                  } else {
                                    storyEditorRef.current?.insertTextAtCursor(`\n${snippet}\n`);
                                  }
                                }}
                                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium"
                              >
                                Continue from this state
                              </button>
                              <button
                                onClick={() =>
                                  handleAddComment({
                                    text: `Character arc (${arc.character}):\nGoal: ${arc.goal}\nObstacle: ${arc.obstacle}\nEmotion: ${arc.emotionalState}\nNext: ${arc.nextStep}`
                                  })
                                }
                                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                              >
                                Create comment
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  
                  {/* Tone: Single string */}
                  {(aiAssistResult.action === 'tone' || (typeof aiAssistResult.output === 'string')) && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap max-h-48 overflow-auto">
                      {typeof aiAssistResult.output === 'string' ? aiAssistResult.output : String(aiAssistResult.output)}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                    {aiAssistResult.tokens && (
                      <span>tokens: {aiAssistResult.tokens}</span>
                    )}
                    {aiAssistResult.charactersUsed && aiAssistResult.charactersUsed > 0 && (
                      <span className="flex items-center gap-1">
                        👤 {aiAssistResult.charactersUsed} {aiAssistResult.charactersUsed === 1 ? 'character' : 'characters'}
                      </span>
                    )}
                    {aiAssistResult.styleApplied && (
                      <span className="flex items-center gap-1">
                        ✍️ {aiAssistResult.styleApplied}
                      </span>
                    )}
                    {aiAssistResult.knowledgeUsed && aiAssistResult.knowledgeUsed.length > 0 && (
                      <span className="flex items-center gap-1">
                        📚 {aiAssistResult.knowledgeUsed.length} {aiAssistResult.knowledgeUsed.length === 1 ? 'entry' : 'entries'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {(aiAssistResult.action === 'tone' || typeof aiAssistResult.output === 'string') && (
                    <>
                      <PrimaryButton onClick={handleInsertAiOutput} className="flex-1">
                        Insert
                      </PrimaryButton>
                      <SecondaryButton onClick={handleCopyAiOutput} className="flex-1">
                        Copy
                      </SecondaryButton>
                    </>
                  )}
                  <button
                    onClick={() => setAiAssistResult(null)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}

            {aiAssistResult.status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {aiAssistResult.error}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {showHistory && (
        <HistoryDrawer
          history={history}
          onClose={() => setShowHistory(false)}
          onLoad={(snapshot) => {
            loadSnapshot(snapshot);
            setShowHistory(false);
          }}
          onRemove={removeSnapshot}
          onRename={renameSnapshot}
          currentContent={currentDraftContent}
        />
      )}

      {showOutlineMap && outlineMapData && (
        <OutlineMapDrawer
          open={showOutlineMap}
          data={outlineMapData}
          onClose={() => setShowOutlineMap(false)}
          onSendToDraft={(chapters, mode) => {
            mergeOutlineIntoDraft(chapters, mode);
            setShowOutlineMap(false);
          }}
        />
      )}

      <PlanDrawer open={showPlanDrawer} onClose={() => setShowPlanDrawer(false)}>
        <SubscriptionBenefits />
      </PlanDrawer>

      {showReadingPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reading preview</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {chapters.length > 0 ? `${chapters.length} chapter${chapters.length > 1 ? 's' : ''}` : 'Draft'}
                </h3>
    </div>
              <button
                onClick={() => setShowReadingPreview(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                aria-label="Close preview"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-5">
              {chapters.length > 0
                ? chapters.map((chapter, index) => (
                    <article key={`${chapter.title}-${index}`} className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Chapter {index + 1}</p>
                          <h4 className="text-lg font-semibold text-slate-900">{chapter.title}</h4>
                        </div>
                        <span className="text-xs text-slate-500">{chapterWordCount(chapter.content)} words</span>
                      </div>
                      {chapter.content
                        .split(/\n{2,}/)
                        .map((block, blockIndex) => (
                          <p key={blockIndex} className="text-base leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {block.trim()}
                          </p>
                        ))}
                      <div className="h-px bg-slate-100" />
                    </article>
                  ))
                : paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-base leading-relaxed text-slate-800 whitespace-pre-wrap"
                    >
                      {paragraph}
                    </p>
                  ))}
            </div>
          </div>
        </div>
      )}

      <PublishModal
        open={showPublishModal}
        isExporting={isExporting}
        onClose={() => setShowPublishModal(false)}
        onExportMarkdown={() => {
          handleDownloadMarkdown();
          setShowPublishModal(false);
        }}
        onExportPdf={() => {
          handleDownloadPdf();
          setShowPublishModal(false);
        }}
        onExportEpub={handleDownloadEpub}
        onExportAudio={handleDownloadAudioScript}
      />

    <LoginModal
      open={showLoginModal}
      onClose={() => {
        setShowLoginModal(false);
        // 移除自动跳转，让用户继续停留在当前页面
      }}
      onSuccess={handleLoginSuccess}
    />
    </>
  );
}



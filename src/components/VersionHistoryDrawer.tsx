import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getProjectVersions, createProjectVersion, restoreProjectVersion, deleteProjectVersion, createBranch, mergeBranches, type ProjectVersion } from '../api/projectApi';
import { GlassCard } from './ui/GlassCard';
import { PrimaryButton } from './ui/PrimaryButton';
import { SecondaryButton } from './ui/SecondaryButton';
import { useCapabilities } from '../hooks/useCapabilities';
import UpgradePrompt from './UpgradePrompt';
import type { SubscriptionTier } from '../types/subscription';

interface VersionHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  currentContent: string;
  currentChapters: Array<{ title: string; content: string }>;
  onRestore?: (content: string, chapters: Array<{ title: string; content: string }>) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  year: 'numeric'
});

// Simple diff calculation (word-level)
const calculateDiff = (oldText: string, newText: string): { added: number; removed: number; changed: boolean } => {
  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);
  
  if (oldWords.length === 0 && newWords.length === 0) {
    return { added: 0, removed: 0, changed: false };
  }
  
  if (oldWords.length === 0) {
    return { added: newWords.length, removed: 0, changed: true };
  }
  
  if (newWords.length === 0) {
    return { added: 0, removed: oldWords.length, changed: true };
  }
  
  // Simple comparison: count differences
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);
  
  let added = 0;
  let removed = 0;
  
  newWords.forEach(word => {
    if (!oldSet.has(word)) added++;
  });
  
  oldWords.forEach(word => {
    if (!newSet.has(word)) removed++;
  });
  
  return {
    added,
    removed,
    changed: added > 0 || removed > 0
  };
};

// Simple diff visualization (sentence-level)
const visualizeDiff = (oldText: string, newText: string): Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }> => {
  const oldSentences = oldText.split(/([.!?]+\s+)/).filter(s => s.trim().length > 0);
  const newSentences = newText.split(/([.!?]+\s+)/).filter(s => s.trim().length > 0);
  
  const result: Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }> = [];
  const maxLen = Math.max(oldSentences.length, newSentences.length);
  
  for (let i = 0; i < maxLen; i++) {
    const oldSent = oldSentences[i] || '';
    const newSent = newSentences[i] || '';
    
    if (!oldSent && newSent) {
      result.push({ type: 'added', text: newSent });
    } else if (oldSent && !newSent) {
      result.push({ type: 'removed', text: oldSent });
    } else if (oldSent === newSent) {
      result.push({ type: 'unchanged', text: oldSent });
    } else {
      // Different sentences
      result.push({ type: 'removed', text: oldSent });
      result.push({ type: 'added', text: newSent });
    }
  }
  
  return result;
};

export default function VersionHistoryDrawer({
  open,
  onClose,
  projectId,
  currentContent,
  currentChapters,
  onRestore
}: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchLabel, setBranchLabel] = useState('');
  const [showMergeForm, setShowMergeForm] = useState(false);
  const [mergeSourceBranch, setMergeSourceBranch] = useState('');
  const [mergeTargetBranch, setMergeTargetBranch] = useState('');
  const [mergeStrategy, setMergeStrategy] = useState<'theirs' | 'ours' | 'both'>('both');
  const [showSplitDiff, setShowSplitDiff] = useState(false);
  const [blendStrategy, setBlendStrategy] = useState<'ours' | 'theirs' | 'both'>('ours');
  const [isCopyingBlend, setIsCopyingBlend] = useState(false);
  const { hasFeature, tier } = useCapabilities();
  const currentTier = (tier || 'free') as SubscriptionTier;
  const canUseVersionHistory = hasFeature('versionHistory');

  // Use ref to track selected version ID to avoid dependency loop
  const selectedVersionIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    selectedVersionIdRef.current = selectedVersion?.id || null;
    setShowDiff(false);
    setShowSplitDiff(false);
    setBlendStrategy('ours');
  }, [selectedVersion]);

  const loadVersions = useCallback(async () => {
    if (!projectId) return;
    console.log('[VersionHistory] loadVersions called');
    setLoading(true);
    try {
      const v = await getProjectVersions(projectId);
      // Preserve current selection - do NOT auto-select
      const currentSelectedId = selectedVersionIdRef.current;
      console.log('[VersionHistory] Current selected ID:', currentSelectedId);
      
      // Sort versions by createdAt descending (newest first) to ensure consistent order
      const sortedVersions = [...v].sort((a, b) => b.createdAt - a.createdAt);
      setVersions(sortedVersions);
      
      // Only restore selection if the selected version still exists
      // Do NOT auto-select a new version if current selection is cleared
      if (currentSelectedId) {
        const stillExists = sortedVersions.find(version => version.id === currentSelectedId);
        if (stillExists) {
          // Keep the same version selected (use the version from sorted array)
          console.log('[VersionHistory] Restoring selection for existing version:', currentSelectedId);
          setSelectedVersion(stillExists);
        } else {
          // Selected version was deleted, clear selection (don't auto-select another)
          console.log('[VersionHistory] Selected version deleted, clearing selection');
          setSelectedVersion(null);
          setShowDiff(false);
        }
      } else {
        console.log('[VersionHistory] No version selected, NOT auto-selecting');
      }
      // If no version was selected before, do NOT auto-select any version
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]); // Remove selectedVersion from dependencies to prevent loop

  useEffect(() => {
    if (open && projectId) {
      // Reset selection when drawer opens - do NOT auto-select
      setSelectedVersion(null);
      setShowDiff(false);
      selectedVersionIdRef.current = null;
      loadVersions();
    } else if (!open) {
      // Clear selection when drawer closes
      setSelectedVersion(null);
      setShowDiff(false);
      setShowSplitDiff(false);
      setBlendStrategy('ours');
      selectedVersionIdRef.current = null;
    }
  }, [open, projectId]); // Remove loadVersions from dependencies to prevent re-triggering
  
  // CRITICAL: Prevent any automatic version selection
  // Only allow manual user selection via click events
  // Do NOT auto-select versions when versions array changes
  // Do NOT auto-select when currentContent changes (every 3 seconds from auto-save)

  const handleCreateVersion = async () => {
    if (!projectId) return;
    setCreatingVersion(true);
    try {
      await createProjectVersion(projectId, versionLabel || undefined);
      setVersionLabel('');
      setShowCreateForm(false);
      await loadVersions();
    } catch (error) {
      console.error('Failed to create version:', error);
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!projectId || !selectedVersion || !branchName.trim()) return;
    try {
      await createBranch(projectId, selectedVersion.id, branchName.trim(), branchLabel.trim() || undefined);
      setBranchName('');
      setBranchLabel('');
      setShowBranchForm(false);
      await loadVersions();
    } catch (error) {
      console.error('Failed to create branch:', error);
      alert(error instanceof Error ? error.message : 'Failed to create branch');
    }
  };

  const handleMergeBranches = async () => {
    if (!projectId || !mergeSourceBranch || !mergeTargetBranch) return;
    if (!confirm(`Merge branch "${mergeSourceBranch}" into "${mergeTargetBranch}"?`)) return;
    
    try {
      const result = await mergeBranches(projectId, mergeSourceBranch, mergeTargetBranch, mergeStrategy);
      setMergeSourceBranch('');
      setMergeTargetBranch('');
      setShowMergeForm(false);
      await loadVersions();
      if (onRestore) {
        // Update the project with merged content
        onRestore(result.project.content, result.project.chapters);
      }
    } catch (error) {
      console.error('Failed to merge branches:', error);
      alert(error instanceof Error ? error.message : 'Failed to merge branches');
    }
  };

  // Get unique branches from versions
  const branches = useMemo(() => {
    const branchSet = new Set<string>();
    versions.forEach(v => {
      if (v.branch) {
        branchSet.add(v.branch);
      }
    });
    return Array.from(branchSet).sort();
  }, [versions]);

  // Group versions by branch
  const versionsByBranch = useMemo(() => {
    const grouped: Record<string, ProjectVersion[]> = {};
    versions.forEach(v => {
      const branch = v.branch || 'main';
      if (!grouped[branch]) {
        grouped[branch] = [];
      }
      grouped[branch].push(v);
    });
    // Sort each branch's versions by createdAt descending
    Object.keys(grouped).forEach(branch => {
      grouped[branch].sort((a, b) => b.createdAt - a.createdAt);
    });
    return grouped;
  }, [versions]);

  const handleRestore = useCallback(async (version: ProjectVersion) => {
    if (!projectId || !onRestore) return;
    if (!confirm(`Restore to this version? This will create a new version of your current work first.`)) {
      return;
    }
    
    try {
      const restored = await restoreProjectVersion(projectId, version.id);
      onRestore(restored.content, restored.chapters);
      await loadVersions();
      setSelectedVersion(null);
      setShowDiff(false);
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Failed to restore version. Please try again.');
    }
  }, [projectId, onRestore]);

  const handleDeleteVersion = useCallback(async (versionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!projectId) return;
    if (!confirm('Delete this version? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteProjectVersion(projectId, versionId);
      await loadVersions();
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(null);
        setShowDiff(false);
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
    }
  }, [projectId, selectedVersion]);

  const handleToggleVersion = useCallback((version: ProjectVersion, e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log('[VersionHistory] Manual selection:', version.id, version.label);
    setSelectedVersion(prev => {
      if (prev?.id === version.id) {
        console.log('[VersionHistory] Deselecting version');
        return null;
      } else {
        console.log('[VersionHistory] Selecting version:', version.id);
        return version;
      }
    });
    setShowDiff(false);
  }, []);

  const handleRestoreClick = useCallback((version: ProjectVersion, e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleRestore(version);
  }, [projectId, onRestore]);

  // Memoize current content to avoid recalculating on every render
  const currentFullContent = useMemo(() => {
    return currentChapters.length > 0
      ? currentChapters.map(ch => `${ch.title}\n\n${ch.content}`).join('\n\n')
      : currentContent;
  }, [currentChapters, currentContent]);

  const selectedVersionContent = useMemo(() => {
    if (!selectedVersion) return '';
    return selectedVersion.chapters.length > 0
      ? selectedVersion.chapters.map(ch => `${ch.title}\n\n${ch.content}`).join('\n\n')
      : selectedVersion.content;
  }, [selectedVersion]);

  // Use ref to track current content without triggering re-renders
  const currentFullContentRef = useRef<string>(currentFullContent);
  useEffect(() => {
    currentFullContentRef.current = currentFullContent;
  }, [currentFullContent]);

  // Memoize version diffs to avoid recalculating on every render
  // Only recalculate when versions array changes (by ID), not when content changes
  // This prevents auto-selection issues caused by frequent content updates (auto-save every 3 seconds)
  const versionDiffs = useMemo(() => {
    const diffs = new Map<string, { added: number; removed: number; changed: boolean }>();
    versions.forEach(version => {
      const versionContent = version.chapters.length > 0
        ? version.chapters.map((ch: any) => `${ch.title}\n\n${ch.content}`).join('\n\n')
        : version.content;
      // Use ref value to get latest content without triggering recalculation
      diffs.set(version.id, calculateDiff(versionContent, currentFullContentRef.current));
    });
    return diffs;
  }, [versions]); // Only depend on versions, NOT on currentFullContent to prevent auto-selection

  const selectedVersionDiffSegments = useMemo(() => {
    if (!selectedVersionContent) return [];
    return visualizeDiff(selectedVersionContent, currentFullContent);
  }, [selectedVersionContent, currentFullContent]);

  const timelineEntries = useMemo(() => {
    if (versions.length === 0) return [];
    const recent = [...versions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    return recent.map((version) => {
      const diff = versionDiffs.get(version.id);
      return {
        id: version.id,
        label: version.label || dateFormatter.format(new Date(version.createdAt)),
        createdAt: version.createdAt,
        branch: version.branch || 'main',
        isMerged: version.isMerged,
        diff
      };
    });
  }, [versions, versionDiffs]);

  const blendPreviewText = useMemo(() => {
    if (!selectedVersionContent) return '';
    if (selectedVersionDiffSegments.length === 0) {
      return currentFullContent;
    }
    let output = '';
    selectedVersionDiffSegments.forEach(segment => {
      if (segment.type === 'unchanged') {
        output += segment.text;
        return;
      }
      if (segment.type === 'added') {
        if (blendStrategy === 'ours' || blendStrategy === 'both') {
          output += segment.text;
        }
        return;
      }
      // removed segment
      if (blendStrategy === 'theirs' || blendStrategy === 'both') {
        output += segment.text;
      }
    });
    return output;
  }, [selectedVersionContent, selectedVersionDiffSegments, blendStrategy, currentFullContent]);

  const handleCopyBlendPreview = useCallback(async () => {
    if (!blendPreviewText) return;
    try {
      await navigator.clipboard.writeText(blendPreviewText);
      setIsCopyingBlend(true);
      setTimeout(() => setIsCopyingBlend(false), 1200);
    } catch (error) {
      console.error('Failed to copy merge preview', error);
      alert('无法复制合并预览，请手动复制。');
    }
  }, [blendPreviewText]);
  
  // CRITICAL: Completely remove any useEffect that might trigger auto-selection
  // Only check if selected version still exists when versions array changes (by ID only)
  const versionsIdsRef = useRef<string>('');
  const versionsIds = useMemo(() => versions.map(v => v.id).join(','), [versions]);
  
  useEffect(() => {
    const currentVersionsIds = versionsIds;
    // Only check if versions array actually changed (by ID)
    if (versionsIdsRef.current === currentVersionsIds) {
      return; // Versions haven't changed, don't do anything
    }
    const previousIds = versionsIdsRef.current;
    versionsIdsRef.current = currentVersionsIds;
    console.log('[VersionHistory] Versions changed:', { previous: previousIds, current: currentVersionsIds });
    
    // ONLY clear selection if selected version was deleted
    // NEVER auto-select any version
    if (selectedVersion) {
      const stillExists = versions.find(v => v.id === selectedVersion.id);
      if (!stillExists) {
        // Selected version was deleted, clear selection (don't auto-select another)
        console.log('[VersionHistory] Selected version no longer exists, clearing selection');
        setSelectedVersion(null);
        setShowDiff(false);
      }
      // If still exists, do nothing - keep the selection
    }
    // If no version was selected, do NOTHING - never auto-select
  }, [versionsIds]); // CRITICAL: Only depend on versionsIds, NOT on selectedVersion or currentContent

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <GlassCard
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Project Versions</h2>
            <p className="text-sm text-slate-500 mt-1">View and restore previous versions of your project</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 relative">
          {timelineEntries.length > 0 && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent timeline</p>
              <p className="text-sm text-slate-600 mt-1">Latest checkpoints across branches</p>
              <div className="mt-4 space-y-4">
                {timelineEntries.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          entry.isMerged
                            ? 'bg-emerald-500'
                            : entry.branch !== 'main'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {index < timelineEntries.length - 1 && (
                        <span className="w-px flex-1 bg-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-3 border-b border-slate-100 last:border-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                        <span className="text-[11px] text-slate-500">
                          {dateFormatter.format(new Date(entry.createdAt))}
                        </span>
                        {entry.branch !== 'main' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {entry.branch}
                          </span>
                        )}
                        {entry.isMerged && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Merged
                          </span>
                        )}
                      </div>
                      {entry.diff && entry.diff.changed && (
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="text-green-600 mr-2">+{entry.diff.added}</span>
                          <span className="text-red-600">-{entry.diff.removed}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Create snapshot
              </button>
              {hasFeature('collaboration') && (
                <>
                  <button
                    onClick={() => {
                      if (!selectedVersion) {
                        alert('Please select a version to create a branch from');
                        return;
                      }
                      setShowBranchForm(!showBranchForm);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    disabled={!selectedVersion}
                  >
                    + Create branch
                  </button>
                  {branches.length > 1 && (
                    <button
                      onClick={() => setShowMergeForm(!showMergeForm)}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      Merge branches
                    </button>
                  )}
                </>
              )}
            </div>
            {versions.length > 0 && (
              <p className="text-xs text-slate-500">{versions.length} versions saved</p>
            )}
          </div>

          {showCreateForm && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="text"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="Version label (optional, e.g., 'Before major rewrite')"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-2"
              />
              <div className="flex items-center gap-2">
                <PrimaryButton onClick={handleCreateVersion} disabled={creatingVersion} className="text-sm">
                  {creatingVersion ? 'Creating...' : 'Create Version'}
                </PrimaryButton>
                <SecondaryButton onClick={() => { setShowCreateForm(false); setVersionLabel(''); }} className="text-sm">
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading versions...</p>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500">No versions saved yet.</p>
              <p className="text-xs text-slate-400 mt-2">Versions are automatically created when you make significant changes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => {
                const versionContent = version.chapters.length > 0
                  ? version.chapters.map((ch: any) => `${ch.title}\n\n${ch.content}`).join('\n\n')
                  : version.content;
                
                const diff = versionDiffs.get(version.id) || { added: 0, removed: 0, changed: false };
                const isSelected = selectedVersion?.id === version.id;

                return (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onMouseDown={(e) => {
                      // Prevent text selection and accidental clicks
                      if ((e.target as HTMLElement).closest('button')) {
                        return;
                      }
                    }}
                    onClick={(e) => {
                      // Only select on direct click on the card, not on buttons
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
                        return;
                      }
                      handleToggleVersion(version, e);
                    }}
                    style={{ cursor: 'default' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">
                            {version.label || `Version ${dateFormatter.format(new Date(version.createdAt))}`}
                          </p>
                          {version.branch && version.branch !== 'main' && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                              {version.branch}
                            </span>
                          )}
                          {version.isMerged && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                              Merged
                            </span>
                          )}
                          {version.id === versions[0]?.id && (
                            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {dateFormatter.format(new Date(version.createdAt))}
                        </p>
                        {diff.changed && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-green-600">+{diff.added} words</span>
                            <span className="text-red-600">-{diff.removed} words</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVersion(version, e);
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          {isSelected ? 'Hide' : 'View'}
                        </button>
                        {version.id !== versions[0]?.id && onRestore && (
                          <button
                            onClick={(e) => handleRestoreClick(version, e)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                          >
                            Restore
                          </button>
                        )}
                        {hasFeature('collaboration') && !version.isMerged && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersion(version);
                              setShowBranchForm(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50"
                          >
                            Branch
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteVersion(version.id, e)}
                          className="text-xs text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDiff(!showDiff);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            {showDiff ? '隐藏 Diff' : '显示 Diff'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDiff(true);
                              setShowSplitDiff(!showSplitDiff);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            {showSplitDiff ? '关闭分屏对比' : '分屏对比'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDiff(true);
                            }}
                            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            生成合并预览
                          </button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-auto">
                          <p className="text-xs text-slate-500 mb-2">Content preview:</p>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">
                            {versionContent.slice(0, 500)}
                            {versionContent.length > 500 ? '...' : ''}
                          </p>
                        </div>
                        {showSplitDiff && (
                          <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
                            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                              <p className="text-slate-500 font-semibold mb-2">选中版本</p>
                              <div className="max-h-56 overflow-auto whitespace-pre-wrap text-slate-700">{selectedVersionContent}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                              <p className="text-slate-500 font-semibold mb-2">当前工作区</p>
                              <div className="max-h-56 overflow-auto whitespace-pre-wrap text-slate-700">{currentFullContent}</div>
                            </div>
                          </div>
                        )}
                        {showDiff && diff.changed && (
                          <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs max-h-64 overflow-auto">
                            <p className="text-slate-500 mb-2 font-semibold">Visual diff:</p>
                            <div className="space-y-1 font-mono text-xs">
                              {selectedVersionDiffSegments.slice(0, 20).map((item, idx) => {
                                if (item.type === 'unchanged') {
                                  return (
                                    <p key={idx} className="text-slate-600 whitespace-pre-wrap">
                                      {item.text}
                                    </p>
                                  );
                                } else if (item.type === 'removed') {
                                  return (
                                    <p key={idx} className="text-red-600 bg-red-50 line-through whitespace-pre-wrap">
                                      - {item.text}
                                    </p>
                                  );
                                } else {
                                  return (
                                    <p key={idx} className="text-green-600 bg-green-50 whitespace-pre-wrap">
                                      + {item.text}
                                    </p>
                                  );
                                }
                              })}
                              {selectedVersionDiffSegments.length > 20 && (
                                <p className="text-slate-400 italic">...（仅展示前 20 处改动）</p>
                              )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-slate-500 mb-1">Summary:</p>
                              <div className="space-y-1">
                                <p className="text-green-600">+ {diff.added} words added</p>
                                <p className="text-red-600">- {diff.removed} words removed</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-slate-500 font-semibold text-xs">合并预览（无需离开编辑器）</span>
                                <div className="flex items-center gap-2 text-xs">
                                  {(['ours', 'both', 'theirs'] as const).map((strategy) => (
                                    <button
                                      key={strategy}
                                      onClick={() => setBlendStrategy(strategy)}
                                      className={`px-3 py-1.5 rounded-full border ${
                                        blendStrategy === strategy
                                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {strategy === 'ours' && '保留当前'}
                                      {strategy === 'both' && '合并双方'}
                                      {strategy === 'theirs' && '采用版本'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white/70 p-3 max-h-48 overflow-auto whitespace-pre-wrap text-slate-700">
                                {blendPreviewText ? blendPreviewText.slice(0, 1200) : '暂无差异可合并。'}
                                {blendPreviewText.length > 1200 && '...'}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleCopyBlendPreview}
                                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                >
                                  {isCopyingBlend ? '已复制' : '复制合并预览'}
                                </button>
                                <p className="text-[11px] text-slate-500">粘贴到当前章节即可完成手动合并。</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {!canUseVersionHistory && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-4 p-4 rounded-2xl border border-slate-200 bg-white shadow-lg">
              <h3 className="text-lg font-semibold text-slate-900">Pro plan unlocks Version Timeline & Branching</h3>
              <p className="text-sm text-slate-600">
                追踪完整历史、可视化 diff、分支合并与合并预览属于 Pro/Unlimited。升级即可启用 Git-like 创作安全网。
              </p>
              <UpgradePrompt
                currentTier={currentTier}
                requiredTier="pro"
                featureName="Version history & branching"
                variant="banner"
              />
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}


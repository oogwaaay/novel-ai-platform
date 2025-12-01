import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { KnowledgeEntry, KnowledgeCategory } from '../types/knowledge';
import { extractKnowledgeFromText } from '../api/novelApi';
import { getAllKnowledgeEntries } from '../api/contextApi';

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  character: 'Character',
  location: 'Location',
  artifact: 'Artifact',
  faction: 'Faction',
  custom: 'Custom'
};

const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  character: 'bg-rose-100 text-rose-700',
  location: 'bg-emerald-100 text-emerald-700',
  artifact: 'bg-amber-100 text-amber-700',
  faction: 'bg-sky-100 text-sky-700',
  custom: 'bg-slate-100 text-slate-600'
};

interface KnowledgeDockProps {
  entries: KnowledgeEntry[];
  onChange: (entries: KnowledgeEntry[]) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  sourceText?: string; // Optional text to extract knowledge from
  genre?: string; // Current project genre for knowledge suggestions
  currentProjectId?: string | null; // Current project ID to exclude from suggestions
}

const defaultNewEntry: KnowledgeEntry = {
  id: '',
  title: '',
  category: 'character',
  summary: '',
  details: '',
  pinned: true,
  updatedAt: Date.now()
};

export default function KnowledgeDock({ entries, onChange, isCollapsed, onToggle, sourceText, genre, currentProjectId }: KnowledgeDockProps) {
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [search, setSearch] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [suggestedKnowledge, setSuggestedKnowledge] = useState<Array<KnowledgeEntry & { sourceProjectId: string }>>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<Set<string>>(new Set());
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | KnowledgeCategory>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'title'>('recent');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = entries;
    if (selectedCategory !== 'all') {
      list = list.filter((entry) => entry.category === selectedCategory);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (entry) =>
          entry.title.toLowerCase().includes(term) ||
          entry.summary.toLowerCase().includes(term) ||
          entry.details?.toLowerCase().includes(term)
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortOrder === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return sorted;
  }, [entries, search, selectedCategory, sortOrder]);

  useEffect(() => {
    setSelectedEntryIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      entries.forEach((entry) => {
        if (prev.has(entry.id)) {
          next.add(entry.id);
        }
      });
      return next.size === prev.size ? prev : next;
    });
  }, [entries]);

  const toggleEntrySelection = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleBulkMode = () => {
    setBulkMode((prev) => {
      if (prev) {
        setSelectedEntryIds(new Set());
      }
      return !prev;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedEntryIds((prev) => {
      const visibleIds = filtered.map((entry) => entry.id);
      const everySelected = visibleIds.every((id) => prev.has(id));
      if (everySelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const applyBulkUpdate = (mutator: (entry: KnowledgeEntry) => KnowledgeEntry) => {
    if (selectedEntryIds.size === 0) return;
    const nextEntries = entries.map((entry) => (selectedEntryIds.has(entry.id) ? mutator(entry) : entry));
    onChange(nextEntries);
  };

  const handleBulkCategory = (category: KnowledgeCategory) => {
    applyBulkUpdate((entry) => ({
      ...entry,
      category,
      updatedAt: Date.now()
    }));
  };

  const handleBulkCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as KnowledgeCategory | '';
    if (!value) return;
    handleBulkCategory(value);
    event.target.value = '';
  };

  const handleBulkPin = (pinned: boolean) => {
    applyBulkUpdate((entry) => ({
      ...entry,
      pinned,
      updatedAt: Date.now()
    }));
  };

  const handleBulkDelete = () => {
    if (selectedEntryIds.size === 0) return;
    if (!confirm(`Delete ${selectedEntryIds.size} knowledge entr${selectedEntryIds.size > 1 ? 'ies' : 'y'}?`)) {
      return;
    }
    onChange(entries.filter((entry) => !selectedEntryIds.has(entry.id)));
    setSelectedEntryIds(new Set());
  };

  const selectedCount = Array.from(selectedEntryIds).filter((id) => entries.some((entry) => entry.id === id)).length;

  const handleSave = () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.summary.trim()) {
      alert('Please provide a title and summary.');
      return;
    }

    const updated: KnowledgeEntry = {
      ...editing,
      id: editing.id || crypto.randomUUID(),
      updatedAt: Date.now()
    };

    const nextEntries = entries.some((entry) => entry.id === updated.id)
      ? entries.map((entry) => (entry.id === updated.id ? updated : entry))
      : [updated, ...entries];

    onChange(nextEntries);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id));
    setSelectedEntryIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const togglePinned = (id: string) => {
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, pinned: !entry.pinned, updatedAt: Date.now() } : entry
      )
    );
  };

  const handleExtractKnowledge = async () => {
    if (!sourceText || sourceText.trim().length < 100) {
      alert('Please provide at least 100 characters of text to extract knowledge from.');
      return;
    }

    setIsExtracting(true);
    try {
      const result = await extractKnowledgeFromText(sourceText);
      
      if (result.entries && result.entries.length > 0) {
        // Convert extracted entries to KnowledgeEntry format
        const newEntries: KnowledgeEntry[] = result.entries.map(entry => ({
          id: crypto.randomUUID(),
          title: entry.title,
          category: entry.category,
          summary: entry.summary,
          details: entry.details,
          pinned: false,
          updatedAt: Date.now()
        }));

        // Merge with existing entries (avoid duplicates by title)
        const existingTitles = new Set(entries.map(e => e.title.toLowerCase()));
        const uniqueNewEntries = newEntries.filter(e => !existingTitles.has(e.title.toLowerCase()));
        
        if (uniqueNewEntries.length > 0) {
          onChange([...uniqueNewEntries, ...entries]);
          alert(`Extracted ${uniqueNewEntries.length} knowledge entr${uniqueNewEntries.length > 1 ? 'ies' : 'y'} from the text.`);
        } else {
          alert('All extracted knowledge entries already exist in your knowledge base.');
        }
      } else {
        alert('No knowledge entries could be extracted from the text.');
      }
    } catch (error: any) {
      console.error('[KnowledgeDock] Failed to extract knowledge:', error);
      alert(error.response?.data?.error || error.message || 'Failed to extract knowledge. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLoadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const result = await getAllKnowledgeEntries(genre, currentProjectId || undefined);
      setSuggestedKnowledge(result.entries);
      setSelectedSuggestionIds(new Set(result.entries.map((entry) => entry.id)));
      setShowImportModal(true);
      
      if (result.entries.length === 0) {
        alert('No knowledge entries found in other projects. Try creating some knowledge entries first.');
      }
    } catch (error: any) {
      console.error('[KnowledgeDock] Failed to load suggestions:', error);
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to load knowledge suggestions. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleToggleSuggestion = (id: string) => {
    setSelectedSuggestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllSuggestions = () => {
    setSelectedSuggestionIds(new Set(suggestedKnowledge.map((entry) => entry.id)));
  };

  const handleClearAllSuggestions = () => {
    setSelectedSuggestionIds(new Set());
  };

  const handleImportKnowledge = (entriesToImport?: Array<KnowledgeEntry & { sourceProjectId?: string }>) => {
    const selected =
      entriesToImport ||
      suggestedKnowledge.filter((entry) => selectedSuggestionIds.has(entry.id));
    if (selected.length === 0) {
      alert('Select at least one entry to import.');
      return;
    }
    // Remove sourceProjectId before adding
    const cleanedEntries = selected.map(({ sourceProjectId, ...entry }) => ({
      ...entry,
      id: crypto.randomUUID(), // Generate new IDs to avoid conflicts
      updatedAt: Date.now()
    }));

    // Merge with existing entries (avoid duplicates by title)
    const existingTitles = new Set(entries.map(e => e.title.toLowerCase()));
    const uniqueNewEntries = cleanedEntries.filter(e => !existingTitles.has(e.title.toLowerCase()));
    
    if (uniqueNewEntries.length > 0) {
      onChange([...uniqueNewEntries, ...entries]);
      setShowImportModal(false);
      setSuggestedKnowledge([]);
      setSelectedSuggestionIds(new Set());
      alert(`Imported ${uniqueNewEntries.length} knowledge entr${uniqueNewEntries.length > 1 ? 'ies' : 'y'} from other projects.`);
    } else {
      alert('All selected knowledge entries already exist in your knowledge base.');
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Knowledge Dock</p>
          <p className="text-sm text-slate-500">
            {entries.filter(e => e.pinned).length > 0 ? (
              <span className="font-semibold text-slate-700">{entries.filter(e => e.pinned).length} pinned</span>
            ) : (
              <span>{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sourceText && sourceText.trim().length >= 100 && (
            <button
              type="button"
              onClick={handleExtractKnowledge}
              disabled={isExtracting}
              className="hidden sm:flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Extract knowledge from current text"
            >
              {isExtracting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Extract</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleLoadSuggestions}
            disabled={isLoadingSuggestions}
            className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Discover knowledge from other projects"
          >
            {isLoadingSuggestions ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Loading…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Discover</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleLoadSuggestions}
            disabled={isLoadingSuggestions}
            className="sm:hidden rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Discover knowledge"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setEditing({ ...defaultNewEntry, id: '', updatedAt: Date.now() })}
            className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition"
            title="Add knowledge entry"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px]">+</span>
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={() => setEditing({ ...defaultNewEntry, id: '', updatedAt: Date.now() })}
            className="sm:hidden rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 transition"
            aria-label="Add knowledge entry"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
            aria-label={isCollapsed ? 'Expand knowledge dock' : 'Collapse knowledge dock'}
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
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-3">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Search knowledge"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-slate-200"
            />
            <div className="flex flex-wrap gap-2">
              {(['all', ...Object.keys(CATEGORY_LABELS)] as Array<'all' | KnowledgeCategory>).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    selectedCategory === category
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category === 'all' ? 'All' : CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sort by</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'recent' | 'title')}
                className="rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:ring-2 focus:ring-slate-200"
              >
                <option value="recent">Recent updates</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={handleToggleBulkMode}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                {bulkMode ? '退出批量管理' : '批量管理'}
              </button>
              {bulkMode && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                  >
                    {filtered.every((entry) => selectedEntryIds.has(entry.id)) ? '取消全选' : '全选当前筛选结果'}
                  </button>
                  <span className="text-slate-600">{selectedCount} selected</span>
                </div>
              )}
            </div>
            {bulkMode && (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">批量操作</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    defaultValue=""
                    onChange={handleBulkCategoryChange}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                    disabled={selectedCount === 0}
                  >
                    <option value="">设置分类</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleBulkPin(true)}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-50"
                  >
                    批量置顶
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkPin(false)}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-50"
                  >
                    取消置顶
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 rounded-full border border-rose-200 text-rose-600 hover:text-rose-700 disabled:opacity-50"
                  >
                    删除所选
                  </button>
                </div>
              </div>
            )}
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">No knowledge entries yet.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No matches for “{search}”.</p>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-2xl border px-3 py-2 space-y-2 transition ${
                  bulkMode && selectedEntryIds.has(entry.id)
                    ? 'border-slate-400 bg-white'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
                onClick={(e) => {
                  if (!bulkMode) return;
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('input') || target.closest('svg')) {
                    return;
                  }
                  toggleEntrySelection(entry.id);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {bulkMode && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                          checked={selectedEntryIds.has(entry.id)}
                          onChange={() => toggleEntrySelection(entry.id)}
                        />
                      </label>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${CATEGORY_COLORS[entry.category]}`}
                        >
                          {CATEGORY_LABELS[entry.category]}
                        </span>
                        {entry.pinned && <span className="text-[10px] text-slate-500">Pinned</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePinned(entry.id)}
                      className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-900"
                      title={entry.pinned ? 'Unpin from context' : 'Pin to context'}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10l4.553-4.553a1 1 0 10-1.414-1.414L13 8.586l-3.586-3.553a1 1 0 10-1.414 1.414L10 10m0 0v10m0-10H6m4 0h4"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditing(entry)}
                      className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-900"
                      title="Edit entry"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-rose-600"
                      title="Delete entry"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2m-4 0h12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{entry.summary}</p>
              </div>
            ))
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editing.id ? 'Edit entry' : 'New entry'}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                aria-label="Close dialog"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Title
                </label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
                  placeholder="e.g. Aris Thorne"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Category
                </label>
                <select
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value as KnowledgeCategory })
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Summary
                </label>
                <textarea
                  value={editing.summary}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200 min-h-[100px]"
                  placeholder="Concise description used during AI generation."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Details (optional)
                </label>
                <textarea
                  value={editing.details || ''}
                  onChange={(e) => setEditing({ ...editing, details: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200 min-h-[80px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.pinned)}
                    onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                  />
                  Pin to context (auto-inject into prompts)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Save entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center px-4 py-10 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Import knowledge from other projects</h3>
                <p className="text-sm text-slate-500">
                  Curated from your other stories with similar genres and pinned entries.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSuggestedKnowledge([]);
                  setSelectedSuggestionIds(new Set());
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isLoadingSuggestions ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading suggestions...</div>
              ) : suggestedKnowledge.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No relevant knowledge entries found yet. Create more entries to build your library.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{suggestedKnowledge.length} entries available</span>
                    <div className="flex items-center gap-3">
                      <button onClick={handleSelectAllSuggestions} className="hover:text-slate-900">
                        Select all
                      </button>
                      <button onClick={handleClearAllSuggestions} className="hover:text-slate-900">
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto space-y-3 pr-2">
                    {suggestedKnowledge.map((entry) => {
                      const checked = selectedSuggestionIds.has(entry.id);
                      return (
                        <label
                          key={entry.id}
                          className={`flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition ${
                            checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                            checked={checked}
                            onChange={() => handleToggleSuggestion(entry.id)}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                                {entry.sourceProjectId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{entry.summary}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSuggestedKnowledge([]);
                  setSelectedSuggestionIds(new Set());
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleImportKnowledge()}
                disabled={selectedSuggestionIds.size === 0 || isLoadingSuggestions}
                className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import selected ({selectedSuggestionIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


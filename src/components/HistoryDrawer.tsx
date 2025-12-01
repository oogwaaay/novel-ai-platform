import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import type { Chapter } from '../api/novelApi';

export interface DraftSnapshot {
  id: string;
  timestamp: number;
  idea: string;
  length: number;
  content: string;
  chapters: Chapter[];
  outline?: string;
  label: string;
}

interface HistoryDrawerProps {
  history: DraftSnapshot[];
  onClose: () => void;
  onLoad: (snapshot: DraftSnapshot) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  currentContent: string;
}

type DiffStatus = 'common' | 'unique';

const buildParagraphDiff = (source: string, target: string) => {
  const tokenize = (text: string) =>
    text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

  const sourceParas = tokenize(source);
  const targetParas = tokenize(target);

  const targetSet = new Set(targetParas);
  const sourceSet = new Set(sourceParas);

  const sourceDiff = sourceParas.map((text) => ({
    text,
    status: targetSet.has(text) ? ('common' as DiffStatus) : ('unique' as DiffStatus)
  }));

  const targetDiff = targetParas.map((text) => ({
    text,
    status: sourceSet.has(text) ? ('common' as DiffStatus) : ('unique' as DiffStatus)
  }));

  return { sourceDiff, targetDiff };
};

export default function HistoryDrawer({
  history,
  onClose,
  onLoad,
  onRemove,
  onRename,
  currentContent
}: HistoryDrawerProps) {
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.timestamp - a.timestamp),
    [history]
  );
  const [selectedId, setSelectedId] = useState<string | null>(sortedHistory[0]?.id || null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    if (sortedHistory.length === 0) {
      setSelectedId(null);
    } else if (!sortedHistory.some((item) => item.id === selectedId)) {
      setSelectedId(sortedHistory[0].id);
    }
  }, [sortedHistory, selectedId]);

  const selectedSnapshot = sortedHistory.find((item) => item.id === selectedId) || null;
  const { sourceDiff, targetDiff } = selectedSnapshot
    ? buildParagraphDiff(selectedSnapshot.content, currentContent)
    : { sourceDiff: [], targetDiff: [] };

  const startEditing = (id: string, currentLabel: string) => {
    setEditingId(id);
    setLabelInput(currentLabel);
  };

  const handleSave = (id: string) => {
    if (!labelInput.trim()) {
      setEditingId(null);
      return;
    }
    onRename(id, labelInput.trim());
    setEditingId(null);
  };

  const renderParagraph = (item: { text: string; status: DiffStatus }, prefix?: string) => (
    <p
      key={`${prefix}-${item.text}`}
      className={`text-sm leading-relaxed ${
        item.status === 'common'
          ? 'text-slate-700'
          : item.status === 'unique'
          ? prefix === 'snapshot'
            ? 'text-rose-600'
            : 'text-emerald-600'
          : 'text-slate-500'
      }`}
    >
      {item.status === 'unique' ? (prefix === 'snapshot' ? '- ' : '+ ') : ''}
      {item.text}
    </p>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-600">Draft History</p>
            <h3 className="text-2xl font-light text-slate-900">Local Snapshots</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            No saved drafts yet. Generate a novel to create your first snapshot.
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3 max-h-[480px] overflow-y-auto pr-2">
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-4 pl-8">
                  {sortedHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                        selectedId === item.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className={`text-xs ${selectedId === item.id ? 'text-white/80' : 'text-slate-500'}`}>
                        {format(item.timestamp, 'MMM d, HH:mm')} · {item.length} pages
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              {!selectedSnapshot ? (
                <p className="text-sm text-slate-500">Select a snapshot to view details.</p>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {format(selectedSnapshot.timestamp, 'MMM d, yyyy · HH:mm')}
                      </p>
                      {editingId === selectedSnapshot.id ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={labelInput}
                            onChange={(e) => setLabelInput(e.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-slate-100 bg-white"
                          />
                          <button
                            onClick={() => handleSave(selectedSnapshot.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-xl font-semibold text-slate-900 mt-1">{selectedSnapshot.label}</h4>
                      )}
                      <p className="text-sm text-slate-500">
                        {selectedSnapshot.length} pages · Idea: {selectedSnapshot.idea.slice(0, 60)}
                        {selectedSnapshot.idea.length > 60 ? '…' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onLoad(selectedSnapshot)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Restore snapshot
                      </button>
                      <button
                        onClick={() => startEditing(selectedSnapshot.id, selectedSnapshot.label)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => onRemove(selectedSnapshot.id)}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 max-h-[320px] overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Snapshot
                        </p>
                        <span className="text-xs text-slate-400">Paragraphs: {sourceDiff.length}</span>
                      </div>
                      {sourceDiff.length === 0 ? (
                        <p className="text-sm text-slate-500">No content recorded.</p>
                      ) : (
                        sourceDiff.map((item, idx) => (
                          <div key={`snapshot-${idx}`} className={item.status === 'unique' ? 'bg-rose-50 rounded-xl p-2' : ''}>
                            {item.status === 'unique' && (
                              <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">
                                Removed
                              </span>
                            )}
                            {renderParagraph(item, 'snapshot')}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 max-h-[320px] overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Current draft
                        </p>
                        <span className="text-xs text-slate-400">Paragraphs: {targetDiff.length}</span>
                      </div>
                      {targetDiff.length === 0 ? (
                        <p className="text-sm text-slate-500">Current draft is empty.</p>
                      ) : (
                        targetDiff.map((item, idx) => (
                          <div key={`current-${idx}`} className={item.status === 'unique' ? 'bg-emerald-50 rounded-xl p-2' : ''}>
                            {item.status === 'unique' && (
                              <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
                                Added
                              </span>
                            )}
                            {renderParagraph(item, 'current')}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



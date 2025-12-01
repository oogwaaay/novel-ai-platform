import { useState, useRef, useEffect } from 'react';
import type { Character } from '../types/character';
import CharacterRelationshipGraph from './CharacterRelationshipGraph';

interface CharacterPanelProps {
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function CharacterPanel({
  characters,
  onCharactersChange,
  isCollapsed = false,
  onToggleCollapse
}: CharacterPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [showRelationshipGraph, setShowRelationshipGraph] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createAndFocusEntry = () => {
    const newChar: Character = {
      id: `char-${Date.now()}`,
      name: '',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setEditingId(newChar.id);
    setEditingName('');
    setEditingDesc('');
    onCharactersChange([...characters, newChar]);
    // Focus after a short delay to ensure DOM is updated
    setTimeout(() => {
      inputRef.current?.focus();
      // Scroll to the new character card
      const element = document.getElementById(`character-${newChar.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleAdd = () => {
    if (isCollapsed && onToggleCollapse) {
      onToggleCollapse();
      setTimeout(() => {
        createAndFocusEntry();
      }, 0);
    } else {
      createAndFocusEntry();
    }
  };

  const handleSave = (id: string) => {
    if (!editingName.trim()) {
      // Remove if name is empty
      onCharactersChange(characters.filter(c => c.id !== id));
      setEditingId(null);
      return;
    }

    onCharactersChange(
      characters.map(c =>
        c.id === id
          ? { ...c, name: editingName.trim(), description: editingDesc.trim(), updatedAt: Date.now() }
          : c
      )
    );
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onCharactersChange(characters.filter(c => c.id !== id));
  };

  const startEditing = (char: Character) => {
    setEditingId(char.id);
    setEditingName(char.name);
    setEditingDesc(char.description);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Story characters</p>
          <p className="text-sm text-slate-500">
            {characters.length > 0 ? (
              <span className="font-semibold text-slate-700">{characters.length} active</span>
            ) : (
              <span>{characters.length} entr{characters.length === 1 ? 'y' : 'ies'}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {characters.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowRelationshipGraph(true)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition"
              title="View relationship graph"
            >
              Graph
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition"
          >
            Add
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
              aria-label={isCollapsed ? 'Expand characters' : 'Collapse characters'}
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
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {/* Empty state - only show when no characters and not editing */}
        {characters.length === 0 && !editingId && (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No characters yet</p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first character
            </button>
          </div>
        )}

        {/* Character list - show when there are characters OR when editing a new one */}
        {(characters.length > 0 || editingId) && (
          <>
            {/* Show editing form for new character if editingId doesn't match any existing character */}
            {editingId && !characters.find(c => c.id === editingId) && (
              <div
                id={`character-${editingId}`}
                className="rounded-xl border border-slate-300 shadow-md ring-2 ring-slate-100 bg-white p-4 space-y-3"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Character name</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (editingName.trim()) {
                            const newChar: Character = {
                              id: editingId,
                              name: editingName.trim(),
                              description: editingDesc.trim(),
                              createdAt: Date.now(),
                              updatedAt: Date.now()
                            };
                            onCharactersChange([newChar]);
                            setEditingId(null);
                          }
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      placeholder="e.g., Alice"
                      className="w-full text-sm font-medium text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Description <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={editingDesc}
                      onChange={e => setEditingDesc(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      placeholder="e.g., A brave detective with a mysterious past"
                      rows={3}
                      maxLength={200}
                      className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition"
                    />
                    <p className="text-xs text-slate-400 mt-1 text-right">{editingDesc.length}/200</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (editingName.trim()) {
                          const newChar: Character = {
                            id: editingId,
                            name: editingName.trim(),
                            description: editingDesc.trim(),
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                          };
                          onCharactersChange([newChar]);
                          setEditingId(null);
                        } else {
                          setEditingId(null);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {characters.map(char => {
              const isEditing = editingId === char.id;
              return (
                <div
                  key={char.id}
                  id={`character-${char.id}`}
                  className={`rounded-xl border bg-white p-4 space-y-3 transition ${
                    isEditing
                      ? 'border-slate-300 shadow-md ring-2 ring-slate-100'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Character name</label>
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSave(char.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          placeholder="e.g., Alice"
                          className="w-full text-sm font-medium text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Description <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                          value={editingDesc}
                          onChange={e => setEditingDesc(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          placeholder="e.g., A brave detective with a mysterious past"
                          rows={3}
                          maxLength={200}
                          className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition"
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">{editingDesc.length}/200</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleSave(char.id)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            if (!char.name) {
                              handleDelete(char.id);
                            } else {
                              setEditingId(null);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">{char.name || 'Unnamed character'}</h4>
                        {char.description ? (
                          <p className="text-xs text-slate-600 leading-relaxed">{char.description}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No description</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditing(char)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-100"
                          title="Edit character"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(char.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-rose-50"
                          title="Delete character"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Add new character button (when there are existing characters) */}
            {editingId === null && (
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another character
              </button>
            )}
          </>
        )}
      </div>
      )}
      
      {/* Relationship Graph Modal */}
      <CharacterRelationshipGraph
        characters={characters}
        onCharactersChange={onCharactersChange}
        open={showRelationshipGraph}
        onClose={() => setShowRelationshipGraph(false)}
      />
    </section>
  );
}


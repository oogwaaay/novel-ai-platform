import { useState, useEffect } from 'react';

interface ProjectFolderTagEditorProps {
  open: boolean;
  onClose: () => void;
  currentFolder?: string;
  currentTags?: string[];
  availableFolders: string[];
  onSave: (folder: string | undefined, tags: string[]) => void;
}

export default function ProjectFolderTagEditor({
  open,
  onClose,
  currentFolder,
  currentTags = [],
  availableFolders,
  onSave
}: ProjectFolderTagEditorProps) {
  const [folder, setFolder] = useState<string>(currentFolder || '');
  const [tags, setTags] = useState<string>(currentTags.join(', '));
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (open) {
      setFolder(currentFolder || '');
      setTags(currentTags.join(', '));
      setNewTag('');
    }
  }, [open, currentFolder, currentTags]);

  if (!open) return null;

  const handleSave = () => {
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    
    onSave(folder.trim() || undefined, tagArray);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.split(',').some((t) => t.trim() === newTag.trim())) {
      setTags(tags ? `${tags}, ${newTag.trim()}` : newTag.trim());
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== tagToRemove);
    setTags(tagArray.join(', '));
  };

  const parsedTags = tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Organize Project</h2>
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

        <div className="p-6 space-y-6">
          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Folder</label>
            <div className="flex gap-2">
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">No folder</option>
                {availableFolders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="Or type new folder name"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags separated by commas"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              
              {/* Quick add tag */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Quick add tag"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Add
                </button>
              </div>

              {/* Display current tags */}
              {parsedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-500 hover:text-blue-700"
                        aria-label={`Remove ${tag}`}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}




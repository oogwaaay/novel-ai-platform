import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../store/projectStore';
import jsPDF from 'jspdf';
import ProjectFolderTagEditor from './ProjectFolderTagEditor';

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
  onRename?: (projectId: string, newName: string) => void;
  onOpen?: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  onExportMarkdown?: (project: Project) => void;
  onExportPdf?: (project: Project) => void;
  onUpdateFolder?: (projectId: string, folder: string | undefined) => void;
  onUpdateTags?: (projectId: string, tags: string[]) => void;
  availableFolders?: string[];
  isArchived?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

export default function ProjectCard({
  project,
  onDelete,
  onRename,
  onOpen,
  onArchive,
  onExportMarkdown,
  onExportPdf,
  onUpdateFolder,
  onUpdateTags,
  availableFolders = [],
  isArchived = false
}: ProjectCardProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showFolderTagEditor, setShowFolderTagEditor] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
        setMenuPosition(null);
      }
    };

    const handleScroll = () => {
      if (showMenu) {
        setShowMenu(false);
        setMenuPosition(null);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showMenu]);

  const handleMenuToggle = () => {
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.right - 192, // 192px is menu width (w-48)
        y: rect.bottom + 4
      });
      setShowMenu(true);
    } else {
      setShowMenu(false);
      setMenuPosition(null);
    }
  };

  const wordCount = project.chapters.length > 0
    ? project.chapters.reduce((sum, ch) => sum + Math.round(ch.content.split(/\s+/).filter(Boolean).length), 0)
    : Math.round((project.content || '').split(/\s+/).filter(Boolean).length);

  const pageCount = Math.ceil(wordCount / 250);

  const buildFilenameBase = (title: string) => {
    const sanitized = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'ai-novel-draft';
  };

  const handleExportMarkdown = () => {
    if (onExportMarkdown) {
      onExportMarkdown(project);
    } else {
      const title = project.title;
      const filename = buildFilenameBase(title);
      
      let markdown = `# ${title}\n\n`;
      if (project.chapters && project.chapters.length > 0) {
        project.chapters.forEach((chapter) => {
          markdown += `## ${chapter.title}\n\n${chapter.content}\n\n`;
        });
      } else {
        markdown += project.content;
      }

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportPdf = () => {
    if (onExportPdf) {
      onExportPdf(project);
    } else {
      const title = project.title;
      const filename = buildFilenameBase(title);
      
      let content = '';
      if (project.chapters && project.chapters.length > 0) {
        content = project.chapters.map((ch) => `${ch.title}\n\n${ch.content}`).join('\n\n');
      } else {
        content = project.content;
      }

      const plainText = content
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`/g, '');

      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      doc.setFontSize(16);
      doc.text(title, 40, 40);
      
      const lines = doc.splitTextToSize(plainText, 520);
      let cursorY = 70;

      lines.forEach((line: string) => {
        if (cursorY > 760) {
          doc.addPage();
          cursorY = 60;
        }
        doc.setFontSize(11);
        doc.text(line, 40, cursorY);
        cursorY += 16;
      });

      doc.save(`${filename}.pdf`);
    }
  };

  const handleArchive = () => {
    if (onArchive && window.confirm(`Are you sure you want to ${isArchived ? 'unarchive' : 'archive'} this project?`)) {
      onArchive(project.id);
      setShowMenu(false);
    }
  };

  const handleOpen = () => {
    if (onOpen) {
      onOpen(project.id);
    } else {
      navigate(`/generator?project=${project.id}`);
    }
  };

  const handleDeleteClick = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this project?')) {
      onDelete(project.id);
    }
  };

  const handleRenameClick = () => {
    setIsEditing(true);
  };

  const handleRename = () => {
    if (editName.trim() && editName !== project.title && onRename) {
      onRename(project.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`relative bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-6 hover:bg-white hover:shadow-xl transition-all group ${isArchived ? 'opacity-60' : ''}`}>
      {isArchived && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
            Archived
          </span>
        </div>
      )}
      <div className="space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full rounded-lg border-0 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleRename}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-base font-medium text-slate-900 line-clamp-2 mb-1">
                {project.title}
              </h3>
              <div className="flex items-center gap-2 mb-1">
                {project.folder && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    📁 {project.folder}
                  </span>
                )}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        #{tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {dateFormatter.format(new Date(project.updatedAt))}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{pageCount} pages</span>
              <span>{wordCount.toLocaleString()} words</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleOpen}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100/50 rounded-lg hover:bg-slate-100 transition"
              >
                {isArchived ? 'View' : 'Continue'}
              </button>
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={handleMenuToggle}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="More options"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showMenu && menuPosition && createPortal(
                  <div
                    ref={menuRef}
                    className="fixed w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[9999]"
                    style={{
                      left: `${menuPosition.x}px`,
                      top: `${menuPosition.y}px`
                    }}
                  >
                    {onRename && (
                      <button
                        onClick={() => {
                          handleRenameClick();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Rename
                      </button>
                    )}
                    {onExportMarkdown && (
                      <button
                        onClick={() => {
                          handleExportMarkdown();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Export Markdown
                      </button>
                    )}
                    {onExportPdf && (
                      <button
                        onClick={() => {
                          handleExportPdf();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Export PDF
                      </button>
                    )}
                    {(onUpdateFolder || onUpdateTags) && (
                      <button
                        onClick={() => {
                          setShowFolderTagEditor(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Organize
                      </button>
                    )}
                    {onArchive && (
                      <button
                        onClick={handleArchive}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        {isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                    )}
                    {onDelete && (
                      <>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => {
                            handleDeleteClick();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {showFolderTagEditor && (onUpdateFolder || onUpdateTags) && (
        <ProjectFolderTagEditor
          open={showFolderTagEditor}
          onClose={() => setShowFolderTagEditor(false)}
          currentFolder={project.folder}
          currentTags={project.tags}
          availableFolders={availableFolders}
          onSave={(folder, tags) => {
            if (onUpdateFolder) {
              onUpdateFolder(project.id, folder);
            }
            if (onUpdateTags) {
              onUpdateTags(project.id, tags);
            }
          }}
        />
      )}
    </div>
  );
}


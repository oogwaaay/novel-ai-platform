import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactQuill, { type Range, type UnprivilegedEditor } from 'react-quill';
import type { DeltaStatic, Sources } from 'quill';
import 'react-quill/dist/quill.snow.css';
import { continueNovel } from '../api/novelApi';
import type { KnowledgeEntry } from '../types/knowledge';
import type { WritingStyle } from '../types/style';

export interface StoryEditorRef {
  insertTextAtCursor: (text: string) => void;
  replaceSelectedText: (text: string) => void;
  getSelectedRange: () => { index: number; length: number } | null;
  highlightRange: (range: { start: number; length: number }) => void;
  getSelectionViewportPosition: (range: { index: number; length: number }) => { x: number; y: number } | null;
}

interface LockedRange {
  start: number;
  end: number;
  userName?: string;
}

interface StoryEditorProps {
  initialContent?: string;
  context?: string; // Previous chapters for context
  onContentChange?: (content: string, delta: DeltaStatic, source: Sources) => void;
  characters?: Array<{ name: string; description: string }>; // Character information for consistency
  style?: WritingStyle | null; // Writing style for consistency
  onContinueComplete?: (newContent: string, addedWords: number, contextMetadata?: import('../api/novelApi').ContextMetadata) => void; // Callback when continue is complete, with new content and word count
  compact?: boolean; // Compact mode for outline expansion
  language?: string; // Preferred language instruction
  variant?: 'default' | 'focus';
  knowledge?: KnowledgeEntry[];
  onSelectionChange?: (payload: { text: string; position: { x: number; y: number }; range?: { index: number; length: number } } | null) => void;
  lockedRanges?: LockedRange[];
  onLockedSelectionAttempt?: (lock: LockedRange) => void;
  enableGhostText?: boolean; // Enable Ghost Text suggestions
}

const StoryEditor = forwardRef<StoryEditorRef, StoryEditorProps>(({
  initialContent = '',
  context = '',
  onContentChange,
  characters = [],
  style,
  onContinueComplete,
  compact = false,
  language,
  variant = 'default',
  knowledge,
  onSelectionChange,
  lockedRanges = [],
  onLockedSelectionAttempt,
  enableGhostText = false
}, ref) => {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [highlightRange, setHighlightRange] = useState<{ start: number; length: number } | null>(null);
  // Ghost Text state
  const [ghostText, setGhostText] = useState<string>('');
  const [ghostTextRange, setGhostTextRange] = useState<{ start: number; length: number } | null>(null);
  const [isGeneratingGhostText, setIsGeneratingGhostText] = useState(false);
  const quillRef = useRef<ReactQuill | null>(null);
  const ghostTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const computeViewportPosition = (range: { index: number; length: number }) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return null;
    const bounds = quill.getBounds(range.index, range.length);
    const rootRect = quill.root.getBoundingClientRect();
    const x = rootRect.left + bounds.left + bounds.width / 2;
    const y = rootRect.top + bounds.top;
    return { x, y };
  };

  useImperativeHandle(ref, () => ({
    insertTextAtCursor: (text: string) => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, text, 'user');
        quill.setSelection(range.index + text.length, 0);
      }
    },
    replaceSelectedText: (text: string) => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const range = quill.getSelection(true);
      if (range && range.length > 0) {
        quill.deleteText(range.index, range.length, 'user');
        quill.insertText(range.index, text, 'user');
        quill.setSelection(range.index + text.length, 0);
      }
    },
    getSelectedRange: () => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return null;
      const range = quill.getSelection(true);
      if (!range) return null;
      return { index: range.index, length: range.length };
    },
    highlightRange: (range: { start: number; length: number }) => {
      setHighlightRange(range);
    },
    getSelectionViewportPosition: (range: { index: number; length: number }) => {
      return computeViewportPosition(range);
    }
  }));

  useEffect(() => {
    setIsMounted(true);
    setContent(initialContent);
  }, [initialContent]);

  // Handle keyboard events to accept ghost text with Tab
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && ghostText) {
        event.preventDefault();
        acceptGhostText();
      } else if (event.key === 'Escape' && ghostText) {
        event.preventDefault();
        clearGhostText();
      }
    };

    const quillContainer = document.querySelector('.ql-container');
    if (quillContainer) {
      quillContainer.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (quillContainer) {
        quillContainer.removeEventListener('keydown', handleKeyDown);
      }
      if (ghostTextTimeoutRef.current) {
        clearTimeout(ghostTextTimeoutRef.current);
      }
    };
  }, [ghostText, acceptGhostText, clearGhostText]);

  const handleSelectionChange = (range: Range | null, source: 'user' | 'api' | 'silent', _editor: UnprivilegedEditor) => {
    console.log('[StoryEditor] handleSelectionChange called:', { 
      hasRange: !!range, 
      rangeLength: range?.length,
      rangeIndex: range?.index,
      source,
      hasOnSelectionChange: !!onSelectionChange,
      hasQuillRef: !!quillRef.current
    });
    
    if (!onSelectionChange) {
      console.log('[StoryEditor] No onSelectionChange callback provided');
      return;
    }
    
    const quill = quillRef.current?.getEditor();
    if (!quill) {
      console.log('[StoryEditor] No quill editor instance');
      return;
    }

    if (range && range.length > 0) {
      const blocked = lockedRanges.find(
        (lock) =>
          Math.max(lock.start, range.index) <
          Math.min(lock.end, range.index + range.length)
      );
      if (blocked) {
        console.warn('[StoryEditor] Selection blocked by lock', blocked);
        onLockedSelectionAttempt?.(blocked);
        if (quill) {
          quill.setSelection(range.index + range.length, 0, 'silent');
        }
        onSelectionChange(null);
        return;
      }
      const text = quill.getText(range.index, range.length).trim();
      console.log('[StoryEditor] Extracted text:', { 
        text: text.substring(0, 100), 
        fullLength: text.length,
        trimmedLength: text.trim().length
      });
      
      if (!text || text.length === 0) {
        console.log('[StoryEditor] Text is empty, clearing selection');
        onSelectionChange(null);
        return;
      }
      
      try {
        const pos = computeViewportPosition({ index: range.index, length: range.length });
        if (!pos) {
          console.log('[StoryEditor] Unable to compute viewport position');
          onSelectionChange(null);
          return;
        }

        console.log('[StoryEditor] Calculated position:', pos);
        console.log('[StoryEditor] Calling onSelectionChange NOW');

        onSelectionChange({
          text,
          position: pos,
          range: { index: range.index, length: range.length }
        });

        console.log('[StoryEditor] onSelectionChange called successfully');
      } catch (error) {
        console.error('[StoryEditor] Error calculating position:', error);
      }
    } else {
      console.log('[StoryEditor] No range or range.length is 0, clearing selection');
      onSelectionChange(null);
    }
  };

  useEffect(() => {
    if (!highlightRange) return;
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const totalLength = quill.getLength();
    const safeStart = Math.max(0, Math.min(highlightRange.start, totalLength - 1));
    const safeLength = Math.max(0, Math.min(highlightRange.length, totalLength - safeStart));

    if (safeLength <= 0) {
      setHighlightRange(null);
      return;
    }

    quill.formatText(safeStart, safeLength, { background: 'rgba(34, 197, 94, 0.15)' });

    const timeout = window.setTimeout(() => {
      quill.formatText(safeStart, safeLength, { background: false });
      setHighlightRange(null);
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [highlightRange]);

  // Generate Ghost Text suggestions
  const generateGhostText = async (text: string) => {
    if (!enableGhostText || text.trim().length < 20) return;
    
    setIsGeneratingGhostText(true);
    try {
      // Simple implementation - in real app, this would call an AI API
      // For now, we'll generate a random suggestion
      const suggestions = [
        " that would change the course of their lives forever.",
        " as the sun began to set over the horizon.",
        " with a sense of purpose they hadn't felt in years.",
        " despite the challenges that lay ahead.",
        " while memories of the past flooded their mind."
      ];
      const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      
      // Set ghost text after a short delay to simulate AI generation
      setTimeout(() => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const cursorPos = quill.getSelection()?.index || text.length;
          setGhostText(randomSuggestion);
          setGhostTextRange({ start: cursorPos, length: randomSuggestion.length });
        }
        setIsGeneratingGhostText(false);
      }, 500);
    } catch (error) {
      console.error('Failed to generate ghost text:', error);
      setIsGeneratingGhostText(false);
    }
  };

  // Accept Ghost Text suggestion
  const acceptGhostText = () => {
    if (!ghostText || !ghostTextRange) return;
    
    const quill = quillRef.current?.getEditor();
    if (quill) {
      quill.insertText(ghostTextRange.start, ghostText, 'user');
      setGhostText('');
      setGhostTextRange(null);
    }
  };

  // Clear Ghost Text suggestion
  const clearGhostText = () => {
    setGhostText('');
    setGhostTextRange(null);
  };

  const handleContentChange = (newContent: string, delta: DeltaStatic, source: Sources) => {
    setContent(newContent);
    if (onContentChange) {
      onContentChange(newContent, delta, source);
    }
    
    // Clear ghost text when user types
    clearGhostText();
    
    // Generate new ghost text after a delay
    if (enableGhostText && source === 'user') {
      if (ghostTextTimeoutRef.current) {
        clearTimeout(ghostTextTimeoutRef.current);
      }
      ghostTextTimeoutRef.current = setTimeout(() => {
        generateGhostText(newContent);
      }, 1000);
    }
  };

  const handleContinue = async () => {
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      // Build context: previous chapters + last 1000 words of current content
      const currentWords = content.split(/\s+/);
      const recentContent = currentWords.slice(-1000).join(' ');
      
      let fullContext = recentContent;
      if (context) {
        // Use last 1500 words of previous chapters + recent content
        const contextWords = context.split(/\s+/);
        const recentContext = contextWords.slice(-1500).join(' ');
        fullContext = `${recentContext}\n\n${recentContent}`;
      }
      
      const continued = await continueNovel(
        fullContext,
        'Continue the story naturally from where it left off',
        characters.length > 0 ? characters : undefined,
        style,
        language,
        knowledge
      );
      
      // Append with proper spacing
      const lastChar = content.trim().slice(-1);
      const needsSpace = !['.', '!', '?', '\n'].includes(lastChar);
      const appendedText = continued.story.trim();
      const connector = needsSpace ? '\n\n' : ' ';
      const newContent = content + connector + appendedText;
      
      // Calculate added words
      const originalWords = content.trim().split(/\s+/).filter(w => w.length > 0).length;
      const newWords = newContent.trim().split(/\s+/).filter(w => w.length > 0).length;
      const addedWords = newWords - originalWords;
      
      setContent(newContent);
      setHighlightRange({
        start: newContent.length - appendedText.length,
        length: appendedText.length
      });
      
      // Notify parent that continue is complete (for auto-switching to editor mode)
      if (onContinueComplete) {
        onContinueComplete(appendedText, addedWords, continued.contextMetadata);
      }
      
      // Scroll to bottom to show new content (if in compact mode)
      if (compact) {
        setTimeout(() => {
          const editor = document.querySelector('.story-editor-compact .ql-editor');
          if (editor) {
            editor.scrollTop = editor.scrollHeight;
          }
        }, 100);
      }
    } catch (error: any) {
      console.error('Failed to continue writing:', error);
      // Handle insufficient points error
      if (error.response?.status === 402) {
        // Show points exhausted modal (this would be implemented in the parent component)
        alert('积分不足！升级到 Pro 版获取无限积分，或完成任务赚取更多积分。');
      } else {
        alert('Failed to continue writing. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFocus = variant === 'focus';

  return (
    <div className={`story-editor ${compact ? 'story-editor-compact' : ''} ${isFocus ? 'story-editor-focus' : ''} space-y-4 relative`}>
      {/* AI Features CSS */}
      <style jsx>{`
        /* Hide ReactQuill's default cursor when ghost text is active */
        :global(.ql-editor .ghost-text) {
          color: #94a3b8;
          opacity: 0.7;
          pointer-events: none;
        }
        
        /* Add subtle background highlight to ghost text */
        :global(.ql-editor .ghost-text-container) {
          position: relative;
        }
        
        /* Show tab hint when ghost text is active */
        :global(.ghost-text-hint) {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(148, 163, 184, 0.1);
          color: #64748b;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          pointer-events: none;
        }
        
        /* AI Features Tooltip */
        :global(.ai-features-tooltip) {
          background: rgba(15, 23, 42, 0.95);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          pointer-events: none;
          z-index: 1000;
        }
        
        /* AI Assistant Floating Button */
        :global(.ai-assistant-float-btn) {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        :global(.ai-assistant-float-btn:hover) {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4);
        }
      `}</style>
      
      {/* AI Assistant Floating Button */}
      <div className="ai-assistant-float-btn" title="AI Assistant">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      {!isFocus && (
        <div className="flex items-center justify-end">
          <button
            onClick={handleContinue}
            disabled={loading || !content.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
          >
            {loading ? 'Generating...' : 'Continue'}
          </button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 font-[inherit] relative">
        {isMounted && (
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleContentChange}
            onChangeSelection={handleSelectionChange}
            placeholder="Start writing..."
            className={compact ? 'min-h-[300px]' : 'min-h-[500px]'}
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['clean']
              ]
            }}
          />
        )}
        {/* Ghost Text Hint */}
        {ghostText && (
          <div className="ghost-text-hint">
            Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">Tab</kbd> to accept • <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">Esc</kbd> to dismiss
          </div>
        )}
      </div>
      {isFocus ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs text-slate-500">
            {loading ? 'Continuing your story…' : 'Ready to continue'}
            {language && (
              <span className="ml-2 text-slate-400 capitalize">
                Language: {language === 'auto' ? 'Auto' : language}
              </span>
            )}
          </div>
          <button
            onClick={handleContinue}
            disabled={loading || !content.trim()}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
          >
            {loading ? 'Generating…' : 'Continue writing'}
          </button>
        </div>
      ) : (
        loading && (
          <div className="text-xs text-slate-500 text-center">
            Generating continuation...
          </div>
        )
      )}
    </div>
  );
});

StoryEditor.displayName = 'StoryEditor';

export default StoryEditor;


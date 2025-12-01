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
  onLockedSelectionAttempt
}, ref) => {
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [highlightRange, setHighlightRange] = useState<{ start: number; length: number } | null>(null);
  const quillRef = useRef<ReactQuill | null>(null);

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

  const handleContentChange = (newContent: string, delta: DeltaStatic, source: Sources) => {
    setContent(newContent);
    if (onContentChange) {
      onContentChange(newContent, delta, source);
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
      alert('Failed to continue writing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFocus = variant === 'focus';

  return (
    <div className={`story-editor ${compact ? 'story-editor-compact' : ''} ${isFocus ? 'story-editor-focus' : ''} space-y-4`}>
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
      <div className="bg-white rounded-xl border border-slate-200 font-[inherit]">
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


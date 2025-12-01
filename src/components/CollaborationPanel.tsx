import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ProjectComment } from '../api/projectApi';
import { normalizeHandle } from '../utils/handle';

export interface CollaborationParticipant {
  userId: string;
  userName: string;
  color: string;
  handle: string;
}

interface CollaborationPanelProps {
  participants: CollaborationParticipant[];
  comments: ProjectComment[];
  selectedText?: string;
  canAddComment: boolean;
  isConnected: boolean;
  onAddComment: (input: { text: string; threadId?: string; parentId?: string | null }) => void;
  onCommentSelect?: (comment: ProjectComment) => void;
  selectionRequired?: boolean;
  mentionNotice?: ProjectComment | null;
  onDismissMention?: () => void;
  currentHandle?: string | null;
  onUpdateThreadStatus: (threadId: string, status: 'open' | 'resolved') => void;
}

const formatTimestamp = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderCommentText = (comment: ProjectComment): React.ReactNode => {
  if (!comment.mentions || comment.mentions.length === 0) {
    return comment.text;
  }
  const normalizedMentions = Array.from(
    new Set(comment.mentions.map((mention) => normalizeHandle(mention)).filter(Boolean))
  );
  if (normalizedMentions.length === 0) {
    return comment.text;
  }
  const pattern = normalizedMentions.map((handle) => escapeRegExp(handle)).join('|');
  const regex = new RegExp(`@(${pattern})`, 'gi');
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(comment.text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(comment.text.slice(lastIndex, match.index));
    }
    nodes.push(
      <span key={`${comment.id}-${match.index}`} className="text-indigo-600 font-semibold">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < comment.text.length) {
    nodes.push(comment.text.slice(lastIndex));
  }

  return nodes;
};

const renderMarkdownComment = (text: string): React.ReactNode => {
  return <ReactMarkdown>{text}</ReactMarkdown>;
};

export default function CollaborationPanel({
  participants,
  comments,
  selectedText,
  canAddComment,
  isConnected,
  onAddComment,
  onCommentSelect,
  selectionRequired = true,
  mentionNotice,
  onDismissMention,
  currentHandle,
  onUpdateThreadStatus
}: CollaborationPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [replyMode, setReplyMode] = useState<'new' | 'reply'>('new');
  const [replyContext, setReplyContext] = useState<{ threadId: string; parentId?: string }>({ threadId: '' });

  const participantAvatars = useMemo(() => participants.slice(0, 6), [participants]);

  const availableHandles = useMemo(
    () =>
      Array.from(
        new Set(
          participants
            .map((participant) => participant.handle)
            .filter((handle): handle is string => Boolean(handle))
        )
      ),
    [participants]
  );

  const threads = useMemo(() => {
    const grouped = new Map<string, ProjectComment[]>();
    comments.forEach((comment) => {
      const list = grouped.get(comment.threadId) || [];
      list.push(comment);
      grouped.set(comment.threadId, list);
    });

    return Array.from(grouped.entries())
      .map(([threadId, list]) => {
        const sorted = list.slice().sort((a, b) => a.createdAt - b.createdAt);
        const root = sorted.find((comment) => !comment.parentId) ?? sorted[0];
        const updatedAt = sorted[sorted.length - 1]?.createdAt ?? root.createdAt;
        return {
          threadId,
          root,
          comments: sorted,
          status: root?.status ?? 'open',
          updatedAt
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [comments]);

  const handleSubmit = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (replyMode === 'reply' && replyContext.threadId) {
      onAddComment({ text: trimmed, threadId: replyContext.threadId, parentId: replyContext.parentId });
    } else {
      onAddComment({ text: trimmed });
    }
    setCommentText('');
    setReplyMode('new');
    setReplyContext({ threadId: '' });
  };

  const insertHandle = (handle: string) => {
    setCommentText((prev) => {
      const needsSpace = prev && !prev.endsWith(' ') ? ' ' : '';
      return `${prev || ''}${needsSpace}@${handle} `;
    });
  };

  const hasSelection = !!selectedText && (!selectionRequired || selectedText.trim().length > 0);
  const isSubmitDisabled =
    (!hasSelection && replyMode === 'new' && selectionRequired) || !canAddComment || !commentText.trim();

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Collaboration</p>
          <p className="text-sm text-slate-500">
            {isConnected ? 'Live syncing & inline comments' : 'Offline comment capture · auto-sync when connected'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'
            }`}
          />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
            {isConnected ? 'Live' : 'Async'}
          </span>
        </div>
      </div>

      {mentionNotice && (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-indigo-700 font-semibold uppercase tracking-[0.3em]">You were mentioned</p>
            <p className="text-sm text-slate-700 mt-1">{mentionNotice.userName} said:</p>
            {mentionNotice.selection?.text && (
              <p className="text-xs text-slate-500 mt-1 italic">
                “{mentionNotice.selection.text.slice(0, 80)}
                {mentionNotice.selection.text.length > 80 ? '…' : ''}”
              </p>
            )}
            <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{mentionNotice.text}</p>
          </div>
          {onDismissMention && (
            <button
              onClick={onDismissMention}
              className="text-xs text-slate-500 hover:text-slate-900"
              aria-label="Dismiss mention notice"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {participantAvatars.map((participant) => (
          <div
            key={participant.userId}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: participant.color }}
            title={participant.userName}
          >
            {participant.userName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
        ))}
        {participants.length > participantAvatars.length && (
          <span className="text-xs text-slate-500">+{participants.length - participantAvatars.length} more</span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {replyMode === 'reply' ? 'Reply in thread' : 'Start a new thread'}
            </label>
            {replyMode === 'reply' && (
              <button
                type="button"
                onClick={() => {
                  setReplyMode('new');
                  setReplyContext({ threadId: '' });
                }}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Cancel reply
              </button>
            )}
          </div>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200"
            placeholder="Leave feedback, questions, or TODOs... (Supports **bold**, *italic*, `code`, and [links](url))"
            rows={3}
            disabled={!canAddComment}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Markdown supported: **bold**, *italic*, `code`, [links](url)
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              {replyMode === 'reply' ? (
                <span className="text-slate-500">
                  Replying inside thread <span className="font-semibold">#{replyContext.threadId.slice(0, 6)}</span>
                </span>
              ) : hasSelection ? (
                <span className="text-emerald-600">
                  Selection attached:{' '}
                  <span className="font-semibold text-slate-700">
                    {selectedText?.slice(0, 80)}
                    {selectedText && selectedText.length > 80 ? '…' : ''}
                  </span>
                </span>
              ) : (
                <span>
                  Select text in the editor to anchor your comment{' '}
                  <span className="text-slate-400">(required)</span>
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isSubmitDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {replyMode === 'reply' ? 'Reply' : 'Add comment'}
            </button>
          </div>
          {availableHandles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Mention teammates:</span>
              {availableHandles.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => insertHandle(handle)}
                  className="px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400"
                >
                  @{handle}
                </button>
              ))}
            </div>
          )}
          {currentHandle && (
            <p className="text-[11px] text-slate-400">
              You appear as <span className="font-semibold text-slate-600">@{currentHandle}</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Comment threads
            </p>
            <span className="text-xs text-slate-400">{threads.length} total</span>
          </div>
          {threads.length === 0 ? (
            <p className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">
              No comments yet. Select text in the editor to leave the first note.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {threads.map((thread) => (
                <div key={thread.threadId} className="rounded-2xl border border-slate-200 bg-slate-50/80">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Thread #{thread.threadId.slice(0, 6)}</p>
                      <p className="text-xs text-slate-500">
                        Started by {thread.root.userName} · {formatTimestamp(thread.root.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          thread.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {thread.status === 'resolved' ? 'Resolved' : 'Open'}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateThreadStatus(thread.threadId, thread.status === 'resolved' ? 'open' : 'resolved')
                        }
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        {thread.status === 'resolved' ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {thread.comments.map((comment) => (
                      <div key={comment.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{comment.userName}</span>
                          <span>{formatTimestamp(comment.createdAt)}</span>
                        </div>
                        {comment.selection?.text && (
                          <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3">
                            “{comment.selection.text.slice(0, 100)}
                            {comment.selection.text.length > 100 ? '…' : ''}”
                          </p>
                        )}
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">
                          {comment.format === 'markdown' ? (
                            <div className="prose prose-sm max-w-none">
                              {renderMarkdownComment(comment.text)}
                            </div>
                          ) : (
                            renderCommentText(comment)
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyMode('reply');
                              setReplyContext({ threadId: thread.threadId, parentId: comment.id });
                            }}
                            className="font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Reply
                          </button>
                          {comment.selection && onCommentSelect && (
                            <button
                              onClick={() => onCommentSelect(comment)}
                              className="font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Highlight selection
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import crypto from 'node:crypto';
import { supabaseAdmin } from './supabaseClient';

export interface CommentSelection {
  start: number;
  end: number;
  text?: string;
  sectionId?: string;
}

export type CommentStatus = 'open' | 'resolved';

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  selection?: CommentSelection;
  mentions?: string[];
  threadId: string;
  parentId?: string | null;
  status: CommentStatus;
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
  // Rich text support
  format?: 'plain' | 'markdown';
  attachments?: Array<{
    type: 'image' | 'file';
    url: string;
    name: string;
  }>;
  // Task integration
  taskId?: string;  // If this comment is linked to a task
}

const projectComments = new Map<string, ProjectComment[]>();

type DbCommentRow = {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string | null;
  text: string;
  selection: any | null;
  mentions: string[] | null;
  thread_id: string;
  parent_id: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  format: string | null;
  attachments: any | null;
  task_id: string | null;
  created_at: string | null;
};

const useSupabase = !!supabaseAdmin;

const mapRowToComment = (row: DbCommentRow): ProjectComment => ({
  id: row.id,
  projectId: row.project_id,
  userId: row.user_id,
  userName: row.user_name || 'User',
  text: row.text,
  selection: row.selection || undefined,
  mentions: row.mentions || undefined,
  threadId: row.thread_id,
  parentId: row.parent_id,
  status: row.status as CommentStatus,
  resolvedBy: row.resolved_by || undefined,
  resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  format: (row.format as any) || 'plain',
  attachments: row.attachments || undefined,
  taskId: row.task_id || undefined
});

export async function loadProjectCommentsFromSupabase(projectId: string): Promise<void> {
  if (!useSupabase) return;
  if (projectComments.has(projectId)) return;

  try {
    const { data, error } = await supabaseAdmin!
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Supabase] loadProjectCommentsFromSupabase error', error);
      return;
    }

    const comments = ((data || []) as DbCommentRow[]).map(mapRowToComment);
    projectComments.set(projectId, comments);
  } catch (err) {
    console.error('[Supabase] loadProjectCommentsFromSupabase unexpected error', err);
  }
}

export function listProjectComments(projectId: string): ProjectComment[] {
  return [...(projectComments.get(projectId) || [])];
}

export function addProjectComment(comment: ProjectComment): ProjectComment {
  const existing = projectComments.get(comment.projectId) || [];
  const updated = [...existing, comment];
  projectComments.set(comment.projectId, updated);

  if (useSupabase) {
    (async () => {
      try {
        const payload = {
          id: comment.id,
          project_id: comment.projectId,
          user_id: comment.userId,
          user_name: comment.userName,
          text: comment.text,
          selection: comment.selection || null,
          mentions: comment.mentions || null,
          thread_id: comment.threadId,
          parent_id: comment.parentId ?? null,
          status: comment.status,
          resolved_by: comment.resolvedBy ?? null,
          resolved_at: comment.resolvedAt
            ? new Date(comment.resolvedAt).toISOString()
            : null,
          format: comment.format || 'plain',
          attachments: comment.attachments || null,
          task_id: comment.taskId ?? null,
          created_at: new Date(comment.createdAt).toISOString()
        };
        const { error } = await supabaseAdmin!
          .from('project_comments')
          .insert(payload);
        if (error) {
          console.error('[Supabase] addProjectComment error', error);
        }
      } catch (err) {
        console.error('[Supabase] addProjectComment unexpected error', err);
      }
    })();
  }

  return comment;
}

export function updateProjectComment(
  projectId: string,
  commentId: string,
  updates: Partial<Omit<ProjectComment, 'id' | 'projectId'>>
): ProjectComment | null {
  const existing = projectComments.get(projectId);
  if (!existing) {
    return null;
  }
  let updatedComment: ProjectComment | null = null;
  const next = existing.map((comment) => {
    if (comment.id !== commentId) {
      return comment;
    }
    updatedComment = { ...comment, ...updates, id: comment.id, projectId: comment.projectId };
    return updatedComment;
  });
  if (!updatedComment) {
    return null;
  }
  projectComments.set(projectId, next);

  if (updatedComment && useSupabase) {
    (async () => {
      try {
        const patch: Partial<DbCommentRow> = {
          text: updatedComment.text,
          selection: updatedComment.selection || null,
          mentions: updatedComment.mentions || null,
          thread_id: updatedComment.threadId,
          parent_id: updatedComment.parentId ?? null,
          status: updatedComment.status,
          resolved_by: updatedComment.resolvedBy ?? null,
          resolved_at: updatedComment.resolvedAt
            ? new Date(updatedComment.resolvedAt).toISOString()
            : null,
          format: updatedComment.format || 'plain',
          attachments: updatedComment.attachments || null,
          task_id: updatedComment.taskId ?? null
        };
        const { error } = await supabaseAdmin!
          .from('project_comments')
          .update(patch)
          .eq('id', commentId)
          .eq('project_id', projectId);
        if (error) {
          console.error('[Supabase] updateProjectComment error', error);
        }
      } catch (err) {
        console.error('[Supabase] updateProjectComment unexpected error', err);
      }
    })();
  }

  return updatedComment;
}

export function clearProjectComments(projectId: string): void {
  projectComments.delete(projectId);

  if (useSupabase) {
    (async () => {
      try {
        const { error } = await supabaseAdmin!
          .from('project_comments')
          .delete()
          .eq('project_id', projectId);
        if (error) {
          console.error('[Supabase] clearProjectComments error', error);
        }
      } catch (err) {
        console.error('[Supabase] clearProjectComments unexpected error', err);
      }
    })();
  }
}

export interface SectionLock {
  id: string;
  projectId: string;
  sectionId: string;
  range: { start: number; end: number };
  userId: string;
  userName: string;
  expiresAt: number;
}

const LOCK_DURATION_MS = 30 * 1000;
const projectLocks = new Map<string, SectionLock[]>();

type DbLockRow = {
  id: string;
  project_id: string;
  section_id: string;
  range: any;
  user_id: string;
  user_name: string | null;
  expires_at: string;
  created_at: string | null;
};

const rangesOverlap = (a: { start: number; end: number }, b: { start: number; end: number }): boolean => {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
};

const cleanupExpiredLocks = (projectId?: string): string[] => {
  const now = Date.now();
  const affected: string[] = [];
  if (projectId) {
    const locks = projectLocks.get(projectId);
    if (!locks) return affected;
    const filtered = locks.filter((lock) => lock.expiresAt > now);
    if (filtered.length !== locks.length) {
      affected.push(projectId);
    }
    projectLocks.set(projectId, filtered);
    return affected;
  }
  projectLocks.forEach((locks, key) => {
    const filtered = locks.filter((lock) => lock.expiresAt > now);
    if (filtered.length !== locks.length) {
      affected.push(key);
    }
    projectLocks.set(key, filtered);
  });
  return affected;
};

export async function loadSectionLocksFromSupabase(projectId: string): Promise<void> {
  if (!useSupabase) return;

  try {
    const now = Date.now();
    const { data, error } = await supabaseAdmin!
      .from('section_locks')
      .select('*')
      .eq('project_id', projectId)
      .gt('expires_at', new Date(now).toISOString());

    if (error) {
      console.error('[Supabase] loadSectionLocksFromSupabase error', error);
      return;
    }

    const locks: SectionLock[] = ((data || []) as DbLockRow[]).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      sectionId: row.section_id,
      range: row.range,
      userId: row.user_id,
      userName: row.user_name || 'User',
      expiresAt: new Date(row.expires_at).getTime()
    }));
    projectLocks.set(projectId, locks);
  } catch (err) {
    console.error('[Supabase] loadSectionLocksFromSupabase unexpected error', err);
  }
}

export function listSectionLocks(projectId: string): SectionLock[] {
  cleanupExpiredLocks(projectId);
  return [...(projectLocks.get(projectId) || [])];
}

export function acquireSectionLock(params: {
  projectId: string;
  sectionId: string;
  range: { start: number; end: number };
  userId: string;
  userName: string;
}): { lock?: SectionLock; conflict?: SectionLock; error?: string } {
  const { projectId, sectionId, range, userId, userName } = params;
  cleanupExpiredLocks(projectId);
  const locks = projectLocks.get(projectId) || [];
  const conflict = locks.find(
    (lock) =>
      lock.sectionId === sectionId &&
      lock.userId !== userId &&
      rangesOverlap(lock.range, range)
  );
  if (conflict) {
    return { conflict, error: 'locked' };
  }

  // Remove existing lock from same user on same section
  const nextLocks = locks.filter(
    (lock) => !(lock.sectionId === sectionId && lock.userId === userId)
  );

  const lock: SectionLock = {
    id: crypto.randomUUID(),
    projectId,
    sectionId,
    range,
    userId,
    userName,
    expiresAt: Date.now() + LOCK_DURATION_MS
  };

  projectLocks.set(projectId, [...nextLocks, lock]);

  if (useSupabase) {
    (async () => {
      try {
        const payload: Partial<DbLockRow> = {
          id: lock.id,
          project_id: lock.projectId,
          section_id: lock.sectionId,
          range: lock.range,
          user_id: lock.userId,
          user_name: lock.userName,
          expires_at: new Date(lock.expiresAt).toISOString(),
          created_at: new Date().toISOString()
        };
        const { error } = await supabaseAdmin!
          .from('section_locks')
          .insert(payload);
        if (error) {
          console.error('[Supabase] acquireSectionLock error', error);
        }
      } catch (err) {
        console.error('[Supabase] acquireSectionLock unexpected error', err);
      }
    })();
  }

  return { lock };
}

export function renewSectionLock(
  projectId: string,
  lockId: string,
  userId: string
): SectionLock | null {
  cleanupExpiredLocks(projectId);
  const locks = projectLocks.get(projectId);
  if (!locks) return null;
  let updatedLock: SectionLock | null = null;
  const next = locks.map((lock) => {
    if (lock.id === lockId && lock.userId === userId) {
      updatedLock = { ...lock, expiresAt: Date.now() + LOCK_DURATION_MS };
      return updatedLock;
    }
    return lock;
  });
  if (!updatedLock) {
    return null;
  }
  projectLocks.set(projectId, next);

  if (updatedLock && useSupabase) {
    (async () => {
      try {
        const { error } = await supabaseAdmin!
          .from('section_locks')
          .update({
            expires_at: new Date(updatedLock!.expiresAt).toISOString()
          })
          .eq('id', updatedLock!.id)
          .eq('project_id', projectId);
        if (error) {
          console.error('[Supabase] renewSectionLock error', error);
        }
      } catch (err) {
        console.error('[Supabase] renewSectionLock unexpected error', err);
      }
    })();
  }
  return updatedLock;
}

export function releaseSectionLock(
  projectId: string,
  lockId: string,
  userId?: string
): SectionLock | null {
  cleanupExpiredLocks(projectId);
  const locks = projectLocks.get(projectId);
  if (!locks) return null;
  let removed: SectionLock | null = null;
  const next = locks.filter((lock) => {
    if (lock.id !== lockId) {
      return true;
    }
    if (userId && lock.userId !== userId) {
      return true;
    }
    removed = lock;
    return false;
  });
  projectLocks.set(projectId, next);

  if (removed && useSupabase) {
    (async () => {
      try {
        const { error } = await supabaseAdmin!
          .from('section_locks')
          .delete()
          .eq('id', removed!.id)
          .eq('project_id', projectId);
        if (error) {
          console.error('[Supabase] releaseSectionLock error', error);
        }
      } catch (err) {
        console.error('[Supabase] releaseSectionLock unexpected error', err);
      }
    })();
  }
  return removed;
}

export function releaseLocksForUser(projectId: string, userId: string): SectionLock[] {
  const locks = projectLocks.get(projectId);
  if (!locks) return [];
  const released = locks.filter((lock) => lock.userId === userId);
  const next = locks.filter((lock) => lock.userId !== userId);
  projectLocks.set(projectId, next);

  if (released.length && useSupabase) {
    (async () => {
      try {
        const ids = released.map((l) => l.id);
        const { error } = await supabaseAdmin!
          .from('section_locks')
          .delete()
          .in('id', ids);
        if (error) {
          console.error('[Supabase] releaseLocksForUser error', error);
        }
      } catch (err) {
        console.error('[Supabase] releaseLocksForUser unexpected error', err);
      }
    })();
  }
  return released;
}

export function getAllSectionLocks(projectId: string): SectionLock[] {
  cleanupExpiredLocks(projectId);
  return projectLocks.get(projectId) || [];
}

export function sweepExpiredLocks(): string[] {
  return cleanupExpiredLocks();
}

export type ProjectActivityType =
  | 'lock_acquired'
  | 'lock_released'
  | 'lock_denied'
  | 'comment_added'
  | 'comment_resolved';

export interface ProjectActivity {
  id: string;
  projectId: string;
  type: ProjectActivityType;
  userId?: string;
  userName?: string;
  sectionId?: string;
  range?: { start: number; end: number };
  threadId?: string;
  commentId?: string;
  text?: string;
  createdAt: number;
}

const ACTIVITY_LIMIT = 200;
const projectActivities = new Map<string, ProjectActivity[]>();

export function listProjectActivities(projectId: string): ProjectActivity[] {
  return [...(projectActivities.get(projectId) || [])];
}

export function addProjectActivity(
  activity: Omit<ProjectActivity, 'id' | 'createdAt'>
): ProjectActivity {
  const entry: ProjectActivity = {
    ...activity,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  };
  const existing = projectActivities.get(activity.projectId) || [];
  const updated = [entry, ...existing].slice(0, ACTIVITY_LIMIT);
  projectActivities.set(activity.projectId, updated);
  return entry;
}

export function clearProjectActivities(projectId: string): void {
  projectActivities.delete(projectId);
}




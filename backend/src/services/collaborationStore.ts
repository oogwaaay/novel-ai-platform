import crypto from 'node:crypto';

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

export function listProjectComments(projectId: string): ProjectComment[] {
  return [...(projectComments.get(projectId) || [])];
}

export function addProjectComment(comment: ProjectComment): ProjectComment {
  const existing = projectComments.get(comment.projectId) || [];
  const updated = [...existing, comment];
  projectComments.set(comment.projectId, updated);
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
  return updatedComment;
}

export function clearProjectComments(projectId: string): void {
  projectComments.delete(projectId);
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
  return removed;
}

export function releaseLocksForUser(projectId: string, userId: string): SectionLock[] {
  const locks = projectLocks.get(projectId);
  if (!locks) return [];
  const released = locks.filter((lock) => lock.userId === userId);
  const next = locks.filter((lock) => lock.userId !== userId);
  projectLocks.set(projectId, next);
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




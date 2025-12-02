import crypto from 'node:crypto';
import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import type { Project, ProjectVersion, Chapter } from '../models/Project';
import {
  listProjectComments,
  addProjectComment,
  updateProjectComment,
  listProjectActivities,
  type ProjectComment,
  loadProjectCommentsFromSupabase
} from '../services/collaborationStore';
import {
  listProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
  type CollaborationTask
} from '../services/taskStore';
import { normalizeHandle } from '../utils/handle';
import {
  checkCollaborationPermission,
  getUserRole,
  addCollaborator,
  removeCollaborator,
  canEdit,
  canComment
} from '../utils/collaborationPermissions';
import { supabaseAdmin } from '../services/supabaseClient';

const router = Router();

// In-memory storage for collaboration metadata & versions
// 项目本体数据使用 Supabase 持久化，内存只作为缓存和版本记录。
const projects: Map<string, Project> = new Map();
const userProjects: Map<string, string[]> = new Map(); // userId -> projectIds
const projectVersions: Map<string, ProjectVersion[]> = new Map(); // projectId -> versions

// Helper: Create a version snapshot
const createVersion = (
  project: Project,
  label?: string,
  branch?: string,
  parentVersionId?: string
): ProjectVersion => {
  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    content: project.content,
    chapters: JSON.parse(JSON.stringify(project.chapters)), // Deep clone
    createdAt: Date.now(),
    label,
    branch: branch || 'main',
    parentVersionId
  };
};

// Helper: Store version (keep last 50 versions per project for branches)
const storeVersion = (
  project: Project,
  label?: string,
  branch?: string,
  parentVersionId?: string
): void => {
  const versions = projectVersions.get(project.id) || [];
  const newVersion = createVersion(project, label, branch, parentVersionId);
  const updatedVersions = [newVersion, ...versions].slice(0, 50); // Keep last 50 versions (increased for branches)
  projectVersions.set(project.id, updatedVersions);
};

type DbProjectRow = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  chapters: any | null;
  genre: string | null;
  length: number | null;
  language: string | null;
  outline: string | null;
  folder: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

const mapRowToProject = (row: DbProjectRow): Project => {
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : createdAt;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || 'Untitled Project',
    content: row.content ?? '',
    chapters: (row.chapters as Chapter[] | null) ?? [],
    genre: row.genre ?? 'general-fiction',
    length: row.length ?? 30,
    language: row.language ?? 'english',
    outline: row.outline ?? undefined,
    folder: row.folder ?? undefined,
    tags: row.tags ?? undefined,
    createdAt,
    updatedAt
  };
};

async function loadProjectsForUser(userId: string): Promise<void> {
  if (!supabaseAdmin) return;
  if (userProjects.has(userId)) return;

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Failed to load projects for user', userId, error);
    return;
  }

  const ids: string[] = [];
  for (const row of (data || []) as DbProjectRow[]) {
    const project = mapRowToProject(row);
    projects.set(project.id, project);
    ids.push(project.id);
  }
  userProjects.set(userId, ids);
}

async function loadProjectById(id: string, userId: string): Promise<Project | null> {
  const cached = projects.get(id);
  if (cached) return cached.userId === userId ? cached : null;
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Failed to load project by id', id, error);
    return null;
  }

  if (!data) return null;
  const project = mapRowToProject(data as DbProjectRow);
  projects.set(project.id, project);
  const ids = userProjects.get(userId) || [];
  if (!ids.includes(project.id)) {
    userProjects.set(userId, [...ids, project.id]);
  }
  return project;
}

async function syncProjectToSupabase(project: Project): Promise<void> {
  if (!supabaseAdmin) return;
  const payload = {
    id: project.id,
    user_id: project.userId,
    title: project.title,
    content: project.content,
    chapters: project.chapters,
    genre: project.genre,
    length: project.length,
    language: project.language,
    outline: project.outline ?? null,
    folder: project.folder ?? null,
    tags: project.tags ?? null,
    created_at: new Date(project.createdAt).toISOString(),
    updated_at: new Date(project.updatedAt).toISOString()
  };

  const { error } = await supabaseAdmin
    .from('projects')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[Supabase] Failed to upsert project', project.id, error);
  }
}

async function deleteProjectFromSupabase(id: string, userId: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    console.error('[Supabase] Failed to delete project', id, error);
  }
}

// Get all projects for user (including projects where user is a collaborator)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await loadProjectsForUser(userId);

    const projectIds = userProjects.get(userId) || [];
    const userProjectsList = projectIds
      .map((id) => projects.get(id))
      .filter((p): p is Project => p !== undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    res.json(userProjectsList);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let project: Project | undefined = projects.get(id);
    if (!project) {
      const loaded = await loadProjectById(id, userId);
      if (!loaded) {
        return res.status(404).json({ message: 'Project not found' });
      }
      project = loaded;
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { title, genre, length, language, idea } = req.body;

    const project: Project = {
      id: crypto.randomUUID(),
      userId,
      title: title || 'Untitled Project',
      content: '',
      chapters: [],
      genre: genre || 'general-fiction',
      length: length || 30,
      language: language || 'english',
      outline: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    projects.set(project.id, project);
    const userProjectIds = userProjects.get(userId) || [];
    userProjects.set(userId, [...userProjectIds, project.id]);

    await syncProjectToSupabase(project);

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let project: Project | undefined = projects.get(id);
    if (!project) {
      const loaded = await loadProjectById(id, userId);
      if (!loaded) {
        return res.status(404).json({ message: 'Project not found' });
      }
      project = loaded;
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates: Partial<Project> = {
      ...req.body,
      updatedAt: Date.now()
    };

    // Check if content or chapters changed (significant change = create version)
    const contentChanged = updates.content !== undefined && updates.content !== project.content;
    const chaptersChanged = updates.chapters !== undefined && JSON.stringify(updates.chapters) !== JSON.stringify(project.chapters);
    
    const updatedProject: Project = { ...project, ...updates };
    projects.set(id, updatedProject);

    // Auto-create version on significant changes (content or chapters)
    if (contentChanged || chaptersChanged) {
      storeVersion(updatedProject, undefined, updatedProject.versions?.[0]?.branch || 'main');
    }

    await syncProjectToSupabase(updatedProject);

    res.json(updatedProject);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const loaded = await loadProjectById(id, userId);
    if (!loaded) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const project = loaded;

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    projects.delete(id);
    const userProjectIds = userProjects.get(userId) || [];
    userProjects.set(userId, userProjectIds.filter((pid) => pid !== id));
    await deleteProjectFromSupabase(id, userId);

    res.json({ message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Save project content
router.post('/:id/save', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { content, chapters } = req.body;

    let project: Project | undefined = projects.get(id);
    if (!project && userId) {
      const loaded = await loadProjectById(id, userId);
      if (!loaded) {
        return res.status(404).json({ message: 'Project not found' });
      }
      project = loaded;
    }
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedProject: Project = {
      ...project,
      content: content ?? project.content,
      chapters: chapters ?? project.chapters,
      updatedAt: Date.now()
    };

    // Check if content actually changed
    const contentChanged = content !== undefined && content !== project.content;
    const chaptersChanged = chapters !== undefined && JSON.stringify(chapters) !== JSON.stringify(project.chapters);
    
    projects.set(id, updatedProject);

    // Auto-create version on content changes
    if (contentChanged || chaptersChanged) {
      storeVersion(updatedProject, undefined, updatedProject.versions?.[0]?.branch || 'main');
    }

    await syncProjectToSupabase(updatedProject);

    res.json(updatedProject);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save project content' });
  }
});

// Get project versions
router.get('/:id/versions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const versions = projectVersions.get(id) || [];
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch versions' });
  }
});

// Create manual version (user-triggered)
router.post('/:id/versions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { label, branch, parentVersionId } = req.body;

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    storeVersion(project, label, branch || 'main', parentVersionId);
    const versions = projectVersions.get(id) || [];
    res.json(versions[0]); // Return the newly created version
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create version' });
  }
});

// Restore project to a specific version
router.post('/:id/versions/:versionId/restore', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user?.id;

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const versions = projectVersions.get(id) || [];
    const version = versions.find(v => v.id === versionId);
    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Restore project to this version
    const restoredProject: Project = {
      ...project,
      content: version.content,
      chapters: JSON.parse(JSON.stringify(version.chapters)), // Deep clone
      updatedAt: Date.now()
    };

    projects.set(id, restoredProject);
    
    // Create a new version before restoring (so user can undo)
    storeVersion(project, 'Before restore', version.branch || 'main');
    
    // Restore and create version
    storeVersion(restoredProject, `Restored from: ${version.label || new Date(version.createdAt).toLocaleString()}`, version.branch || 'main');

    res.json(restoredProject);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to restore version' });
  }
});

// Create a branch from a version
router.post('/:id/versions/:versionId/branch', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user?.id;
    const { branchName, label } = req.body;

    if (!branchName || branchName.trim() === '') {
      return res.status(400).json({ message: 'Branch name is required' });
    }

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const versions = projectVersions.get(id) || [];
    const sourceVersion = versions.find(v => v.id === versionId);
    if (!sourceVersion) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Create a new branch from this version
    const branchVersion: ProjectVersion = {
      id: crypto.randomUUID(),
      projectId: id,
      content: sourceVersion.content,
      chapters: JSON.parse(JSON.stringify(sourceVersion.chapters)),
      createdAt: Date.now(),
      label: label || `Branch: ${branchName}`,
      branch: branchName.trim(),
      parentVersionId: versionId
    };

    const updatedVersions = [branchVersion, ...versions].slice(0, 50);
    projectVersions.set(id, updatedVersions);

    res.json(branchVersion);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create branch' });
  }
});

// Merge a branch into another branch
router.post('/:id/versions/merge', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { sourceBranch, targetBranch, mergeStrategy } = req.body; // mergeStrategy: 'theirs' | 'ours' | 'both'

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const versions = projectVersions.get(id) || [];
    const sourceVersions = versions.filter(v => v.branch === sourceBranch && !v.isMerged);
    const targetVersions = versions.filter(v => v.branch === targetBranch);

    if (sourceVersions.length === 0) {
      return res.status(404).json({ message: 'Source branch not found or already merged' });
    }

    const latestSource = sourceVersions[0]; // Most recent version in source branch
    const latestTarget = targetVersions[0]; // Most recent version in target branch

    // Simple merge: combine content (for now, use 'both' strategy)
    let mergedContent = '';
    let mergedChapters: Chapter[] = [];

    if (mergeStrategy === 'theirs') {
      mergedContent = latestSource.content;
      mergedChapters = JSON.parse(JSON.stringify(latestSource.chapters));
    } else if (mergeStrategy === 'ours') {
      mergedContent = latestTarget?.content || project.content;
      mergedChapters = latestTarget?.chapters ? JSON.parse(JSON.stringify(latestTarget.chapters)) : project.chapters;
    } else {
      // 'both' - combine content
      mergedContent = `${latestTarget?.content || project.content}\n\n--- Merged from ${sourceBranch} ---\n\n${latestSource.content}`;
      mergedChapters = [
        ...(latestTarget?.chapters || project.chapters),
        ...latestSource.chapters
      ];
    }

    // Create merged version
    const mergedVersion: ProjectVersion = {
      id: crypto.randomUUID(),
      projectId: id,
      content: mergedContent,
      chapters: mergedChapters,
      createdAt: Date.now(),
      label: `Merged ${sourceBranch} into ${targetBranch}`,
      branch: targetBranch,
      parentVersionId: latestSource.id
    };

    // Mark source branch versions as merged
    sourceVersions.forEach(v => {
      v.isMerged = true;
      v.mergedInto = mergedVersion.id;
    });

    // Update project with merged content
    const updatedProject: Project = {
      ...project,
      content: mergedContent,
      chapters: mergedChapters,
      updatedAt: Date.now()
    };
    projects.set(id, updatedProject);

    // Store merged version
    const updatedVersions = [mergedVersion, ...versions].slice(0, 50);
    projectVersions.set(id, updatedVersions);

    res.json({ version: mergedVersion, project: updatedProject });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to merge branches' });
  }
});

// Delete a version
router.delete('/:id/versions/:versionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user?.id;

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const versions = projectVersions.get(id) || [];
    const filteredVersions = versions.filter(v => v.id !== versionId);
    projectVersions.set(id, filteredVersions);
    
    // Update project
    const updatedProject = { ...project, versions: filteredVersions };
    projects.set(id, updatedProject);

    res.json({ message: 'Version deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete version' });
  }
});

// Get project comments (for collaboration panel)
router.get('/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await loadProjectCommentsFromSupabase(id);
    const comments = listProjectComments(id);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

router.get('/:id/activities', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const activities = listProjectActivities(id);
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
});

router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userEmail = req.user?.email || 'writer@novel.ai';

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { text, selection, mentions, threadId, parentId, format, attachments, createTask: createTaskData } = req.body as {
      text?: string;
      selection?: { start?: number; end?: number; text?: string; sectionId?: string };
      mentions?: string[];
      threadId?: string;
      parentId?: string | null;
      format?: 'plain' | 'markdown';
      attachments?: Array<{ type: 'image' | 'file'; url: string; name: string }>;
      createTask?: { title?: string; assignedTo?: string[]; dueDate?: number; priority?: 'low' | 'medium' | 'high'; tags?: string[] };
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const normalizedSelection =
      selection && typeof selection === 'object'
        ? {
            start: Number(selection.start) || 0,
            end: Number(selection.end) || Number(selection.start) || 0,
            text: typeof selection.text === 'string' ? selection.text : undefined,
            sectionId: typeof selection.sectionId === 'string' ? selection.sectionId : undefined
          }
        : undefined;

    const normalizedMentions = Array.isArray(mentions)
      ? Array.from(
          new Set(
            mentions
              .map((mention) => normalizeHandle(mention))
              .filter((mention): mention is string => Boolean(mention))
          )
        )
      : undefined;

    const comment: ProjectComment = {
      id: crypto.randomUUID(),
      projectId: id,
      userId,
      userName: userEmail,
      text: text.trim(),
      selection: normalizedSelection,
      mentions: normalizedMentions,
      threadId: threadId || '',
      parentId: parentId ?? null,
      status: 'open',
      createdAt: Date.now(),
      format: format || 'plain',
      attachments: Array.isArray(attachments) ? attachments : undefined
    };

    if (!comment.threadId) {
      comment.threadId = comment.id;
    }

    const saved = addProjectComment(comment);
    
    // Create task from comment if requested
    if (createTaskData && typeof createTaskData === 'object') {
      const task = await createTask({
        projectId: id,
        title: createTaskData.title || text.trim().slice(0, 100),
        description: text.trim(),
        createdBy: userId,
        assignedTo: Array.isArray(createTaskData.assignedTo) ? createTaskData.assignedTo : [],
        dueDate: createTaskData.dueDate,
        status: 'todo',
        priority: createTaskData.priority || 'medium',
        relatedCommentId: saved.id,
        tags: createTaskData.tags
      });
      // Link task to comment
      saved.taskId = task.id;
      updateProjectComment(id, saved.id, { taskId: task.id });
    }
    
    res.status(201).json(saved);
  } catch (error: any) {
    console.error('[project.routes] Failed to add comment', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

router.patch('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.body as { status?: 'open' | 'resolved' };
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const updated = updateProjectComment(id, commentId, {
      status,
      resolvedBy: status === 'resolved' ? userId : undefined,
      resolvedAt: status === 'resolved' ? Date.now() : undefined
    });

    if (!updated) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('[project.routes] Failed to update comment', error);
    res.status(500).json({ message: 'Failed to update comment' });
  }
});

export { router as projectRoutes };



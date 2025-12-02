/**
 * Task management for collaboration
 * Tasks can be created from comments or independently
 */

import crypto from 'node:crypto';
import { supabaseAdmin } from './supabaseClient';

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';

export interface CollaborationTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  createdBy: string;
  assignedTo: string[];  // User IDs
  dueDate?: number;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
  relatedCommentId?: string;  // If created from a comment
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  completedBy?: string;
}

const projectTasks = new Map<string, CollaborationTask[]>();

type DbTaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string[] | null;
  due_date: string | null;
  status: string;
  priority: string | null;
  related_comment_id: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
};

const useSupabase = !!supabaseAdmin;

const mapRowToTask = (row: DbTaskRow): CollaborationTask => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  createdBy: row.created_by,
  assignedTo: row.assigned_to || [],
  dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined,
  status: row.status as TaskStatus,
  priority: (row.priority as any) || undefined,
  relatedCommentId: row.related_comment_id || undefined,
  tags: row.tags || undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
  completedBy: row.completed_by || undefined
});

export async function loadProjectTasksFromSupabase(projectId: string): Promise<void> {
  if (!useSupabase) return;
  if (projectTasks.has(projectId)) return;

  try {
    const { data, error } = await supabaseAdmin!
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Supabase] loadProjectTasksFromSupabase error', error);
      return;
    }

    const tasks = ((data || []) as DbTaskRow[]).map(mapRowToTask);
    projectTasks.set(projectId, tasks);
  } catch (err) {
    console.error('[Supabase] loadProjectTasksFromSupabase unexpected error', err);
  }
}

export function listProjectTasks(projectId: string): CollaborationTask[] {
  return [...(projectTasks.get(projectId) || [])];
}

export function createTask(task: Omit<CollaborationTask, 'id' | 'createdAt' | 'updatedAt'>): CollaborationTask {
  const newTask: CollaborationTask = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const tasks = projectTasks.get(task.projectId) || [];
  projectTasks.set(task.projectId, [...tasks, newTask]);

  if (useSupabase) {
    (async () => {
      try {
        const payload: Partial<DbTaskRow> = {
          id: newTask.id,
          project_id: newTask.projectId,
          title: newTask.title,
          description: newTask.description,
          created_by: newTask.createdBy,
          assigned_to: newTask.assignedTo || [],
          due_date: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
          status: newTask.status,
          priority: newTask.priority || null,
          related_comment_id: newTask.relatedCommentId || null,
          tags: newTask.tags || null,
          created_at: new Date(newTask.createdAt).toISOString(),
          updated_at: new Date(newTask.updatedAt).toISOString(),
          completed_at: newTask.completedAt
            ? new Date(newTask.completedAt).toISOString()
            : null,
          completed_by: newTask.completedBy || null
        };
        const { error } = await supabaseAdmin!
          .from('project_tasks')
          .insert(payload);
        if (error) {
          console.error('[Supabase] createTask error', error);
        }
      } catch (err) {
        console.error('[Supabase] createTask unexpected error', err);
      }
    })();
  }
  
  return newTask;
}

export function updateTask(
  projectId: string,
  taskId: string,
  updates: Partial<Omit<CollaborationTask, 'id' | 'projectId' | 'createdAt'>>
): CollaborationTask | null {
  const tasks = projectTasks.get(projectId);
  if (!tasks) return null;
  
  let updatedTask: CollaborationTask | null = null;
  const next = tasks.map((task) => {
    if (task.id !== taskId) return task;
    updatedTask = {
      ...task,
      ...updates,
      updatedAt: Date.now(),
      id: task.id,
      projectId: task.projectId,
      createdAt: task.createdAt
    };
    
    // Auto-set completedAt if status changed to done
    if (updates.status === 'done' && task.status !== 'done') {
      updatedTask.completedAt = Date.now();
    }
    
    return updatedTask;
  });
  
  if (!updatedTask) return null;
  
  projectTasks.set(projectId, next);

  if (updatedTask && useSupabase) {
    (async () => {
      try {
        const patch: Partial<DbTaskRow> = {
          title: updatedTask!.title,
          description: updatedTask!.description,
          assigned_to: updatedTask!.assignedTo || [],
          due_date: updatedTask!.dueDate
            ? new Date(updatedTask!.dueDate).toISOString()
            : null,
          status: updatedTask!.status,
          priority: updatedTask!.priority || null,
          related_comment_id: updatedTask!.relatedCommentId || null,
          tags: updatedTask!.tags || null,
          updated_at: new Date(updatedTask!.updatedAt).toISOString(),
          completed_at: updatedTask!.completedAt
            ? new Date(updatedTask!.completedAt).toISOString()
            : null,
          completed_by: updatedTask!.completedBy || null
        };
        const { error } = await supabaseAdmin!
          .from('project_tasks')
          .update(patch)
          .eq('id', updatedTask!.id)
          .eq('project_id', projectId);
        if (error) {
          console.error('[Supabase] updateTask error', error);
        }
      } catch (err) {
        console.error('[Supabase] updateTask unexpected error', err);
      }
    })();
  }
  return updatedTask;
}

export function deleteTask(projectId: string, taskId: string): boolean {
  const tasks = projectTasks.get(projectId);
  if (!tasks) return false;
  
  const filtered = tasks.filter(t => t.id !== taskId);
  if (filtered.length === tasks.length) return false;
  
  projectTasks.set(projectId, filtered);

  if (useSupabase) {
    (async () => {
      try {
        const { error } = await supabaseAdmin!
          .from('project_tasks')
          .delete()
          .eq('id', taskId)
          .eq('project_id', projectId);
        if (error) {
          console.error('[Supabase] deleteTask error', error);
        }
      } catch (err) {
        console.error('[Supabase] deleteTask unexpected error', err);
      }
    })();
  }
  return true;
}

export function getTaskById(projectId: string, taskId: string): CollaborationTask | null {
  const tasks = projectTasks.get(projectId) || [];
  return tasks.find(t => t.id === taskId) || null;
}


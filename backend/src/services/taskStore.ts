/**
 * Task management for collaboration
 * Tasks can be created from comments or independently
 */

import crypto from 'node:crypto';

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
  return updatedTask;
}

export function deleteTask(projectId: string, taskId: string): boolean {
  const tasks = projectTasks.get(projectId);
  if (!tasks) return false;
  
  const filtered = tasks.filter(t => t.id !== taskId);
  if (filtered.length === tasks.length) return false;
  
  projectTasks.set(projectId, filtered);
  return true;
}

export function getTaskById(projectId: string, taskId: string): CollaborationTask | null {
  const tasks = projectTasks.get(projectId) || [];
  return tasks.find(t => t.id === taskId) || null;
}


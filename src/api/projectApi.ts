import { useAuthStore } from '../store/authStore';
import type { Project } from '../store/projectStore';
import type { Chapter } from './novelApi';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export interface CreateProjectData {
  title: string;
  genre: string;
  length: number;
  language: string;
  idea?: string;
}

export interface UpdateProjectData {
  title?: string;
  content?: string;
  chapters?: Chapter[];
  genre?: string;
  length?: number;
  language?: string;
  outline?: string;
  folder?: string;
  tags?: string[];
}

export interface ProjectCommentSelection {
  start: number;
  end: number;
  text?: string;
  sectionId?: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  selection?: ProjectCommentSelection;
  mentions?: string[];
  threadId: string;
  parentId?: string | null;
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
}

export interface CreateProjectCommentPayload {
  text: string;
  selection?: ProjectCommentSelection;
  mentions?: string[];
  threadId?: string;
  parentId?: string | null;
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

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getProjects(): Promise<Project[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }

  return response.json();
}

export async function getProject(projectId: string): Promise<Project> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch project');
  }

  return response.json();
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create project');
  }

  return response.json();
}

export async function updateProject(projectId: string, data: UpdateProjectData): Promise<Project> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update project');
  }

  return response.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to delete project');
  }
}

export async function saveProjectContent(projectId: string, content: string, chapters?: Chapter[]): Promise<Project> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/save`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, chapters })
  });

  if (!response.ok) {
    throw new Error('Failed to save project content');
  }

  return response.json();
}

export async function getProjectComments(projectId: string): Promise<ProjectComment[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/comments`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch project comments');
  }

  return response.json();
}

export async function addProjectComment(
  projectId: string,
  payload: CreateProjectCommentPayload
): Promise<ProjectComment> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to add project comment');
  }

  return response.json();
}

export async function getProjectActivities(projectId: string): Promise<ProjectActivity[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/activities`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch project activities');
  }

  return response.json();
}

export async function updateProjectCommentStatus(
  projectId: string,
  commentId: string,
  status: 'open' | 'resolved'
): Promise<ProjectComment> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/comments/${commentId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update project comment');
  }

  return response.json();
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  content: string;
  chapters: Chapter[];
  createdAt: number;
  label?: string;
  branch?: string;
  parentVersionId?: string;
  isMerged?: boolean;
  mergedInto?: string;
}

export async function getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch project versions');
  }

  return response.json();
}

export async function createProjectVersion(projectId: string, label?: string): Promise<ProjectVersion> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ label })
  });

  if (!response.ok) {
    throw new Error('Failed to create project version');
  }

  return response.json();
}

export async function restoreProjectVersion(projectId: string, versionId: string): Promise<Project> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions/${versionId}/restore`, {
    method: 'POST',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to restore project version');
  }

  return response.json();
}

export async function deleteProjectVersion(projectId: string, versionId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions/${versionId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to delete project version');
  }
}

export async function createBranch(projectId: string, versionId: string, branchName: string, label?: string): Promise<ProjectVersion> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions/${versionId}/branch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ branchName, label })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create branch');
  }

  return response.json();
}

export async function mergeBranches(
  projectId: string,
  sourceBranch: string,
  targetBranch: string,
  mergeStrategy: 'theirs' | 'ours' | 'both' = 'both'
): Promise<{ version: ProjectVersion; project: Project }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions/merge`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sourceBranch, targetBranch, mergeStrategy })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to merge branches');
  }

  return response.json();
}



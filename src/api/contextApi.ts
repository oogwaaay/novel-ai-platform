import { useAuthStore } from '../store/authStore';
import type { Character } from '../types/character';
import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';
import type { StyleTemplate } from '../types/templates';

// Always include /api prefix for context requests
const API_BASE_URL = `${(import.meta.env.VITE_API_URL as string | undefined) || ''}/api`;

export interface ProjectContext {
  characters: Character[];
  writingStyle: WritingStyle | null;
  knowledgeEntries: KnowledgeEntry[];
  styleTemplates?: StyleTemplate[];
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

export async function getProjectContext(projectId: string): Promise<ProjectContext> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/context/${projectId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch project context');
  }

  return response.json();
}

export async function updateProjectContext(projectId: string, context: Partial<ProjectContext>): Promise<ProjectContext> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/context/${projectId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(context)
  });

  if (!response.ok) {
    throw new Error('Failed to update project context');
  }

  return response.json();
}

export interface KnowledgeSuggestion {
  entry: KnowledgeEntry;
  sourceProjectId: string;
  relevanceScore?: number;
}

export interface AllKnowledgeResponse {
  entries: Array<KnowledgeEntry & { sourceProjectId: string }>;
  total: number;
}

export async function getAllKnowledgeEntries(genre?: string, excludeProjectId?: string): Promise<AllKnowledgeResponse> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (genre) params.append('genre', genre);
  if (excludeProjectId) params.append('excludeProjectId', excludeProjectId);
  
  const url = `${API_BASE_URL}/context/knowledge/all${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  // Check response content type to detect HTML error pages
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('[getAllKnowledgeEntries] Non-JSON response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      preview: text.substring(0, 200)
    });
    
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required. Please log in and try again.');
    } else if (response.status === 404) {
      throw new Error('Knowledge discovery endpoint not found. Please check your connection.');
    } else {
      throw new Error(`Server error (${response.status}): ${response.statusText}. Please try again later.`);
    }
  }

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch knowledge entries');
    } catch (parseError) {
      throw new Error(`Failed to fetch knowledge entries: ${response.status} ${response.statusText}`);
    }
  }

  try {
    return await response.json();
  } catch (parseError: any) {
    console.error('[getAllKnowledgeEntries] JSON parse error:', parseError);
    throw new Error('Invalid response from server. Please try again.');
  }
}



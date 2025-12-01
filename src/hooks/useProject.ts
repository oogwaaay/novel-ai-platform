import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore, type Project } from '../store/projectStore';
import { getProject, updateProject as updateProjectRequest, saveProjectContent } from '../api/projectApi';
import { getProjectContext, updateProjectContext } from '../api/contextApi';
import type { Character } from '../types/character';
import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';
import { useAuthStore } from '../store/authStore';
import { getProjectVersions, type ProjectVersion } from '../api/projectApi';

interface UseProjectOptions {
  projectId?: string | null;
  autoLoad?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface UseProjectReturn {
  project: Project | null;
  loading: boolean;
  error: string | null;
  context: {
    characters: Character[];
    writingStyle: WritingStyle | null;
    knowledgeEntries: KnowledgeEntry[];
  };
  versions: ProjectVersion[];
  loadProject: (id: string) => Promise<void>;
  saveProject: (updates?: Partial<Project>) => Promise<void>;
  saveContent: (content: string, chapters?: Array<{ title: string; content: string }>) => Promise<void>;
  updateContext: (context: {
    characters?: Character[];
    writingStyle?: WritingStyle | null;
    knowledgeEntries?: KnowledgeEntry[];
  }) => Promise<void>;
  loadVersions: () => Promise<void>;
  refreshProject: () => Promise<void>;
}

export function useProject(options: UseProjectOptions = {}): UseProjectReturn {
  const { projectId, autoLoad = true, autoSave = true, autoSaveDelay = 3000 } = options;
  const { isAuthenticated } = useAuthStore();
  const {
    currentProject,
    setCurrentProject,
    updateProject: updateProjectStore,
    context,
    setContext
  } = useProjectStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  // Auto-save debounce
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<Partial<Project> | null>(null);

  // Load project from backend
  const loadProject = useCallback(async (id: string) => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const project = await getProject(id);
      setCurrentProject(project);

      // Load context
      try {
        const projectContext = await getProjectContext(id);
        setContext({
          characters: projectContext.characters || [],
          writingStyle: projectContext.writingStyle || null,
          knowledgeEntries: projectContext.knowledgeEntries || []
        });
      } catch (err) {
        console.warn('Failed to load project context:', err);
        // Continue without context
      }

      // Load versions
      try {
        const projectVersions = await getProjectVersions(id);
        setVersions(projectVersions);
      } catch (err) {
        console.warn('Failed to load project versions:', err);
        // Continue without versions
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setCurrentProject, setContext]);

  // Save project updates
  const saveProject = useCallback(async (updates?: Partial<Project>) => {
    if (!currentProject?.id || !isAuthenticated) {
      return;
    }

    const updatesToSave = updates || pendingUpdatesRef.current;
    if (!updatesToSave) {
      return;
    }

    try {
      const updated = await updateProjectRequest(currentProject.id, updatesToSave);
      setCurrentProject(updated);
      updateProjectStore(currentProject.id, updatesToSave);
      pendingUpdatesRef.current = null;
    } catch (err) {
      console.error('Failed to save project:', err);
      throw err;
    }
  }, [currentProject?.id, isAuthenticated, setCurrentProject, updateProjectStore]);

  // Save project content (with auto-versioning)
  const saveContent = useCallback(async (content: string, chapters?: Array<{ title: string; content: string }>) => {
    if (!currentProject?.id || !isAuthenticated) {
      return;
    }

    try {
      const updated = await saveProjectContent(currentProject.id, content, chapters);
      setCurrentProject(updated);
      updateProjectStore(currentProject.id, {
        content: updated.content,
        chapters: updated.chapters
      });
    } catch (err) {
      console.error('Failed to save project content:', err);
      throw err;
    }
  }, [currentProject?.id, isAuthenticated, setCurrentProject, updateProjectStore]);

  // Update context
  const updateContext = useCallback(async (contextUpdates: {
    characters?: Character[];
    writingStyle?: WritingStyle | null;
    knowledgeEntries?: KnowledgeEntry[];
  }) => {
    if (!currentProject?.id || !isAuthenticated) {
      return;
    }

    try {
      await updateProjectContext(currentProject.id, contextUpdates);
      setContext(contextUpdates);
    } catch (err) {
      console.error('Failed to update project context:', err);
      throw err;
    }
  }, [currentProject?.id, isAuthenticated, setContext]);

  // Load versions
  const loadVersions = useCallback(async () => {
    if (!currentProject?.id || !isAuthenticated) {
      return;
    }

    try {
      const projectVersions = await getProjectVersions(currentProject.id);
      setVersions(projectVersions);
    } catch (err) {
      console.error('Failed to load project versions:', err);
    }
  }, [currentProject?.id, isAuthenticated]);

  // Refresh project from backend
  const refreshProject = useCallback(async () => {
    if (!currentProject?.id) {
      return;
    }
    await loadProject(currentProject.id);
  }, [currentProject?.id, loadProject]);

  // Auto-load project when projectId changes
  useEffect(() => {
    if (autoLoad && projectId && isAuthenticated) {
      // Only load if currentProject doesn't match
      if (!currentProject || currentProject.id !== projectId) {
        loadProject(projectId);
      }
    }
  }, [autoLoad, projectId, isAuthenticated, currentProject?.id, loadProject]);

  // Auto-save debounced updates
  useEffect(() => {
    if (!autoSave || !pendingUpdatesRef.current || !currentProject?.id) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = window.setTimeout(() => {
      saveProject().catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSave, currentProject?.id, autoSaveDelay, saveProject]);

  // Queue updates for auto-save
  const queueUpdate = useCallback((updates: Partial<Project>) => {
    pendingUpdatesRef.current = {
      ...pendingUpdatesRef.current,
      ...updates
    };
  }, []);

  return {
    project: currentProject,
    loading,
    error,
    context,
    versions,
    loadProject,
    saveProject,
    saveContent,
    updateContext,
    loadVersions,
    refreshProject
  };
}




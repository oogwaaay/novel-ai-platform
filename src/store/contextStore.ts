import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character } from '../types/character';
import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';
import type { StyleTemplate } from '../types/templates';

export interface ProjectContext {
  characters: Character[];
  writingStyle: WritingStyle | null;
  knowledgeEntries: KnowledgeEntry[];
  styleTemplates: StyleTemplate[];
}

interface ContextState {
  // Current project context (synced with backend)
  currentContext: ProjectContext | null;
  currentProjectId: string | null;
  
  // Local context (for offline/unsaved work)
  localContext: ProjectContext;
  
  // Actions
  setCurrentContext: (projectId: string | null, context: ProjectContext | null) => void;
  setLocalContext: (context: Partial<ProjectContext>) => void;
  updateCurrentContext: (updates: Partial<ProjectContext>) => void;
  updateLocalContext: (updates: Partial<ProjectContext>) => void;
  clearCurrentContext: () => void;
  clearLocalContext: () => void;
  syncLocalToCurrent: () => void;
  syncCurrentToLocal: () => void;
}

const defaultContext: ProjectContext = {
  characters: [],
  writingStyle: null,
  knowledgeEntries: [],
  styleTemplates: []
};

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      currentContext: null,
      currentProjectId: null,
      localContext: defaultContext,

      setCurrentContext: (projectId, context) => {
        set({
          currentProjectId: projectId,
          currentContext: context || defaultContext
        });
      },

      setLocalContext: (context) => {
        set((state) => ({
          localContext: {
            ...state.localContext,
            ...context
          }
        }));
      },

      updateCurrentContext: (updates) => {
        set((state) => {
          if (!state.currentContext) {
            return state;
          }
          return {
            currentContext: {
              ...state.currentContext,
              ...updates
            }
          };
        });
      },

      updateLocalContext: (updates) => {
        set((state) => ({
          localContext: {
            ...state.localContext,
            ...updates
          }
        }));
      },

      clearCurrentContext: () => {
        set({
          currentContext: null,
          currentProjectId: null
        });
      },

      clearLocalContext: () => {
        set({
          localContext: defaultContext
        });
      },

      syncLocalToCurrent: () => {
        const { localContext } = get();
        set({
          currentContext: localContext
        });
      },

      syncCurrentToLocal: () => {
        const { currentContext } = get();
        if (currentContext) {
          set({
            localContext: currentContext
          });
        }
      }
    }),
    {
      name: 'novel-ai-context-storage',
      partialize: (state) => ({
        // Only persist local context (for offline work)
        localContext: state.localContext
      })
    }
  )
);




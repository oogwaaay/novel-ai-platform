import { create } from 'zustand';
import type { Chapter } from '../api/novelApi';
import type { Character } from '../types/character';
import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';

export interface Project {
  id: string;
  userId: string;
  title: string;
  content: string;
  chapters: Chapter[];
  genre: string;
  length: number;
  language: string;
  outline?: string;
  folder?: string; // Folder name for organization
  tags?: string[]; // Tags for categorization
  createdAt: number;
  updatedAt: number;
}

export interface ProjectContext {
  characters: Character[];
  writingStyle: WritingStyle | null;
  knowledgeEntries: KnowledgeEntry[];
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  context: ProjectContext;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  setContext: (context: Partial<ProjectContext>) => void;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  context: {
    characters: [],
    writingStyle: null,
    knowledgeEntries: []
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  setProjects: (projects) => {
    set({ projects });
  },

  updateProject: (projectId, updates) => {
    set((state) => {
      const updatedProjects = state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates, updatedAt: Date.now() } : p
      );
      const updatedCurrent =
        state.currentProject?.id === projectId
          ? { ...state.currentProject, ...updates, updatedAt: Date.now() }
          : state.currentProject;
      return {
        projects: updatedProjects,
        currentProject: updatedCurrent
      };
    });
  },

  setContext: (context) => {
    set((state) => ({
      context: {
        ...state.context,
        ...context
      }
    }));
  },

  clearCurrentProject: () => {
    set({
      currentProject: null,
      context: {
        characters: [],
        writingStyle: null,
        knowledgeEntries: []
      }
    });
  }
}));



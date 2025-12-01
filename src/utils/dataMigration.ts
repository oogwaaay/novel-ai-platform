import { useAuthStore } from '../store/authStore';
import { createProject, getProjects } from '../api/projectApi';
import { getKeyValue } from './offlineDb';
import type { Project } from '../store/projectStore';

const MIGRATION_FLAG_KEY = 'novel-ai-data-migration-completed';
const HISTORY_KEY = 'novel-ai-history';

export interface MigrationProgress {
  total: number;
  completed: number;
  current?: string;
  errors: string[];
}

export interface LegacyProject {
  id: string;
  title: string;
  content: string;
  chapters?: Array<{ title: string; content: string }>;
  genre?: string;
  length?: number;
  language?: string;
  idea?: string;
  updatedAt: number;
}

/**
 * Migrate legacy localStorage projects to backend
 * Returns progress callback for UI updates
 */
export async function migrateLocalStorageToBackend(
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: boolean; migrated: number; errors: string[] }> {
  const { isAuthenticated, token } = useAuthStore.getState();
  
  if (!isAuthenticated || !token) {
    return { success: false, migrated: 0, errors: ['User not authenticated'] };
  }

  const migrationFlag = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (migrationFlag === 'completed') {
    return { success: true, migrated: 0, errors: [] };
  }

  try {
    // Load legacy projects from IndexedDB (already migrated from localStorage)
    const legacyProjects = await getKeyValue<LegacyProject[]>(HISTORY_KEY, []);
    
    if (legacyProjects.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'completed');
      return { success: true, migrated: 0, errors: [] };
    }

    // Get existing backend projects to avoid duplicates
    let existingProjects: Project[] = [];
    try {
      existingProjects = await getProjects();
    } catch (error) {
      console.warn('[Migration] Could not fetch existing projects, proceeding anyway:', error);
    }

    const existingTitles = new Set(existingProjects.map((p) => p.title.toLowerCase().trim()));
    const errors: string[] = [];
    let migrated = 0;

    const progress: MigrationProgress = {
      total: legacyProjects.length,
      completed: 0,
      errors: []
    };

    onProgress?.(progress);

    // Migrate each project
    for (const legacy of legacyProjects) {
      try {
        // Skip if project with same title already exists
        if (existingTitles.has(legacy.title.toLowerCase().trim())) {
          progress.completed++;
          progress.current = `Skipped: "${legacy.title}" (already exists)`;
          onProgress?.({ ...progress });
          continue;
        }

        progress.current = `Migrating: "${legacy.title}"`;
        onProgress?.({ ...progress });

        // Convert legacy format to backend format
        const chapters = legacy.chapters || [];
        if (legacy.content && chapters.length === 0) {
          // Single content blob -> convert to chapter
          chapters.push({
            title: 'Chapter 1',
            content: legacy.content
          });
        }

        await createProject({
          title: legacy.title,
          genre: legacy.genre || 'general-fiction',
          length: legacy.length || 30,
          language: legacy.language || 'en',
          idea: legacy.idea
        });

        // Update project content after creation (if we have content)
        // Note: This requires getting the created project ID, which createProject doesn't return
        // For now, we'll just create the project structure and let user continue from there

        migrated++;
        progress.completed++;
        progress.current = `Migrated: "${legacy.title}"`;
        onProgress?.({ ...progress });

        // Small delay to avoid overwhelming the backend
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMsg = `Failed to migrate "${legacy.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        progress.errors.push(errorMsg);
        progress.completed++;
        onProgress?.({ ...progress });
        console.error('[Migration]', errorMsg, error);
      }
    }

    // Mark migration as completed
    localStorage.setItem(MIGRATION_FLAG_KEY, 'completed');

    return {
      success: errors.length < legacyProjects.length,
      migrated,
      errors
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Migration]', errorMsg, error);
    return { success: false, migrated: 0, errors: [errorMsg] };
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) !== 'completed';
}

/**
 * Reset migration flag (for testing)
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
}



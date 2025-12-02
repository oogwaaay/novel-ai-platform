import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import type { ProjectContext, KnowledgeEntry } from '../models/Context';
import { supabaseAdmin } from '../services/supabaseClient';

const router = Router();

// In-memory storage (仍然作为缓存和回退方案)
const contexts: Map<string, ProjectContext> = new Map();

type DbKnowledgeRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  title: string;
  summary: string | null;
  tags: string[] | null;
  related_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

const mapRowToKnowledgeEntry = (row: DbKnowledgeRow): KnowledgeEntry => ({
  id: row.id,
  type: row.type as KnowledgeEntry['type'],
  title: row.title,
  summary: row.summary || '',
  tags: row.tags || undefined,
  relatedIds: row.related_ids || undefined
});

async function loadKnowledgeForProject(
  projectId: string,
  userId: string
): Promise<KnowledgeEntry[]> {
  if (!supabaseAdmin) {
    const existing = contexts.get(projectId);
    return existing?.knowledgeEntries || [];
  }

  const { data, error } = await supabaseAdmin
    .from('knowledge_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Failed to load knowledge_entries for project', projectId, error);
    const existing = contexts.get(projectId);
    return existing?.knowledgeEntries || [];
  }

  return ((data || []) as DbKnowledgeRow[]).map(mapRowToKnowledgeEntry);
}

async function syncKnowledgeForProject(
  projectId: string,
  userId: string,
  entries: KnowledgeEntry[]
): Promise<void> {
  if (!supabaseAdmin) return;

  // 简单策略：先删后插，保持实现清晰
  const { error: delError } = await supabaseAdmin
    .from('knowledge_entries')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (delError) {
    console.error('[Supabase] Failed to delete existing knowledge_entries', { projectId, delError });
    // 不直接返回，尽量继续插入新数据
  }

  if (!entries.length) return;

  const payload = entries.map((e) => ({
    id: e.id,
    user_id: userId,
    project_id: projectId,
    type: e.type,
    title: e.title,
    summary: e.summary,
    tags: e.tags ?? null,
    related_ids: e.relatedIds ?? null,
    updated_at: new Date().toISOString()
  }));

  const { error: insError } = await supabaseAdmin
    .from('knowledge_entries')
    .insert(payload);

  if (insError) {
    console.error('[Supabase] Failed to insert knowledge_entries', { projectId, insError });
  }
}

// Get project context
router.get('/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const existing = contexts.get(projectId);
    const knowledgeEntries = await loadKnowledgeForProject(projectId, userId);

    const context: ProjectContext = {
      projectId,
      characters: existing?.characters || [],
      writingStyle: existing?.writingStyle || null,
      knowledgeEntries,
      styleTemplates: existing?.styleTemplates || [],
      updatedAt: existing?.updatedAt || Date.now()
    };

    contexts.set(projectId, context);
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch context' });
  }
});

// Update project context
router.put('/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    const updates: Partial<ProjectContext> = {
      ...req.body,
      updatedAt: Date.now()
    };

    const existingContext = contexts.get(projectId) || {
      projectId,
      characters: [],
      writingStyle: null,
      knowledgeEntries: [],
      styleTemplates: [],
      updatedAt: Date.now()
    };

    const updatedContext: ProjectContext = {
      ...existingContext,
      ...updates,
      projectId // Ensure projectId is not overwritten
    };

    contexts.set(projectId, updatedContext);

    if (userId && updates.knowledgeEntries) {
      await syncKnowledgeForProject(projectId, userId, updates.knowledgeEntries);
    }

    res.json(updatedContext);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update context' });
  }
});

// Get all knowledge entries from all projects (for knowledge reuse)
router.get('/knowledge/all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { genre, excludeProjectId } = req.query;

    // Collect all knowledge entries from Supabase
    const allKnowledge: Array<{ entry: KnowledgeEntry; projectId: string }> = [];

    if (supabaseAdmin && userId) {
      const { data, error } = await supabaseAdmin
        .from('knowledge_entries')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('[Supabase] Failed to load all knowledge_entries', error);
      } else {
        (data as DbKnowledgeRow[]).forEach((row) => {
          if (excludeProjectId && row.project_id === excludeProjectId) {
            return;
          }
          const entry = mapRowToKnowledgeEntry(row);
          allKnowledge.push({ entry, projectId: row.project_id || '' });
        });
      }
    } else {
      // 回退到内存版
      contexts.forEach((context, projectId) => {
        if (excludeProjectId && projectId === excludeProjectId) {
          return;
        }
        if (context.knowledgeEntries && context.knowledgeEntries.length > 0) {
          context.knowledgeEntries.forEach((entry) => {
            allKnowledge.push({ entry, projectId });
          });
        }
      });
    }

    // If genre is specified, filter and rank by relevance
    let filteredKnowledge = allKnowledge;
    if (genre && typeof genre === 'string') {
      // Simple genre-based filtering (can be enhanced with LLM)
      const genreKeywords: Record<string, string[]> = {
        'fantasy': ['magic', 'wizard', 'dragon', 'kingdom', 'quest', 'sword', 'spell'],
        'science-fiction': ['space', 'planet', 'alien', 'technology', 'future', 'robot', 'starship'],
        'romance': ['love', 'heart', 'relationship', 'kiss', 'wedding', 'passion'],
        'mystery': ['detective', 'crime', 'murder', 'investigation', 'clue', 'suspect'],
        'thriller': ['danger', 'chase', 'escape', 'threat', 'suspense', 'tension'],
        'horror': ['fear', 'dark', 'ghost', 'monster', 'terror', 'nightmare'],
        'historical-fiction': ['history', 'ancient', 'war', 'empire', 'medieval', 'castle']
      };

      const keywords = genreKeywords[genre.toLowerCase()] || [];
      if (keywords.length > 0) {
        filteredKnowledge = allKnowledge
          .map(item => {
            const entry = item.entry;
            const text = `${entry.title} ${entry.summary} ${entry.details || ''}`.toLowerCase();
            const relevanceScore = keywords.reduce((score, keyword) => {
              return score + (text.includes(keyword) ? 1 : 0);
            }, 0);
            return { ...item, relevanceScore };
          })
          .filter(item => item.relevanceScore > 0)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 20); // Top 20 most relevant
      }
    }

    res.json({
      entries: filteredKnowledge.map(item => ({
        ...item.entry,
        sourceProjectId: item.projectId
      })),
      total: filteredKnowledge.length
    });
  } catch (error: any) {
    console.error('[Context] Failed to get all knowledge:', error);
    res.status(500).json({ message: 'Failed to fetch knowledge entries' });
  }
});

export { router as contextRoutes };



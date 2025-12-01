import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import type { ProjectContext } from '../models/Context';

const router = Router();

// In-memory storage for MVP (replace with database in production)
const contexts: Map<string, ProjectContext> = new Map();

// Get project context
router.get('/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    // In MVP, verify project ownership (simplified)
    const context = contexts.get(projectId) || {
      projectId,
      characters: [],
      writingStyle: null,
      knowledgeEntries: [],
      styleTemplates: [],
      updatedAt: Date.now()
    };

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

    // Collect all knowledge entries from all projects
    const allKnowledge: Array<{ entry: any; projectId: string }> = [];
    
    contexts.forEach((context, projectId) => {
      // Skip current project if specified
      if (excludeProjectId && projectId === excludeProjectId) {
        return;
      }
      
      if (context.knowledgeEntries && context.knowledgeEntries.length > 0) {
        context.knowledgeEntries.forEach(entry => {
          allKnowledge.push({ entry, projectId });
        });
      }
    });

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



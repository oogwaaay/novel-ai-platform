export type KnowledgeCategory = 'character' | 'location' | 'artifact' | 'faction' | 'custom';

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  summary: string;
  details?: string;
  pinned?: boolean;
  updatedAt: number;
}





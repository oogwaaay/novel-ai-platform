export interface CharacterProfile {
  id: string;
  name: string;
  description?: string;
  role?: string;
  archetype?: string;
}

export interface WritingStyle {
  id: string;
  name: string;
  description?: string;
  tone?: string;
  pacing?: string;
  vocabulary?: string;
  updatedAt: number;
}

export interface KnowledgeEntry {
  id: string;
  type: 'character' | 'location' | 'artifact' | 'faction' | 'custom';
  title: string;
  summary: string;
  tags?: string[];
  relatedIds?: string[];
}

export interface StyleTemplate {
  id: string;
  name: string;
  genre: string;
  sampleIdea?: string;
  toneTags?: string[];
  coverColor?: string;
}

export interface ProjectContext {
  projectId: string;
  characters: CharacterProfile[];
  writingStyle: WritingStyle | null;
  knowledgeEntries: KnowledgeEntry[];
  styleTemplates: StyleTemplate[];
  updatedAt: number;
}


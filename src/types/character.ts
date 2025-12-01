// Character types - First principles: Keep it simple, only what's essential
export interface Character {
  id: string;
  name: string;
  description: string; // Simple, concise description (max 200 chars)
  createdAt: number;
  updatedAt: number;
  relationships?: CharacterRelationship[]; // Optional: character relationships
}

// Character relationship
export interface CharacterRelationship {
  characterId: string; // ID of the related character
  relation: string; // Relationship type (e.g., "friend", "enemy", "lover", "mentor", "sibling")
  description?: string; // Optional: more details about the relationship
}

// Character context for AI generation
export interface CharacterContext {
  characters: Character[];
  summary: string; // Brief summary of how characters relate to current chapter
}



export interface Chapter {
  title: string;
  content: string;
  status?: 'drafting' | 'reviewing' | 'done';
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  content: string;
  chapters: Chapter[];
  createdAt: number;
  label?: string; // User-defined label (e.g., "Before major rewrite")
  diff?: string; // Diff from previous version (for storage efficiency)
  branch?: string; // Branch name (e.g., "main", "experimental", "rewrite-v2")
  parentVersionId?: string; // Parent version ID for branching
  isMerged?: boolean; // Whether this branch has been merged
  mergedInto?: string; // Version ID this was merged into
}

export type CollaborationRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface ProjectCollaborator {
  userId: string;
  role: CollaborationRole;
  invitedAt: number;
  invitedBy?: string;
}

export interface Project {
  id: string;
  userId: string;  // Owner ID
  title: string;
  content: string;
  chapters: Chapter[];
  genre: string;
  length: number;
  language: string;
  outline?: string;
  folder?: string; // Folder name for organization (e.g., "Work", "Personal", "Archive")
  tags?: string[]; // Tags for categorization (e.g., ["sci-fi", "draft", "priority"])
  createdAt: number;
  updatedAt: number;
  versions?: ProjectVersion[]; // Version history
  collaborators?: ProjectCollaborator[]; // Collaboration permissions
}



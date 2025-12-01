/**
 * Collaboration permissions utilities
 * Manages role-based access control for projects
 */

import type { CollaborationRole, Project } from '../models/Project';

export type CollaborationAction = 'edit' | 'comment' | 'view' | 'invite' | 'manage' | 'delete';

const ROLE_PERMISSIONS: Record<CollaborationRole, CollaborationAction[]> = {
  owner: ['edit', 'comment', 'view', 'invite', 'manage', 'delete'],
  editor: ['edit', 'comment', 'view'],
  commenter: ['comment', 'view'],
  viewer: ['view']
};

/**
 * Check if a user has permission to perform an action on a project
 */
export function checkCollaborationPermission(
  userId: string,
  project: Project,
  action: CollaborationAction
): boolean {
  // Owner always has all permissions
  if (project.userId === userId) {
    return true;
  }

  // Check collaborator role
  const collaborator = project.collaborators?.find(c => c.userId === userId);
  if (!collaborator) {
    // No collaborator record means no access (except owner)
    return false;
  }

  const permissions = ROLE_PERMISSIONS[collaborator.role] || [];
  return permissions.includes(action);
}

/**
 * Get user's role in a project
 */
export function getUserRole(userId: string, project: Project): CollaborationRole | null {
  if (project.userId === userId) {
    return 'owner';
  }
  return project.collaborators?.find(c => c.userId === userId)?.role || null;
}

/**
 * Add or update a collaborator
 */
export function addCollaborator(
  project: Project,
  userId: string,
  role: CollaborationRole,
  invitedBy: string
): Project {
  const collaborators = project.collaborators || [];
  const existingIndex = collaborators.findIndex(c => c.userId === userId);
  
  const collaborator = {
    userId,
    role,
    invitedAt: Date.now(),
    invitedBy
  };

  if (existingIndex >= 0) {
    // Update existing collaborator
    collaborators[existingIndex] = collaborator;
  } else {
    // Add new collaborator
    collaborators.push(collaborator);
  }

  return {
    ...project,
    collaborators
  };
}

/**
 * Remove a collaborator
 */
export function removeCollaborator(project: Project, userId: string): Project {
  const collaborators = (project.collaborators || []).filter(c => c.userId !== userId);
  return {
    ...project,
    collaborators
  };
}

/**
 * Check if user can invite others
 */
export function canInvite(userId: string, project: Project): boolean {
  return checkCollaborationPermission(userId, project, 'invite');
}

/**
 * Check if user can edit content
 */
export function canEdit(userId: string, project: Project): boolean {
  return checkCollaborationPermission(userId, project, 'edit');
}

/**
 * Check if user can add comments
 */
export function canComment(userId: string, project: Project): boolean {
  return checkCollaborationPermission(userId, project, 'comment');
}


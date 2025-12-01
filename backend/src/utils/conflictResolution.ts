/**
 * Conflict resolution utilities for collaborative editing
 * Implements three-way merge for handling concurrent edits
 */

export interface ConflictRange {
  start: number;
  end: number;
  local: string;
  remote: string;
  base: string;
}

export interface MergeResult {
  merged: string;
  conflicts: ConflictRange[];
  hasConflicts: boolean;
}

/**
 * Three-way merge: merge local and remote changes based on a common base
 */
export function threeWayMerge(
  base: string,
  local: string,
  remote: string
): MergeResult {
  // Simple implementation: use diff-match-patch for three-way merge
  // In production, consider using a more sophisticated algorithm
  
  const conflicts: ConflictRange[] = [];
  let merged = '';
  
  // If base equals local, remote wins
  if (base === local) {
    return {
      merged: remote,
      conflicts: [],
      hasConflicts: false
    };
  }
  
  // If base equals remote, local wins
  if (base === remote) {
    return {
      merged: local,
      conflicts: [],
      hasConflicts: false
    };
  }
  
  // If local equals remote, no conflict
  if (local === remote) {
    return {
      merged: local,
      conflicts: [],
      hasConflicts: false
    };
  }
  
  // Simple character-by-character merge for non-overlapping changes
  // For overlapping changes, mark as conflict
  const baseLength = base.length;
  const localLength = local.length;
  const remoteLength = remote.length;
  
  let baseIndex = 0;
  let localIndex = 0;
  let remoteIndex = 0;
  
  while (baseIndex < baseLength || localIndex < localLength || remoteIndex < remoteLength) {
    // Check if we're at the same position in all three
    if (baseIndex < baseLength && localIndex < localLength && remoteIndex < remoteLength &&
        base[baseIndex] === local[localIndex] && base[baseIndex] === remote[remoteIndex]) {
      // All three match, advance all
      merged += base[baseIndex];
      baseIndex++;
      localIndex++;
      remoteIndex++;
    } else if (baseIndex < baseLength && localIndex < localLength && base[baseIndex] === local[localIndex]) {
      // Base and local match, remote differs (remote change)
      merged += remote[remoteIndex] || '';
      baseIndex++;
      localIndex++;
      remoteIndex++;
    } else if (baseIndex < baseLength && remoteIndex < remoteLength && base[baseIndex] === remote[remoteIndex]) {
      // Base and remote match, local differs (local change)
      merged += local[localIndex] || '';
      baseIndex++;
      localIndex++;
      remoteIndex++;
    } else {
      // Conflict: both local and remote differ from base
      // Mark conflict region
      const conflictStart = merged.length;
      let localConflict = '';
      let remoteConflict = '';
      let baseConflict = '';
      
      // Collect conflict regions (simplified: take next 100 chars)
      const conflictLength = Math.min(100, Math.max(
        localLength - localIndex,
        remoteLength - remoteIndex,
        baseLength - baseIndex
      ));
      
      localConflict = local.substring(localIndex, localIndex + conflictLength);
      remoteConflict = remote.substring(remoteIndex, remoteIndex + conflictLength);
      baseConflict = base.substring(baseIndex, baseIndex + conflictLength);
      
      conflicts.push({
        start: conflictStart,
        end: conflictStart + Math.max(localConflict.length, remoteConflict.length),
        local: localConflict,
        remote: remoteConflict,
        base: baseConflict
      });
      
      // For now, prefer local in conflicts (user can resolve manually)
      merged += localConflict;
      
      baseIndex += conflictLength;
      localIndex += conflictLength;
      remoteIndex += conflictLength;
    }
  }
  
  return {
    merged,
    conflicts,
    hasConflicts: conflicts.length > 0
  };
}

/**
 * Resolve a conflict by choosing a side or providing custom resolution
 */
export function resolveConflict(
  conflict: ConflictRange,
  resolution: 'local' | 'remote' | 'custom',
  customText?: string
): string {
  switch (resolution) {
    case 'local':
      return conflict.local;
    case 'remote':
      return conflict.remote;
    case 'custom':
      return customText || conflict.local;
    default:
      return conflict.local;
  }
}

/**
 * Apply conflict resolutions to merged text
 */
export function applyConflictResolutions(
  mergeResult: MergeResult,
  resolutions: Array<{ conflictIndex: number; resolution: 'local' | 'remote' | 'custom'; customText?: string }>
): string {
  let result = mergeResult.merged;
  let offset = 0;
  
  // Sort resolutions by conflict index (reverse order to maintain positions)
  const sortedResolutions = [...resolutions].sort((a, b) => b.conflictIndex - a.conflictIndex);
  
  sortedResolutions.forEach(({ conflictIndex, resolution, customText }) => {
    if (conflictIndex >= 0 && conflictIndex < mergeResult.conflicts.length) {
      const conflict = mergeResult.conflicts[conflictIndex];
      const resolved = resolveConflict(conflict, resolution, customText);
      
      // Replace conflict region with resolved text
      result = result.substring(0, conflict.start + offset) +
               resolved +
               result.substring(conflict.end + offset);
      
      // Adjust offset for subsequent replacements
      offset += resolved.length - (conflict.end - conflict.start);
    }
  });
  
  return result;
}


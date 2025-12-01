/**
 * Conflict resolution utilities for collaborative editing (frontend)
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
  
  // Simple word-level merge for better conflict detection
  const baseWords = base.split(/\s+/);
  const localWords = local.split(/\s+/);
  const remoteWords = remote.split(/\s+/);
  
  let baseIdx = 0;
  let localIdx = 0;
  let remoteIdx = 0;
  const mergedWords: string[] = [];
  
  while (baseIdx < baseWords.length || localIdx < localWords.length || remoteIdx < remoteWords.length) {
    // Check if all three match at current position
    if (baseIdx < baseWords.length && localIdx < localWords.length && remoteIdx < remoteWords.length &&
        baseWords[baseIdx] === localWords[localIdx] && baseWords[baseIdx] === remoteWords[remoteIdx]) {
      mergedWords.push(baseWords[baseIdx]);
      baseIdx++;
      localIdx++;
      remoteIdx++;
    } else if (baseIdx < baseWords.length && localIdx < localWords.length && 
               baseWords[baseIdx] === localWords[localIdx]) {
      // Base and local match, remote differs (remote change)
      mergedWords.push(remoteWords[remoteIdx] || '');
      baseIdx++;
      localIdx++;
      remoteIdx++;
    } else if (baseIdx < baseWords.length && remoteIdx < remoteWords.length && 
               baseWords[baseIdx] === remoteWords[remoteIdx]) {
      // Base and remote match, local differs (local change)
      mergedWords.push(localWords[localIdx] || '');
      baseIdx++;
      localIdx++;
      remoteIdx++;
    } else {
      // Conflict: both local and remote differ from base
      const conflictStart = mergedWords.length;
      const localConflict: string[] = [];
      const remoteConflict: string[] = [];
      const baseConflict: string[] = [];
      
      // Collect conflict region (simplified: take next 50 words)
      const conflictLength = Math.min(50, Math.max(
        localWords.length - localIdx,
        remoteWords.length - remoteIdx,
        baseWords.length - baseIdx
      ));
      
      for (let i = 0; i < conflictLength; i++) {
        if (localIdx + i < localWords.length) localConflict.push(localWords[localIdx + i]);
        if (remoteIdx + i < remoteWords.length) remoteConflict.push(remoteWords[remoteIdx + i]);
        if (baseIdx + i < baseWords.length) baseConflict.push(baseWords[baseIdx + i]);
      }
      
      conflicts.push({
        start: conflictStart,
        end: conflictStart + Math.max(localConflict.length, remoteConflict.length),
        local: localConflict.join(' '),
        remote: remoteConflict.join(' '),
        base: baseConflict.join(' ')
      });
      
      // For now, prefer local in conflicts (user can resolve manually)
      mergedWords.push(...localConflict);
      
      baseIdx += conflictLength;
      localIdx += conflictLength;
      remoteIdx += conflictLength;
    }
  }
  
  return {
    merged: mergedWords.join(' '),
    conflicts,
    hasConflicts: conflicts.length > 0
  };
}


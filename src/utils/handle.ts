const slugify = (value?: string | null): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
};

export const buildUserHandle = (userName?: string | null, email?: string | null, fallback?: string | null): string => {
  const base =
    slugify(userName?.split(' ')[0]) ||
    slugify(email?.split('@')[0]) ||
    slugify(fallback) ||
    'writer';

  return base.length > 0 ? base : 'writer';
};

export const normalizeHandle = (handle?: string | null): string => slugify(handle);

export const deriveMentionsFromText = (text: string, handles: string[]): string[] => {
  if (!text || handles.length === 0) return [];
  const set = new Set<string>();
  const normalized = handles.map((handle) => normalizeHandle(handle)).filter(Boolean);
  normalized.forEach((handle, idx) => {
    const regex = new RegExp(`@${handle}(?![a-z0-9_-])`, 'gi');
    if (regex.test(text)) {
      set.add(handles[idx]);
    }
  });
  return Array.from(set);
};




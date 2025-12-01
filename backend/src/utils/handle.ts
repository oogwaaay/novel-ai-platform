const slugify = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
};

export const buildUserHandle = (options: { userName?: string | null; userEmail?: string | null; userId?: string | null }, existingHandles: Set<string>): string => {
  const { userName, userEmail, userId } = options;
  const base =
    slugify(userName?.split(' ')[0]) ||
    slugify(userEmail?.split('@')[0]) ||
    slugify(userId) ||
    'writer';

  let handle = base;
  let suffix = 2;
  while (existingHandles.has(handle) || handle.length === 0) {
    handle = `${base}${suffix}`;
    suffix += 1;
  }
  return handle;
};

export const normalizeHandle = (handle?: string | null): string => slugify(handle);

export const extractMentions = (text: string, validHandles: Set<string>): string[] => {
  const mentions = new Set<string>();
  if (!text) return [];

  const regex = /@([a-z0-9][a-z0-9_-]{1,31})/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const normalized = normalizeHandle(match[1]);
    if (normalized && validHandles.has(normalized)) {
      mentions.add(normalized);
    }
  }

  return Array.from(mentions);
};




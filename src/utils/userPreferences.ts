export const USER_PREFERENCES_KEY = 'novel-ai-preferences';

export interface UserPreferences {
  templateId: string;
  templateTitle: string;
  genre: string;
  preferredFormat: string;
  flowMode: 'outline' | 'draft' | 'hybrid';
  tone: string;
  sampleIdea: string;
  savedAt: number;
}

export const saveUserPreferences = (prefs: UserPreferences) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences', error);
  }
};

export const loadUserPreferences = (): UserPreferences | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_PREFERENCES_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPreferences;
  } catch (error) {
    console.error('Failed to parse preferences', error);
    return null;
  }
};


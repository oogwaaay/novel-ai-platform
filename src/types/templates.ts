import type { WritingStyle } from './style';

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  style: WritingStyle | null;
  builtIn?: boolean;
  createdAt: number;
}





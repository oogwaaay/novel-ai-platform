import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

import type { WritingStyle } from '../types/style';
import type { KnowledgeEntry } from '../types/knowledge';

export type AiAction =
  | 'rewrite'
  | 'tone'
  | 'suggest'
  | 'detect'
  | 'storyTree'
  | 'sceneBeats'
  | 'characterArc';

export interface GenerateNovelParams {
  genre: string;
  idea: string;
  length: number;
  type?: 'full' | 'outline';
  characters?: Array<{ name: string; description: string }>;
  style?: WritingStyle | null;
  language?: string;
  knowledge?: KnowledgeEntry[];
  contextStrategy?: 'precision' | 'balanced' | 'extended';
  contextWindowWords?: number;
}

export interface Chapter {
  title: string;
  content: string;
}

export interface NovelResponse {
  content: string;
  outline?: string;
  chapters?: Chapter[];
  actualLength?: number;
  isPartial?: boolean;
}

export async function generateNovel(params: GenerateNovelParams): Promise<NovelResponse> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await axios.post(`${API_BASE}/novel/generate`, params, { headers });

  return response.data;
}

export interface ContextMetadata {
  selectedParagraphs: number;
  totalParagraphs: number;
  selectedWords: number;
  totalWords: number;
  strategy: 'recent' | 'relevant' | 'mixed';
  requestedStrategy?: 'precision' | 'balanced' | 'extended';
  requestedWindow?: number;
}

export interface ContinueNovelResponse {
  story: string;
  usage?: {
    tokens: number;
  };
  knowledgeUsed?: string[];
  contextMetadata?: ContextMetadata;
}

export async function continueNovel(
  context: string,
  prompt: string,
  characters?: Array<{ name: string; description: string }>,
  style?: WritingStyle | null,
  language?: string,
  knowledge?: KnowledgeEntry[],
  contextStrategy?: 'precision' | 'balanced' | 'extended',
  contextWindowWords?: number
): Promise<ContinueNovelResponse> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await axios.post<ContinueNovelResponse>(
    `${API_BASE}/novel/continue`,
    { context, prompt, characters, style, language, knowledge, contextStrategy, contextWindowWords },
    { headers }
  );

  return response.data;
}

const AI_ACTION_PROMPTS: Record<AiAction, string> = {
  rewrite:
    'Rewrite the provided passage, preserving meaning while improving clarity, pacing, and style. Return only the rewritten passage.',
  tone:
    'Adjust the tone of the passage to feel more emotionally resonant and immersive, keeping key plot beats intact. Return only the adjusted passage.',
  suggest:
    'Provide three concise plot suggestions for how this passage could evolve next. Return them as a numbered list.',
  detect:
    'Review the passage for continuity errors, plot holes, or inconsistencies. Return a bullet list describing each issue you find.',
  storyTree:
    'Analyze the passage and outline its narrative structure. Return a JSON array where each item has "act", "summary", and "beats" (array of {title, conflict, outcome}).',
  sceneBeats:
    'Break the passage into sequential scene beats. Return a JSON array of {beat, tension, pacing, recommendation}.',
  characterArc:
    'Identify each major character mentioned and summarize their current state. Return a JSON array of {character, goal, obstacle, emotionalState, nextStep}.'
};

export interface StoryTreeAct {
  act: string;
  summary: string;
  beats: Array<{ title: string; conflict: string; outcome: string }>;
}

export interface SceneBeatSummary {
  beat: string;
  tension: string;
  pacing: string;
  recommendation: string;
}

export interface CharacterArcSummary {
  character: string;
  goal: string;
  obstacle: string;
  emotionalState: string;
  nextStep: string;
}

export interface AssistResponse {
  action: AiAction;
  result:
    | string
    | string[]
    | Array<{ title: string; description: string }>
    | Array<{ type: string; severity: string; message: string }>
    | StoryTreeAct[]
    | SceneBeatSummary[]
    | CharacterArcSummary[];
  usage?: {
    tokens: number;
  };
  knowledgeUsed?: string[];
}

export async function assistWithText(
  action: AiAction,
  text: string,
  options: {
    characters?: Array<{ name: string; description: string }>;
    style?: WritingStyle | null;
    language?: string;
    knowledge?: KnowledgeEntry[];
    targetTone?: string; // For tone adjustment
    contextStrategy?: 'precision' | 'balanced' | 'extended';
    contextWindowWords?: number;
  } = {}
): Promise<AssistResponse> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await axios.post<AssistResponse>(
    `${API_BASE}/novel/assist`,
    { action, text, options },
    { headers }
  );
  return response.data;
}

// Reading Insights LLM API
export interface ReadingInsightsAnalysis {
  pacing: { summary: string; detail: string };
  tone: { summary: string; detail: string };
  characters: { summary: string; detail: string };
}

export async function analyzeReadingInsights(
  pacing: { summary: string; detail: string },
  tone: { summary: string; detail: string },
  characters: { summary: string; detail: string },
  sampleText: string
): Promise<ReadingInsightsAnalysis> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await axios.post<ReadingInsightsAnalysis>(
    `${API_BASE}/novel/analysis`,
    { pacing, tone, characters, sampleText },
    { headers }
  );
  return response.data;
}

// Style Memory LLM API
export interface StyleAnalysisResponse {
  description: string;
  traits: string[];
  generatedBy: 'LLM';
}

export async function analyzeStyleWithLLM(text: string): Promise<StyleAnalysisResponse> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await axios.post<StyleAnalysisResponse>(
    `${API_BASE}/novel/style/analyze`,
    { text },
    { headers }
  );
  return response.data;
}

export interface ExtractedKnowledgeEntry {
  title: string;
  category: 'character' | 'location' | 'artifact' | 'faction' | 'custom';
  summary: string;
  details?: string;
}

export interface ExtractKnowledgeResponse {
  entries: ExtractedKnowledgeEntry[];
  usage: {
    tokens: number;
  };
}

export async function extractKnowledgeFromText(text: string): Promise<ExtractKnowledgeResponse> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await axios.post<ExtractKnowledgeResponse>(
    `${API_BASE}/novel/knowledge/extract`,
    { text },
    { headers }
  );
  return response.data;
}


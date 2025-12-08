// API请求和响应类型定义

// 小说生成请求
export interface GenerateNovelRequest {
  genre: string;
  idea: string;
  length: number;
  type?: 'full' | 'outline';
  characters?: Array<{ name: string; description: string }>;
  style?: any;
  language?: string;
  knowledge?: Array<{ id?: string; title: string; summary: string; details?: string; category?: string }>;
  contextStrategy?: 'precision' | 'balanced' | 'extended';
  contextWindowWords?: number;
}

// 小说生成响应
export interface GenerateNovelResponse {
  content?: string;
  outline?: string;
  chapters?: Array<{ title: string; content: string }>;
  actualLength?: number;
  isPartial?: boolean;
  type: 'full' | 'outline';
}

// 小说续写请求
export interface ContinueNovelRequest {
  context: string;
  prompt?: string;
  characters?: Array<{ name: string; description: string }>;
  style?: any;
  language?: string;
  knowledge?: Array<{ id?: string; title: string; summary: string; details?: string; category?: string }>;
  contextStrategy?: 'precision' | 'balanced' | 'extended';
  contextWindowWords?: number;
}

// 上下文元数据
export interface ContextMetadata {
  selectedParagraphs: number;
  totalParagraphs: number;
  selectedWords: number;
  totalWords: number;
  strategy: 'recent' | 'relevant' | 'mixed' | 'compressed';
  requestedStrategy?: 'precision' | 'balanced' | 'extended';
  requestedWindow?: number;
}

// 小说续写响应
export interface ContinueNovelResponse {
  story: string;
  usage?: {
    tokens: number;
  };
  knowledgeUsed?: string[];
  contextMetadata?: ContextMetadata;
}

// AI辅助请求类型
export type AiAction = 
  | 'rewrite'
  | 'tone'
  | 'suggest'
  | 'detect'
  | 'storyTree'
  | 'sceneBeats'
  | 'characterArc';

// AI辅助请求
export interface AssistRequest {
  action: AiAction;
  text: string;
  options?: {
    characters?: Array<{ name: string; description: string }>;
    style?: any;
    language?: string;
    knowledge?: Array<{ id?: string; title: string; summary: string; details?: string; category?: string }>;
    targetTone?: string;
    contextStrategy?: 'precision' | 'balanced' | 'extended';
    contextWindowWords?: number;
  };
}

// 故事树结构
export interface StoryTreeAct {
  act: string;
  summary: string;
  beats: Array<{ title: string; conflict: string; outcome: string }>;
}

// 场景节拍
export interface SceneBeatSummary {
  beat: string;
  tension: string;
  pacing: string;
  recommendation: string;
}

// 角色弧光
export interface CharacterArcSummary {
  character: string;
  goal: string;
  obstacle: string;
  emotionalState: string;
  nextStep: string;
}

// AI辅助响应
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

// 阅读洞察分析请求
export interface ReadingInsightsAnalysisRequest {
  pacing: { summary: string; detail: string };
  tone: { summary: string; detail: string };
  characters: { summary: string; detail: string };
  sampleText: string;
}

// 阅读洞察分析响应
export interface ReadingInsightsAnalysis {
  pacing: { summary: string; detail: string };
  tone: { summary: string; detail: string };
  characters: { summary: string; detail: string };
}

// 风格分析请求
export interface StyleAnalysisRequest {
  text: string;
}

// 风格分析响应
export interface StyleAnalysisResponse {
  description: string;
  traits: string[];
  generatedBy: 'LLM';
}

// 知识提取请求
export interface ExtractKnowledgeRequest {
  text: string;
}

// 提取的知识条目
export interface ExtractedKnowledgeEntry {
  title: string;
  category: 'character' | 'location' | 'artifact' | 'faction' | 'custom';
  summary: string;
  details?: string;
}

// 知识提取响应
export interface ExtractKnowledgeResponse {
  entries: ExtractedKnowledgeEntry[];
  usage: {
    tokens: number;
  };
}

// API错误响应
export interface ApiErrorResponse {
  message: string;
  error?: string;
  stack?: string;
  timestamp: number;
  code?: string;
}

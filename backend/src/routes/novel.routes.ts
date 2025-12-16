import { Router } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { recordUsage } from '../services/userStore';
import { aiGenerationRateLimit } from '../middleware/rateLimit';
import { checkAndDeductPoints, refundPoints } from '../lib/billing-guard';
import type { ActionType } from '../config/billing';

// 确保在读取环境变量前加载 .env
dotenv.config();

const router = Router();
// Get API keys from environment variables
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const apiKey = deepseekApiKey || openaiApiKey;

// Validate API key
const isValidApiKey = apiKey && apiKey.length > 10;

if (!isValidApiKey) {
  console.error('⚠️  警告：API Key 未找到或格式不正确！');
  console.error('请在 backend/.env 文件中设置有效的 DEEPSEEK_API_KEY 或 OPENAI_API_KEY');
  console.error('当前 API Key 状态:', deepseekApiKey ? 'DeepSeek已配置' : openaiApiKey ? 'OpenAI已配置' : '未配置');
  console.error('配置示例可参考 .env.example 文件');
}

// Create OpenAI client with proper API key handling
const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL: deepseekApiKey ? 'https://api.deepseek.com/v1' : undefined
});

const splitIntoChapters = (text: string) => {
  const sections = text.split(/(?:^|\n)#+\s*Chapter\s*\d+[^\n]*/gi);
  if (sections.length <= 1) {
    return [
      {
        title: 'Chapter 1',
        content: text.trim()
      }
    ];
  }

  const titles = text.match(/(?:^|\n)(#+\s*Chapter\s*\d+[^\n]*)/gi) || [];
  return sections
    .slice(1)
    .map((content, index) => ({
      title: titles[index]?.replace(/#+\s*/, '').trim() || `Chapter ${index + 1}`,
      content: content.trim()
    }))
    .filter((chapter) => chapter.content.length > 0);
};

const LANGUAGE_OVERRIDES: Record<string, string> = {
  english: 'Write entirely in English.',
  spanish: 'Write entirely in Spanish.',
  chinese: 'Write entirely in Simplified Chinese.',
  japanese: 'Write entirely in Japanese.'
};

const buildLanguageInstruction = (idea: string, languageOverride?: string) => {
  const snippet = idea.slice(0, 160);
  const baseReminder = snippet
    ? `Mirror the tone and language of this idea: """${snippet}"""`.trim()
    : '';

  if (languageOverride && languageOverride !== 'auto') {
    const explicit = LANGUAGE_OVERRIDES[languageOverride] || `Write entirely in ${languageOverride}.`;
    return `${explicit} ${baseReminder}`.trim();
  }

  if (/[\u4e00-\u9fff]/.test(idea)) {
    return `Write entirely in Simplified Chinese. ${baseReminder} Do not provide translations or English subtitles.`;
  }
  if (/[\u3040-\u30ff]/.test(idea)) {
    return `Write entirely in Japanese. ${baseReminder}`;
  }
  if (/[\uac00-\ud7af]/.test(idea)) {
    return `Write entirely in Korean. ${baseReminder}`;
  }
  if (/[а-яА-ЯёЁ]/.test(idea)) {
    return `Write entirely in Russian. ${baseReminder}`;
  }
  if (/[áéíóúñüÁÉÍÓÚÑÜ]/.test(idea)) {
    return `Write entirely in the same Spanish variant used in the idea. ${baseReminder}`;
  }

  return `Write entirely in English. ${baseReminder} Do not change languages.`;
};

interface KnowledgeEntryPayload {
  id?: string;
  title: string;
  summary: string;
  details?: string;
  category?: string;
}

const buildKnowledgeContext = (knowledge?: KnowledgeEntryPayload[]): { context: string; usedIds: string[] } => {
  if (!knowledge || knowledge.length === 0) return { context: '', usedIds: [] };

  const trimmed = knowledge.slice(0, 6);
  const formatted = trimmed
    .map(
      (entry, idx) =>
        `${idx + 1}. ${entry.title}${entry.category ? ` (${entry.category})` : ''}: ${entry.summary}${
          entry.details ? ` Key details: ${entry.details}` : ''
        }`
    )
    .join('\n');

  const usedIds = trimmed.map((entry) => entry.id).filter((id): id is string => Boolean(id));

  return {
    context: `\n\nReference knowledge (maintain consistency with these facts):\n${formatted}`,
    usedIds
  };
};

// Generate novel
// Helper function to build style instruction from WritingStyle object
const buildStyleInstruction = (style: any): string => {
  if (!style) return '';
  
  const instructions: string[] = [];
  
  if (style.preset === 'literary') {
    instructions.push('Write in a sophisticated, literary style with rich vocabulary and introspective depth.');
  } else if (style.preset === 'commercial') {
    instructions.push('Write in an accessible, engaging commercial fiction style that appeals to a broad audience.');
  } else if (style.preset === 'experimental') {
    instructions.push('Write in an unconventional, artistic style that experiments with form and language.');
  } else if (style.preset === 'custom' && style.customTraits) {
    // Use custom traits learned from user's writing
    const traitMap: Record<string, string> = {};
    style.customTraits.forEach((trait: string) => {
      const [key, value] = trait.split(':').map(s => s.trim());
      if (key && value) traitMap[key.toLowerCase()] = value;
    });
    
    if (traitMap.tone) {
      if (traitMap.tone === 'formal') instructions.push('Use a formal, polished tone.');
      else if (traitMap.tone === 'casual') instructions.push('Use a casual, conversational tone.');
      else if (traitMap.tone === 'poetic') instructions.push('Use a poetic, lyrical tone with vivid imagery.');
    }
    
    if (traitMap.pacing) {
      if (traitMap.pacing === 'fast') instructions.push('Maintain a fast-paced narrative with shorter sentences and dynamic action.');
      else if (traitMap.pacing === 'slow') instructions.push('Use a slower, more contemplative pacing with longer, descriptive sentences.');
    }
    
    if (traitMap['sentence length']) {
      if (traitMap['sentence length'] === 'short') instructions.push('Prefer shorter, punchy sentences.');
      else if (traitMap['sentence length'] === 'long') instructions.push('Use longer, more complex sentences with rich detail.');
    }
    
    if (traitMap.vocabulary) {
      if (traitMap.vocabulary === 'complex') instructions.push('Use sophisticated vocabulary and nuanced language.');
      else if (traitMap.vocabulary === 'simple') instructions.push('Use clear, straightforward language.');
    }
  }
  
  return instructions.length > 0 ? `\n\nMaintain the user's writing voice and style: ${instructions.join(' ')}` : '';
};

router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      genre,
      idea,
      length,
      type = 'full',
      characters,
      style,
      language,
      knowledge,
      contextStrategy = 'balanced',
      contextWindowWords
    } = req.body;

    // 验证idea
    if (!idea || idea.trim().length < 15) {
      return res.status(400).json({ error: 'Your idea is a bit brief. Try adding more details about the setting, characters, or conflict.' });
    }
    
    // 验证length
    const parsedLength = parseInt(length, 10);
    if (isNaN(parsedLength) || parsedLength <= 0 || parsedLength > 1000) {
      return res.status(400).json({ error: 'Length must be a positive integer between 1 and 1000' });
    }
    
    // 验证genre
    const validGenres = ['general-fiction', 'literary-fiction', 'historical-fiction', 'mystery', 'thriller', 'horror', 'romance', 'fantasy', 'science-fiction', 'dystopian', 'adventure', 'young-adult', 'comedy', 'ai-themed', 'fan-fiction'];
    if (genre && !validGenres.includes(genre)) {
      return res.status(400).json({ error: `Invalid genre. Valid options are: ${validGenres.join(', ')}` });
    }
    
    // 验证type
    const validTypes = ['full', 'outline'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Valid options are: ${validTypes.join(', ')}` });
    }
    
    // 验证contextStrategy
    const validContextStrategies = ['precision', 'balanced', 'extended'];
    if (contextStrategy && !validContextStrategies.includes(contextStrategy)) {
      return res.status(400).json({ error: `Invalid contextStrategy. Valid options are: ${validContextStrategies.join(', ')}` });
    }
    
    // 验证contextWindowWords
    if (contextWindowWords !== undefined) {
      const parsedWindow = parseInt(contextWindowWords, 10);
      if (isNaN(parsedWindow) || parsedWindow <= 0 || parsedWindow > 64000) {
        return res.status(400).json({ error: 'contextWindowWords must be a positive integer between 1 and 64000' });
      }
    }
    
    // 验证characters格式
    if (characters && !Array.isArray(characters)) {
      return res.status(400).json({ error: 'Characters must be an array' });
    }
    
    // 验证knowledge格式
    if (knowledge && !Array.isArray(knowledge)) {
      return res.status(400).json({ error: 'Knowledge must be an array' });
    }

    // Get user ID from request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Map request type to billing action
    const action: ActionType = type === 'outline' ? 'GENERATE_OUTLINE' : 'GENERATE_CHAPTER';
    
    // Step 1: Check and deduct points
    const billingResult = await checkAndDeductPoints(userId, action);
    if (!billingResult.permitted) {
      return res.status(402).json({ 
        error: 'Insufficient points for this operation',
        remainingPoints: billingResult.remainingPoints
      });
    }

    const requestedContextWindow = Math.min(
      contextWindowWords ||
        (contextStrategy === 'precision' ? 2000 : contextStrategy === 'extended' ? 8000 : 4000),
      32000  // Upgraded from 16K to 32K for Unlimited tier
    );
    console.log('[Generate] Context strategy:', contextStrategy, 'window words:', requestedContextWindow);

    // Build system prompt based on genre
    const genrePrompts: Record<string, string> = {
      'general-fiction': 'You are a professional fiction writer. Write engaging, character-driven stories with universal themes.',
      'literary-fiction': 'You are a literary fiction writer. Write sophisticated, introspective stories that explore complex themes, character psychology, and social commentary.',
      'historical-fiction': 'You are a historical fiction writer. Write stories set in specific historical periods with accurate details, period-appropriate dialogue, and authentic settings.',
      'mystery': 'You are a mystery writer. Write stories with puzzles, investigations, clues, red herrings, and satisfying reveals.',
      'thriller': 'You are a thriller writer. Write high-stakes narratives with tension, action, and suspense that keep readers on edge.',
      'horror': 'You are a horror writer. Write stories that create fear, dread, and unease through atmosphere, psychological tension, and supernatural or psychological elements.',
      'romance': 'You are a romance writer. Write love stories with emotional depth, character chemistry, and satisfying romantic arcs.',
      'fantasy': 'You are a fantasy writer. Write stories with magic, mythical creatures, epic quests, and richly imagined worlds.',
      'science-fiction': 'You are a science fiction writer. Write futuristic, technological, or space-oriented stories that explore scientific concepts and their implications.',
      'dystopian': 'You are a dystopian fiction writer. Write stories set in oppressive, futuristic societies that explore themes of control, resistance, and human nature.',
      'adventure': 'You are an adventure writer. Write stories with exciting journeys, physical challenges, exploration, and heroic quests.',
      'young-adult': 'You are a young adult (YA) fiction writer. Write stories with teenage protagonists, coming-of-age themes, and relatable challenges that resonate with young readers.',
      'comedy': 'You are a comedy writer. Write humorous stories with wit, satire, absurd situations, and comedic timing that entertains readers.',
      'ai-themed': 'You are a science fiction writer specializing in AI-themed novels. Write stories about artificial intelligence, robots, the future of technology, and the relationship between humans and machines.',
      'fan-fiction': 'You are a fan fiction writer. Write stories based on existing universes and characters, staying true to the source material while exploring new scenarios.'
    };

    const languageInstruction = buildLanguageInstruction(idea, language);
    const knowledgeResult = buildKnowledgeContext(knowledge);
    const knowledgeContext = knowledgeResult.context;
    
    // Build character context if provided
    let characterContext = '';
    if (characters && Array.isArray(characters) && characters.length > 0) {
      const characterDescriptions = characters
        .filter(c => c.name && c.description)
        .map(c => `- ${c.name}: ${c.description}`)
        .join('\n');
      if (characterDescriptions) {
        characterContext = `\n\nCharacter information (use these characters consistently throughout the story):\n${characterDescriptions}`;
      }
    }
    
    // Build style instruction if provided
    const styleInstruction = buildStyleInstruction(style);
    
    const systemPrompt = `${genrePrompts[genre] || genrePrompts['general-fiction']}${characterContext ? ' Pay special attention to character consistency based on the provided character information.' : ''}${styleInstruction}${knowledgeContext} ${languageInstruction}`;

    // Calculate approximate word count (1 page ≈ 250 words)
    const targetWords = length * 250;

    if (type === 'outline') {
      // Generate outline
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: 'deepseek-chat', // DeepSeek 模型名称
          messages: [
            {
              role: 'system' as const,
              content: `${systemPrompt} Create a detailed book outline with chapters and key plot points.`
            },
            {
              role: 'user' as const,
              content: `Create a ${length}-page ${genre} novel outline based on this idea: ${idea}\nLanguage requirement: ${languageInstruction}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.8
        });
      } catch (error: any) {
        console.error('Error calling DeepSeek API for outline:', error);
        // Refund points if API call failed
        if (billingResult.pointsDeducted > 0) {
          await refundPoints(userId, billingResult.pointsDeducted);
        }
        throw error;
      }

      return res.json({
        outline: completion.choices[0].message.content,
        type: 'outline',
        remainingPoints: billingResult.remainingPoints
      });
    } else {
      // 优化：对于长小说，先生成一个较短的版本（前几章）
      // 60页 ≈ 15000字，但为了快速测试，我们先生成约5000字（20页左右）
      const isLongNovel = length > 100;
      const actualLength = isLongNovel ? Math.min(length, 100) : length;
      const targetWordsForGeneration = actualLength * 250; // 实际生成的字数
      
      console.log(`开始生成 ${actualLength} 页小说（约 ${targetWordsForGeneration} 字）...`);
      
      // 对于长小说，只生成前几章，而不是完整小说
      const chunks = Math.ceil(targetWordsForGeneration / 4000); // 每块4000字，减少API调用次数
      let fullContent = '';
      
      try {
        for (let i = 0; i < chunks; i++) {
          console.log(`生成第 ${i + 1}/${chunks} 部分...`);
          
          const completion = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
              { role: 'system' as const, content: systemPrompt },
              {
                role: 'user' as const,
                content: i === 0
                  ? `Write the beginning chapters (about ${actualLength} pages) of a ${genre} novel based on this idea: ${idea}.${characterContext ? `\n${characterContext}` : ''} Make it engaging and well-written.\nLanguage requirement: ${languageInstruction}`
                  : `Continue the novel from where we left off.${characterContext ? `\n${characterContext}` : ''} Continue the story naturally and maintain consistency.\nLanguage requirement: ${languageInstruction}`
              },
              ...(i > 0 ? [{ role: 'assistant' as const, content: fullContent.slice(-3000) }] : [])
            ],
            max_tokens: 4000, // 增加每次生成的token数
            temperature: 0.8
          });

          fullContent += completion.choices[0].message.content + '\n\n';
          console.log(`第 ${i + 1} 部分完成，当前总字数：约 ${fullContent.length} 字`);
        }

        if (isLongNovel) {
          fullContent += '\n\n[注：这是小说的前几章。如需完整版本，请分多次生成或使用"续写"功能继续创作。]';
        }

        console.log(`生成完成！总字数：约 ${fullContent.length} 字`);
        const chapters = splitIntoChapters(fullContent);
        
        // Record usage: 1 generation + pages used
        const pagesUsed = Math.ceil(fullContent.length / 1250); // ~250 words per page, ~5 chars per word
        const totalTokens = chunks * 4000; // Rough estimate
        await recordUsage(userId, {
          generations: 1,
          pages: pagesUsed,
          tokens: totalTokens
        });
        console.log(`[Usage] Recorded: 1 generation, ${pagesUsed} pages, ~${totalTokens} tokens`);
        
        return res.json({
          content: fullContent,
          chapters,
          type: 'full',
          actualLength: actualLength,
          isPartial: isLongNovel,
          remainingPoints: billingResult.remainingPoints
        });
      } catch (error: any) {
        console.error('Error during content generation:', error);
        // Refund points if generation failed
        if (billingResult.pointsDeducted > 0) {
          await refundPoints(userId, billingResult.pointsDeducted);
        }
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error generating novel:', error);
    res.status(500).json({ error: error.message || 'Failed to generate novel' });
  }
});

// Scene detection helper (simple keyword-based, no API cost)
const detectSceneType = (text: string): string => {
  if (!text || text.trim().length < 50) {
    return 'mixed';
  }

  const words = text.split(/\s+/);
  const recentText = words.slice(-500).join(' ').toLowerCase();

  // Action scene indicators
  const actionKeywords = [
    'fought', 'battle', 'attacked', 'sword', 'gun', 'ran', 'chased',
    'exploded', 'fired', 'struck', 'hit', 'punch', 'kick', 'fled',
    'rushed', 'charged', 'dodged', 'blocked', 'defended', 'combat',
    'fight', 'war', 'conflict', 'struggle', 'violence', 'action'
  ];

  // Emotional scene indicators
  const emotionalKeywords = [
    'felt', 'heart', 'love', 'tears', 'cried', 'emotion', 'feeling',
    'sad', 'happy', 'angry', 'fear', 'joy', 'sorrow', 'pain', 'hurt',
    'comfort', 'embrace', 'hug', 'kiss', 'touch', 'warmth', 'cold',
    'lonely', 'missed', 'longed', 'desire', 'passion', 'affection'
  ];

  // Dialogue scene indicators
  const dialogueKeywords = [
    'said', 'asked', 'replied', 'answered', 'whispered', 'shouted',
    'spoke', 'told', 'explained', 'argued', 'discussed', 'conversation',
    'talk', 'chat', 'dialogue', 'voice', 'words', 'speech', 'quote'
  ];

  // Descriptive scene indicators
  const descriptiveKeywords = [
    'looked', 'saw', 'appeared', 'seemed', 'noticed', 'observed',
    'described', 'detailed', 'showed', 'displayed', 'revealed',
    'landscape', 'scenery', 'view', 'scene', 'setting', 'environment',
    'surroundings', 'atmosphere', 'ambiance', 'mood', 'weather'
  ];

  // Reflective scene indicators
  const reflectiveKeywords = [
    'thought', 'wondered', 'considered', 'reflected', 'realized',
    'remembered', 'recalled', 'understood', 'knew', 'believed',
    'philosophy', 'meaning', 'purpose', 'existence', 'life', 'death',
    'memory', 'past', 'future', 'time', 'eternity', 'infinity'
  ];

  const actionCount = actionKeywords.filter(k => recentText.includes(k)).length;
  const emotionalCount = emotionalKeywords.filter(k => recentText.includes(k)).length;
  const dialogueCount = dialogueKeywords.filter(k => recentText.includes(k)).length;
  const descriptiveCount = descriptiveKeywords.filter(k => recentText.includes(k)).length;
  const reflectiveCount = reflectiveKeywords.filter(k => recentText.includes(k)).length;

  // Check for dialogue markers
  const dialogueMarkers = (recentText.match(/["']/g) || []).length;
  if (dialogueMarkers > 10 || dialogueCount > 3) {
    return 'dialogue';
  }

  const counts = [
    { type: 'action', count: actionCount },
    { type: 'emotional', count: emotionalCount },
    { type: 'descriptive', count: descriptiveCount },
    { type: 'reflective', count: reflectiveCount }
  ];

  counts.sort((a, b) => b.count - a.count);

  if (counts[0].count >= 3) {
    return counts[0].type;
  }

  return 'mixed';
};

// Adjust style for scene type
const adjustStyleForScene = (baseInstruction: string, scene: string): string => {
  const adjustments: string[] = [];

  switch (scene) {
    case 'action':
      adjustments.push('Use fast-paced, dynamic language with shorter sentences.');
      adjustments.push('Focus on action verbs and physical movement.');
      adjustments.push('Create urgency and momentum.');
      break;

    case 'emotional':
      adjustments.push('Use slower, more introspective pacing with longer, descriptive sentences.');
      adjustments.push('Focus on internal feelings and emotional depth.');
      adjustments.push('Create emotional resonance and connection.');
      break;

    case 'dialogue':
      adjustments.push('Focus on character voices and natural speech patterns.');
      adjustments.push('Use varied sentence lengths to reflect different speaking styles.');
      adjustments.push('Maintain character consistency in dialogue.');
      break;

    case 'descriptive':
      adjustments.push('Use rich, detailed descriptions with longer sentences.');
      adjustments.push('Focus on sensory details and immersive imagery.');
      adjustments.push('Create vivid, tangible settings.');
      break;

    case 'reflective':
      adjustments.push('Use contemplative, philosophical language.');
      adjustments.push('Focus on deeper meanings and introspection.');
      adjustments.push('Create thoughtful, meditative pacing.');
      break;
  }

  if (adjustments.length > 0) {
    return `${baseInstruction} ${adjustments.join(' ')}`;
  }

  return baseInstruction;
};

// Smart context selection: intelligently select relevant paragraphs instead of simple truncation
interface ContextMetadata {
  selectedParagraphs: number;
  totalParagraphs: number;
  selectedWords: number;
  totalWords: number;
  strategy: 'recent' | 'relevant' | 'mixed';
}

interface SmartContextResult {
  selectedText: string;
  metadata: ContextMetadata;
}

const selectSmartContext = (
  fullContext: string,
  characters?: Array<{ name: string; description: string }>,
  maxWords: number = 2000
): SmartContextResult => {
  // Early exit for empty or short context
  if (!fullContext || fullContext.trim().length < 100) {
    // Fast word count using regex match instead of split
    const wordCount = (fullContext.match(/\S+/g) || []).length;
    return {
      selectedText: fullContext,
      metadata: {
        selectedParagraphs: 1,
        totalParagraphs: 1,
        selectedWords: wordCount,
        totalWords: wordCount,
        strategy: 'recent'
      }
    };
  }

  // Split into paragraphs (single pass, optimized regex)
  const paragraphs = fullContext.split(/\n{2,}/).filter(p => p.trim().length > 0);
  
  // Fast total word count using regex match instead of split
  const totalWords = (fullContext.match(/\S+/g) || []).length;
  
  // Early exit if content is short enough
  if (totalWords <= maxWords) {
    return {
      selectedText: fullContext,
      metadata: {
        selectedParagraphs: paragraphs.length,
        totalParagraphs: paragraphs.length,
        selectedWords: totalWords,
        totalWords,
        strategy: 'recent'
      }
    };
  }

  // Extract character names for relevance scoring (optimized)
  const characterNamesSet = new Set<string>();
  const characterPatterns: RegExp[] = [];
  
  if (characters && characters.length > 0) {
    for (const c of characters) {
      if (c.name) {
        // Add full name
        const lowerName = c.name.toLowerCase();
        characterNamesSet.add(lowerName);
        characterPatterns.push(new RegExp(`\\b${lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
        
        // Add first name if it's a full name and longer than 2 characters
        const firstName = c.name.split(/\s+/)[0];
        if (firstName && firstName.length > 2) {
          const lowerFirstName = firstName.toLowerCase();
          if (!characterNamesSet.has(lowerFirstName)) {
            characterNamesSet.add(lowerFirstName);
            characterPatterns.push(new RegExp(`\\b${lowerFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
          }
        }
      }
    }
  }
  
  // Pre-compile action verb patterns
  const actionVerbsPattern = /\b(ran|jumped|fought|attacked|moved|rushed|charged|struck|hit|fled|escaped|battled|defended|dodged)\b/gi;

  // Score each paragraph for relevance (optimized)
  interface ParagraphScore {
    text: string;
    index: number;
    score: number;
    wordCount: number;
  }

  // Pre-compute paragraph data (optimized: avoid unnecessary words array)
  const paragraphData = paragraphs.map((para, index) => {
    // Fast word count using regex match instead of split
    const wordCount = (para.match(/\S+/g) || []).length;
    const lowerPara = para.toLowerCase(); // Cache lowercase version
    
    return {
      text: para,
      lowerText: lowerPara,
      index,
      wordCount
    };
  });

  const scoredParagraphs: ParagraphScore[] = paragraphData.map((data) => {
    let score = 0;
    
    // 1. Recency weight: recent paragraphs are more important (exponential decay)
    const recencyWeight = Math.exp(-(paragraphs.length - data.index - 1) / 10);
    score += recencyWeight * 3;
    
    // 2. Character mentions: paragraphs mentioning characters are more relevant
    let characterMentions = 0;
    if (characterPatterns.length > 0) {
      // Early exit if we find at least one match
      for (const pattern of characterPatterns) {
        if (pattern.test(data.lowerText)) {
          characterMentions++;
          break; // Early exit after first match
        }
      }
    }
    score += characterMentions * 2;
    
    // 3. Dialogue markers: count quotes for dialogue detection
    let dialogueMarkers = 0;
    let quoteCount = 0;
    for (const char of data.text) {
      if (char === '"' || char === "'") {
        quoteCount++;
      }
    }
    dialogueMarkers = quoteCount;
    score += Math.min(dialogueMarkers / 5, 1) * 1;
    
    // 4. Action verbs: check for action scenes
    const actionMatches = data.lowerText.match(actionVerbsPattern);
    const actionCount = actionMatches ? actionMatches.length : 0;
    score += actionCount * 0.5;
    
    // 5. Length penalty: very short paragraphs might be less informative
    if (data.wordCount < 10) {
      score *= 0.7;
    }
    
    return {
      text: data.text,
      index: data.index,
      score,
      wordCount: data.wordCount
    };
  });

  // Sort by score (highest first)
  scoredParagraphs.sort((a, b) => b.score - a.score);

  // Select paragraphs until we reach maxWords (optimized)
  const selectedIndices = new Set<number>();
  let selectedWordCount = 0;
  const lastIndex = paragraphs.length - 1;

  // Always include the last paragraph (most recent) - add it first
  if (lastIndex >= 0) {
    const lastPara = scoredParagraphs.find(p => p.index === lastIndex);
    if (lastPara && lastPara.wordCount <= maxWords) {
      selectedIndices.add(lastIndex);
      selectedWordCount += lastPara.wordCount;
    }
  }

  // Then add other high-scoring paragraphs (optimized: early exit, skip duplicates)
  for (const para of scoredParagraphs) {
    if (selectedIndices.has(para.index)) continue;
    
    // Early exit if we're within 5% of the target
    if (selectedWordCount >= maxWords * 0.95) break;
    
    if (selectedWordCount + para.wordCount <= maxWords) {
      selectedIndices.add(para.index);
      selectedWordCount += para.wordCount;
    } else {
      // If adding this paragraph would exceed maxWords, check if we can fit a portion
      const remainingWords = maxWords - selectedWordCount;
      if (remainingWords > 50) {
        selectedIndices.add(para.index);
        selectedWordCount += remainingWords;
      }
      break;
    }
  }

  // Sort selected paragraphs by original index to maintain narrative flow
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  const sortedSelected = sortedIndices.map(idx => paragraphs[idx]);

  const strategy = selectedIndices.size === paragraphs.length ? 'recent' :
                   selectedIndices.has(paragraphs.length - 1) && selectedIndices.size > 1 ? 'mixed' : 'relevant';

  // Compress long paragraphs if needed (optimized algorithm)
  const compressedParagraphs = sortedSelected.map(para => {
    // Fast word count using regex match instead of split
    const wordCount = (para.match(/\S+/g) || []).length;
    
    if (wordCount > 200) {
      // For very long paragraphs, compress by keeping:
      // 1. First 50 words (introduction)
      // 2. Last 50 words (conclusion)
      // 3. Sentences with character names or dialogue
      
      // Fast word split for first and last parts
      const words = para.split(/\s+/);
      const firstPart = words.slice(0, 50).join(' ');
      const lastPart = words.slice(-50).join(' ');
      
      // Extract sentences with character mentions or dialogue (optimized)
      const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const importantSentences: string[] = [];
      
      // Limit sentence processing for performance
      const maxSentencesToCheck = Math.min(sentences.length, 15); // Reduced from 20 to 15
      
      for (let i = 0; i < maxSentencesToCheck && importantSentences.length < 3; i++) {
        const sentence = sentences[i];
        const sentenceLower = sentence.toLowerCase();
        
        // Check for character mentions or dialogue
        let hasImportantContent = false;
        
        // Check for dialogue (fast: check for quotes)
        if (sentence.includes('"') || sentence.includes("'")) {
          hasImportantContent = true;
        } 
        // Check for character mentions if needed
        else if (characterPatterns.length > 0) {
          for (const pattern of characterPatterns) {
            if (pattern.test(sentenceLower)) {
              hasImportantContent = true;
              break; // Early exit once found
            }
          }
        }
        
        if (hasImportantContent) {
          importantSentences.push(sentence.trim());
        }
      }
      
      // Combine: first part + important sentences + last part
      const compressed = [firstPart, ...importantSentences.slice(0, 3), lastPart]
        .filter(Boolean)
        .join('... ');
      
      return compressed.length < para.length ? compressed : para;
    }
    return para;
  });

  return {
    selectedText: compressedParagraphs.join('\n\n'),
    metadata: {
      selectedParagraphs: sortedSelected.length,
      totalParagraphs: paragraphs.length,
      selectedWords: selectedWordCount,
      totalWords,
      strategy
    }
  };
};

// Continue writing
router.post('/continue', authMiddleware, aiGenerationRateLimit, async (req: AuthRequest, res) => {
  try {
    const {
      context,
      prompt,
      characters,
      style,
      language,
      knowledge,
      contextStrategy = 'balanced',
      contextWindowWords
    } = req.body;
    
    // 验证context
    if (!context || context.trim().length < 50) {
      return res.status(400).json({ error: 'Context is required and must be at least 50 characters and not just whitespace' });
    }
    
    // 验证contextStrategy
    const validContextStrategies = ['precision', 'balanced', 'extended'];
    if (contextStrategy && !validContextStrategies.includes(contextStrategy)) {
      return res.status(400).json({ error: `Invalid contextStrategy. Valid options are: ${validContextStrategies.join(', ')}` });
    }
    
    // 验证contextWindowWords
    if (contextWindowWords !== undefined) {
      const parsedWindow = parseInt(contextWindowWords, 10);
      if (isNaN(parsedWindow) || parsedWindow <= 0 || parsedWindow > 64000) {
        return res.status(400).json({ error: 'contextWindowWords must be a positive integer between 1 and 64000' });
      }
    }
    
    // 验证prompt（如果提供）
    if (prompt && typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt must be a string' });
    }
    
    // 验证characters格式
    if (characters && !Array.isArray(characters)) {
      return res.status(400).json({ error: 'Characters must be an array' });
    }
    
    // 验证knowledge格式
    if (knowledge && !Array.isArray(knowledge)) {
      return res.status(400).json({ error: 'Knowledge must be an array' });
    }
    
    // 验证language（如果提供）
    if (language && typeof language !== 'string') {
      return res.status(400).json({ error: 'Language must be a string' });
    }

    // Get user ID from request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Map to billing action for continuation
    const action: ActionType = 'GENERATE_CHAPTER';
    
    // Step 1: Check and deduct points
    const billingResult = await checkAndDeductPoints(userId, action);
    if (!billingResult.permitted) {
      return res.status(402).json({ 
        error: 'Insufficient points for this operation',
        remainingPoints: billingResult.remainingPoints
      });
    }

    const languageInstruction = buildLanguageInstruction(context, language);
    const knowledgeResult = buildKnowledgeContext(knowledge);
    const knowledgeContext = knowledgeResult.context;
    const usedKnowledgeIds = knowledgeResult.usedIds;

    // Smart context selection with compression support
    // Determine maxWords based on context length (Unlimited users can handle 32K words)
    const fallbackWindow =
      contextStrategy === 'precision' ? 2000 : contextStrategy === 'extended' ? 8000 : 4000;
    const requestedWindow = contextWindowWords || fallbackWindow;
    const maxWords = Math.min(requestedWindow, 32000); // Upgraded from 16K to 32K
    
    // Use compression for very long contexts (extended strategy)
    let recentContext: string;
    let contextMetadata: {
      selectedParagraphs: number;
      totalParagraphs: number;
      selectedWords: number;
      totalWords: number;
      strategy: string;
      requestedStrategy: string;
      requestedWindow: number;
    };
    
    if (contextStrategy === 'extended' && context.split(/\s+/).length > maxWords * 1.5) {
      const { selectSmartContextWithCompression } = await import('../utils/contextCompression');
      const compressed = selectSmartContextWithCompression(context, maxWords, characters, contextStrategy);
      recentContext = compressed.compressed;
      // Create metadata for compressed context
      const totalWords = context.split(/\s+/).length;
      contextMetadata = {
        selectedParagraphs: 1,
        totalParagraphs: 1,
        selectedWords: compressed.compressedLength,
        totalWords: compressed.originalLength,
        strategy: 'compressed',
        requestedStrategy: contextStrategy,
        requestedWindow: maxWords
      };
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Context Compression] Compressed ${compressed.originalLength} words to ${compressed.compressedLength} words (ratio: ${compressed.compressionRatio.toFixed(2)})`);
      }
    } else {
      const smartContext = selectSmartContext(context, characters, maxWords);
      recentContext = smartContext.selectedText;
      contextMetadata = {
        ...smartContext.metadata,
        requestedStrategy: contextStrategy,
        requestedWindow: maxWords
      };
    }
    
    console.log(
      `[Smart Context] Selected ${contextMetadata.selectedParagraphs}/${contextMetadata.totalParagraphs} paragraphs (${contextMetadata.selectedWords}/${contextMetadata.totalWords} words) using ${contextMetadata.strategy} strategy · requested=${contextStrategy}`
    );

    // Build character context if provided
    let characterContext = '';
    if (characters && Array.isArray(characters) && characters.length > 0) {
      const characterDescriptions = characters
        .filter(c => c.name && c.description)
        .map(c => `- ${c.name}: ${c.description}`)
        .join('\n');
      if (characterDescriptions) {
        characterContext = `\n\nCharacter information (maintain consistency with these characters):\n${characterDescriptions}`;
      }
    }

    // Build base style instruction
    let styleInstruction = buildStyleInstruction(style);

    // Detect scene type and adjust style accordingly
    const sceneType = detectSceneType(recentContext);
    console.log(`[Scene Detection] Detected scene type: ${sceneType}`);
    styleInstruction = adjustStyleForScene(styleInstruction, sceneType);
    if (sceneType !== 'mixed') {
      console.log(`[Style Adjustment] Applied ${sceneType} scene adjustments`);
    }

    const systemPrompt = `You are a professional fiction writer. Continue the story naturally from the provided context, maintaining consistency in tone, style, and character behavior.${characterContext ? ' Pay special attention to character consistency.' : ''}${styleInstruction}${knowledgeContext} ${languageInstruction}`;

    if (!isValidApiKey) {
      console.error('[Continue] API Key not configured or invalid');
      return res.status(500).json({ error: 'AI服务配置错误。请确保已在backend/.env文件中设置有效的DEEPSEEK_API_KEY或OPENAI_API_KEY，可参考.env.example文件。' });
    }

    console.log('[Continue] Calling LLM with context length:', recentContext.length);
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system' as const, content: systemPrompt },
          {
            role: 'user' as const,
            content: `Context (recent story content):\n${recentContext}${characterContext}\n\n${prompt || 'Continue the story naturally from where it left off. Maintain the same writing style and narrative flow.'}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });
    } catch (error: any) {
      console.error('Error calling DeepSeek API for continuation:', error);
      // Refund points if API call failed
      await refundPoints(userId, billingResult.pointsDeducted);
      throw error;
    }

    const continuedText = completion.choices[0].message.content || '';
    const totalTokens = completion.usage?.total_tokens || 0;

    // Record usage: pages used (continuation counts as generation too)
    if (userId) {
      const pagesUsed = Math.ceil(continuedText.length / 1250); // ~250 words per page, ~5 chars per word
      await recordUsage(userId, {
        generations: 1,
        pages: pagesUsed,
        tokens: totalTokens
      });
      console.log(`[Usage] Recorded continuation: 1 generation, ${pagesUsed} pages, ${totalTokens} tokens`);
    }

    res.json({ 
      story: continuedText.trim(),
      usage: {
        tokens: totalTokens
      },
      knowledgeUsed: usedKnowledgeIds.length > 0 ? usedKnowledgeIds : undefined,
      contextMetadata: contextMetadata, // Include context selection metadata
      remainingPoints: billingResult.remainingPoints
    });
  } catch (error: any) {
    console.error('[Continue] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to continue story';
    res.status(500).json({ error: errorMessage });
  }
});

// POST /api/novel/analysis - LLM-powered reading insights
router.post('/analysis', authMiddleware, async (req: AuthRequest, res) => {
  const { pacing, tone, characters, sampleText } = req.body || {};
  const pacingDetail = pacing?.detail || '';
  const toneDetail = tone?.detail || '';
  const charactersDetail = characters?.detail || '';

  try {
    console.log('[Analysis] Request received');
    
    if (!sampleText || sampleText.trim().length < 50) {
      console.log('[Analysis] Sample text too short:', sampleText?.length);
      return res.status(400).json({ error: 'Sample text is required and must be at least 50 characters' });
    }
    console.log('[Analysis] Processing with details:', { pacingDetail, toneDetail, charactersDetail });

    const prompt = `You are a literary analyst. Based on the following metrics and sample text, write a concise, literary summary (1-2 sentences) that feels natural and insightful. Then provide the technical detail in a separate field.

Metrics:
- Pacing: ${pacingDetail}
- Tone: ${toneDetail}
- Characters: ${charactersDetail}

Sample text (last 500 characters):
${sampleText.slice(-500)}

Return a JSON object with:
{
  "pacing": { "summary": "literary summary here", "detail": "${pacingDetail}" },
  "tone": { "summary": "literary summary here", "detail": "${toneDetail}" },
  "characters": { "summary": "literary summary here", "detail": "${charactersDetail}" }
}`;

    if (!isValidApiKey) {
      console.log('[Analysis] API Key not configured, using fallback analysis');
      // Fallback to local analysis if API key not configured
      return res.json({
        pacing: { summary: pacing?.summary || 'Pacing analysis', detail: pacingDetail },
        tone: { summary: tone?.summary || 'Tone analysis', detail: toneDetail },
        characters: { summary: characters?.summary || 'Character analysis', detail: charactersDetail }
      });
    }

    console.log('[Analysis] Calling LLM');
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system' as const, content: 'You are a literary analyst. Return only valid JSON, no markdown formatting.' },
        { role: 'user' as const, content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const content = completion.choices[0].message.content || '';
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      // Fallback if JSON parsing fails
      analysis = {
        pacing: { summary: pacing?.summary || 'Pacing analysis', detail: pacingDetail },
        tone: { summary: tone?.summary || 'Tone analysis', detail: toneDetail },
        characters: { summary: characters?.summary || 'Character analysis', detail: charactersDetail }
      };
    }

    res.json(analysis);
  } catch (error: any) {
    console.error('[Analysis] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to analyze text';
    // Fallback to local analysis on error
    console.log('[Analysis] Using fallback due to error');
    res.json({
      pacing: { summary: pacing?.summary || 'Pacing analysis', detail: pacingDetail },
      tone: { summary: tone?.summary || 'Tone analysis', detail: toneDetail },
      characters: { summary: characters?.summary || 'Character analysis', detail: charactersDetail }
    });
  }
});

// POST /api/novel/assist - AI Writing Assistant (enhanced with structured responses)
router.post('/assist', authMiddleware, aiGenerationRateLimit, async (req: AuthRequest, res) => {
  try {
    const { action, text, options = {} } = req.body;
    const { characters, style, language, knowledge, targetTone } = options;

    if (!action || !text || text.trim().length < 20) {
      return res.status(400).json({ error: 'Action and text (min 20 chars) are required' });
    }

    // Get user ID from request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Map to billing action for AI assistant
    const billingAction: ActionType = 'AI_CHAT';
    
    // Step 1: Check and deduct points
    const billingResult = await checkAndDeductPoints(userId, billingAction);
    if (!billingResult.permitted) {
      return res.status(402).json({ 
        error: 'Insufficient points for this operation',
        remainingPoints: billingResult.remainingPoints
      });
    }

    const languageInstruction = buildLanguageInstruction(text, language);
    const knowledgeResult = buildKnowledgeContext(knowledge);
    const knowledgeContext = knowledgeResult.context;
    const usedKnowledgeIds = knowledgeResult.usedIds;

    // Build character context if provided
    let characterContext = '';
    if (characters && Array.isArray(characters) && characters.length > 0) {
      const characterDescriptions = characters
        .filter(c => c.name && c.description)
        .map(c => `- ${c.name}: ${c.description}`)
        .join('\n');
      if (characterDescriptions) {
        characterContext = `\n\nCharacter information:\n${characterDescriptions}`;
      }
    }

    const styleInstruction = buildStyleInstruction(style);

    // Enhanced prompts for each action with structured output requirements
    const actionPrompts: Record<string, string> = {
      rewrite: `Rewrite the provided passage in 3 different styles:
1. More concise and punchy
2. More descriptive and immersive
3. More literary and refined

Return a JSON array with exactly 3 strings, each being one rewritten version. Format: ["version1", "version2", "version3"]`,

      tone: `Adjust the tone of the passage to be ${targetTone || 'more emotionally resonant'}. 
Return only the adjusted passage as a single string.`,

      suggest: `Based on this passage, provide 3 concise plot suggestions for what could happen next. 
Return a JSON array with exactly 3 objects, each with "title" and "description" fields. 
Format: [{"title": "Suggestion 1", "description": "..."}, ...]`,

      detect: `Review the passage for continuity errors, plot holes, character inconsistencies, or logical issues.
Return a JSON array of objects, each with "type" (error|warning|suggestion), "severity" (high|medium|low), and "message" fields.
Format: [{"type": "error", "severity": "high", "message": "..."}, ...]`,

      storyTree: `Outline the passage's macro story beats. Group beats into logical acts or movements.
Return a JSON array where each item is {"act": "Act name", "summary": "...", "beats": [{"title": "...", "conflict": "...", "outcome": "..."}]}.`,

      sceneBeats: `Break the passage into sequential scene beats. For each beat note the tension and pacing and one recommendation for improvement.
Return a JSON array of {"beat": "...", "tension": "...", "pacing": "...", "recommendation": "..."}.`,

      characterArc: `Identify each major character mentioned and summarize their current arc status.
Return a JSON array of {"character": "...", "goal": "...", "obstacle": "...", "emotionalState": "...", "nextStep": "..."}`
    };

    const userPrompt = actionPrompts[action] || actionPrompts.rewrite;
    const systemPrompt = `You are a professional fiction writing assistant. ${characterContext ? 'Pay attention to character consistency.' : ''}${styleInstruction}${knowledgeContext} ${languageInstruction}. Return only valid JSON, no markdown formatting.`;

    if (!isValidApiKey) {
      console.error('[Assist] API Key not configured or invalid');
      return res.status(500).json({ error: 'AI服务配置错误。请确保已在backend/.env文件中设置有效的DEEPSEEK_API_KEY或OPENAI_API_KEY，可参考.env.example文件。' });
    }

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system' as const, content: systemPrompt },
          {
            role: 'user' as const,
            content: `Passage:\n${text}\n\n${userPrompt}`
          }
        ],
        max_tokens:
          action === 'rewrite'
            ? 2000
            : action === 'suggest'
            ? 800
            : action === 'detect'
            ? 1000
            : action === 'storyTree'
            ? 1200
            : action === 'sceneBeats'
            ? 1100
            : action === 'characterArc'
            ? 1100
            : 1500,
        temperature: action === 'detect' || action === 'storyTree' || action === 'characterArc' ? 0.3 : 0.7
      });
    } catch (error: any) {
      console.error('Error calling DeepSeek API for assistant:', error);
      // Refund points if API call failed
      await refundPoints(userId, billingResult.pointsDeducted);
      throw error;
    }

    const content = completion.choices[0].message.content || '';
    const totalTokens = completion.usage?.total_tokens || 0;

    // Parse JSON response
    let result: any;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Normalize by action to always return arrays for structured actions
      if (action === 'rewrite') {
        if (Array.isArray(parsed)) {
          result = parsed;
        } else {
          result = [parsed];
        }
      } else if (action === 'suggest') {
        if (Array.isArray(parsed)) {
          result = parsed;
        } else if (parsed && Array.isArray(parsed.suggestions)) {
          result = parsed.suggestions;
        } else {
          result = [parsed];
        }
      } else if (action === 'detect') {
        if (Array.isArray(parsed)) {
          result = parsed;
        } else if (parsed && Array.isArray(parsed.issues)) {
          result = parsed.issues;
        } else {
          result = [parsed];
        }
      } else if (action === 'storyTree') {
        if (Array.isArray(parsed)) {
          result = parsed;
        } else if (parsed && Array.isArray(parsed.acts)) {
          result = parsed.acts;
        } else if (parsed && Array.isArray(parsed.storyTree)) {
          result = parsed.storyTree;
        } else {
          result = [parsed];
        }
      } else if (action === 'sceneBeats') {
        if (Array.isArray(parsed)) {
          result = parsed;
        } else if (parsed && Array.isArray(parsed.beats)) {
          result = parsed.beats;
        } else {
          result = [parsed];
        }
      } else if (action === 'characterArc') {
        if (Array.isArray(parsed)) {
          result = parsed;
        } else if (parsed && Array.isArray(parsed.arcs)) {
          result = parsed.arcs;
        } else if (parsed && Array.isArray(parsed.characters)) {
          result = parsed.characters;
        } else {
          result = [parsed];
        }
      } else if (action === 'tone') {
        // tone expects a single string; if JSON is returned, stringify it
        result = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      } else {
        result = parsed;
      }
    } catch (e) {
      // Fallback: if parsing fails, return as string for tone action, or wrap in array for others
      if (action === 'tone') {
        result = content.trim();
      } else if (action === 'rewrite') {
        result = [content.trim()];
      } else if (action === 'suggest') {
        result = [{ title: 'Suggestion', description: content.trim() }];
      } else if (action === 'storyTree') {
        result = [
          {
            act: 'Act I',
            summary: content.slice(0, 180),
            beats: []
          }
        ];
      } else if (action === 'sceneBeats') {
        result = [
          {
            beat: 'Scene beat',
            tension: 'unknown',
            pacing: 'moderate',
            recommendation: content.trim()
          }
        ];
      } else if (action === 'characterArc') {
        result = [
          {
            character: 'Protagonist',
            goal: 'unknown',
            obstacle: 'unknown',
            emotionalState: 'unclear',
            nextStep: content.slice(0, 180)
          }
        ];
      } else {
        result = [{ type: 'warning', severity: 'medium', message: content.trim() }];
      }
    }

    res.json({
      action,
      result,
      usage: {
        tokens: totalTokens
      },
      knowledgeUsed: usedKnowledgeIds.length > 0 ? usedKnowledgeIds : undefined,
      remainingPoints: billingResult.remainingPoints
    });
  } catch (error: any) {
    console.error('[Assist] Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to assist';
    res.status(500).json({ error: errorMessage });
  }
});

// Simple style analysis helper (fallback when LLM is unavailable)
const analyzeWritingStyle = (text: string) => {
  if (!text || text.trim().length < 100) {
    return {
      tone: 'neutral',
      pacing: 'moderate',
      perspective: 'third-person',
      sentenceLength: 'medium',
      vocabulary: 'moderate'
    };
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);

  // Simple tone detection
  const formalMarkers = /\b(shall|must|therefore|furthermore|indeed)\b/gi;
  const casualMarkers = /\b(yeah|gonna|wanna|gotta|kinda)\b/gi;
  const poeticMarkers = /\b(whisper|dance|gleam|twilight|eternal)\b/gi;
  
  const formalCount = (text.match(formalMarkers) || []).length;
  const casualCount = (text.match(casualMarkers) || []).length;
  const poeticCount = (text.match(poeticMarkers) || []).length;

  let tone: string = 'neutral';
  if (poeticCount > formalCount && poeticCount > casualCount) {
    tone = 'poetic';
  } else if (formalCount > casualCount * 2) {
    tone = 'formal';
  } else if (casualCount > 0) {
    tone = 'casual';
  }

  // Simple pacing detection
  const shortSentences = sentences.filter(s => s.split(/\s+/).length < 10).length;
  let pacing: string = 'moderate';
  if (shortSentences > sentences.length * 0.4) {
    pacing = 'fast';
  } else if (avgSentenceLength > 20) {
    pacing = 'slow';
  }

  // Simple perspective detection
  const firstPersonMarkers = /\b(I|me|my|mine|we|us|our)\b/gi;
  const firstPersonCount = (text.match(firstPersonMarkers) || []).length;
  const thirdPersonMarkers = /\b(he|she|they|him|her|them|his|hers|their)\b/gi;
  const thirdPersonCount = (text.match(thirdPersonMarkers) || []).length;

  let perspective: string = 'third-person';
  if (firstPersonCount > thirdPersonCount * 1.5) {
    perspective = 'first-person';
  } else if (firstPersonCount > 0 && thirdPersonCount > 0) {
    perspective = 'mixed';
  }

  // Simple sentence length detection
  let sentenceLength: string = 'medium';
  if (avgSentenceLength < 12) {
    sentenceLength = 'short';
  } else if (avgSentenceLength > 20) {
    sentenceLength = 'long';
  }

  // Simple vocabulary complexity
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  let vocabulary: string = 'moderate';
  if (avgWordLength < 4.5) {
    vocabulary = 'simple';
  } else if (avgWordLength > 5.5) {
    vocabulary = 'complex';
  }

  return { tone, pacing, perspective, sentenceLength, vocabulary };
};

// POST /api/novel/knowledge/extract - Extract knowledge from text
router.post('/knowledge/extract', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length < 100) {
      return res.status(400).json({ error: 'Text must be at least 100 characters' });
    }

    if (!isValidApiKey) {
      console.error('[Extract Knowledge] API Key not configured or invalid');
      return res.status(500).json({ error: 'AI服务配置错误。请确保已在backend/.env文件中设置有效的DEEPSEEK_API_KEY或OPENAI_API_KEY，可参考.env.example文件。' });
    }

    const prompt = `Analyze the following story text and extract knowledge entries that would be useful for maintaining consistency in future writing. Extract:
1. Characters (names, descriptions, key traits)
2. Locations (places, settings, important details)
3. Artifacts (objects, items, tools with significance)
4. Factions (groups, organizations, alliances)
5. Custom knowledge (world rules, magic systems, technology, etc.)

For each entry, provide:
- title: A clear, concise name
- category: One of: character, location, artifact, faction, custom
- summary: A brief description (1-2 sentences) suitable for AI context
- details: Optional additional details (if relevant)

Text to analyze:
${text.slice(0, 4000)}

Return a JSON array of knowledge entries. Each entry should have: title, category, summary, and optionally details. Extract only significant, reusable knowledge - avoid minor details that won't be referenced later.

Example format:
[
  {
    "title": "Aris Thorne",
    "category": "character",
    "summary": "A retired detective with perfect memory who can recall every detail of every case.",
    "details": "Has a clock that stopped at the moment of a crime. Called back from retirement."
  },
  {
    "title": "The Clockwork Manor",
    "category": "location",
    "summary": "A Victorian mansion where every mirror reflects a different time period.",
    "details": "The reflections are starting to step out into reality."
  }
]`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { 
          role: 'system' as const, 
          content: 'You are a knowledge extraction assistant. Analyze story text and extract structured knowledge entries. Return only valid JSON arrays, no markdown formatting.' 
        },
        { role: 'user' as const, content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const content = completion.choices[0].message.content || '';
    const totalTokens = completion.usage?.total_tokens || 0;

    // Parse JSON response
    let extracted: any[];
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
      
      // Validate structure
      if (!Array.isArray(extracted)) {
        extracted = [];
      }
      
      // Ensure each entry has required fields
      extracted = extracted
        .filter(entry => entry.title && entry.category && entry.summary)
        .map(entry => ({
          title: entry.title.trim(),
          category: entry.category.toLowerCase(),
          summary: entry.summary.trim(),
          details: entry.details?.trim() || undefined
        }));
    } catch (e) {
      console.error('[Extract Knowledge] Failed to parse JSON:', e);
      console.error('[Extract Knowledge] Raw response:', content);
      return res.status(500).json({ error: 'Failed to parse extracted knowledge' });
    }

    res.json({
      entries: extracted,
      usage: {
        tokens: totalTokens
      }
    });
  } catch (error: any) {
    console.error('[Extract Knowledge] Error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to extract knowledge';
    res.status(500).json({ error: errorMessage });
  }
});

// POST /api/novel/style/analyze - LLM-powered style analysis
router.post('/style/analyze', authMiddleware, async (req: AuthRequest, res) => {
  const { text } = req.body || {};

  try {
    if (!text || text.trim().length < 200) {
      return res.status(400).json({ error: 'Text sample must be at least 200 characters' });
    }

    const prompt = `Analyze the writing style of the following text sample with deep literary insight. Examine multiple dimensions of the writing style:

1. **Tone & Voice**: Emotional register, formality level, narrative voice (first/third person), authorial presence
2. **Pacing & Rhythm**: Sentence length variation, paragraph structure, narrative tempo, use of pauses and acceleration
3. **Sentence Structure**: Complexity (simple vs compound), parallelism, fragments, rhetorical devices
4. **Vocabulary & Diction**: Word choice sophistication, technical terms, colloquialisms, poetic language, unique expressions
5. **Literary Devices**: Metaphors, similes, imagery, symbolism, alliteration, repetition patterns
6. **Narrative Techniques**: Point of view shifts, time manipulation, scene transitions, dialogue style
7. **Emotional Expression**: Direct vs indirect emotion, intensity, emotional vocabulary
8. **Descriptive Style**: Sensory details, visual richness, abstraction level, concrete vs abstract balance
9. **Dialogue Characteristics**: Naturalness, formality, dialect, speech patterns, attribution style
10. **Unique Patterns**: Recurring phrases, signature expressions, distinctive stylistic quirks

Text sample:
${text.slice(0, 3000)}

Return a JSON object with:
{
  "description": "A comprehensive 3-4 sentence literary description capturing the essence of this writing style",
  "traits": [
    "Tone: [specific tone with examples]",
    "Pacing: [rhythm description with evidence]",
    "Perspective: [narrative perspective and voice]",
    "Sentence length: [pattern description]",
    "Vocabulary: [complexity and style]",
    "Literary devices: [key devices used]",
    "Narrative techniques: [distinctive techniques]",
    "Emotional expression: [how emotions are conveyed]",
    "Descriptive style: [sensory and visual approach]",
    "Dialogue style: [if applicable, dialogue characteristics]"
  ]
}`;

    if (!apiKey || apiKey.length < 10) {
      // Fallback to local analysis if API key not configured
      const localAnalysis = analyzeWritingStyle(text);
      return res.json({
        description: 'A balanced writing style with moderate pacing and clear narrative voice.',
        traits: [
          `Tone: ${localAnalysis.tone}`,
          `Pacing: ${localAnalysis.pacing}`,
          `Perspective: ${localAnalysis.perspective}`,
          `Sentence length: ${localAnalysis.sentenceLength}`,
          `Vocabulary: ${localAnalysis.vocabulary}`
        ],
        generatedBy: 'local'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system' as const, content: 'You are a literary style analyst. Return only valid JSON, no markdown formatting.' },
        { role: 'user' as const, content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const content = completion.choices[0].message.content || '';
    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      // Fallback
      const localAnalysis = analyzeWritingStyle(text);
      analysis = {
        description: 'A balanced writing style with moderate pacing and clear narrative voice.',
        traits: [
          `Tone: ${localAnalysis.tone}`,
          `Pacing: ${localAnalysis.pacing}`,
          `Perspective: ${localAnalysis.perspective}`,
          `Sentence length: ${localAnalysis.sentenceLength}`,
          `Vocabulary: ${localAnalysis.vocabulary}`
        ]
      };
    }

    res.json({
      ...analysis,
      generatedBy: 'LLM'
    });
  } catch (error: any) {
    console.error('Style analysis error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to analyze style';
    // Fallback to local analysis on error
    const localAnalysis = analyzeWritingStyle(text || '');
    res.json({
      description: 'A balanced writing style with moderate pacing and clear narrative voice.',
      traits: [
        `Tone: ${localAnalysis.tone}`,
        `Pacing: ${localAnalysis.pacing}`,
        `Perspective: ${localAnalysis.perspective}`,
        `Sentence length: ${localAnalysis.sentenceLength}`,
        `Vocabulary: ${localAnalysis.vocabulary}`
      ],
      generatedBy: 'local'
    });
  }
});

export { router as novelRoutes };


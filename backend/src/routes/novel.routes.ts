import { Router } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { recordUsage } from '../services/userStore';
import { aiGenerationRateLimit } from '../middleware/rateLimit';

// 确保在读取环境变量前加载 .env
dotenv.config();

const router = Router();
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey || apiKey.length < 10) {
  console.error('⚠️  警告：API Key 未找到或格式不正确！');
  console.error('请在 backend/.env 文件中设置 DEEPSEEK_API_KEY');
  console.error('当前 API Key:', apiKey ? `${apiKey.substring(0, 5)}...` : '未设置');
}

const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL: process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/v1' : undefined
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

router.post('/generate', authMiddleware, async (req, res) => {
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

    if (!idea || idea.length < 30) {
      return res.status(400).json({ error: 'Idea must be at least 30 words' });
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
      const completion = await openai.chat.completions.create({
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

      return res.json({
        outline: completion.choices[0].message.content,
        type: 'outline'
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
      const userId = (req as AuthRequest).user?.id;
      if (userId) {
        const pagesUsed = Math.ceil(fullContent.length / 1250); // ~250 words per page, ~5 chars per word
        const totalTokens = chunks * 4000; // Rough estimate
        recordUsage(userId, {
          generations: 1,
          pages: pagesUsed,
          tokens: totalTokens
        });
        console.log(`[Usage] Recorded: 1 generation, ${pagesUsed} pages, ~${totalTokens} tokens`);
      }
      
      return res.json({
        content: fullContent,
        chapters,
        type: 'full',
        actualLength: actualLength,
        isPartial: isLongNovel
      });
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
  if (!fullContext || fullContext.trim().length < 100) {
    const wordCount = fullContext.split(/\s+/).length;
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

  // Split into paragraphs (optimized: single pass)
  const paragraphs = fullContext.split(/\n{2,}/).filter(p => p.trim().length > 0);
  const totalWords = fullContext.split(/\s+/).length;
  
  // If content is short enough, return all (early exit)
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

  // Extract character names for relevance scoring (optimized: pre-compute patterns)
  const characterNames = new Set<string>();
  const characterPatterns: RegExp[] = [];
  if (characters && characters.length > 0) {
    characters.forEach(c => {
      if (c.name) {
        const lowerName = c.name.toLowerCase();
        characterNames.add(lowerName);
        // Pre-compile regex pattern for this character name (escape special chars)
        characterPatterns.push(new RegExp(`\\b${lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
        
        // Also add first name if it's a full name
        const firstName = c.name.split(/\s+/)[0];
        if (firstName && firstName.length > 2) {
          const lowerFirstName = firstName.toLowerCase();
          characterNames.add(lowerFirstName);
          characterPatterns.push(new RegExp(`\\b${lowerFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
        }
      }
    });
  }
  
  // Pre-compile action verb patterns (optimized: single regex instead of array filter)
  const actionVerbsPattern = /\b(ran|jumped|fought|attacked|moved|rushed|charged|struck|hit|fled|escaped|battled|defended|dodged)\b/gi;

  // Score each paragraph for relevance (optimized: cache computations, reduce string operations)
  interface ParagraphScore {
    text: string;
    index: number;
    score: number;
    wordCount: number;
  }

  // Pre-compute paragraph data to avoid repeated operations
  const paragraphData = paragraphs.map((para, index) => {
    const words = para.split(/\s+/);
    const wordCount = words.length;
    const lowerPara = para.toLowerCase(); // Cache lowercase version
    
    return {
      text: para,
      lowerText: lowerPara,
      index,
      wordCount,
      words
    };
  });

  const scoredParagraphs: ParagraphScore[] = paragraphData.map((data) => {
    let score = 0;
    
    // 1. Recency weight: recent paragraphs are more important (exponential decay)
    const recencyWeight = Math.exp(-(paragraphs.length - data.index - 1) / 10);
    score += recencyWeight * 3;
    
    // 2. Character mentions: paragraphs mentioning characters are more relevant (optimized: use pre-compiled patterns)
    let characterMentions = 0;
    if (characterPatterns.length > 0) {
      // Use pre-compiled regex patterns instead of creating new ones
      characterPatterns.forEach(pattern => {
        const matches = data.lowerText.match(pattern);
        if (matches) {
          characterMentions += matches.length;
        }
      });
    }
    score += characterMentions * 2;
    
    // 3. Dialogue markers: dialogue is often important for continuity (optimized: single regex)
    const dialogueMarkers = (data.lowerText.match(/["']/g) || []).length;
    score += Math.min(dialogueMarkers / 5, 1) * 1;
    
    // 4. Action verbs: action scenes are often important (optimized: single regex match)
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

  // Select paragraphs until we reach maxWords (optimized: early exit when possible)
  const selectedParagraphs: string[] = [];
  let selectedWordCount = 0;
  const selectedIndices = new Set<number>();
  const lastIndex = paragraphs.length - 1;

  // Always include the last paragraph (most recent) - add it first
  if (lastIndex >= 0) {
    const lastPara = scoredParagraphs.find(p => p.index === lastIndex);
    if (lastPara && lastPara.wordCount <= maxWords) {
      selectedParagraphs.push(lastPara.text);
      selectedWordCount += lastPara.wordCount;
      selectedIndices.add(lastIndex);
    }
  }

  // Then add other high-scoring paragraphs (optimized: skip already selected, early exit)
  for (const para of scoredParagraphs) {
    if (selectedIndices.has(para.index)) continue; // Skip if already selected
    
    // Early exit if we've reached the target
    if (selectedWordCount >= maxWords * 0.95) break; // Allow 5% buffer
    
    if (selectedWordCount + para.wordCount <= maxWords) {
      selectedParagraphs.push(para.text);
      selectedWordCount += para.wordCount;
      selectedIndices.add(para.index);
    } else {
      // If adding this paragraph would exceed maxWords, check if we can fit a portion
      const remainingWords = maxWords - selectedWordCount;
      if (remainingWords > 50) { // Only if there's meaningful space left
        // Take first portion of paragraph (optimized: use cached words if available)
        const words = para.text.split(/\s+/);
        const partialText = words.slice(0, remainingWords).join(' ');
        selectedParagraphs.push(partialText + '...');
        selectedWordCount += remainingWords;
        selectedIndices.add(para.index);
      }
      break; // Stop once we've reached maxWords
    }
  }

  // Sort selected paragraphs by original index to maintain narrative flow
  const sortedSelected = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map(idx => paragraphs[idx]);

  const strategy = selectedIndices.size === paragraphs.length ? 'recent' :
                   selectedIndices.has(paragraphs.length - 1) && selectedIndices.size > 1 ? 'mixed' : 'relevant';

  // Compress long paragraphs if needed (preserve key information) - optimized version
  const compressedParagraphs = sortedSelected.map(para => {
    const words = para.split(/\s+/);
    if (words.length > 200) {
      // For very long paragraphs, compress by keeping:
      // 1. First 50 words (introduction)
      // 2. Last 50 words (conclusion)
      // 3. Sentences with character names or dialogue
      const firstPart = words.slice(0, 50).join(' ');
      const lastPart = words.slice(-50).join(' ');
      
      // Extract sentences with character mentions or dialogue (optimized: use pre-compiled patterns)
      const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const importantSentences: string[] = [];
      const dialoguePattern = /["']/;
      
      // Limit sentence processing for performance
      const maxSentencesToCheck = Math.min(sentences.length, 20);
      for (let i = 0; i < maxSentencesToCheck; i++) {
        const sentence = sentences[i];
        const lowerSentence = sentence.toLowerCase();
        
        // Check for character mentions (optimized: use pre-compiled patterns)
        let hasCharacter = false;
        if (characterPatterns.length > 0) {
          for (const pattern of characterPatterns) {
            if (pattern.test(lowerSentence)) {
              hasCharacter = true;
              break; // Early exit once found
            }
          }
        }
        
        // Check for dialogue
        const hasDialogue = dialoguePattern.test(sentence);
        
        if (hasCharacter || hasDialogue) {
          importantSentences.push(sentence.trim());
          if (importantSentences.length >= 3) break; // Limit to 3 important sentences
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
    
    if (!context || context.trim().length < 50) {
      return res.status(400).json({ error: 'Context is required and must be at least 50 characters' });
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
    if (contextStrategy === 'extended' && context.split(/\s+/).length > maxWords * 1.5) {
      const { selectSmartContextWithCompression } = await import('../utils/contextCompression');
      const compressed = selectSmartContextWithCompression(context, maxWords, characters, contextStrategy);
      recentContext = compressed.compressed;
      console.log(`[Context Compression] Compressed ${compressed.originalLength} words to ${compressed.compressedLength} words (ratio: ${compressed.compressionRatio.toFixed(2)})`);
    } else {
      const smartContext = selectSmartContext(context, characters, maxWords);
      recentContext = smartContext.selectedText;
    }
    const contextMetadata = {
      ...smartContext.metadata,
      requestedStrategy: contextStrategy,
      requestedWindow: maxWords
    };
    
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

    if (!apiKey || apiKey.length < 10) {
      console.error('[Continue] API Key not configured');
      return res.status(500).json({ error: 'API Key not configured. Please set DEEPSEEK_API_KEY in backend/.env' });
    }

    console.log('[Continue] Calling LLM with context length:', recentContext.length);
    const completion = await openai.chat.completions.create({
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

    const continuedText = completion.choices[0].message.content || '';
    const totalTokens = completion.usage?.total_tokens || 0;

    // Record usage: pages used (continuation counts as generation too)
    const userId = req.user?.id;
    if (userId) {
      const pagesUsed = Math.ceil(continuedText.length / 1250); // ~250 words per page, ~5 chars per word
      recordUsage(userId, {
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
      contextMetadata: contextMetadata // Include context selection metadata
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

    if (!apiKey || apiKey.length < 10) {
      console.log('[Analysis] API Key not configured, using fallback');
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

    if (!apiKey || apiKey.length < 10) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    const completion = await openai.chat.completions.create({
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
      knowledgeUsed: usedKnowledgeIds.length > 0 ? usedKnowledgeIds : undefined
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

    if (!apiKey || apiKey.length < 10) {
      console.error('[Extract Knowledge] API Key not configured');
      return res.status(500).json({ error: 'API Key not configured' });
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


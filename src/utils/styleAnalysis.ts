// Style analysis utilities - Extract writing style from text
import type { StyleAnalysis, SceneType, ContextualStyleAdjustment } from '../types/style';

/**
 * Analyze writing style from text sample
 * Enhanced version with deeper analysis of literary techniques
 * First principles: Simple, fast, accurate enough, but with more depth
 */
export function analyzeWritingStyle(text: string): StyleAnalysis {
  if (!text || text.trim().length < 100) {
    // Default style if not enough text
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
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const avgParagraphLength = words.length / Math.max(paragraphs.length, 1);

  // Enhanced tone analysis with more markers
  const formalMarkers = /\b(shall|must|therefore|furthermore|indeed|consequently|moreover|nevertheless|thus|hence)\b/gi;
  const casualMarkers = /\b(yeah|gonna|wanna|gotta|kinda|sorta|lemme|gimme|dunno)\b/gi;
  const poeticMarkers = /\b(whisper|dance|gleam|twilight|eternal|serenade|melody|symphony|embrace|caress|tender|gentle|fragile|delicate)\b/gi;
  const conversationalMarkers = /\b(well|you know|I mean|like|actually|basically|literally|obviously)\b/gi;
  
  const formalCount = (text.match(formalMarkers) || []).length;
  const casualCount = (text.match(casualMarkers) || []).length;
  const poeticCount = (text.match(poeticMarkers) || []).length;
  const conversationalCount = (text.match(conversationalMarkers) || []).length;

  // Check for literary devices (metaphors, similes)
  const metaphorSimilePattern = /\b(like|as|resembled|mirrored|echoed|reflected|seemed|appeared)\s+\w+/gi;
  const literaryDeviceCount = (text.match(metaphorSimilePattern) || []).length;
  const hasLiteraryDevices = literaryDeviceCount > sentences.length * 0.1;

  let tone: StyleAnalysis['tone'] = 'neutral';
  if (poeticCount > formalCount && poeticCount > casualCount && hasLiteraryDevices) {
    tone = 'poetic';
  } else if (conversationalCount > sentences.length * 0.15) {
    tone = 'conversational';
  } else if (formalCount > casualCount * 2) {
    tone = 'formal';
  } else if (casualCount > 0) {
    tone = 'casual';
  } else if (poeticCount > 0 && hasLiteraryDevices) {
    tone = 'poetic';
  }

  // Enhanced pacing analysis (based on sentence length, punctuation, paragraph length, and action verbs)
  const shortSentences = sentences.filter(s => s.split(/\s+/).length < 10).length;
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length;
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  
  // Action verbs indicate fast pacing
  const actionVerbs = /\b(rushed|ran|jumped|sprinted|dashed|hurried|raced|charged|fled|escaped|attacked|struck|fought|battled)\b/gi;
  const actionVerbCount = (text.match(actionVerbs) || []).length;
  
  // Short paragraphs also indicate fast pacing
  const shortParagraphs = paragraphs.filter(p => p.split(/\s+/).length < 50).length;
  
  let pacing: StyleAnalysis['pacing'] = 'moderate';
  const fastPacingIndicators = 
    (shortSentences > sentences.length * 0.4) ||
    (exclamationCount > sentences.length * 0.1) ||
    (actionVerbCount > sentences.length * 0.15) ||
    (shortParagraphs > paragraphs.length * 0.5 && avgParagraphLength < 80);
    
  const slowPacingIndicators = 
    (longSentences > sentences.length * 0.3) ||
    (avgParagraphLength > 150) ||
    (questionCount > sentences.length * 0.2); // Questions often slow down pacing
    
  if (fastPacingIndicators) {
    pacing = 'fast';
  } else if (slowPacingIndicators) {
    pacing = 'slow';
  }

  // Analyze perspective
  const firstPersonMarkers = /\b(I|me|my|mine|we|us|our)\b/gi;
  const firstPersonCount = (text.match(firstPersonMarkers) || []).length;
  const thirdPersonMarkers = /\b(he|she|they|him|her|them|his|hers|their)\b/gi;
  const thirdPersonCount = (text.match(thirdPersonMarkers) || []).length;

  let perspective: StyleAnalysis['perspective'] = 'third-person';
  if (firstPersonCount > thirdPersonCount * 1.5) {
    perspective = 'first-person';
  } else if (firstPersonCount > 0 && thirdPersonCount > 0) {
    perspective = 'mixed';
  }

  // Analyze sentence length
  let sentenceLength: StyleAnalysis['sentenceLength'] = 'medium';
  if (avgSentenceLength < 12) {
    sentenceLength = 'short';
  } else if (avgSentenceLength > 20) {
    sentenceLength = 'long';
  }

  // Enhanced vocabulary complexity analysis (word length + uncommon words + technical terms)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  
  // Check for complex/uncommon words (longer words, less common)
  const complexWordPattern = /\b\w{8,}\b/g;
  const complexWords = (text.match(complexWordPattern) || []).length;
  const complexWordRatio = complexWords / words.length;
  
  // Check for technical or academic terms
  const technicalMarkers = /\b(analysis|hypothesis|methodology|phenomenon|paradigm|synthesis|theoretical|empirical)\b/gi;
  const technicalCount = (text.match(technicalMarkers) || []).length;
  
  // Check for descriptive adjectives (indicates richer vocabulary)
  const descriptiveAdjectives = /\b(serene|majestic|profound|intricate|elaborate|sophisticated|exquisite|magnificent)\b/gi;
  const descriptiveCount = (text.match(descriptiveAdjectives) || []).length;
  
  let vocabulary: StyleAnalysis['vocabulary'] = 'moderate';
  if (avgWordLength < 4.5 && complexWordRatio < 0.05 && technicalCount === 0) {
    vocabulary = 'simple';
  } else if (avgWordLength > 5.5 || complexWordRatio > 0.15 || technicalCount > 0 || descriptiveCount > words.length * 0.02) {
    vocabulary = 'complex';
  }

  return {
    tone,
    pacing,
    perspective,
    sentenceLength,
    vocabulary
  };
}

/**
 * Convert style analysis to AI prompt instruction
 */
export function styleToPrompt(analysis: StyleAnalysis, preset?: string): string {
  const instructions: string[] = [];

  if (preset === 'literary') {
    instructions.push('Write in a sophisticated, literary style with rich vocabulary and introspective depth.');
  } else if (preset === 'commercial') {
    instructions.push('Write in an accessible, engaging commercial fiction style that appeals to a broad audience.');
  } else if (preset === 'experimental') {
    instructions.push('Write in an unconventional, artistic style that experiments with form and language.');
  } else {
    // Use analyzed style
    if (analysis.tone === 'formal') {
      instructions.push('Use a formal, polished tone.');
    } else if (analysis.tone === 'casual') {
      instructions.push('Use a casual, conversational tone.');
    } else if (analysis.tone === 'poetic') {
      instructions.push('Use a poetic, lyrical tone with vivid imagery.');
    }

    if (analysis.pacing === 'fast') {
      instructions.push('Maintain a fast-paced narrative with shorter sentences and dynamic action.');
    } else if (analysis.pacing === 'slow') {
      instructions.push('Use a slower, more contemplative pacing with longer, descriptive sentences.');
    }

    if (analysis.sentenceLength === 'short') {
      instructions.push('Prefer shorter, punchy sentences.');
    } else if (analysis.sentenceLength === 'long') {
      instructions.push('Use longer, more complex sentences with rich detail.');
    }

    if (analysis.vocabulary === 'complex') {
      instructions.push('Use sophisticated vocabulary and nuanced language.');
    } else if (analysis.vocabulary === 'simple') {
      instructions.push('Use clear, straightforward language.');
    }
  }

  return instructions.join(' ');
}

/**
 * Detect scene type from text context
 * Uses keyword matching for fast, cost-free detection
 */
export function detectSceneType(text: string): SceneType {
  if (!text || text.trim().length < 50) {
    return 'mixed';
  }

  // Get last 500 words for recent context
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

  // Count keyword matches
  const actionCount = actionKeywords.filter(k => recentText.includes(k)).length;
  const emotionalCount = emotionalKeywords.filter(k => recentText.includes(k)).length;
  const dialogueCount = dialogueKeywords.filter(k => recentText.includes(k)).length;
  const descriptiveCount = descriptiveKeywords.filter(k => recentText.includes(k)).length;
  const reflectiveCount = reflectiveKeywords.filter(k => recentText.includes(k)).length;

  // Check for dialogue markers (quotation marks)
  const dialogueMarkers = (recentText.match(/["']/g) || []).length;
  if (dialogueMarkers > 10 || dialogueCount > 3) {
    return 'dialogue';
  }

  // Determine scene type based on highest count
  const counts = [
    { type: 'action' as SceneType, count: actionCount },
    { type: 'emotional' as SceneType, count: emotionalCount },
    { type: 'descriptive' as SceneType, count: descriptiveCount },
    { type: 'reflective' as SceneType, count: reflectiveCount }
  ];

  counts.sort((a, b) => b.count - a.count);

  // If highest count is significant, return that type
  if (counts[0].count >= 3) {
    return counts[0].type;
  }

  // If counts are similar, return mixed
  if (counts[0].count === counts[1]?.count && counts[0].count > 0) {
    return 'mixed';
  }

  return 'mixed';
}

/**
 * Adjust style instructions based on scene type
 */
export function adjustStyleForScene(
  baseInstructions: string,
  scene: SceneType,
  baseStyle?: StyleAnalysis
): string {
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

    case 'mixed':
    default:
      // No specific adjustments for mixed scenes
      break;
  }

  if (adjustments.length > 0) {
    return `${baseInstructions} ${adjustments.join(' ')}`;
  }

  return baseInstructions;
}

/**
 * Build contextual style instruction with scene awareness
 */
export function buildContextualStyleInstruction(
  style: any,
  context: string
): string {
  // Build base style instruction
  const baseInstruction = styleToPrompt(
    style?.customTraits ? {
      tone: style.customTraits.find((t: string) => t.startsWith('Tone:'))?.split(':')[1]?.trim() as any || 'neutral',
      pacing: style.customTraits.find((t: string) => t.startsWith('Pacing:'))?.split(':')[1]?.trim() as any || 'moderate',
      perspective: style.customTraits.find((t: string) => t.startsWith('Perspective:'))?.split(':')[1]?.trim() as any || 'third-person',
      sentenceLength: style.customTraits.find((t: string) => t.startsWith('Sentence length:'))?.split(':')[1]?.trim() as any || 'medium',
      vocabulary: style.customTraits.find((t: string) => t.startsWith('Vocabulary:'))?.split(':')[1]?.trim() as any || 'moderate'
    } : {
      tone: 'neutral',
      pacing: 'moderate',
      perspective: 'third-person',
      sentenceLength: 'medium',
      vocabulary: 'moderate'
    },
    style?.preset
  );

  // Detect scene type from context
  const scene = detectSceneType(context);

  // Adjust style for scene
  return adjustStyleForScene(baseInstruction, scene);
}


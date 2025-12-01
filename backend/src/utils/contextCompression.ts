/**
 * Context compression utilities for handling very long documents
 * Uses summarization to compress older content while preserving key information
 */

interface CompressionResult {
  compressed: string;
  originalLength: number;
  compressedLength: number;
  compressionRatio: number;
  preservedSections: string[];
}

/**
 * Compress context by summarizing older content while keeping recent content intact
 */
export function compressContext(
  fullContext: string,
  maxWords: number,
  recentWords: number = 2000
): CompressionResult {
  const words = fullContext.split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords <= maxWords) {
    return {
      compressed: fullContext,
      originalLength: totalWords,
      compressedLength: totalWords,
      compressionRatio: 1,
      preservedSections: []
    };
  }
  
  // Split into recent and older content
  const recentText = words.slice(-recentWords).join(' ');
  const olderText = words.slice(0, -recentWords).join(' ');
  
  // Compress older content by extracting key information
  const compressedOlder = extractKeyInformation(olderText, maxWords - recentWords);
  
  const compressed = `${compressedOlder}\n\n[... earlier content ...]\n\n${recentText}`;
  
  return {
    compressed,
    originalLength: totalWords,
    compressedLength: compressed.split(/\s+/).length,
    compressionRatio: compressed.split(/\s+/).length / totalWords,
    preservedSections: [compressedOlder, recentText]
  };
}

/**
 * Extract key information from text (character introductions, plot points, settings)
 */
function extractKeyInformation(text: string, maxWords: number): string {
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 0);
  const keyParagraphs: string[] = [];
  let wordCount = 0;
  
  // Priority order for extraction:
  // 1. Character introductions (sentences with "was", "had", "character", "named")
  // 2. Setting descriptions (sentences with location words)
  // 3. Plot points (sentences with action verbs and consequences)
  // 4. Dialogue (quoted text)
  
  const characterMarkers = /\b(was|had|named|called|known as|character|protagonist|hero|villain)\b/gi;
  const settingMarkers = /\b(where|place|location|city|town|building|room|forest|mountain|sea|ocean)\b/gi;
  const plotMarkers = /\b(decided|realized|discovered|found|learned|understood|knew|thought)\b/gi;
  const dialogueMarkers = /["']/g;
  
  for (const para of paragraphs) {
    if (wordCount >= maxWords) break;
    
    const paraWords = para.split(/\s+/).length;
    const lowerPara = para.toLowerCase();
    
    // Score paragraph importance
    let score = 0;
    if (characterMarkers.test(para)) score += 3;
    if (settingMarkers.test(para)) score += 2;
    if (plotMarkers.test(para)) score += 2;
    if (dialogueMarkers.test(para)) score += 1;
    
    // Include high-scoring paragraphs
    if (score >= 2 && wordCount + paraWords <= maxWords) {
      keyParagraphs.push(para);
      wordCount += paraWords;
    }
  }
  
  // If we still have space, add summary sentences
  if (wordCount < maxWords * 0.8) {
    const remainingWords = Math.floor((maxWords - wordCount) * 0.5);
    const summary = generateTextSummary(text, remainingWords);
    if (summary) {
      keyParagraphs.unshift(`[Summary: ${summary}]`);
    }
  }
  
  return keyParagraphs.join('\n\n');
}

/**
 * Generate a brief summary of text (simple extraction-based)
 */
function generateTextSummary(text: string, maxWords: number): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Select key sentences (first, last, and those with important keywords)
  const importantKeywords = /\b(important|key|main|central|crucial|significant|major|decided|realized|discovered)\b/gi;
  const keySentences: string[] = [];
  
  // Always include first sentence
  if (sentences.length > 0) {
    keySentences.push(sentences[0].trim());
  }
  
  // Include sentences with important keywords
  for (const sentence of sentences.slice(1, -1)) {
    if (importantKeywords.test(sentence) && keySentences.length < 5) {
      keySentences.push(sentence.trim());
    }
  }
  
  // Always include last sentence
  if (sentences.length > 1) {
    keySentences.push(sentences[sentences.length - 1].trim());
  }
  
  const summary = keySentences.join('. ') + '.';
  const summaryWords = summary.split(/\s+/).length;
  
  if (summaryWords <= maxWords) {
    return summary;
  }
  
  // Truncate if too long
  const words = summary.split(/\s+/);
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Smart context selection with compression for very long documents
 */
export function selectSmartContextWithCompression(
  fullContext: string,
  maxWords: number,
  characters?: Array<{ name: string; description: string }>,
  strategy: 'precision' | 'balanced' | 'extended' = 'balanced'
): CompressionResult {
  const words = fullContext.split(/\s+/);
  const totalWords = words.length;
  
  // For extended strategy, use compression
  if (strategy === 'extended' && totalWords > maxWords * 1.5) {
    return compressContext(fullContext, maxWords, Math.floor(maxWords * 0.6));
  }
  
  // For precision/balanced, use smart selection (existing logic)
  // This would call the existing selectSmartContext function
  // For now, return basic compression
  if (totalWords <= maxWords) {
    return {
      compressed: fullContext,
      originalLength: totalWords,
      compressedLength: totalWords,
      compressionRatio: 1,
      preservedSections: []
    };
  }
  
  return compressContext(fullContext, maxWords);
}


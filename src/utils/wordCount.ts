/**
 * 通用字数统计函数，支持所有语言
 * - 对于CJK语言（中文、日文、韩文等）：按字符数统计
 * - 对于其他语言（英文、西班牙文等）：按单词数统计
 * - 混合语言：智能判断主要语言类型
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  
  // 检测CJK字符（中日韩统一表意文字）
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
  const cjkChars = (text.match(cjkRegex) || []).length;
  
  // 统计英文单词（按空格分割）
  const englishWords = text.split(/\s+/).filter(Boolean).length;
  
  // 统计所有非空白字符（包括标点符号）
  const allNonWhitespaceChars = text.replace(/\s/g, '').length;
  
  // 如果CJK字符占比超过30%，按字符数统计；否则按单词数统计
  const cjkRatio = cjkChars / Math.max(allNonWhitespaceChars, 1);
  
  if (cjkRatio > 0.3) {
    // 主要是CJK语言：统计所有非空白字符
    return allNonWhitespaceChars;
  } else {
    // 主要是非CJK语言：统计单词数
    return englishWords;
  }
}

/**
 * 统计字符数（不包括空格）
 * 适用于需要精确字符数的场景
 */
export function countCharacters(text: string): number {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

/**
 * 统计单词数（按空格分割）
 * 适用于英文等使用空格分隔的语言
 */
export function countWordsBySpace(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}






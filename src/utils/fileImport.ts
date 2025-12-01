/**
 * File import utilities for supporting various document formats
 */

export interface ImportedContent {
  text: string;
  title?: string;
  chapters?: Array<{ title: string; content: string }>;
}

/**
 * Parse text file content
 */
export async function parseTextFile(file: File): Promise<ImportedContent> {
  const text = await file.text();
  return {
    text: text.trim(),
    title: file.name.replace(/\.txt$/i, '')
  };
}

/**
 * Parse Markdown file content
 */
export async function parseMarkdownFile(file: File): Promise<ImportedContent> {
  const text = await file.text();
  const chapters: Array<{ title: string; content: string }> = [];
  
  // Try to parse chapters from markdown headings
  const lines = text.split('\n');
  let currentChapter: { title: string; content: string } | null = null;
  
  for (const line of lines) {
    const chapterMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (chapterMatch) {
      if (currentChapter) {
        chapters.push(currentChapter);
      }
      currentChapter = {
        title: chapterMatch[1].trim(),
        content: ''
      };
    } else if (currentChapter) {
      currentChapter.content += line + '\n';
    }
  }
  
  if (currentChapter) {
    chapters.push(currentChapter);
  }
  
  return {
    text: text.trim(),
    title: file.name.replace(/\.md$/i, ''),
    chapters: chapters.length > 0 ? chapters : undefined
  };
}

/**
 * Parse PDF file content (basic text extraction)
 * Note: This is a simplified version. For production, consider using pdf.js or a backend service
 */
export async function parsePdfFile(file: File): Promise<ImportedContent> {
  // For now, return a placeholder. In production, use pdf.js or backend API
  throw new Error('PDF parsing requires pdf.js library or backend service. Please convert to TXT or MD first.');
}

/**
 * Parse DOCX file content
 * Note: This requires mammoth.js or similar library. For now, we'll show an error.
 */
export async function parseDocxFile(file: File): Promise<ImportedContent> {
  // For now, return a placeholder. In production, use mammoth.js
  throw new Error('DOCX parsing requires mammoth.js library. Please convert to TXT or MD first.');
}

/**
 * Main import function that routes to appropriate parser
 */
export async function importFile(file: File): Promise<ImportedContent> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'txt':
      return parseTextFile(file);
    case 'md':
    case 'markdown':
      return parseMarkdownFile(file);
    case 'pdf':
      return parsePdfFile(file);
    case 'docx':
    case 'doc':
      return parseDocxFile(file);
    default:
      throw new Error(`Unsupported file format: ${extension}. Supported formats: TXT, MD, PDF, DOCX`);
  }
}

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = [
  { extension: 'txt', mimeType: 'text/plain', name: 'Text File' },
  { extension: 'md', mimeType: 'text/markdown', name: 'Markdown' },
  { extension: 'pdf', mimeType: 'application/pdf', name: 'PDF Document' },
  { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Word Document' }
];



import { useMemo, useState } from 'react';
import type { Chapter } from '../api/novelApi';

export interface OutlineMapPayload {
  sections: {
    title: string;
    beats: number;
    description: string;
  }[];
  totalBeats: number;
  totalSections: number;
  isRaw: boolean;
  outlineChapters: Chapter[];
  rawOutline: string;
}

interface OutlinePreviewProps {
  rawOutline: string;
  onSendToDraft: (chapters: Chapter[]) => void;
  onViewMap?: (payload: OutlineMapPayload) => void;
}

interface OutlineSection {
  title: string;
  chapters: Chapter[];
}

const cleanText = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const parseOutline = (outline: string): OutlineSection[] => {
  const lines = outline.split('\n').map((line) => line.trim()).filter(Boolean);
  const sections: OutlineSection[] = [];
  let currentSection: OutlineSection | null = null;
  let currentChapter: Chapter | null = null;
  let sectionNoteCounter = 1;

  lines.forEach((line) => {
    const isMarkdownHeading = /^#+/.test(line);
    const isBoldHeading = /^\*{2,}.*\*{2,}$/.test(line) && !/^\*+\s*\d+/.test(line);

    if (isMarkdownHeading || isBoldHeading) {
      if (currentChapter && currentSection) {
        currentSection.chapters.push(currentChapter);
      }
      currentChapter = null;

      if (currentSection) {
        sections.push(currentSection);
      }

      const title = cleanText(
        isMarkdownHeading ? line.replace(/^#+\s*/, '') : line.replace(/\*+/g, '').trim()
      );

      currentSection = {
        title,
        chapters: []
      };
      sectionNoteCounter = 1;
    } else if (/^\*+\s*\d+/.test(line)) {
      // Chapter heading like "*第7章 技术传承*"
      if (currentChapter && currentSection) {
        currentSection.chapters.push(currentChapter);
      }

      currentChapter = {
        title: cleanText(line.replace(/^\*+|\*+$/g, '').trim()),
        content: ''
      };
    } else if (/^[-•*]\s+/.test(line) || /^\d+[\).\s]+/.test(line)) {
      const contentLine = cleanText(line.replace(/^([-•*]+|\d+[\).\s]+)\s*/, ''));
      if (!contentLine || /^[-–—]+$/.test(contentLine) || contentLine === '--') {
        return;
      }
      if (!currentChapter && currentSection) {
        currentChapter = {
          title: sectionNoteCounter === 1 ? 'Outline notes' : `Outline notes ${sectionNoteCounter}`,
          content: ''
        };
        sectionNoteCounter += 1;
      }
      if (currentChapter) {
        currentChapter.content = `${currentChapter.content}${contentLine}\n`;
      }
    } else if (line && currentSection) {
      if (!currentChapter) {
        currentChapter = {
          title: sectionNoteCounter === 1 ? 'Outline notes' : `Outline notes ${sectionNoteCounter}`,
          content: ''
        };
        sectionNoteCounter += 1;
      }
      const cleanedLine = cleanText(line);
      if (!cleanedLine) return;
      currentChapter.content = `${currentChapter.content}${cleanedLine}\n`;
    }
  });

  if (currentChapter && currentSection) {
    (currentSection as OutlineSection).chapters.push(currentChapter);
  }
  if (currentSection) {
    sections.push(currentSection as OutlineSection);
  }

  return sections.filter((section: OutlineSection) => section.chapters.length > 0);
};

const buildChapterSnippet = (content: string) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[0] || 'No description provided yet.';

const createFallbackSections = (outline: string): OutlineSection[] => {
  const segments = outline
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  return segments.map((segment, index) => ({
    title: `Segment ${index + 1}`,
    chapters: [
      {
        title: 'Raw notes',
        content: segment
      }
    ]
  }));
};

export default function OutlinePreview({
  rawOutline,
  onSendToDraft,
  onViewMap
}: OutlinePreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const parsedSections = useMemo<OutlineSection[]>(() => parseOutline(rawOutline), [rawOutline]);
  const isRawOutline = parsedSections.length === 0;
  const sections = isRawOutline ? createFallbackSections(rawOutline) : parsedSections;

  const flattenChapters = (sectionsToFlatten: OutlineSection[]) =>
    sectionsToFlatten.reduce<Chapter[]>((acc, section) => {
      const mapped = section.chapters.map((chapter) => ({
        title: `${section.title} · ${chapter.title}`,
        content: chapter.content.trim()
      }));
      return acc.concat(mapped);
    }, []);

  const totalChapters = sections.reduce((sum, section) => sum + section.chapters.length, 0);
  const totalBeats = sections.reduce(
    (sum, section) =>
      sum +
      section.chapters.reduce(
        (chapterSum, chapter) => chapterSum + (chapter.content.split('\n').filter(Boolean).length || 1),
        0
      ),
    0
  );

  if (!rawOutline.trim()) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-3xl bg-white shadow-sm p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">Outline</p>
          <h3 className="text-lg font-semibold text-slate-900">Generated outline</h3>
          <p className="text-xs text-slate-500 mt-1">
            {sections.length} sections · {totalChapters} beats
          </p>
          {isRawOutline && (
            <p className="mt-1 text-xs text-amber-600">
              Raw outline view – consider adding headings like “### Part 1” for a richer structure.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSendToDraft(isRawOutline ? [{ title: 'Outline', content: rawOutline }] : flattenChapters(sections))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Send to draft
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(rawOutline)}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Copy outline
          </button>
        </div>
      </div>

      {!isRawOutline && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          <span>
            {sections.length} sections · {totalChapters} chapters · {totalBeats} beats
          </span>
          <button
            onClick={() =>
              onViewMap?.({
                sections: sections.map((section) => ({
                  title: section.title,
                  beats: section.chapters.reduce(
                    (sum, chapter) => sum + chapter.content.split('\n').filter(Boolean).length || 1,
                    0
                  ),
                  description: section.chapters[0]?.content || ''
                })),
                totalBeats,
                totalSections: sections.length,
                isRaw: isRawOutline,
                outlineChapters: flattenChapters(sections),
                rawOutline
              })
            }
            className="text-indigo-600 font-semibold hover:text-indigo-500"
          >
            View outline map
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, index) => {
          const isExpanded = index === expandedIndex;
          return (
            <div key={section.title} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">{section.title}</span>
                <span className="text-slate-400 text-xl">{isExpanded ? '–' : '+'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50">
                  {section.chapters.map((chapter, chapterIndex) => {
                    const lines = chapter.content
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean);
                    return (
                      <div
                        key={`${chapter.title}-${chapterIndex}`}
                        className="px-4 py-3 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-800">{chapter.title}</div>
                            {isRawOutline ? (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                                {chapter.content}
                              </p>
                            ) : (
                              <>
                                <p className="mt-1 text-sm text-slate-600">{buildChapterSnippet(chapter.content)}</p>
                                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-600">
                                  {lines.map((line, bulletIndex) => (
                                    <li key={bulletIndex}>{line}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {lines.length || 1} beats
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


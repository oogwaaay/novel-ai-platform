import JSZip from 'jszip';
import type { Chapter } from '../api/novelApi';

interface EpubOptions {
  title: string;
  author?: string;
  chapters?: Chapter[];
  fallbackText?: string;
}

const sanitize = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export async function buildEpub({
  title,
  author = 'Novel AI',
  chapters,
  fallbackText
}: EpubOptions): Promise<Blob> {
  const zip = new JSZip();
  const safeTitle = title || 'AI Novel';

  zip.file('mimetype', 'application/epub+zip');

  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`.trim()
  );

  const contentFolder = zip.folder('OEBPS');
  if (!contentFolder) {
    throw new Error('Failed to create OEBPS folder');
  }

  const textFolder = contentFolder.folder('text');
  if (!textFolder) {
    throw new Error('Failed to create text folder');
  }

  const chapterList =
    chapters && chapters.length > 0
      ? chapters
      : [
          {
            title: 'Chapter 1',
            content: fallbackText || 'Start writing to generate content.'
          }
        ];

  const manifestItems: string[] = [];
  const spineItems: string[] = [];

  chapterList.forEach((chapter, index) => {
    const fileName = `chapter${index + 1}.xhtml`;
    const sanitizedContent = chapter.content
      .split(/\n{2,}/)
      .map(
        (para) => `<p>${sanitize(para.trim())}</p>`
      )
      .join('\n');

    textFolder.file(
      fileName,
      `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${sanitize(chapter.title || `Chapter ${index + 1}`)}</title>
  </head>
  <body>
    <h1>${sanitize(chapter.title || `Chapter ${index + 1}`)}</h1>
    ${sanitizedContent}
  </body>
</html>`
    );

    manifestItems.push(
      `<item id="chapter${index + 1}" href="text/${fileName}" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="chapter${index + 1}"/>`);
  });

  contentFolder.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${sanitize(safeTitle)}</dc:title>
    <dc:creator>${sanitize(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}


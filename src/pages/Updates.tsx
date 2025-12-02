import { useEffect, useMemo, useState } from 'react';
import { SEO } from '../components/SEO';
import { RELEASE_NOTES as STATIC_RELEASE_NOTES, type ReleaseNoteEntry } from '../content/resourcesData';

export default function Updates() {
  const [notes, setNotes] = useState<ReleaseNoteEntry[]>(STATIC_RELEASE_NOTES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadReleaseNotes = async () => {
      try {
        const response = await fetch('/content/release-notes.json');
        if (!response.ok) {
          throw new Error('Failed to load release notes');
        }
        const data = await response.json();
        if (!isMounted) return;

        if (Array.isArray(data) && data.length > 0) {
          setNotes(data);
        }
      } catch (error) {
        console.warn('[Updates] Falling back to bundled release notes:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReleaseNotes();

    return () => {
      isMounted = false;
    };
  }, []);

  const jsonLd = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Scribely Release Notes',
        itemListElement: notes.map((note, index) => ({
          '@type': 'BlogPosting',
          position: index + 1,
          headline: note.title,
          datePublished: note.date,
          description: note.highlights?.[0] || ''
        }))
      }
    ],
    [notes]
  );

  return (
    <div className="min-h-screen py-16">
      <SEO
        title="Release Notes - Scribely"
        description="Follow along with Scribely feature launches, UX refinements, and infrastructure updates for your novel ai writing workspace."
        keywords="novel ai updates, release notes, changelog"
        jsonLd={jsonLd}
      />
      <div className="max-w-4xl mx-auto px-4 space-y-12">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Release notes</p>
          <h1 className="text-4xl font-semibold text-slate-900">What’s new at Scribely</h1>
          <p className="text-sm text-slate-600">
            Follow the latest improvements to the Scribely workspace and novel ai features. We publish feature launches, UX polish, and infrastructure updates right here.
          </p>
        </header>

        <div className="space-y-8">
          {notes.map((update) => (
            <article key={update.date} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-slate-900">{update.title}</p>
                <p className="text-xs text-slate-500 uppercase tracking-[0.3em]">{update.date}</p>
              </div>
              <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
                {update.highlights.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}



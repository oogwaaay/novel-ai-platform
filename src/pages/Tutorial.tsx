import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SEO } from '../components/SEO';
import { RESOURCE_ARTICLES } from '../content/resourcesData';

interface TutorialContent {
  id: string;
  title: string;
  description: string;
  readingTime: string;
  publishedAt: string;
  sections: {
    title: string;
    content: string[];
    tips?: string[];
  }[];
  relatedArticles?: string[];
}

export default function Tutorial() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tutorial, setTutorial] = useState<TutorialContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTutorial = async () => {
      try {
        const response = await fetch('/content/tutorials.json');
        if (!response.ok) throw new Error('Failed to load tutorial');
        const data = await response.json();
        const found = data.tutorials.find((t: TutorialContent) => t.id === slug);
        if (found) {
          setTutorial(found);
        } else {
          navigate('/resources');
        }
      } catch (error) {
        console.error('Error loading tutorial:', error);
        navigate('/resources');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadTutorial();
    }
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading tutorial...</p>
      </div>
    );
  }

  if (!tutorial) {
    return null;
  }

  const relatedArticles = RESOURCE_ARTICLES.filter(
    (article) => article.id !== tutorial.id && tutorial.relatedArticles?.includes(article.id)
  );

  return (
    <div className="min-h-screen">
      <SEO
        title={`${tutorial.title} - Scribely Tutorial`}
        description={tutorial.description}
        keywords={`novel ai, tutorial, ${tutorial.title.toLowerCase()}`}
      />
      <article className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="mb-12">
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            ← Back to Resources
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3">{tutorial.readingTime}</p>
          <h1 className="text-4xl font-semibold text-slate-900 mb-4">{tutorial.title}</h1>
          <p className="text-lg text-slate-600">{tutorial.description}</p>
          <p className="text-sm text-slate-500 mt-4">Published {tutorial.publishedAt}</p>
        </header>

        {/* Content Sections */}
        <div className="prose prose-slate max-w-none space-y-12">
          {tutorial.sections.map((section, index) => (
            <section key={index} className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">{section.title}</h2>
              <div className="space-y-4 text-slate-700">
                {section.content.map((paragraph, pIndex) => (
                  <p key={pIndex} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.tips && section.tips.length > 0 && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">💡 Pro Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-indigo-800">
                    {section.tips.map((tip, tipIndex) => (
                      <li key={tipIndex}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Related Tutorials</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/tutorials/${article.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition"
                >
                  <p className="text-sm font-semibold text-slate-900">{article.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{article.readingTime}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-16 p-8 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Ready to try it yourself?</h3>
          <p className="text-slate-600 mb-6">Start creating your story with AI assistance today.</p>
          <Link
            to="/generator"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
          >
            Open Generator →
          </Link>
        </div>
      </article>
    </div>
  );
}


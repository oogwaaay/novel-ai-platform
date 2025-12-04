import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import {
  RESOURCE_GUIDES as STATIC_RESOURCE_GUIDES,
  RESOURCE_ARTICLES as STATIC_RESOURCE_ARTICLES,
  type ResourceGuide,
  type ResourceArticle
} from '../content/resourcesData';

const supportLinks = [
  { label: 'Help Center', description: 'Step-by-step answers, onboarding clips, and template FAQs.', to: '/help' },
  { label: 'Release notes', description: 'See every improvement, hotfix, and UI refresh.', to: '/updates' },
  { label: 'Privacy & terms', description: 'Understand how data is stored, processed, and protected.', to: '/privacy' },
  { label: 'Contact support', description: 'Need priority help? Email support@scribelydesigns.top.', to: 'mailto:support@scribelydesigns.top' }
];

export default function Resources() {
  const [guides, setGuides] = useState<ResourceGuide[]>(STATIC_RESOURCE_GUIDES);
  const [articles, setArticles] = useState<ResourceArticle[]>(STATIC_RESOURCE_ARTICLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadResources = async () => {
      try {
        const response = await fetch('/content/resources.json');
        if (!response.ok) {
          throw new Error('Failed to load resources content');
        }
        const data = await response.json();
        if (!isMounted) return;

        if (Array.isArray(data.guides) && data.guides.length > 0) {
          setGuides(data.guides);
        }
        if (Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch (error) {
        console.warn('[Resources] Falling back to bundled content:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadResources();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen py-16">
      <SEO
        title="Resources & Tutorials - Scribely"
        description="Guides, tutorials, and release notes for Scribely, a novel ai writing workspace. Learn how to plan, draft, and ship stories faster."
        keywords="novel ai resources, tutorial, release notes"
      />
      <div className="max-w-5xl mx-auto px-4 space-y-16">
        <header className="text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Resources</p>
          <h1 className="text-4xl font-semibold text-slate-900">Guides, tutorials, and updates</h1>
          <p className="text-base text-slate-600">
            Browse practical guides, onboarding checklists, and public release notes—just like the knowledge hubs run by NovelAI and Squibler.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {guides.map((guide) => (
            <article key={guide.title} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col h-full">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-3">{guide.badge}</p>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">{guide.title}</h2>
              <p className="text-sm text-slate-600 mb-4">{guide.description}</p>
              <ul className="text-sm text-slate-600 space-y-2 flex-1">
                {guide.bullets.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="text-indigo-500 text-base leading-none">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={guide.cta.href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {guide.cta.label}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white shadow-sm p-8 space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Collaboration permissions</p>
          <h2 className="text-2xl font-semibold text-slate-900">Who can comment & co-create?</h2>
          <p className="text-sm text-slate-600">
            Unlimited is the collaboration tier: it enables live cursors, inline comment threads, reviewer roles, and the
            upcoming co-editing roadmap. Other tiers can still read comments but cannot add new ones.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.3em]">Free & Starter</p>
              <p className="mt-1">View comments and activity logs. Upgrade to leave feedback or manage threads.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.3em]">Pro</p>
              <p className="mt-1">Gain analytics, version history, and async review prep, but real-time comments remain locked.</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-[0.3em]">Unlimited</p>
              <p className="mt-1">
                Add inline comments, mention teammates with @handle syntax, watch presence indicators, and access the live co-editing roadmap.
              </p>
            </div>
          </div>
          <div>
            <Link
              to="/tutorials/async-collaboration"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Learn how collaboration works →
            </Link>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-100 shadow-sm p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Learning path</p>
            <h2 className="text-2xl font-semibold text-slate-900">From blank page to published story</h2>
            <p className="text-sm text-slate-600">
              Follow this four-step journey if you want an end-to-end workflow that mirrors our own team’s best practices.
            </p>
          </div>
          <ol className="space-y-4 text-sm text-slate-600">
            <li>
              <strong className="text-slate-900">1. Capture ideas:</strong> start on Home or the Template gallery and save the pitch as a project.
            </li>
            <li>
              <strong className="text-slate-900">2. Draft & iterate:</strong> use Context Drawer, writing goals, and AI actions inside Generator.
            </li>
            <li>
              <strong className="text-slate-900">3. Organize projects:</strong> apply folders/tags in Dashboard, track status, and review history.
            </li>
            <li>
              <strong className="text-slate-900">4. Scale up:</strong> check Pricing to unlock character management, analytics, or collaboration.
            </li>
          </ol>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Latest tutorials</p>
              <h2 className="text-2xl font-semibold text-slate-900">Deep dives & how-to articles</h2>
            </div>
            <a href="/help" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
              Explore Help Center →
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {articles.map((article) => (
              <Link
                key={article.title}
                to={article.href}
                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition flex flex-col"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">{article.readingTime}</p>
                <p className="text-base font-semibold text-slate-900">{article.title}</p>
                <p className="text-sm text-slate-600 flex-1 mt-2">{article.description}</p>
                <span className="mt-3 text-sm font-semibold text-indigo-600">Read more →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Support</p>
            <h2 className="text-2xl font-semibold text-slate-900">Need help fast?</h2>
            <p className="text-sm text-slate-600">
              Need to dive deeper? These links are curated for writers who want quick answers, transparency, and human help.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {supportLinks.map((link) => {
              const isExternal = link.to.startsWith('mailto:');
              const Wrapper = isExternal ? 'a' : Link;
              const props = isExternal
                ? { href: link.to }
                : {
                    to: link.to
                  };
              return (
                <Wrapper
                  key={link.label}
                  {...props}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left hover:border-slate-300 transition"
                >
                  <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{link.description}</p>
                </Wrapper>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}



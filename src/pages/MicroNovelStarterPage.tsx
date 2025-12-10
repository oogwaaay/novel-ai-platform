import React from 'react';
import MicroNovelStarter from '../components/MicroNovelStarter';
import LiveActivityFeed from '../components/LiveActivityFeed';

export default function MicroNovelStarterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Micro-Novel Starter
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Generate creative micro-novel openings in seconds
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section A (Top): The Tool */}
        <section className="mb-12">
          <MicroNovelStarter />
        </section>

        {/* Section B (Middle): Social Proof */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">🔥 Live Inspiration Feed</h2>
            </div>
            <LiveActivityFeed />
          </div>
        </section>

        {/* Section C (Bottom): SEO Content Block */}
        <section className="mb-12 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">How to use this Micro-Novel Starter</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Stuck on ideas for your next micro-novel? This tool generates creative openings for various genres. Simply select a genre, click generate, and let our AI inspire your next masterpiece.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Why use Scribely for Micro-Novels?</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Micro-novels are a great way to practice your writing skills or tell a compelling story in a short format. Use these openings as a springboard and continue writing in Scribely's AI-powered editor, which offers features like:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mt-3">
                  <li>AI-assisted writing suggestions</li>
                  <li>Character and plot development tools</li>
                  <li>Easy sharing and publishing options</li>
                  <li>Collaboration features for co-writing</li>
                  <li>Export to multiple formats</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">FAQ</h3>
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">Is it free?</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Yes! This Micro-Novel Starter is completely free to use for both personal and commercial projects.
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">How long are the generated openings?</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Each opening is approximately 100-150 words, perfect for starting a micro-novel (typically 500-1000 words total).
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2">Can I customize the generated text?</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Absolutely! Once you generate an opening, you can copy it to the Scribely editor and modify it as much as you like to fit your vision.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        {/* Conversion: CTA */}
        <section className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Write Your Micro-Novel?
            </h2>
            <p className="text-indigo-100 text-lg mb-6">
              Use our Micro-Novel Starter to get inspired, then continue writing in the Scribely editor.
            </p>
            <button 
              onClick={() => window.location.href = '/generator'} 
              className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Start Writing Now
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} Scribely. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

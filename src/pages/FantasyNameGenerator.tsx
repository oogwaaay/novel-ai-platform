import React from 'react';
import CharacterNameGen from '../components/CharacterNameGen';
import LiveActivityFeed from '../components/LiveActivityFeed';
import SEOContentBlock from '../components/SEOContentBlock';

export default function FantasyNameGenerator() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Fantasy Name Generator
          </h1>
          <p className="text-slate-600 mt-1">
            Create unique and memorable names for your fantasy characters
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Layer: The Tool */}
        <section className="mb-12">
          <CharacterNameGen />
        </section>

        {/* Middle Layer: Social Proof */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <LiveActivityFeed />
          </div>
        </section>

        {/* Bottom Layer: SEO Content */}
        <section className="mb-12">
          <SEOContentBlock />
        </section>

        {/* Conversion: CTA */}
        <section className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Bring Your Character to Life?
            </h2>
            <p className="text-indigo-100 text-lg mb-6">
              Like this name? Create a detailed character profile for them in Scribely.
            </p>
            <button 
              onClick={() => window.location.href = '/generator'} 
              className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Create Character Profile
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-600">
            © 2025 Scribely. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

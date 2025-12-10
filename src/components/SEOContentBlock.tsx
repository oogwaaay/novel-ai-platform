import React from 'react';

interface SEOContentBlockProps {
  className?: string;
}

export default function SEOContentBlock({ className = '' }: SEOContentBlockProps) {
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          How to Name Fantasy Characters: A Comprehensive Guide
        </h2>
        
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">
              Why Character Names Matter in Fantasy Novels
            </h3>
            <p className="text-slate-600 leading-relaxed">
              In the realm of fantasy writing, character names are more than just labels—they're powerful tools that shape reader perception, establish worldbuilding, and even hint at character arcs. A well-chosen name can evoke a sense of history, culture, and personality, while a poorly chosen one can break immersion and weaken your story.
            </p>
            <p className="text-slate-600 leading-relaxed mt-3">
              Consider iconic fantasy names like Gandalf, Daenerys Targaryen, or Frodo Baggins. These names aren't just memorable—they're inseparable from the characters themselves. They carry weight, history, and meaning that enriches the reading experience.
            </p>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">
              Key Principles for Creating Memorable Fantasy Names
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-2">
                  <span className="text-indigo-600 mr-2">1.</span> Reflect Your Worldbuilding
                </h4>
                <p className="text-sm text-slate-600">
                  Names should align with your fantasy world's culture, geography, and history. A Viking-inspired character might have a different naming convention than an elven princess.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-2">
                  <span className="text-indigo-600 mr-2">2.</span> Consider Phonetics and Flow
                </h4>
                <p className="text-sm text-slate-600">
                  Names should be easy to pronounce and remember. Avoid overly complex combinations that might trip up readers.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-2">
                  <span className="text-indigo-600 mr-2">3.</span> Avoid Cultural Appropriation
                </h4>
                <p className="text-sm text-slate-600">
                  Be respectful when drawing inspiration from real-world cultures. Research thoroughly and avoid stereotyping.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-2">
                  <span className="text-indigo-600 mr-2">4.</span> Use Names to Hint at Character Traits
                </h4>
                <p className="text-sm text-slate-600">
                  Names can subtly reveal personality, abilities, or destiny. Consider how "Zelphar, Void Walker" suggests mystery and darkness.
                </p>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">
              Different Approaches to Fantasy Character Naming
            </h3>
            <p className="text-slate-600 leading-relaxed">
              There are many effective methods for creating fantasy character names, including:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-3">
              <li>
                <strong>Etymology-based:</strong> Drawing from Latin, Greek, or other languages to create meaningful names
              </li>
              <li>
                <strong>Sounds-based:</strong> Creating names based on pleasing phonetic combinations
              </li>
              <li>
                <strong>Culture-inspired:</strong> Using real-world cultural naming conventions as a foundation
              </li>
              <li>
                <strong>Descriptive:</strong> Combining words that describe the character's traits or role
              </li>
              <li>
                <strong>Symbolic:</strong> Using names that carry symbolic meaning related to the character's arc
              </li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">
              Common Mistakes to Avoid
            </h3>
            <p className="text-slate-600 leading-relaxed">
              When naming your fantasy characters, steer clear of these common pitfalls:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-3">
              <li>Overly complex or unpronounceable names</li>
              <li>Names that are too similar to each other</li>
              <li>Overusing apostrophes or unusual spellings</li>
              <li>Culturally insensitive appropriations</li>
              <li>Names that don't fit your worldbuilding</li>
              <li>Generic names that fail to stand out</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">
              Tips for Consistency Across Your Story
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Maintaining consistency in character naming is crucial for worldbuilding. Here are some tips:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-3">
              <li>Create naming conventions for different races or cultures</li>
              <li>Keep a master list of all character names</li>
              <li>Use similar sounds or structures for related characters</li>
              <li>Consider how names might evolve across generations</li>
              <li>Think about nicknames or titles that characters might acquire</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

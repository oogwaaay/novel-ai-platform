import { useState } from 'react';

const faqs = [
  {
    question: 'What exactly does Novel AI generate?',
    answer:
      'Novel AI creates long-form drafts or structured outlines based on your story description. You can choose to generate 3–5 opening chapters, a full 60-page manuscript preview, or a chapter-by-chapter outline that you can expand interactively.'
  },
  {
    question: 'Can I edit and continue the novel after it’s generated?',
    answer:
      'Absolutely. Switch to the editor mode to revise paragraphs, request alternative scenes, or use “Continue writing” to extend the draft. We keep track of your context so the AI maintains tone and characters across sessions.'
  },
  {
    question: 'How do I get the best results?',
    answer:
      'Describe characters, tone, stakes, and ending expectations. Mention the pacing (slow burn vs. fast thriller) and specify whether you want third-person, first-person, or multiple POVs. The clearer the brief, the better the draft.'
  },
  {
    question: 'Is there a free plan?',
    answer:
      'Yes. The Starter plan lets you generate and export shorter drafts so you can experience the workflow before upgrading. All plans include outline generation, reading/editor modes, and PDF/Markdown exports.'
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <header className="text-center space-y-3">
        <p className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-600 dark:text-indigo-400">FAQ</p>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Frequently asked questions</h2>
        <p className="text-slate-600 dark:text-slate-300">
          Answers to the most common questions writers ask before adopting AI into their workflow.
        </p>
      </header>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={faq.question}
              className="border border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 shadow-sm transition"
            >
              <button
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span className="text-base font-semibold text-slate-900 dark:text-white">{faq.question}</span>
                <span
                  className={`text-xl font-semibold ${
                    isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {isOpen ? '–' : '+'}
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



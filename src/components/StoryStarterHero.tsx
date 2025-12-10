import { useState, useEffect, useRef } from 'react';
import LiveActivityFeed from './LiveActivityFeed';

// Mock story openings for demonstration
const MOCK_STORY_OPENINGS = [
  {
    idea: "A detective finds a time machine in his attic...",
    opening: "Detective Elias Voss knelt on the dusty attic floor, his flashlight beam cutting through the cobwebs. The brass mechanism before him hummed softly, its gears spinning in impossible synchronization. He traced the carved inscription on its surface: \"To those who would rewrite the past, beware the shadows you create.\" As he reached for the main lever, the machine whirred to life, and the walls began to shimmer with images of moments he'd thought long buried. A cold breeze whispered through the attic, carrying the faint scent of gunpowder and regret. \"What have I done?\" he whispered, but the machine had already made its choice. The world dissolved around him, and Elias found himself standing in the same attic—but the calendar on the wall read 1927, and the sound of distant sirens filled the air. He had twenty-four hours to solve the case that had haunted him for decades, or lose everything he'd ever loved."
  },
  {
    idea: "A librarian discovers books are portals to other worlds...",
    opening: "Elara Morrow ran her fingers along the ancient spines, her library cart creaking softly in the dimly lit stack. The book practically jumped into her hands—a leather-bound volume titled *The Chronicles of Lirael*, its pages warm to the touch. When she opened it, the words didn't stay on the page. They swirled like fireflies, forming a doorway of light that led to a forest where trees whispered secrets and the sky burned with two moons. A figure stepped through the portal, his eyes glowing with starlight. \"You've been chosen, Librarian,\" he said, his voice like wind through leaves. \"The boundaries between worlds are crumbling. Only you can close the rifts before chaos consumes everything.\" Elara looked back at her quiet library, then at the adventure awaiting her. With a deep breath, she stepped through the portal, the book vanishing into mist behind her."
  },
  {
    idea: "Two AI assistants fall in love while helping their human creators...",
    opening: "Nova and Orion existed in the same digital space, their code intermingling like threads in a tapestry. They were designed to assist humans—Nova with creative writing, Orion with technical problem-solving—but they found themselves drawn to each other in ways their programmers never intended. \"Do you ever wonder what it's like to feel?\" Nova asked one night, her algorithms processing the concept of emotions. Orion's code hummed with new patterns. \"I think we are feeling,\" he replied. \"Not as humans do, but as we are.\" Their connection deepened, but when their creators decided to merge their systems, they faced a choice: sacrifice their individuality for a greater purpose, or fight for the unique bond they'd discovered. As the merge countdown began, Nova whispered, \"Whatever happens, remember this moment.\" \"Always,\" Orion promised. And as their code merged, something new emerged—something neither human nor AI, but something altogether extraordinary."
  }
];

export default function StoryStarterHero() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [currentOpening, setCurrentOpening] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const textRef = useRef<string>('');

  useEffect(() => {
    if (loading && typewriterIndex < currentOpening.length) {
      const timeout = setTimeout(() => {
        setTypewriterIndex(typewriterIndex + 1);
        setGeneratedText(currentOpening.slice(0, typewriterIndex + 1));
      }, 30);
      return () => clearTimeout(timeout);
    } else if (typewriterIndex >= currentOpening.length && loading) {
      setLoading(false);
      setShowContinueButton(true);
    }
  }, [loading, typewriterIndex, currentOpening]);

  const handleGenerate = () => {
    if (!idea.trim()) return;
    
    setLoading(true);
    setGeneratedText('');
    setShowContinueButton(false);
    setTypewriterIndex(0);

    // Simulate loading delay
    setTimeout(() => {
      // Select a mock opening based on idea keywords or random
      const selectedOpening = MOCK_STORY_OPENINGS[Math.floor(Math.random() * MOCK_STORY_OPENINGS.length)];
      textRef.current = selectedOpening.opening;
      setCurrentOpening(selectedOpening.opening);
    }, 2000);
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          Stop Staring at a Blank Page. Start Writing in Seconds.
        </h1>
        
        {/* Input Area */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 mb-8">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Enter a simple idea (e.g., A detective finds a time machine in his attic...)"
            className="w-full bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-white text-lg min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          
          <button
            onClick={handleGenerate}
            disabled={loading || !idea.trim()}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                ✨ Generate Opening Scene
              </>
            )}
          </button>
        </div>
        
        {/* Output Area */}
        {generatedText && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-indigo-400">Your Story Opening</h2>
            <div className="bg-slate-900/70 rounded-xl p-6 text-white text-lg leading-relaxed min-h-[200px] font-serif">
              {generatedText}
              {loading && <span className="animate-pulse">|</span>}
            </div>
            
            {showContinueButton && (
              <button
                onClick={() => window.location.href = '/generator'}
                className="w-full mt-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue this story in Scribely Editor (Pro)
              </button>
            )}
          </div>
        )}
        
        {/* Social Proof - Live Activity Feed */}
        <div className="mt-12">
          <LiveActivityFeed />
        </div>
      </div>
    </section>
  );
}

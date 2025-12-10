import { useState, useEffect, useRef } from 'react';

interface ActivityItem {
  id: number;
  text: string;
}

const MOCK_DATA: ActivityItem[] = [
  { id: 1, text: 'User 8821 generated a Cyberpunk Story Opening' },
  { id: 2, text: 'User just captured a Fantasy Character Name: "Eldrin the Wise"' },
  { id: 3, text: 'Someone is writing a Sci-Fi Thriller...' },
  { id: 4, text: 'User 1234 created a Romance Novel Outline' },
  { id: 5, text: 'Writer XYZ expanded their story idea with AI' },
  { id: 6, text: 'User 5678 generated a Mystery Chapter' },
  { id: 7, text: 'Author ABC used AI to improve their writing style' },
  { id: 8, text: 'User 9012 created a Historical Fiction Draft' },
  { id: 9, text: 'Someone is working on a Horror Story...' },
  { id: 10, text: 'User 3456 generated a Children\'s Book Concept' },
  { id: 11, text: 'Writer DEF expanded their Fantasy Worldbuilding' },
  { id: 12, text: 'User 7890 created a Self-Help Book Outline' },
  { id: 13, text: 'Author GHI used AI to generate character arcs' },
  { id: 14, text: 'User 2345 is writing a Young Adult Novel' },
  { id: 15, text: 'Someone just finished a Short Story Draft' },
];

export default function LiveActivityFeed() {
  const [position, setPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const updatePosition = () => {
      setPosition(prev => {
        const contentWidth = content.offsetWidth;
        if (prev <= -contentWidth / 2) {
          return 0;
        }
        return prev - 1;
      });
    };

    const interval = setInterval(updatePosition, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden bg-slate-900/30 backdrop-blur-md rounded-full py-2 px-4 border border-slate-700/50"
      style={{ height: '40px' }}
    >
      <div 
        ref={contentRef}
        className="flex items-center whitespace-nowrap absolute top-0 left-0"
        style={{ transform: `translateX(${position}px)` }}
      >
        {MOCK_DATA.map((item) => (
          <div 
            key={item.id} 
            className="inline-block mr-8 text-sm text-slate-300 flex items-center"
          >
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 animate-pulse"></span>
            {item.text}
          </div>
        ))}
        {/* Duplicate content for seamless scrolling */}
        {MOCK_DATA.map((item) => (
          <div 
            key={`duplicate-${item.id}`} 
            className="inline-block mr-8 text-sm text-slate-300 flex items-center"
          >
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 animate-pulse"></span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

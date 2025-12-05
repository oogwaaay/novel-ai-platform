import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { WorkspaceView } from '../components/WorkspaceView';
import type { BlockSchema } from '../types/block';
import ImportDraftDialog from '../components/ImportDraftDialog';
import type { ImportedContent } from '../utils/fileImport';

// Dynamic placeholder templates (innovative, not copying Squibler)
const DYNAMIC_PLACEHOLDERS = [
  'I want to write a 60-page sci-fi novel about a time traveler who discovers they\'re the cause of every historical disaster...',
  'I want to write a 45-page mystery thriller about a detective who can only solve cases in their dreams...',
  'I want to write a 80-page fantasy epic about a librarian who discovers books are actually portals to other worlds...',
  'I want to write a 50-page romance novel about two AI assistants who fall in love while helping their human creators...',
  'I want to write a 70-page dystopian story about a society where emotions are illegal and one person starts feeling again...',
  'I want to write a 55-page adventure tale about a group of kids who find a map to a hidden dimension in their school library...',
  'I want to write a 65-page psychological thriller about a therapist who realizes all their patients are describing the same person...',
  'I want to write a 40-page coming-of-age story about a teenager who discovers they can communicate with extinct animals...'
];

const GENRE_OPTIONS = [
  { value: 'general-fiction', label: 'General Fiction' },
  { value: 'literary-fiction', label: 'Literary Fiction' },
  { value: 'historical-fiction', label: 'Historical Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'horror', label: 'Horror / Suspense' },
  { value: 'romance', label: 'Romance' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'science-fiction', label: 'Science Fiction' },
  { value: 'dystopian', label: 'Dystopian' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'young-adult', label: 'Young Adult (YA)' },
  { value: 'comedy', label: 'Comedy / Humor' },
  { value: 'ai-themed', label: 'AI Themed / Novels About AI' },
  { value: 'fan-fiction', label: 'Fan Fiction' }
];

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [heroIdea, setHeroIdea] = useState('');
  const [heroGenre, setHeroGenre] = useState('general-fiction');
  const heroWordCount = heroIdea.trim() ? heroIdea.trim().split(/\s+/).length : 0;
  const minWords = 20;

  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const charIndexRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(true);

  // Typewriter effect for placeholders
  useEffect(() => {
    // Stop if user is typing or focused
    if (heroIdea.trim().length > 0 || isFocused) {
      isActiveRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (heroIdea.trim().length > 0) {
        setDisplayedPlaceholder('');
      }
      setIsTyping(false);
      return;
    }

    // Start typewriter effect
    isActiveRef.current = true;
    const currentFullText = DYNAMIC_PLACEHOLDERS[currentPlaceholderIndex];
    if (!currentFullText) {
      console.warn('No placeholder text found at index:', currentPlaceholderIndex);
      return;
    }
    
    charIndexRef.current = 0;
    setIsTyping(true);
    setDisplayedPlaceholder('');

    const typeChar = () => {
      if (!isActiveRef.current) return;
      
      if (charIndexRef.current < currentFullText.length) {
        charIndexRef.current++;
        const newText = currentFullText.slice(0, charIndexRef.current);
        setDisplayedPlaceholder(newText);
        
        // Variable typing speed: faster for spaces, slower for punctuation
        const char = currentFullText[charIndexRef.current - 1];
        let delay = 40;
        if (char === ' ') delay = 20;
        else if (char === ',' || char === '.') delay = 80;
        else if (char === '?') delay = 100;
        else delay = 30 + Math.random() * 20;
        
        typingTimeoutRef.current = setTimeout(typeChar, delay);
      } else {
        // Finished typing, wait 2.5 seconds then erase
        setIsTyping(false);
        typingTimeoutRef.current = setTimeout(() => {
          if (!isActiveRef.current) return;
          setIsTyping(true);
          
          const erase = () => {
            if (!isActiveRef.current) return;
            
            if (charIndexRef.current > 0) {
              charIndexRef.current--;
              setDisplayedPlaceholder(currentFullText.slice(0, charIndexRef.current));
              typingTimeoutRef.current = setTimeout(erase, 10);
            } else {
              // Move to next placeholder
              setCurrentPlaceholderIndex((prev) => (prev + 1) % DYNAMIC_PLACEHOLDERS.length);
            }
          };
          erase();
        }, 2500);
      }
    };

    // Start typing after a very short delay to ensure component is mounted
    typingTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        typeChar();
      }
    }, 100);

    return () => {
      isActiveRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [currentPlaceholderIndex, heroIdea, isFocused]);

  // Home page only needs hero + import; template management moved to Help

  // Handle anchor scrolling when navigating from other pages
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  const handleHeroSubmit = (mode: 'draft' | 'outline') => {
    if (heroWordCount < minWords) return;
    const params = new URLSearchParams({
      entry: 'hero',
      mode,
      genre: heroGenre,
      idea: heroIdea.trim()
    });
    navigate(`/generator?${params.toString()}`);
  };

  const handleImport = (content: ImportedContent) => {
    // Navigate to generator with imported content
    const params = new URLSearchParams({
      entry: 'import',
      mode: 'draft',
      imported: 'true'
    });
    
    // Store imported content in sessionStorage for Generator to pick up
    sessionStorage.setItem('importedContent', JSON.stringify({
      text: content.text,
      title: content.title,
      chapters: content.chapters
    }));
    
    navigate(`/generator?${params.toString()}`);
  };

  const heroBlock: BlockSchema = {
    id: 'home-hero',
    type: 'home-hero',
    props: {
      genre: heroGenre,
      genreOptions: GENRE_OPTIONS,
      onGenreChange: (value: string) => setHeroGenre(value),
      idea: heroIdea,
      onIdeaChange: (value: string) => setHeroIdea(value),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      displayedPlaceholder,
      isTyping,
      isFocused,
      heroWordCount,
      minWords,
      onGenerate: () => handleHeroSubmit('draft'),
      onOutline: () => handleHeroSubmit('outline'),
      onImport: () => setShowImportDialog(true)
    }
  };

  // const testimonialBlock: BlockSchema = {
  //   id: 'home-testimonials',
  //   type: 'testimonial',
  //   className: 'max-w-4xl mx-auto px-4',
  //   props: {
  //     title: 'Trusted by writers worldwide',
  //     layout: 'carousel',
  //     testimonials: [
  //       {
  //         id: 'home-1',
  //         name: 'Sarah Chen',
  //         role: 'Fantasy Novelist',
  //         avatar: '/images/testimonials/sarah-chen.png',
  //         tier: 'pro',
  //         verified: true,
  //         rating: 5,
  //         content: 'I\'ve been writing fantasy novels for years, and Scribely is the first tool that actually understands my voice. It remembers how I write dialogue, how I describe scenes, and keeps everything consistent across hundreds of pages. It\'s like having a co-writer who never forgets your style.',
  //       },
  //       {
  //         id: 'home-2',
  //         name: 'Marcus Johnson',
  //         role: 'Indie Author',
  //         avatar: '/images/testimonials/marcus-johnson.png',
  //         tier: 'unlimited',
  //         verified: true,
  //         rating: 5,
  //         content: 'Working with my editor used to mean endless email chains and version confusion. Now we collaborate in real-time, leave comments directly in the text, and I can see exactly what changed in each version. It\'s transformed how we work together.',
  //       },
  //       {
  //         id: 'home-3',
  //         name: 'Emma Rodriguez',
  //         role: 'Creative Writing Student',
  //         avatar: '/images/testimonials/emma-rodriguez.png',
  //         tier: 'starter',
  //         verified: true,
  //         rating: 5,
  //         content: 'As a student, I can\'t afford expensive writing software. Scribely\'s Starter plan gives me everything I need to practice and improve. The AI suggestions help me understand pacing and character development. It\'s like having a writing tutor available 24/7.',
  //       },
  //       {
  //         id: 'home-4',
  //         name: 'David Kim',
  //         role: 'Screenwriter & Novelist',
  //         avatar: '/images/testimonials/david-kim.png',
  //         tier: 'pro',
  //         verified: true,
  //         rating: 5,
  //         content: 'What I love most is how Scribely learns from my previous work. I can write a sci-fi novel and a romance novel, and it adapts to each genre perfectly. The character tracking keeps everyone\'s motivations and relationships clear, even in complex stories.',
  //       },
  //     ],
  //   },
  // };

  const homeBlocks: BlockSchema[] = [heroBlock /*, testimonialBlock */];

  return (
    <div>
      <SEO
        title="Scribely - AI Novel Generator | Create Stories with AI"
        description="Generate complete novels with AI in minutes. Free AI novel generator for writers. Create novels about AI, fantasy, romance, mystery, and more."
        keywords="scribely, ai novel generator, ai novel writer, novels about ai, ai story generator, ai book generator"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Scribely',
          description: 'AI-powered novel writing assistant for creating, managing, and refining your stories',
          url: 'https://scribelydesigns.top',
          applicationCategory: 'WritingApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
          },
          featureList: [
            'AI-powered story generation',
            'Character management',
            'Writing style customization',
            'Chapter organization',
            'Export to multiple formats'
          ],
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '120'
          }
        }}
      />

      <WorkspaceView blocks={homeBlocks} className="space-y-16" />

      <ImportDraftDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </div>
  );
}

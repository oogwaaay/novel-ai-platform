import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SEO } from '../components/SEO';
import StoryStarterHero from '../components/StoryStarterHero';
import ImportDraftDialog from '../components/ImportDraftDialog';
import type { ImportedContent } from '../utils/fileImport';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showImportDialog, setShowImportDialog] = useState(false);

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

  return (
    <div>
      <SEO
        title="Scribely - AI Novel Generator | Create Stories with AI"
        description="Generate complete novels with AI in minutes. Free AI novel generator for writers. Create novels about AI, fantasy, romance, mystery, and more."
        keywords="scribely, ai novel generator, ai novel writer, novels about ai, ai story generator, ai book generator"
        image="https://scribelydesigns.top/brand1090.png"
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

      <StoryStarterHero />

      <ImportDraftDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </div>
  );
}

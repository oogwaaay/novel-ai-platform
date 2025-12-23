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
      
      {/* 添加相关链接区块，解决dead end问题 */}
      <section className="py-12 px-4 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-slate-900 dark:text-white">探索更多功能</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <a 
              href="/generator" 
              className="block p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">AI小说生成器</h3>
              <p className="text-slate-600 dark:text-slate-300">使用AI辅助创作完整的小说</p>
            </a>
            
            <a 
              href="/ai-prompt-generator" 
              className="block p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">AI提示生成器</h3>
              <p className="text-slate-600 dark:text-slate-300">生成创意写作提示</p>
            </a>
            
            <a 
              href="/dashboard" 
              className="block p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">仪表板</h3>
              <p className="text-slate-600 dark:text-slate-300">管理您的写作项目</p>
            </a>
            
            <a 
              href="/pricing" 
              className="block p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">定价方案</h3>
              <p className="text-slate-600 dark:text-slate-300">查看我们的订阅计划</p>
            </a>
            
            <a 
              href="/resources" 
              className="block p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">资源中心</h3>
              <p className="text-slate-600 dark:text-slate-300">获取写作技巧和指南</p>
            </a>
            
            <a 
              href="/tools/fantasy-name-generator" 
              className="block p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">奇幻名字生成器</h3>
              <p className="text-slate-600 dark:text-slate-300">为角色和地点生成创意名字</p>
            </a>
          </div>
        </div>
      </section>

      <ImportDraftDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import { GlassCard } from '../components/ui/GlassCard';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export default function AIPromptGenerator() {
  // Example prompt for initial state
  const EXAMPLE_PROMPT = "A futuristic city floating in the clouds, golden hour lighting, studio ghibli style, highly detailed, 8k resolution --ar 16:9";
  
  // Model selection state
  const [selectedModel, setSelectedModel] = useState<'midjourney' | 'stable-diffusion' | 'nano-banana'>('midjourney');
  const [prompt, setPrompt] = useState<string>(EXAMPLE_PROMPT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isInitialPrompt, setIsInitialPrompt] = useState<boolean>(true);

  // Arrays for prompt generation
  const subjects = [
    "A cyberpunk samurai",
    "A cute robot",
    "A futuristic city",
    "An astronaut",
    "A magical forest",
    "A steampunk airship",
    "A underwater civilization",
    "A mythical dragon",
    "A post-apocalyptic settlement",
    "A space station"
  ];

  const styles = [
    "in the style of Studio Ghibli",
    "synthwave aesthetic",
    "oil painting",
    "unreal engine 5 render",
    "watercolor painting",
    "comic book style",
    "pixel art",
    "minimalist design",
    "impressionist painting",
    "3D rendering"
  ];

  const lighting = [
    "cinematic lighting",
    "golden hour",
    "neon ambiance",
    "mysterious fog",
    "dramatic shadows",
    "soft pastel lighting",
    "volumetric lighting",
    "blue hour",
    "studio lighting",
    "natural sunlight"
  ];

  const techSpecs = [
    "8k resolution",
    "highly detailed",
    "wide angle lens",
    "--ar 16:9",
    "ultra realistic",
    "smooth animation",
    "depth of field",
    "bokeh effect",
    "ray tracing",
    "high dynamic range"
  ];

  // Nano Banana specific keywords
  const nanoBananaKeywords = [
    "crisp details",
    "vibrant colors",
    "smooth texture",
    "nano style",
    "3d render",
    "high quality",
    "sharp focus",
    "modern aesthetic",
    "trending style",
    "clean design",
    "ultra detailed",
    "nano optimized",
    "🚀 nano banana",
    "premium render",
    "professional quality"
  ];

  // Generate a random prompt
  const generatePrompt = () => {
    setIsGenerating(true);
    
    // Randomly select from each array
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomLighting = lighting[Math.floor(Math.random() * lighting.length)];
    
    // Handle model-specific tech specs
    let randomTechSpecs;
    if (selectedModel === 'nano-banana') {
      // For Nano Banana, prioritize its specific keywords
      const nanoKeyword = nanoBananaKeywords[Math.floor(Math.random() * nanoBananaKeywords.length)];
      // Mix with a regular tech spec for variety
      const regularTechSpec = techSpecs[Math.floor(Math.random() * techSpecs.length)];
      randomTechSpecs = `${nanoKeyword}, ${regularTechSpec}`;
    } else {
      // Regular tech specs for other models
      randomTechSpecs = techSpecs[Math.floor(Math.random() * techSpecs.length)];
    }
    
    // Combine into a single prompt
    const newPrompt = `${randomSubject}, ${randomStyle}, ${randomLighting}, ${randomTechSpecs}`;
    
    // Add fade-in animation effect
    setTimeout(() => {
      setPrompt(newPrompt);
      setIsGenerating(false);
      setIsInitialPrompt(false); // Remove initial prompt state
    }, 300);
  };

  // Copy prompt to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Share on X (Twitter)
  const shareOnX = () => {
    const shareText = `I generated this AI idea using ScribelyDesigns: ${prompt} #AIart https://scribelydesigns.top`;
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank', 'noopener noreferrer');
  };

  // Generate initial prompt on component mount
  useEffect(() => {
    generatePrompt();
  }, []);

  return (
    <div className="min-h-screen py-16">
      <SEO
        title="AI Art Prompt Randomizer - Generate Creative Ideas for Midjourney, Stable Diffusion & Nano Banana"
        description="Overcome creative block instantly. Generate viral prompts for Midjourney, Stable Diffusion, and Nano Banana with our AI Art Prompt Generator."
        keywords="ai art prompts, midjourney prompts, stable diffusion prompts, ai prompt generator, creative ideas"
        image="https://scribelydesigns.top/brand1090.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'AI Art Prompt Generator',
          description: 'Random AI Art Prompt Generator for Midjourney and Stable Diffusion',
          url: 'https://scribelydesigns.top/ai-prompt-generator',
          applicationCategory: 'ProductivityApplication'
        }}
      />
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-slate-900 dark:text-slate-200 tracking-tight mb-4">
            AI Art Prompt Randomizer
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Overcome creative block instantly. Generate viral prompts for Midjourney, Stable Diffusion, and Nano Banana.
          </p>
        </div>
        
        {/* Prompt Generator Card */}
        <GlassCard className="p-8 shadow-xl">
          <div className="space-y-6">
            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Target Model
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {/* Midjourney Option */}
                <button
                  onClick={() => setSelectedModel('midjourney')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${selectedModel === 'midjourney' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Midjourney
                </button>
                
                {/* Stable Diffusion Option */}
                <button
                  onClick={() => setSelectedModel('stable-diffusion')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${selectedModel === 'stable-diffusion' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Stable Diffusion
                </button>
                
                {/* Nano Banana Option */}
                <button
                  onClick={() => setSelectedModel('nano-banana')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all relative ${selectedModel === 'nano-banana' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Nano Banana 🚀
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    New
                  </span>
                </button>
              </div>
            </div>
            
            {/* Prompt Output Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Your AI Art Prompt
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  readOnly
                  className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-6 text-lg font-mono resize-none transition-all duration-300 ${isGenerating ? 'opacity-50' : 'opacity-100'} ${isInitialPrompt ? 'text-slate-500 dark:text-slate-400 opacity-70' : 'text-slate-900 dark:text-white opacity-100'}`}
                  rows={4}
                  placeholder="Generating your prompt..."
                />
                {/* Copy icon button inside the textarea */}
                <button
                  onClick={copyToClipboard}
                  disabled={!prompt || isGenerating}
                  className="absolute bottom-3 right-3 p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Guiding Label */}
            <div className="flex justify-center mb-4">
              <span className="text-sm text-slate-600 dark:text-yellow-300 animate-pulse">
                👆 Click 'Generate Prompt' to create your own unique idea
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <PrimaryButton
                onClick={generatePrompt}
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white"
              >
                {isGenerating ? 'Generating...' : 'Generate Prompt'}
              </PrimaryButton>
              
              <SecondaryButton
                onClick={copyToClipboard}
                disabled={!prompt || isGenerating}
                className="flex-1 relative group"
              >
                {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                {isCopied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded-full">
                    Copied to clipboard!
                  </span>
                )}
              </SecondaryButton>
              
              <SecondaryButton
                onClick={shareOnX}
                disabled={!prompt || isGenerating}
                className="flex-1"
              >
                Share on X
              </SecondaryButton>
            </div>
            
            {/* Write Story Button - Visual-to-Story Bridge */}
            <div className="mt-6">
              <PrimaryButton
                onClick={() => {
                  const encodedPrompt = encodeURIComponent(prompt);
                  window.location.href = `https://scribelydesigns.top/app/editor?mode=visual_start&prompt=${encodedPrompt}`;
                }}
                disabled={!prompt || isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg relative group"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  ✨ Write This Story (Scribely AI)
                </span>
                {/* Tooltip */}
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  Turn this visual idea into a novel chapter instantly.
                </span>
              </PrimaryButton>
            </div>
            
            {/* How it works */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                How it works
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This tool combines random subjects, styles, lighting, and technical specifications to create unique AI art prompts.
                Click "Generate Prompt" to get a new idea, then copy it to use in Midjourney, Stable Diffusion, or any other AI art generator.
                Now fully optimized for the latest <strong>Nano Banana</strong> model.
              </p>
            </div>
          </div>
        </GlassCard>
        
        {/* Feature List */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">
              Endless Ideas
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Generate thousands of unique prompt combinations to overcome creative block.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">
              Ready to Use
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Copy and paste directly into your favorite AI art generator.
            </p>
          </div>
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">
              Mobile Friendly
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Works on any device, from desktop to mobile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
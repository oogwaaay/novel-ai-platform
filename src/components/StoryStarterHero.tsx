import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LiveActivityFeed from './LiveActivityFeed';
import { useAuthStore } from '../store/authStore';
import { updateSubscription } from '../api/authApi';
import { CREEM_PRODUCT_IDS } from '../config/products';
import LoginModal from './LoginModal';
import type { SubscriptionTier } from '../types/subscription';
import { CAPABILITY_PROFILES } from '../config/capabilities';
// 使用环境变量获取 API 基础 URL，开发环境为空字符串(走代理)，生产环境为 Railway 域名
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
  
  // Payment related state
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { isAuthenticated } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Handle select plan and payment
  const handleSelectPlan = async (tier: string) => {
    setProcessingPayment(true);
    
    const normalizedTier = (tier || '').toLowerCase() as SubscriptionTier;
    
    // Free plan doesn't require payment
    if (normalizedTier === 'free') {
      navigate('/generator');
      setProcessingPayment(false);
      return;
    }
    
    if (!['starter', 'pro', 'unlimited'].includes(normalizedTier)) {
      navigate('/generator');
      setProcessingPayment(false);
      return;
    }

    // If not logged in, show login modal
    if (!isAuthenticated) {
      setShowLoginModal(true);
      setProcessingPayment(false);
      return;
    }

    try {
      // Get the appropriate Creem product ID for this plan and billing cycle
      const productId = CREEM_PRODUCT_IDS[normalizedTier][billingCycle];
      
      // Call Creem API to create checkout session
      const apiUrl = `${API_BASE_URL}/api/creem/create-checkout`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          billingCycle
        })
      });

      const result = await response.json();
      
      if (result.checkout_url) {
        // Redirect to Creem payment page
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('[StoryStarterHero] Failed to create checkout session', error);
      // Fallback: still navigate to generator so the user can continue writing.
      navigate('/generator');
    } finally {
      setProcessingPayment(false);
    }
  };

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
    <section className="py-12 px-4 bg-transparent text-slate-900 dark:text-white">
      <div className="max-w-4xl mx-auto">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-200 dark:to-purple-200">
          Stop Staring at a Blank Page. Start Writing in Seconds.
        </h1>
        
        {/* Subheadline with points incentive */}
        <p className="text-base sm:text-lg md:text-xl text-center text-slate-600 dark:text-slate-200 mb-8">
          Turn your idea into a story. Join now and get <span className="text-indigo-600 dark:text-indigo-300 font-semibold">💎 500 Free Points!</span>
        </p>
        
        {/* Input Area */}
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-6 mb-8">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Enter a simple idea (e.g., A detective finds a time machine in his attic...)"
            className="w-full bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 sm:p-4 text-slate-900 dark:text-white text-base sm:text-lg min-h-[100px] sm:min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          
          <button
            onClick={handleGenerate}
            disabled={loading || !idea.trim()}
            className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
          <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-indigo-500 dark:text-indigo-300">Your Story Opening</h2>
            <div className="bg-white dark:bg-slate-900/90 rounded-xl p-4 sm:p-6 text-slate-900 dark:text-white text-base sm:text-lg leading-relaxed min-h-[150px] sm:min-h-[200px] font-serif">
              {generatedText}
              {loading && <span className="animate-pulse">|</span>}
            </div>
            
            {showContinueButton && (
              <button
                onClick={() => window.location.href = '/generator'}
                className="w-full mt-3 sm:mt-4 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
              >
                Continue this story in Scribely Editor (Pro)
              </button>
            )}
          </div>
        )}
        
        {/* Social Proof - Live Activity Feed */}
        <div className="mt-8 sm:mt-12">
          <LiveActivityFeed />
        </div>
        
        {/* Features Section - Added by Trae */}
        <div className="mt-12 sm:mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-slate-900 dark:text-white">What You Can Do with Scribely</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1: AI Writing */}
            <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-6 text-center hover:transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📝</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-slate-900 dark:text-white">AI Writing</h3>
              <p className="text-slate-600 dark:text-slate-200 text-sm sm:text-base">Infinite text generation for Pro users.</p>
            </div>
            
            {/* Feature 2: Character Art */}
            <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-6 text-center hover:transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎨</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-slate-900 dark:text-white">Character Art</h3>
              <p className="text-slate-600 dark:text-slate-200 text-sm sm:text-base">Bring characters to life with AI art. <span className="text-amber-500 dark:text-amber-400 text-xs sm:text-sm">Coming Soon</span></p>
            </div>
            
            {/* Feature 3: World Building */}
            <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-6 text-center hover:transform hover:scale-105 transition-transform">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🌍</div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-slate-900 dark:text-white">World Building</h3>
              <p className="text-slate-600 dark:text-slate-200 text-sm sm:text-base">Deep world tracking and lore management.</p>
            </div>
          </div>
        </div>
        
        {/* Pricing Preview - Added by Trae */}
        <div className="mt-16 sm:mt-20 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10 text-slate-900 dark:text-white">Simple, Transparent Pricing</h2>
          
          <div className="flex items-center justify-center gap-4 py-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-16 h-8 rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-slate-700 dark:bg-green-600' : 'bg-slate-200 dark:bg-slate-600'}`}
              aria-label="Toggle billing cycle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white dark:bg-white shadow-lg transition-transform ${billingCycle === 'yearly' ? 'translate-x-8' : ''}`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>
                Yearly
              </span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-0.5 rounded-full shadow-md">
                Save up to 25%
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white dark:bg-slate-900/70 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700/50">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-slate-900 dark:text-white">Starter</h3>
              <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                ${billingCycle === 'yearly' ? CAPABILITY_PROFILES.starter.yearlyPrice : CAPABILITY_PROFILES.starter.monthlyPrice}
                <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                  {billingCycle === 'yearly' ? '/year' : '/mo'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
                  ${Math.round(CAPABILITY_PROFILES.starter.yearlyPrice / 12)}/month
                  <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    Save {CAPABILITY_PROFILES.starter.yearlyDiscount}%
                  </span>
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-200 mb-5 sm:mb-6">5,000 Points</p>
              <button 
                onClick={() => handleSelectPlan('starter')}
                disabled={processingPayment}
                className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processing...' : 'Get Started'}
              </button>
            </div>
            
            {/* Pro Plan */}
            <div className="bg-white dark:bg-slate-900/70 rounded-xl p-5 sm:p-6 border-2 border-indigo-500 shadow-lg relative">
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-slate-900 dark:text-white">Pro</h3>
              <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                ${billingCycle === 'yearly' ? CAPABILITY_PROFILES.pro.yearlyPrice : CAPABILITY_PROFILES.pro.monthlyPrice}
                <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                  {billingCycle === 'yearly' ? '/year' : '/mo'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
                  ${Math.round(CAPABILITY_PROFILES.pro.yearlyPrice / 12)}/month
                  <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    Save {CAPABILITY_PROFILES.pro.yearlyDiscount}%
                  </span>
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-200 mb-5 sm:mb-6">Unlimited Text + 2,000 Points</p>
              <button 
                onClick={() => handleSelectPlan('pro')}
                disabled={processingPayment}
                className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processing...' : 'Choose Pro'}
              </button>
            </div>
            
            {/* Unlimited Plan */}
            <div className="bg-white dark:bg-slate-900/70 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700/50">
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-slate-900 dark:text-white">Unlimited</h3>
              <div className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                ${billingCycle === 'yearly' ? CAPABILITY_PROFILES.unlimited.yearlyPrice : CAPABILITY_PROFILES.unlimited.monthlyPrice}
                <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                  {billingCycle === 'yearly' ? '/year' : '/mo'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-sm text-slate-500 dark:text-slate-300 mb-3">
                  ${Math.round(CAPABILITY_PROFILES.unlimited.yearlyPrice / 12)}/month
                  <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    Save {CAPABILITY_PROFILES.unlimited.yearlyDiscount}%
                  </span>
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-200 mb-5 sm:mb-6">Unlimited + 10,000 Points</p>
              <button 
                onClick={() => handleSelectPlan('unlimited')}
                disabled={processingPayment}
                className="w-full py-2.5 sm:py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processing...' : 'Go Unlimited'}
              </button>
            </div>
          </div>
          
          <p className="text-center text-slate-500 dark:text-slate-400 mt-6 sm:mt-8 text-xs sm:text-sm">
            Need more features? Contact us for custom enterprise plans.
          </p>
        </div>
        
        {/* Login Modal for subscription */}
        <LoginModal
          open={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            // After successful login, user can click again to purchase
          }}
        />
      </div>
    </section>
  );
}

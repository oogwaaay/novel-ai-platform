import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { WorkspaceView } from '../components/WorkspaceView';
import type { BlockSchema } from '../types/block';
import { CAPABILITY_PROFILES } from '../config/capabilities';
import { useAuthStore } from '../store/authStore';
import { updateSubscription } from '../api/authApi';
import { CREEM_PRODUCT_IDS } from '../config/products';
import type { SubscriptionTier } from '../types/subscription';
import LoginModal from '../components/LoginModal';
// 使用相对路径，让浏览器自动使用当前页面的域名和端口
const API_BASE_URL = '/api';

export default function Pricing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { isAuthenticated } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Handle anchor scrolling when navigating from other pages or URL hash
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

  const plans = [
    CAPABILITY_PROFILES.starter,
    { ...CAPABILITY_PROFILES.pro, popular: true },
    CAPABILITY_PROFILES.unlimited
  ];

  const handleSelectPlan = async (tier: string, e?: React.MouseEvent) => {
    // 阻止默认行为
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const normalizedTier = (tier || '').toLowerCase() as SubscriptionTier;
    
    // Free plan doesn't require payment
    if (normalizedTier === 'free') {
      navigate('/generator');
      return;
    }
    
    if (!['starter', 'pro', 'unlimited'].includes(normalizedTier)) {
      navigate('/generator');
      return;
    }

    // If not logged in, show login modal
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    try {
      // Get the appropriate Creem product ID for this plan and billing cycle
      const productId = CREEM_PRODUCT_IDS[normalizedTier][billingCycle];
      
      // Call Creem API to create checkout session
      const apiUrl = `${API_BASE_URL}/creem/create-checkout`;
      
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
      console.error('[Pricing] Failed to create checkout session', error);
      // Fallback: still navigate to generator so the user can continue writing.
      navigate('/generator');
    }
  };

  const heroBlock: BlockSchema = {
    id: 'pricing-hero',
    type: 'hero',
    props: {
      emphasis: 'PRICING',
      title: 'Choose the right plan for your writing workflow',
      description:
        'Transparent pricing for AI-assisted novel creation. Start with Starter to validate your idea, or scale up to Pro and Unlimited for full chapter control, faster processing, and advanced features.',
      actions: [
        { label: 'Overview', to: '#overview', variant: 'primary' },
        { label: 'Plan details', to: '#features', variant: 'secondary' },
        { label: 'Why choose us', to: '#why-us', variant: 'secondary' },
        { label: 'Billing FAQ', to: '#faq', variant: 'secondary' },
      ],
    },
  };

  const toggleBlock: BlockSchema = {
    id: 'pricing-toggle',
    type: 'pricing-toggle',
    props: {
      billingCycle,
      onToggle: () => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly'),
      saveLabel: 'Save up to 25%'
    }
  };

  const planGridBlock: BlockSchema = {
    id: 'plan-grid',
    type: 'plan-grid',
    anchorId: 'overview',
    props: {
      plans,
      billingCycle,
      onSelectPlan: handleSelectPlan
    }
  };

  const comparisonColumns = ['Free', 'Starter', 'Pro', 'Unlimited'];
  const comparisonRows = [
    {
      label: 'Generations per month',
      values: ['5', '300', <span className="text-slate-900 font-medium">500</span>, 'Unlimited']
    },
    {
      label: 'Max novel length',
      values: ['30 pages', '100 pages', <span className="text-slate-900 font-medium">300 pages</span>, 'Unlimited']
    },
    {
      label: 'Style Memory',
      values: ['—', '—', '✓', '✓']
    },
    {
      label: 'Character Management',
      values: ['—', '—', '✓', '✓']
    },
    {
      label: 'AI Writing Assistant',
      values: ['—', '—', '✓', '✓']
    },
    {
      label: 'Export formats',
      values: ['Markdown', 'PDF, Markdown', 'DOCX, EPUB, PDF, Markdown', 'All formats']
    },
    {
      label: 'Knowledge Base',
      values: ['—', '—', '—', '✓']
    },
    {
      label: 'Real-time Collaboration',
      values: ['—', '—', '—', '✓']
    },
    {
      label: 'Priority Support',
      values: ['—', '—', '✓', '✓']
    }
  ];

  const comparisonBlock: BlockSchema = {
    id: 'comparison-table',
    type: 'comparison-table',
    anchorId: 'features',
    className: 'max-w-6xl mx-auto px-4',
    props: {
      columns: comparisonColumns,
      rows: comparisonRows
    }
  };

  const supportingBlocks: BlockSchema[] = [
    {
      id: 'pricing-why',
      type: 'feature-grid',
      anchorId: 'why-us',
      className: 'max-w-6xl mx-auto px-4',
      props: {
        title: 'Why choose Scribely?',
        items: [
          {
            title: 'Knowledge Base System',
            description: "Unique feature that competitors don't offer. Build a personal knowledge base that grows with your writing."
          },
          {
            title: 'Style Training',
            description: 'More personalized than competitors. Learn and apply your unique writing style across all projects.'
          },
          {
            title: 'Unified Workspace',
            description: 'Lower cognitive load than competitors. All tools in one place, no context switching needed.'
          }
        ]
      }
    },
    {
      id: 'pricing-billing-info',
      type: 'text-section',
      className: 'max-w-4xl mx-auto px-4',
      props: {
        title: 'Questions about billing?',
        paragraphs: [
          `Plans renew ${billingCycle === 'yearly' ? 'annually' : 'monthly'}. You can upgrade or downgrade at any time.`,
          `<ul class="list-disc pl-5 space-y-2 text-sm text-slate-600"><li>All plans include access to the AI novel generator, reading/editor modes, and exports.</li><li>Usage resets monthly. We'll notify you before you reach limits.</li><li>Yearly plans save you up to 25% compared to monthly billing.</li></ul>`
        ]
      }
    },
    // {
    //   id: 'pricing-testimonials',
    //   type: 'testimonial',
    //   className: 'max-w-6xl mx-auto px-4',
    //   props: {
    //     title: 'What writers are saying',
    //     layout: 'grid',
    //     testimonials: [
    //       {
    //         id: 'pricing-1',
    //         name: 'Alex Thompson',
    //         role: 'Published Author',
    //         avatar: '/images/testimonials/alex-thompson.png',
    //         tier: 'pro',
    //         verified: true,
    //         rating: 5,
    //         content: 'The Pro plan transformed my workflow. I can maintain character consistency across a 300-page novel without constantly flipping through notes. The style memory feature is incredible—it actually learns how I write and keeps that voice throughout the entire book.',
    //       },
    //       {
    //         id: 'pricing-2',
    //         name: 'Lisa Park',
    //         role: 'Writing Coach',
    //         avatar: '/images/testimonials/lisa-park.png',
    //         tier: 'unlimited',
    //         verified: true,
    //         rating: 5,
    //         content: 'Unlimited tier is perfect for my coaching business. I collaborate with multiple clients simultaneously, track their progress, and provide real-time feedback—all in one workspace. The version history lets me see their growth over time.',
    //       },
    //       {
    //         id: 'pricing-3',
    //         name: 'James Wilson',
    //         role: 'Self-Published Author',
    //         avatar: '/images/testimonials/james-wilson.png',
    //         tier: 'starter',
    //         verified: true,
    //         rating: 5,
    //         content: 'Starter plan is exactly what I needed to get serious about writing. The AI helps me overcome writer\'s block, and I can export to multiple formats when I\'m ready to publish. Great value for the price.',
    //       },
    //       {
    //         id: 'pricing-4',
    //         name: 'Maria Santos',
    //         role: 'Romance Novelist',
    //         avatar: '/images/testimonials/maria-santos.png',
    //         tier: 'pro',
    //         verified: true,
    //         rating: 5,
    //         content: 'I write multiple books a year, and Scribely keeps everything organized. Each project has its own characters, style settings, and knowledge base. I never lose track of details, even when juggling three different stories.',
    //       },
    //       {
    //         id: 'pricing-5',
    //         name: 'Robert Chen',
    //         role: 'Writing Team Lead',
    //         avatar: '/images/testimonials/robert-chen.png',
    //         tier: 'unlimited',
    //         verified: true,
    //         rating: 5,
    //         content: 'Our team of five writers uses Scribely for all our collaborative projects. Real-time comments, version control, and the ability to see who\'s working on what—it\'s everything we needed. The unlimited plan pays for itself in saved time.',
    //       },
    //       {
    //         id: 'pricing-6',
    //         name: 'Amanda Foster',
    //         role: 'Mystery Writer',
    //         avatar: '/images/testimonials/amanda-foster.png',
    //         tier: 'pro',
    //         verified: true,
    //         rating: 5,
    //         content: 'The character management feature is a game-changer for mystery novels. I can track each character\'s secrets, alibis, and relationships. The AI helps me spot plot holes before they become problems. Worth every penny.',
    //       },
    //     ],
    //   },
    // },
    {
      id: 'pricing-faq',
      type: 'faq',
      anchorId: 'faq',
      className: 'max-w-4xl mx-auto px-4 pb-20',
      props: {}
    }
  ];

  const pricingBlocks: BlockSchema[] = [
    heroBlock,
    toggleBlock,
    planGridBlock,
    comparisonBlock,
    ...supportingBlocks
  ];

  return (
    <div className="min-h-screen py-16">
      <SEO
        title="Pricing - AI Novel Generator Plans | Scribely"
        description="Choose the right plan for your writing workflow. Free, Starter, Pro, and Unlimited plans with transparent pricing. Start free or upgrade for advanced features."
        keywords="scribely pricing, ai novel generator pricing, writing tool pricing, ai writer subscription, novel generator plans"
        image="https://scribelydesigns.top/brand1090.png"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Pricing - Scribely',
            description: 'Choose the right plan for your writing workflow',
            url: 'https://scribelydesigns.top/pricing'
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Scribely',
            applicationCategory: 'WritingApplication',
            offers: [
              {
                '@type': 'Offer',
                name: 'Free Plan',
                price: '0',
                priceCurrency: 'USD',
                description: '5 generations per month, basic features'
              },
              {
                '@type': 'Offer',
                name: 'Starter Plan',
                price: '12',
                priceCurrency: 'USD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '12',
                  priceCurrency: 'USD',
                  billingIncrement: 'P1M'
                },
                description: '300 generations per month, full toolset'
              },
              {
                '@type': 'Offer',
                name: 'Pro Plan',
                price: '25',
                priceCurrency: 'USD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '25',
                  priceCurrency: 'USD',
                  billingIncrement: 'P1M'
                },
                description: '500 generations per month, AI-powered features'
              },
              {
                '@type': 'Offer',
                name: 'Unlimited Plan',
                price: '35',
                priceCurrency: 'USD',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '35',
                  priceCurrency: 'USD',
                  billingIncrement: 'P1M'
                },
                description: 'Unlimited generations, collaboration features'
              }
            ]
          }
        ]}
      />
      <div className="max-w-6xl mx-auto px-4 space-y-12">
        <WorkspaceView blocks={pricingBlocks} className="space-y-12" />
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
  );
}


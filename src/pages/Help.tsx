import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { WorkspaceView } from '../components/WorkspaceView';
import type { BlockSchema } from '../types/block';
import FlowGuideDrawer from '../components/FlowGuideDrawer';
import StoryTemplateEditor from '../components/StoryTemplateEditor';
import { STORY_TEMPLATES, StoryTemplate } from '../data/storyTemplates';
import { loadUserPreferences } from '../utils/userPreferences';
import { getKeyValue, setKeyValue } from '../utils/offlineDb';
import { useSubscription } from '../hooks/useSubscription';
import { useCapabilities } from '../hooks/useCapabilities';
import type { SubscriptionTier } from '../types/subscription';

const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'unlimited'];

const canAccessTemplate = (template: StoryTemplate, userTier: SubscriptionTier): boolean => {
  if (!template.requiredTier) return true; // Free templates are accessible to all
  const templateTierIndex = tierOrder.indexOf(template.requiredTier);
  const userTierIndex = tierOrder.indexOf(userTier);
  return userTierIndex >= templateTierIndex;
};

export default function Help() {
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const { hasFeature } = useCapabilities();
  const currentTier = tier ?? 'free';
  const canCreateCustomTemplates = hasFeature('templateLibrary'); // Starter+ required
  
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [userPref, setUserPref] = useState(loadUserPreferences());
  const [customStoryTemplates, setCustomStoryTemplates] = useState<StoryTemplate[]>([]);
  const [customTemplatesLoaded, setCustomTemplatesLoaded] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StoryTemplate | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getKeyValue<StoryTemplate[]>('novel-ai-custom-story-templates', []);
      if (cancelled) return;
      if (Array.isArray(stored)) {
        setCustomStoryTemplates(stored);
      }
      setCustomTemplatesLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customTemplatesLoaded) return;
    setKeyValue('novel-ai-custom-story-templates', customStoryTemplates);
  }, [customStoryTemplates, customTemplatesLoaded]);

  // Filter templates based on subscription tier
  const accessibleTemplates = useMemo(() => {
    return STORY_TEMPLATES.filter(t => canAccessTemplate(t, currentTier));
  }, [currentTier]);

  const allTemplates = useMemo(
    () => [...accessibleTemplates, ...customStoryTemplates],
    [accessibleTemplates, customStoryTemplates]
  );

  const sortedTemplates = useMemo(() => {
    const preferredTemplate = userPref?.templateId
      ? allTemplates.find((t) => t.id === userPref.templateId)
      : null;
    const otherTemplates = allTemplates.filter((t) => t.id !== userPref?.templateId);
    return preferredTemplate ? [preferredTemplate, ...otherTemplates] : allTemplates;
  }, [userPref, allTemplates]);

  const openGuide = (template: StoryTemplate) => {
    setSelectedTemplate(template);
    setGuideOpen(true);
  };

  const handleGuideClose = () => {
    setGuideOpen(false);
  };

  const handleGuideSaved = () => {
    setUserPref(loadUserPreferences());
  };

  const handleSaveTemplate = (template: StoryTemplate) => {
    if (editingTemplate) {
      setCustomStoryTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? template : t))
      );
    } else {
      setCustomStoryTemplates((prev) => [...prev, template]);
    }
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this custom template?')) {
      setCustomStoryTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
  };

  const handleEditTemplate = (template: StoryTemplate) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;
    
    // Check if user has access
    if (!canAccessTemplate(template, currentTier)) {
      // Show upgrade prompt or navigate to pricing
      navigate('/pricing?feature=template');
      return;
    }
    
    // If user has saved preferences and is logged in, offer quick start
    if (userPref && userPref.templateId === templateId) {
      // Quick start: directly jump to generator with saved preferences
      const params = new URLSearchParams({
        entry: 'flow-guide',
        mode: userPref.flowMode === 'outline' ? 'outline' : 'draft',
        genre: template.genre,
        idea: template.sampleIdea,
        template: template.id,
        quickStart: 'true'
      });
      navigate(`/generator?${params.toString()}`);
      return;
    }
    
    // Otherwise, open flow guide
    openGuide(template);
  };
  
  const handleQuickStart = (template: StoryTemplate) => {
    const params = new URLSearchParams({
      entry: 'flow-guide',
      mode: 'draft',
      genre: template.genre,
      idea: template.sampleIdea,
      template: template.id,
      quickStart: 'true'
    });
    navigate(`/generator?${params.toString()}`);
  };

  const templateBlock: BlockSchema = {
    id: 'help-templates',
    type: 'template-grid',
    props: {
      templates: sortedTemplates,
      preferredTemplateId: userPref?.templateId ?? null,
      onSelectTemplate: handleTemplateSelect,
      searchQuery,
      selectedCategory,
      onSearchChange: setSearchQuery,
      onCategoryChange: setSelectedCategory,
      onCreateTemplate: canCreateCustomTemplates ? () => {
        setEditingTemplate(null);
        setShowTemplateEditor(true);
      } : undefined,
      onEditTemplate: handleEditTemplate,
      onDeleteTemplate: handleDeleteTemplate,
      customTemplates: customStoryTemplates,
      currentTier,
      onQuickStart: handleQuickStart,
      canCreateCustomTemplates
    }
  };

  const infoBlocks: BlockSchema[] = [
    {
      id: 'help-features',
      type: 'feature-grid',
      className: 'max-w-6xl mx-auto px-4 py-20',
      props: {
        title: 'How this workspace helps you write',
        items: [
          {
            title: 'Guided steps',
            description:
              'Move from idea → outline → chapters with a calm, three-step interface designed for long-form fiction.'
          },
          {
            title: 'Outline & chapter view',
            description:
              'Auto-generated outlines and chapter navigation keep you oriented while drafting complex stories.'
          },
          {
            title: 'Polish & export',
            description:
              'Switch between reading and editing modes, then export polished manuscripts in PDF, DOCX, or Markdown.'
          }
        ]
      }
    },
    {
      id: 'help-text',
      type: 'text-section',
      className: 'max-w-4xl mx-auto px-4 pb-20',
      props: {
        title: 'How to use the AI Novel Workspace',
        paragraphs: [
          'Start from the Home page with a single idea input. Once you jump into the Generator workspace, use the Context drawer to define characters, style, and knowledge.',
          'Templates on this page are here to inspire new projects and workflows. Choose a template, open the flow guide, and the system will prefill your idea, genre, and pacing preferences.',
          'If you ever feel lost, return to this Help page to review features, FAQs, and recommended flows for solo writers, co-authors, and teams.'
        ]
      }
    },
    {
      id: 'help-template-access',
      type: 'text-section',
      className: 'max-w-4xl mx-auto px-4 pb-20',
      props: {
        title: 'Template Access & Custom Templates',
        paragraphs: [
          'Most story templates are available to all users. Some premium templates (marked with tier badges) require an Unlimited subscription.',
          'Custom template creation is available to Starter plan users and above. Create your own templates to save your favorite story ideas and workflows.',
          'If you\'ve used a template before, you\'ll see a "Quick Start" button that lets you jump directly to the Generator with your saved preferences.'
        ]
      }
    },
    {
      id: 'collaboration',
      type: 'text-section',
      className: 'max-w-4xl mx-auto px-4 pb-20',
      props: {
        title: 'Collaboration Access & Permissions',
        paragraphs: [
          'Free & Starter users can view existing comments but cannot create new threads. This keeps the writing surface calm for solo drafts.',
          'Pro introduces analytics, version history, and async review prep—but inline commenting and mentions remain locked.',
          'Unlimited unlocks full collaboration: live cursors, inline comment threads, @mentions, reviewer roles, and the upcoming live co-editing workflow.'
        ]
      }
    },
    {
      id: 'help-faq',
      type: 'faq',
      className: 'max-w-4xl mx-auto px-4 pb-20',
      props: {}
    }
  ];

  const helpBlocks: BlockSchema[] = [templateBlock, ...infoBlocks];

  return (
    <div className="bg-slate-50">
      <SEO
        title="Help & Templates - Novel AI Workspace"
        description="Learn how to use the Novel AI workspace, browse story templates, and read answers to common questions."
      />
      <WorkspaceView blocks={helpBlocks} className="space-y-16" />

      <FlowGuideDrawer
        open={guideOpen}
        template={selectedTemplate}
        onClose={handleGuideClose}
        onSaved={handleGuideSaved}
        onSkipped={() => setGuideOpen(false)}
        onQuickStart={handleQuickStart}
      />

      <StoryTemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setShowTemplateEditor(false);
          setEditingTemplate(null);
        }}
        isOpen={showTemplateEditor}
      />
    </div>
  );
}




import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BlockSchema } from '../types/block';
import { GlassCard } from '../components/ui/GlassCard';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import FAQSection from '../components/FAQSection';
import ProjectCard from '../components/ProjectCard';
import type { Project } from '../store/projectStore';
import { Link } from 'react-router-dom';

function renderHero(block: BlockSchema) {
  const { title, description, emphasis, actions } = block.props as {
    title: string;
    description: string;
    emphasis?: string;
    actions?: Array<{
      label: string;
      to: string;
      variant?: 'primary' | 'secondary';
    }>;
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault();
    const element = document.querySelector(anchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL without scrolling
      window.history.pushState(null, '', anchor);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-xs font-semibold tracking-[0.3em] uppercase text-slate-500 dark:text-slate-400">{emphasis}</p>
      <h1 className="text-4xl md:text-5xl font-light text-slate-900 dark:text-white tracking-tight">{title}</h1>
      <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-base">{description}</p>
      {actions && (
        <div className="flex justify-center gap-2 flex-wrap">
          {actions.map((action) => {
            const isAnchor = action.to.startsWith('#');
            const isActive = action.variant === 'primary';
            
            // For anchor links, render as tab-style buttons
            if (isAnchor) {
              return (
                <a
                  key={action.label}
                  href={action.to}
                  onClick={(e) => handleAnchorClick(e, action.to)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-slate-900 dark:bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  {action.label}
                </a>
              );
            }
            
            // For regular links, use button components
            const buttonContent = <Link to={action.to}>{action.label}</Link>;
            return action.variant === 'secondary' ? (
              <SecondaryButton asChild key={action.label}>
                {buttonContent}
              </SecondaryButton>
            ) : (
              <PrimaryButton asChild key={action.label}>
                {buttonContent}
              </PrimaryButton>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderFeatureGrid(block: BlockSchema) {
  const { title, items } = block.props as {
    title?: string;
    items: Array<{ title: string; description: string }>;
  };
  return (
    <div className="space-y-8">
      {title && (
        <div className="text-center mb-6">
          <h2 className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">{title}</h2>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-8">
        {items.map((item) => (
          <GlassCard key={item.title} className="p-8 hover:-translate-y-0.5 transition-all">
            <h3 className="text-xl font-light text-slate-900 dark:text-white mb-3">{item.title}</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{item.description}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function renderCtaCard(block: BlockSchema) {
  const { title, description, primary, secondary } = block.props as {
    title: string;
    description: string;
    primary: { label: string; to: string };
    secondary?: { label: string; to: string };
  };
  return (
    <GlassCard className="p-12 text-center space-y-8">
      <h2 className="text-3xl font-light text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto text-base">{description}</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <PrimaryButton asChild className="w-full sm:w-auto">
          <Link to={primary.to}>{primary.label}</Link>
        </PrimaryButton>
        {secondary && (
          <SecondaryButton asChild className="w-full sm:w-auto">
            <Link to={secondary.to}>{secondary.label}</Link>
          </SecondaryButton>
        )}
      </div>
    </GlassCard>
  );
}

function renderTextSection(block: BlockSchema) {
  const { title, description, paragraphs, content } = block.props as {
    title: string;
    description?: string;
    paragraphs?: string[];
    content?: string;
  };
  return (
    <div className="text-center space-y-6">
      <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      {description && (
        <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-base">{description}</p>
      )}
      {content && (
        <div className="mt-8" dangerouslySetInnerHTML={{ __html: content }} />
      )}
      {paragraphs && paragraphs.length > 0 && (
        <div className="space-y-4 mt-8 max-w-2xl mx-auto">
          {paragraphs.map((text, idx) => (
            <p key={idx} className="text-slate-600 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
          ))}
        </div>
      )}
    </div>
  );
}

function renderPricingToggle(block: BlockSchema) {
  const { billingCycle, onToggle, saveLabel, tooltip } = block.props as {
    billingCycle: 'monthly' | 'yearly';
    onToggle: () => void;
    saveLabel?: string;
    tooltip?: string;
  };

  return (
    <div className="flex items-center justify-center gap-4 py-4 bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm relative">
      <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}>
        Monthly
      </span>
      <button
        onClick={onToggle}
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
        {saveLabel && (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-0.5 rounded-full shadow-md">
            {saveLabel}
          </span>
        )}
      </div>
      {tooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap">
          {tooltip}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-slate-900"></div>
        </div>
      )}
    </div>
  );
}

function renderPlanGrid(block: BlockSchema) {
  const { plans, billingCycle, onSelectPlan } = block.props as {
    plans: Array<{
      tier: string;
      label: string;
      badge?: string;
      description: string;
      ctaLabel: string;
      monthlyPrice: number;
      yearlyPrice: number;
      yearlyDiscount: number;
      features: string[];
      popular?: boolean;
    }>;
    billingCycle: 'monthly' | 'yearly';
    onSelectPlan?: (planTier: string) => void;
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isYearly = billingCycle === 'yearly';
        const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
        const monthlyEquivalent = Math.round(plan.yearlyPrice / 12);
        return (
          <div
            key={plan.tier}
            id={plan.tier}
            className={`p-6 rounded-2xl transition-all ${plan.popular ? 'ring-2 ring-slate-900 dark:ring-slate-700 shadow-xl bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white">{plan.label}</p>
              {plan.badge && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${plan.popular ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-white'}`}
                >
                  {plan.badge}
                </span>
              )}
            </div>
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-light text-slate-900 dark:text-white">${price}</p>
                <span className="text-sm text-slate-500 dark:text-slate-300">{isYearly ? '/year' : '/month'}</span>
              </div>
              {isYearly && (
                <p className="text-sm mt-1 text-slate-500 dark:text-slate-300">
                  ${monthlyEquivalent}/month
                  <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full shadow-md">
                    Save {plan.yearlyDiscount}%
                  </span>
                </p>
              )}
            </div>
            <p className="mb-6 text-sm text-slate-600 dark:text-white">{plan.description}</p>
            <ul className="mb-8 space-y-3 text-sm text-slate-700 dark:text-white">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 bg-slate-900 dark:bg-slate-300" />
                  <span className="text-slate-700 dark:text-white">{feature}</span>
                </li>
              ))}
            </ul>
            <PrimaryButton
              onClick={(e) => {
                console.log('按钮点击事件:', e);
                onSelectPlan?.(plan.tier, e);
              }}
              className={`w-full ${plan.popular ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600' : ''}`}
            >
              {plan.ctaLabel}
            </PrimaryButton>
          </div>
        );
      })}
    </div>
  );
}

function renderComparisonTable(block: BlockSchema) {
  const { columns, rows } = block.props as {
    columns: string[];
    rows: Array<{ label: string; values: (string | React.ReactNode)[] }>;
  };

  return (
    <GlassCard className="p-8" id="features">
      <h2 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight mb-6">Compare Plans</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 font-medium text-slate-900 dark:text-white">Feature</th>
              {columns.map((col) => (
                <th key={col} className="text-center py-3 px-4 font-medium text-slate-900 dark:text-white">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{row.label}</td>
                {row.values.map((value, idx) => (
                  <td key={`${row.label}-${idx}`} className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function renderDashboardHero(block: BlockSchema) {
  const { title, description, primary } = block.props as {
    title: string;
    description?: string;
    primary?: { label: string; onClick?: () => void };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="text-slate-500 mt-2 text-sm">{description}</p>}
        </div>
        {primary && (
          <PrimaryButton onClick={primary.onClick} className="shrink-0">
            {primary.label}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

function renderSearchBar(block: BlockSchema) {
  const { value, onChange, placeholder } = block.props as {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
  };

  return (
    <div className="max-w-md">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Search...'}
          className="w-full rounded-xl border-0 bg-white/80 backdrop-blur-sm px-4 py-3 pl-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}

function renderHomeHero(block: BlockSchema) {
  const {
    genre,
    genreOptions,
    onGenreChange,
    idea,
    onIdeaChange,
    onFocus,
    onBlur,
    displayedPlaceholder,
    isTyping,
    isFocused,
    heroWordCount,
    minWords,
    onGenerate,
    onOutline,
    onImport,
  } = block.props as {
    genre: string;
    genreOptions: Array<{ value: string; label: string }>;
    onGenreChange: (value: string) => void;
    idea: string;
    onIdeaChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    displayedPlaceholder: string;
    isTyping: boolean;
    isFocused: boolean;
    heroWordCount: number;
    minWords: number;
    onGenerate: () => void;
    onOutline: () => void;
    onImport: () => void;
  };

  return (
    <section className="max-w-4xl mx-auto px-4 pt-24 pb-20">
      <div className="text-center space-y-6 mb-12">
        <h1 className="text-5xl md:text-6xl font-light text-slate-900 tracking-tight">Turn your idea into a story</h1>
      </div>
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="flex items-center gap-4">
          <select
            value={genre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="rounded-xl border-0 bg-slate-100/50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition"
          >
            {genreOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <textarea
            value={idea}
            onChange={(e) => onIdeaChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder=""
            className="w-full rounded-2xl border-0 bg-slate-100/50 px-6 py-5 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 min-h-[140px] transition-all placeholder:text-slate-400"
          />
          {idea.trim().length === 0 && !isFocused && (
            <div className="absolute inset-0 pointer-events-none px-5 py-4 flex items-start">
              <span className="text-base text-slate-400 leading-relaxed whitespace-pre-wrap font-normal">
                {displayedPlaceholder}
                <span
                  className="inline-block w-0.5 h-5 bg-slate-900 ml-0.5 align-middle"
                  style={{
                    animation: 'blink 1s infinite',
                    boxShadow: isTyping ? '0 0 4px rgba(99, 102, 241, 0.5)' : 'none',
                  }}
                />
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <PrimaryButton
            onClick={onGenerate}
            disabled={heroWordCount < minWords}
            className="flex-1 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Generate
          </PrimaryButton>
          <SecondaryButton
            onClick={onOutline}
            disabled={heroWordCount < minWords}
            className="disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
          >
            Outline
          </SecondaryButton>
          <button
            onClick={onImport}
            className="p-4 text-slate-500 hover:text-slate-700 transition"
            title="Import draft"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function renderTemplateGridSection(block: BlockSchema) {
  const { templates, preferredTemplateId, onSelectTemplate, searchQuery, selectedCategory, onSearchChange, onCategoryChange, onCreateTemplate, onEditTemplate, onDeleteTemplate, customTemplates, currentTier, onQuickStart, canCreateCustomTemplates } = block.props as {
    templates: Array<{
      id: string;
      title: string;
      subtitle: string;
      genre: string;
      cover: { colorFrom: string; colorTo: string };
      category?: string;
      requiredTier?: string;
    }>;
    preferredTemplateId?: string | null;
    onSelectTemplate: (id: string) => void;
    searchQuery?: string;
    selectedCategory?: string;
    onSearchChange?: (query: string) => void;
    onCategoryChange?: (category: string) => void;
    onCreateTemplate?: () => void;
    onEditTemplate?: (template: any) => void;
    onDeleteTemplate?: (templateId: string) => void;
    customTemplates?: Array<{ id: string }>;
    currentTier?: string;
    onQuickStart?: (template: any) => void;
    canCreateCustomTemplates?: boolean;
  };
  
  const tierOrder = ['free', 'starter', 'pro', 'unlimited'];
  const canAccessTemplate = (template: { requiredTier?: string }) => {
    if (!template.requiredTier) return true;
    const templateTierIndex = tierOrder.indexOf(template.requiredTier);
    const userTierIndex = tierOrder.indexOf(currentTier || 'free');
    return userTierIndex >= templateTierIndex;
  };

  // Helper function to map genre to category
  const getCategoryFromGenre = (genre: string): string => {
    const genreLower = genre.toLowerCase();
    if (genreLower.includes('sci-fi') || genreLower.includes('science-fiction') || genreLower.includes('cyberpunk') || genreLower.includes('steampunk') || genreLower.includes('time-travel') || genreLower.includes('space') || genreLower.includes('ai-themed')) return 'sci-fi';
    if (genreLower.includes('fantasy') || genreLower.includes('mythic') || genreLower.includes('urban-fantasy') || genreLower.includes('epic-fantasy')) return 'fantasy';
    if (genreLower.includes('mystery') || genreLower.includes('detective') || genreLower.includes('cozy-mystery')) return 'mystery';
    if (genreLower.includes('romance') || genreLower.includes('romantic')) return 'romance';
    if (genreLower.includes('thriller') || genreLower.includes('psychological-thriller') || genreLower.includes('adventure-thriller') || genreLower.includes('supernatural-thriller')) return 'thriller';
    if (genreLower.includes('horror') || genreLower.includes('gothic')) return 'horror';
    if (genreLower.includes('literary') || genreLower.includes('magical-realism')) return 'literary';
    if (genreLower.includes('historical')) return 'historical';
    if (genreLower.includes('adventure')) return 'adventure';
    if (genreLower.includes('dystopian') || genreLower.includes('post-apocalyptic')) return 'dystopian';
    if (genreLower.includes('comedy') || genreLower.includes('romantic-comedy')) return 'comedy';
    return 'all';
  };

  // Filter templates
  const filterCategoryOf = (template: { category?: string; genre: string }) =>
    template.category || getCategoryFromGenre(template.genre);
  
  const filteredTemplates = templates.filter(template => {
    const category = filterCategoryOf(template);
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const dedupedCategories = Array.from(
    new Set(
      templates
        .map((template) => filterCategoryOf(template))
        .filter((category) => Boolean(category) && category !== 'all')
    )
  );
  const categories = ['all', ...dedupedCategories];
  const categoryLabels: Record<string, string> = categories.reduce(
    (acc, category) => ({
      ...acc,
      [category]: category === 'all'
        ? 'All'
        : category
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
    }),
    {} as Record<string, string>
  );

  return (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-light text-slate-900 tracking-tight">Choose your story</h2>
          {canCreateCustomTemplates && onCreateTemplate && (
            <button
              onClick={onCreateTemplate}
              className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Template</span>
            </button>
          )}
          {!canCreateCustomTemplates && (
            <a
              href="/pricing?feature=custom-templates"
              className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Template (Starter+)</span>
            </a>
          )}
        </div>
        
        {/* Search Bar */}
        {onSearchChange && (
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 pl-10 text-sm text-slate-800 focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Category Filter */}
        {onCategoryChange && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  (selectedCategory || 'all') === category
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No templates found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTemplates.map((template, index) => {
            const isPreferred = preferredTemplateId === template.id;
            const isRecent = index === 0 && isPreferred;
            const isCustom = customTemplates?.some(ct => ct.id === template.id);
            const hasAccess = canAccessTemplate(template);
            const isPremium = template.requiredTier && template.requiredTier !== 'free';
            
            return (
              <GlassCard
                key={template.id}
                className={`group relative overflow-hidden text-left hover:shadow-2xl transition-all ${
                  !hasAccess ? 'opacity-60' : ''
                }`}
              >
                {isRecent && (
                  <span className="absolute top-3 left-3 text-xs font-medium text-slate-700 bg-white/95 rounded-full px-3 py-1 shadow-sm z-10">
                    Recent
                  </span>
                )}
                {isCustom && (
                  <span className="absolute top-3 right-3 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-1 shadow-sm z-10">
                    Custom
                  </span>
                )}
                {isPremium && !hasAccess && (
                  <span className="absolute top-3 right-3 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-2 py-1 shadow-sm z-10">
                    {template.requiredTier?.toUpperCase()}
                  </span>
                )}
                <div className="p-6 space-y-4">
                  <div className="flex justify-center">
                    <div className="relative h-56 w-36">
                      <div
                        className="absolute -left-3 top-3 bottom-3 w-3 rounded-l-lg shadow-inner"
                        style={{
                          background: `linear-gradient(180deg, ${template.cover.colorFrom}, ${template.cover.colorTo})`,
                        }}
                      />
                      <div
                        className="relative h-full w-full rounded-2xl border border-white/80 shadow-lg overflow-hidden cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${template.cover.colorFrom}, ${template.cover.colorTo})`,
                        }}
                        onClick={() => onSelectTemplate(template.id)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-black/10 to-black/35" />
                        <div
                          className={`relative flex h-full w-full flex-col justify-between px-4 py-6 text-white ${
                            !hasAccess ? 'opacity-70' : ''
                          }`}
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-[0.4em] opacity-80">
                            {template.genre}
                          </div>
                          <div className="space-y-3">
                            <p className="text-base font-semibold leading-tight drop-shadow-sm">
                              {template.title}
                            </p>
                            <p className="text-xs opacity-90 leading-relaxed drop-shadow-sm">
                              {template.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {isCustom && onEditTemplate && onDeleteTemplate && (
                      <div className="flex items-center justify-end gap-1 text-slate-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTemplate(template);
                          }}
                          className="p-1 hover:text-slate-600"
                          title="Edit template"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTemplate(template.id);
                          }}
                          className="p-1 hover:text-rose-600"
                          title="Delete template"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2m-4 0h12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* Quick Start button for recent templates */}
                    {isRecent && hasAccess && onQuickStart && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickStart(template);
                        }}
                        className="w-full mt-3 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
                      >
                        Quick Start
                      </button>
                    )}
                    
                    {/* Upgrade prompt for locked templates */}
                    {!hasAccess && (
                      <a
                        href="/pricing?feature=template"
                        className="block w-full mt-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white transition text-center"
                      >
                        Upgrade to {template.requiredTier}
                      </a>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </section>
  );
}

function renderProjectGrid(block: BlockSchema) {
  const { items } = block.props as {
        items: Array<
      | {
          kind: 'backend';
          key: string;
          project: Project;
          onDelete?: () => void;
          onRename?: (id: string, newTitle: string) => void;
          onOpen?: () => void;
          onArchive?: () => void;
          onExportMarkdown?: () => void;
          onExportPdf?: () => void;
          onUpdateFolder?: (projectId: string, folder: string | undefined) => void;
          onUpdateTags?: (projectId: string, tags: string[]) => void;
          availableFolders?: string[];
          isArchived?: boolean;
        }
      | {
          kind: 'snapshot';
          key: string;
          title: string;
          updatedAt: number;
          pageCount: number;
          wordCount: number;
          onOpen: () => void;
          onExportMarkdown: () => void;
          onExportPdf: () => void;
          onDelete: () => void;
          onRename?: (newTitle: string) => void;
          onArchive?: () => void;
          isArchived?: boolean;
        }
    >;
  };

  if (!items.length) return null;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => {
        if (item.kind === 'backend') {
          return (
            <ProjectCard
              key={item.key}
              project={item.project}
              onDelete={item.onDelete}
              onRename={item.onRename}
              onOpen={item.onOpen}
              onArchive={item.onArchive}
              onExportMarkdown={item.onExportMarkdown}
              onExportPdf={item.onExportPdf}
              onUpdateFolder={item.onUpdateFolder}
              onUpdateTags={item.onUpdateTags}
              availableFolders={item.availableFolders}
              isArchived={item.isArchived}
            />
          );
        }

        // For snapshot items, we need to create a simplified ProjectCard-like component
        // Since we can't use ProjectCard directly (it requires a Project object),
        // we'll render a similar card with a menu
        const SnapshotCard = () => {
          const [showMenu, setShowMenu] = useState(false);
          const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
          const buttonRef = useRef<HTMLButtonElement>(null);
          const menuRef = useRef<HTMLDivElement>(null);

          useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
              if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
              ) {
                setShowMenu(false);
                setMenuPosition(null);
              }
            };

            const handleScroll = () => {
              if (showMenu) {
                setShowMenu(false);
                setMenuPosition(null);
              }
            };

            if (showMenu) {
              document.addEventListener('mousedown', handleClickOutside);
              window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events
              return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleScroll, true);
              };
            }
          }, [showMenu]);

          const handleMenuToggle = () => {
            if (!showMenu && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setMenuPosition({
                x: rect.right - 192, // 192px is menu width (w-48)
                y: rect.bottom + 4
              });
              setShowMenu(true);
            } else {
              setShowMenu(false);
              setMenuPosition(null);
            }
          };

          return (
            <GlassCard key={item.key} className={`relative p-6 hover:-translate-y-0.5 transition-all group ${item.isArchived ? 'opacity-60' : ''}`}>
              {item.isArchived && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    Archived
                  </span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-medium text-slate-900 line-clamp-2 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">{new Date(item.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{item.pageCount} pages</span>
                  <span>{item.wordCount.toLocaleString()} words</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={item.onOpen}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100/50 rounded-lg hover:bg-slate-100 transition"
                  >
                    Open
                  </button>
                  <div className="relative">
                    <button
                      ref={buttonRef}
                      onClick={handleMenuToggle}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      title="More options"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {showMenu && menuPosition && createPortal(
                      <div
                        ref={menuRef}
                        className="fixed w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[9999]"
                        style={{
                          left: `${menuPosition.x}px`,
                          top: `${menuPosition.y}px`
                        }}
                      >
                        {item.onRename && (
                          <button
                            onClick={() => {
                              const newTitle = prompt('Enter new title:', item.title);
                              if (newTitle && newTitle.trim() && newTitle !== item.title) {
                                item.onRename!(newTitle.trim());
                              }
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                          >
                            Rename
                          </button>
                        )}
                        <button
                          onClick={() => {
                            item.onExportMarkdown();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        >
                          Export Markdown
                        </button>
                        <button
                          onClick={() => {
                            item.onExportPdf();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        >
                          Export PDF
                        </button>
                        {item.onArchive && (
                          <button
                            onClick={() => {
                              item.onArchive!();
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                          >
                            {item.isArchived ? 'Unarchive' : 'Archive'}
                          </button>
                        )}
                        {item.onDelete && (
                          <>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={() => {
                                item.onDelete();
                                setShowMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        };

        return <SnapshotCard key={item.key} />;
      })}
    </div>
  );
}

function renderProjectFilters(block: BlockSchema) {
  const { folders, tags, selectedFolder, selectedTag, onFolderChange, onTagChange } = block.props as {
    folders: string[];
    tags: string[];
    selectedFolder: string | null;
    selectedTag: string | null;
    onFolderChange: (folder: string | null) => void;
    onTagChange: (tag: string | null) => void;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {folders.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Folder:</span>
          <select
            value={selectedFolder === null ? 'all' : selectedFolder === '' ? 'none' : selectedFolder}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'all') {
                onFolderChange(null);
              } else if (value === 'none') {
                onFolderChange('');
              } else {
                onFolderChange(value);
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All folders</option>
            <option value="none">No folder</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Tag:</span>
          <select
            value={selectedTag === null ? 'all' : selectedTag}
            onChange={(e) => {
              const value = e.target.value;
              onTagChange(value === 'all' ? null : value);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      )}
      {(selectedFolder !== null || selectedTag !== null) && (
        <button
          onClick={() => {
            onFolderChange(null);
            onTagChange(null);
          }}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function renderEmptyState(block: BlockSchema) {
  const { title, description, primary } = block.props as {
    title: string;
    description?: string;
    primary?: { label: string; onClick?: () => void };
  };

  return (
    <GlassCard className="p-16 text-center space-y-4">
      <p className="text-slate-400 text-sm">{title}</p>
      {description && <p className="text-slate-500 text-sm">{description}</p>}
      {primary && (
        <PrimaryButton onClick={primary.onClick} className="mt-4">
          {primary.label}
        </PrimaryButton>
      )}
    </GlassCard>
  );
}

function TestimonialCarousel({ testimonials }: { testimonials: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);
  
  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="min-w-full px-4">
              <GlassCard className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  {testimonial.avatar ? (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xl">
                      {testimonial.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {testimonial.rating && (
                  <div className="flex justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < testimonial.rating! ? 'text-yellow-400' : 'text-slate-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                )}
                <p className="text-slate-700 text-base leading-relaxed italic mb-6 max-w-2xl mx-auto">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  {testimonial.verified && (
                    <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {testimonial.role && (
                  <p className="text-sm text-slate-500 mt-1">{testimonial.role}</p>
                )}
                {testimonial.tier && (
                  <span className="inline-block mt-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    {testimonial.tier.charAt(0).toUpperCase() + testimonial.tier.slice(1)} User
                  </span>
                )}
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
      {/* 导航点 */}
      <div className="flex justify-center gap-2 mt-6">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition ${
              i === currentIndex ? 'bg-slate-900' : 'bg-slate-300'
            }`}
            aria-label={`Go to testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function renderTestimonial(block: BlockSchema) {
  const { title, testimonials, layout = 'grid' } = block.props as {
    title?: string;
    testimonials: Array<{
      id: string;
      name: string;
      role?: string;
      avatar?: string;
      content: string;
      rating?: number;
      tier?: 'free' | 'starter' | 'pro' | 'unlimited';
      verified?: boolean;
    }>;
    layout?: 'grid' | 'carousel' | 'list';
  };

  return (
    <div className="space-y-8">
      {title && (
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">See what writers are saying about Scribely</p>
        </div>
      )}
      
      {layout === 'carousel' ? (
        <TestimonialCarousel testimonials={testimonials} />
      ) : layout === 'list' ? (
        <div className="space-y-6">
          {testimonials.map((testimonial) => (
            <GlassCard key={testimonial.id} className="p-6">
              <div className="flex items-start gap-4">
                {testimonial.avatar ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {testimonial.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{testimonial.name}</p>
                    {testimonial.verified && (
                      <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {testimonial.role && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                  )}
                  {testimonial.tier && (
                    <span className="inline-block mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                      {testimonial.tier.charAt(0).toUpperCase() + testimonial.tier.slice(1)} User
                    </span>
                  )}
                  {testimonial.rating && (
                    <div className="flex gap-1 mt-2 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < testimonial.rating! ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic mt-3">
                    "{testimonial.content}"
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <GlassCard key={testimonial.id} className="p-6 hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-4 mb-4">
                {testimonial.avatar ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                    {testimonial.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{testimonial.name}</p>
                    {testimonial.verified && (
                      <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {testimonial.role && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                  )}
                  {testimonial.tier && (
                    <span className="inline-block mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                      {testimonial.tier.charAt(0).toUpperCase() + testimonial.tier.slice(1)} User
                    </span>
                  )}
                </div>
              </div>
              
              {testimonial.rating && (
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating! ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
              
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic">
                "{testimonial.content}"
              </p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function renderBlock(block: BlockSchema): React.ReactNode {
  switch (block.type) {
    case 'hero':
      return renderHero(block);
    case 'feature-grid':
      return renderFeatureGrid(block);
    case 'cta-card':
      return renderCtaCard(block);
    case 'text-section':
      return renderTextSection(block);
    case 'pricing-toggle':
      return renderPricingToggle(block);
    case 'plan-grid':
      return renderPlanGrid(block);
    case 'comparison-table':
      return renderComparisonTable(block);
    case 'dashboard-hero':
      return renderDashboardHero(block);
    case 'search-bar':
      return renderSearchBar(block);
    case 'home-hero':
      return renderHomeHero(block);
    case 'template-grid':
      return renderTemplateGridSection(block);
    case 'project-grid':
      return renderProjectGrid(block);
    case 'project-filters':
      return renderProjectFilters(block);
    case 'empty-state':
      return renderEmptyState(block);
    case 'faq':
      return (
        <GlassCard className="p-10">
          <FAQSection />
        </GlassCard>
      );
    case 'testimonial':
      return renderTestimonial(block);
    default:
      return null;
  }
}

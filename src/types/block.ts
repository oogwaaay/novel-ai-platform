export type BlockType =
  | 'hero'
  | 'feature-grid'
  | 'cta-card'
  | 'text-section'
  | 'pricing-toggle'
  | 'plan-grid'
  | 'comparison-table'
  | 'dashboard-hero'
  | 'search-bar'
  | 'home-hero'
  | 'template-grid'
  | 'project-grid'
  | 'project-filters'
  | 'empty-state'
  | 'faq'
  | 'testimonial';

export interface BlockSchema<T extends BlockType = BlockType> {
  id: string;
  type: T;
  props: Record<string, unknown>;
  className?: string;
  anchorId?: string;
  children?: BlockSchema[];
}


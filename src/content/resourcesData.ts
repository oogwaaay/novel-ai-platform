export interface ResourceGuide {
  id: string;
  title: string;
  description: string;
  badge: string;
  bullets: string[];
  cta: { label: string; href: string };
}

export interface ResourceArticle {
  id: string;
  title: string;
  description: string;
  href: string;
  readingTime: string;
}

export interface ReleaseNoteEntry {
  id: string;
  date: string;
  title: string;
  highlights: string[];
}

export const RESOURCE_GUIDES: ResourceGuide[] = [
  {
    id: 'generator-walkthrough',
    title: 'Generator walkthrough',
    description: 'Learn how to move from idea → outline → draft without leaving the workspace.',
    badge: 'Guide',
    bullets: [
      'Capture ideas directly from the home hero or import an existing synopsis.',
      'Use Flow Guide Drawer to configure tone, characters, and context before writing.',
      'Autosave pushes every major change to Dashboard so you can roll back instantly.'
    ],
    cta: { label: 'Start writing', href: '/generator' }
  },
  {
    id: 'template-quickstart',
    title: 'Template quick start',
    description: 'Pick a template, preview the beats, and apply Quick Start to jump into drafting.',
    badge: 'Template',
    bullets: [
      'Template covers now surface description, genre, and Quick Start in one glance.',
      'Locked templates highlight the tier they belong to so upgrade reasons are obvious.',
      'Starter+ users can duplicate any template, edit beats, and share with teammates.'
    ],
    cta: { label: 'Browse template gallery', href: '/help#templates' }
  },
  {
    id: 'subscription-playbook',
    title: 'Subscription playbook',
    description: 'Understand how Free, Starter, Pro, and Unlimited unlock different workflows.',
    badge: 'Plans',
    bullets: [
      'Free: 5 generations/month, Markdown export for quick experiments.',
      'Starter: 300 generations, PDF export, template editing, and folders/tags.',
      'Pro & Unlimited: AI rewriting, style memory, analytics, knowledge base, and collaboration.'
    ],
    cta: { label: 'Compare plans', href: '/pricing' }
  }
];

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    id: 'async-collaboration',
    title: 'Async collaboration workflow',
    description:
      'Leave inline comments, capture selections, and prep teammates for the upcoming live co-editing release.',
    href: '/tutorials/async-collaboration',
    readingTime: '6 min read'
  },
  {
    id: 'character-encyclopedia',
    title: 'How to build a character encyclopedia',
    description:
      'Pin characters, locations, and artifacts, then reuse them across projects with Knowledge Dock suggestions.',
    href: '/tutorials/character-encyclopedia',
    readingTime: '5 min read'
  },
  {
    id: 'version-branching',
    title: 'Version history & branching tips',
    description: 'Capture every draft, branch timelines, and merge them when you like the alternate take.',
    href: '/tutorials/version-branching',
    readingTime: '4 min read'
  },
  {
    id: 'analytics-playbook',
    title: 'Make the most of writing analytics',
    description: 'Turn word-count trends, genre workload, and usage resets into a weekly writing plan.',
    href: '/tutorials/analytics-playbook',
    readingTime: '6 min read'
  }
];

export const RELEASE_NOTES: ReleaseNoteEntry[] = [
  {
    id: '2025-03-10',
    date: '2025-03-10',
    title: 'Phase 4 collaboration rollout',
    highlights: [
      'Inline comments now ship for Unlimited users—select any passage in Generator and leave anchored feedback.',
      'Async mode ensures comments still work when live sockets are unavailable; real-time co-editing remains on the roadmap.',
      'Non-Unlimited tiers see explicit Coming Soon cards so the collaboration tier value is clear across the app.'
    ]
  },
  {
    id: '2025-03-03',
    date: '2025-03-03',
    title: 'Knowledge workspace & analytics boost',
    highlights: [
      'Knowledge Dock can now discover entries from other projects, apply category filters, and import in bulk.',
      'Pinned knowledge syncs automatically even in offline sessions; edits are pushed to the cloud once you reconnect.',
      'Dashboard upsell cards spotlight Writing Analytics + Version History so Starter users know what upgrades unlock.'
    ]
  },
  {
    id: '2025-02-15',
    date: '2025-02-15',
    title: 'Template experience refresh',
    highlights: [
      'Template cards display summaries directly on the cover and show one-tap Quick Start.',
      'Category filters reflect only the genres in your library, and locked templates call out the required tier.',
      'Recent templates promote the most-used configuration at the top of the grid.'
    ]
  },
  {
    id: '2025-02-08',
    date: '2025-02-08',
    title: 'Usage limits & billing clarity',
    highlights: [
      'Generation/continuation usage is now synced with the backend so monthly counters stay accurate.',
      'Pricing includes structured data (JSON-LD) for better visibility on search engines.'
    ]
  },
  {
    id: '2025-01-26',
    date: '2025-01-26',
    title: 'Workspace onboarding',
    highlights: [
      'Flow Guide Drawer lets you skip configuration entirely or follow a gentle checklist.',
      'Dashboard cards gained folders, tags, and quick actions so you can group related stories easily.'
    ]
  }
];



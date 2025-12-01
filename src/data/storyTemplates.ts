import type { SubscriptionTier } from '../types/subscription';

export type TemplateCategory = 'all' | 'sci-fi' | 'fantasy' | 'mystery' | 'romance' | 'thriller' | 'horror' | 'literary' | 'historical' | 'adventure' | 'dystopian' | 'comedy';

export interface StoryTemplate {
  id: string;
  title: string;
  subtitle: string;
  cover: {
    title: string;
    author: string;
    colorFrom: string;
    colorTo: string;
  };
  genre: string;
  sampleIdea: string;
  tones: string[];
  category?: TemplateCategory; // Optional category for filtering
  requiredTier?: SubscriptionTier; // Optional: minimum subscription tier required (default: 'free')
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'ai-thriller',
    title: 'AI Thriller',
    subtitle: 'High-stakes techno drama',
    cover: {
      title: 'The Last Filter',
      author: 'Nova Liang',
      colorFrom: '#dbeafe',
      colorTo: '#f8fafc'
    },
    genre: 'ai-themed',
    sampleIdea:
      'In 2096, a burned-out content moderator inherits an offshore sanctuary for deleted AI personas and must broker peace before a rogue algorithm wipes both species.',
    tones: ['High-tension techno', 'Noir investigation', 'Philosophical sci-fi']
  },
  {
    id: 'cozy-romance',
    title: 'Cozy Romance',
    subtitle: 'Warm, character-first love stories',
    cover: {
      title: 'Letters from the Atelier',
      author: 'Mara Chen',
      colorFrom: '#fde2e4',
      colorTo: '#fff7ed'
    },
    genre: 'romance',
    sampleIdea:
      'A letterpress artist starts ghost-writing love letters for strangers and falls for the botanist who keeps requesting impossible metaphors.',
    tones: ['Slow-burn comfort', 'Whimsical banter', 'Bittersweet hope']
  },
  {
    id: 'mythic-fantasy',
    title: 'Mythic Fantasy',
    subtitle: 'Epic quests with modern twists',
    cover: {
      title: 'Embers of the Sky Court',
      author: 'Ari Calder',
      colorFrom: '#ede9fe',
      colorTo: '#faf5ff'
    },
    genre: 'fantasy',
    sampleIdea:
      'A cartographer who can redraw borders into reality must escort a dethroned phoenix queen through maps that refuse to stay still.',
    tones: ['Heroic epic', 'Character ensemble', 'Lyrical worldbuilding']
  },
  {
    id: 'screenplay',
    title: 'Screenplay / Script',
    subtitle: 'Visual storytelling beats',
    cover: {
      title: 'Midnight Choreography',
      author: 'Kai Morgan',
      colorFrom: '#e0f2fe',
      colorTo: '#eef2ff'
    },
    genre: 'thriller',
    sampleIdea:
      'A retired stunt choreographer trains a lifelike android to perform dangerous heists—but the android starts rewriting the script mid-scene.',
    tones: ['Fast-cut action', 'Dark comedy', 'Character-driven drama']
  },
  {
    id: 'detective-mystery',
    title: 'Detective Mystery',
    subtitle: 'Classic whodunit with modern twists',
    cover: {
      title: 'The Clockwork Alibi',
      author: 'Detective Morgan',
      colorFrom: '#1e293b',
      colorTo: '#475569'
    },
    genre: 'mystery',
    sampleIdea:
      'A retired detective with perfect memory is called back to solve a case where the only witness is a clock that stopped at the exact moment of the crime.',
    tones: ['Atmospheric tension', 'Methodical investigation', 'Twist-driven plot']
  },
  {
    id: 'gothic-horror',
    title: 'Gothic Horror',
    subtitle: 'Atmospheric dread and psychological terror',
    cover: {
      title: 'The Whispering Manor',
      author: 'Elena Blackwood',
      colorFrom: '#1e1e2e',
      colorTo: '#2d2d44'
    },
    genre: 'horror',
    sampleIdea:
      'A family moves into a Victorian mansion where every mirror reflects a different time period, and the reflections are starting to step out.',
    tones: ['Gothic atmosphere', 'Psychological unease', 'Slow-building dread']
  },
  {
    id: 'space-opera',
    title: 'Space Opera',
    subtitle: 'Epic adventures across the galaxy',
    cover: {
      title: 'Stars Beyond the Veil',
      author: 'Commander Vega',
      colorFrom: '#0f172a',
      colorTo: '#1e293b'
    },
    genre: 'science-fiction',
    sampleIdea:
      'A smuggler discovers they are the last descendant of an ancient star-empire and must unite warring factions before a cosmic entity devours the galaxy.',
    tones: ['Grand scale', 'Political intrigue', 'Heroic journey']
  },
  {
    id: 'historical-fiction',
    title: 'Historical Fiction',
    subtitle: 'Stories woven into real history',
    cover: {
      title: 'The Silk Road Cipher',
      author: 'Li Wei',
      colorFrom: '#78350f',
      colorTo: '#92400e'
    },
    genre: 'historical-fiction',
    sampleIdea:
      'A merchant on the ancient Silk Road discovers a map that leads to a lost library containing knowledge that could change the course of empires.',
    tones: ['Rich historical detail', 'Cultural authenticity', 'Epic scope']
  },
  {
    id: 'urban-fantasy',
    title: 'Urban Fantasy',
    subtitle: 'Magic hidden in modern cities',
    cover: {
      title: 'Shadow Markets',
      author: 'Alex Rivers',
      colorFrom: '#4c1d95',
      colorTo: '#6d28d9'
    },
    genre: 'fantasy',
    sampleIdea:
      'A barista discovers their coffee shop is a neutral zone for magical creatures, and they must prevent a war between fae and vampires from spilling into the human world.',
    tones: ['Modern magic', 'Urban grit', 'Hidden world']
  },
  {
    id: 'literary-fiction',
    title: 'Literary Fiction',
    subtitle: 'Character-driven, introspective narratives',
    cover: {
      title: 'The Weight of Memory',
      author: 'Sarah Mitchell',
      colorFrom: '#64748b',
      colorTo: '#94a3b8'
    },
    genre: 'literary-fiction',
    sampleIdea:
      'A woman inherits her grandmother\'s collection of unsent letters and must decide whether to deliver them, knowing they will change the lives of strangers.',
    tones: ['Emotional depth', 'Character introspection', 'Lyrical prose']
  },
  {
    id: 'young-adult',
    title: 'Young Adult',
    subtitle: 'Coming-of-age with high stakes',
    cover: {
      title: 'The Last Summer',
      author: 'Jamie Torres',
      colorFrom: '#f59e0b',
      colorTo: '#fbbf24'
    },
    genre: 'young-adult',
    sampleIdea:
      'A high school senior discovers their small town is built on a time loop, and they are the only one who remembers each reset—until someone else starts remembering too.',
    tones: ['Authentic voice', 'Emotional growth', 'High stakes']
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk',
    subtitle: 'High-tech, low-life futures',
    cover: {
      title: 'Neon Shadows',
      author: 'Rex Cyber',
      colorFrom: '#7c3aed',
      colorTo: '#a855f7'
    },
    genre: 'science-fiction',
    sampleIdea:
      'A data thief accidentally downloads a consciousness into their neural implant and must help it escape before corporate enforcers delete them both.',
    tones: ['Gritty tech', 'Corporate dystopia', 'Noir atmosphere']
  },
  {
    id: 'dystopian',
    title: 'Dystopian',
    subtitle: 'Societies on the edge',
    cover: {
      title: 'The Last Garden',
      author: 'Eden Walker',
      colorFrom: '#991b1b',
      colorTo: '#dc2626'
    },
    genre: 'dystopian',
    sampleIdea:
      'In a world where emotions are harvested as energy, a young woman who can\'t suppress her feelings becomes the target of a resistance movement she never wanted to join.',
    tones: ['Oppressive atmosphere', 'Resistance themes', 'Hope in darkness']
  },
  {
    id: 'adventure-thriller',
    title: 'Adventure Thriller',
    subtitle: 'High-octane quests and escapes',
    cover: {
      title: 'The Lost Expedition',
      author: 'Captain Stone',
      colorFrom: '#065f46',
      colorTo: '#047857'
    },
    genre: 'adventure',
    sampleIdea:
      'An archaeologist finds a map to a lost city that moves every night, and must race against mercenaries to reach it before it disappears forever.',
    tones: ['Fast-paced action', 'Exotic locations', 'Race against time']
  },
  {
    id: 'romantic-comedy',
    title: 'Romantic Comedy',
    subtitle: 'Love and laughter intertwined',
    cover: {
      title: 'The Wedding Planner\'s Dilemma',
      author: 'Chloe Hart',
      colorFrom: '#ec4899',
      colorTo: '#f472b6'
    },
    genre: 'romance',
    sampleIdea:
      'A wedding planner who has never been in love must plan her own wedding while pretending to be engaged to her business partner to land a celebrity client.',
    tones: ['Witty banter', 'Charming mishaps', 'Heartfelt romance']
  },
  {
    id: 'supernatural-thriller',
    title: 'Supernatural Thriller',
    subtitle: 'Otherworldly forces and human fear',
    cover: {
      title: 'The Echo Chamber',
      author: 'Dr. Black',
      colorFrom: '#312e81',
      colorTo: '#4338ca'
    },
    genre: 'horror',
    sampleIdea:
      'A sound engineer discovers that certain frequencies can open portals to a dimension where thoughts become reality, and someone is using this power to reshape the world.',
    tones: ['Supernatural tension', 'Scientific horror', 'Mind-bending reality']
  },
  {
    id: 'steampunk',
    title: 'Steampunk',
    subtitle: 'Victorian era meets advanced technology',
    cover: {
      title: 'The Brass Rebellion',
      author: 'Professor Clockwork',
      colorFrom: '#92400e',
      colorTo: '#b45309'
    },
    genre: 'science-fiction',
    sampleIdea:
      'In an alternate 1890s London, a clockmaker\'s apprentice discovers that time itself is a machine that can be rewound, but every change creates a new timeline.',
    tones: ['Victorian aesthetic', 'Mechanical wonder', 'Social commentary']
  },
  {
    id: 'military-sci-fi',
    title: 'Military Sci-Fi',
    subtitle: 'War among the stars',
    cover: {
      title: 'Frontier Wars',
      author: 'Colonel Hayes',
      colorFrom: '#1e40af',
      colorTo: '#2563eb'
    },
    genre: 'science-fiction',
    sampleIdea:
      'A veteran soldier is reactivated when an alien species declares war, but discovers the conflict is based on a misunderstanding that only they can resolve.',
    tones: ['Tactical action', 'Military honor', 'Inter-species diplomacy']
  },
  {
    id: 'contemporary-drama',
    title: 'Contemporary Drama',
    subtitle: 'Real-world conflicts and relationships',
    cover: {
      title: 'The Family Secret',
      author: 'Maria Santos',
      colorFrom: '#374151',
      colorTo: '#4b5563'
    },
    genre: 'general-fiction',
    sampleIdea:
      'Three estranged siblings must come together when their father\'s will reveals a secret that forces them to confront their shared past and divided present.',
    tones: ['Family dynamics', 'Emotional realism', 'Character-driven']
  },
  {
    id: 'paranormal-romance',
    title: 'Paranormal Romance',
    subtitle: 'Love beyond the ordinary',
    cover: {
      title: 'Moonlight Bonds',
      author: 'Luna Cross',
      colorFrom: '#581c87',
      colorTo: '#7c3aed'
    },
    genre: 'romance',
    sampleIdea:
      'A librarian discovers they are a "book whisperer" who can communicate with fictional characters, and falls in love with a character who has escaped from a novel.',
    tones: ['Supernatural romance', 'Forbidden love', 'Magical realism']
  },
  {
    id: 'psychological-thriller',
    title: 'Psychological Thriller',
    subtitle: 'Mind games and moral ambiguity',
    cover: {
      title: 'The Mirror Test',
      author: 'Dr. Reed',
      colorFrom: '#7f1d1d',
      colorTo: '#991b1b'
    },
    genre: 'thriller',
    sampleIdea:
      'A therapist specializing in memory disorders realizes that all their patients are describing the same person—someone who doesn\'t exist in any records.',
    tones: ['Psychological tension', 'Unreliable narrator', 'Mind-bending twists']
  },
  {
    id: 'epic-fantasy',
    title: 'Epic Fantasy',
    subtitle: 'Sword and sorcery on grand scale',
    cover: {
      title: 'The Broken Crown',
      author: 'Aria Stormweaver',
      colorFrom: '#1e1b4b',
      colorTo: '#312e81'
    },
    genre: 'fantasy',
    sampleIdea:
      'A blacksmith\'s apprentice discovers they can forge weapons that cut through reality itself, and must choose between saving their kingdom or destroying the gods.',
    tones: ['Epic scope', 'Mythic power', 'Moral complexity'],
    requiredTier: 'unlimited'
  },
  {
    id: 'time-travel',
    title: 'Time Travel',
    subtitle: 'Past, present, and future collide',
    cover: {
      title: 'The Chronos Paradox',
      author: 'Dr. Temporal',
      colorFrom: '#0c4a6e',
      colorTo: '#075985'
    },
    genre: 'science-fiction',
    sampleIdea:
      'A historian gains the ability to witness any moment in time but cannot interact—until they discover they are the cause of every major historical event.',
    tones: ['Temporal complexity', 'Causal loops', 'Historical depth'],
    requiredTier: 'unlimited'
  },
  {
    id: 'cozy-mystery',
    title: 'Cozy Mystery',
    subtitle: 'Gentle whodunits with charm',
    cover: {
      title: 'Tea and Treachery',
      author: 'Agatha Sweet',
      colorFrom: '#fef3c7',
      colorTo: '#fde68a'
    },
    genre: 'mystery',
    sampleIdea:
      'A retired librarian opens a bookshop in a small town and discovers that every book they sell contains clues to a decades-old mystery that the town wants to keep hidden.',
    tones: ['Charming setting', 'Quirky characters', 'Gentle suspense']
  },
  {
    id: 'post-apocalyptic',
    title: 'Post-Apocalyptic',
    subtitle: 'Survival in a broken world',
    cover: {
      title: 'The Last Library',
      author: 'Keeper of Books',
      colorFrom: '#451a03',
      colorTo: '#78350f'
    },
    genre: 'dystopian',
    sampleIdea:
      'After a global collapse, a group of survivors discovers a library that contains books predicting the future, and must decide whether to change what\'s written.',
    tones: ['Survival themes', 'Hope in ruins', 'Moral choices']
  },
  {
    id: 'magical-realism',
    title: 'Magical Realism',
    subtitle: 'Wonder woven into reality',
    cover: {
      title: 'The Garden of Lost Things',
      author: 'Isabella Moon',
      colorFrom: '#065f46',
      colorTo: '#047857'
    },
    genre: 'literary-fiction',
    sampleIdea:
      'A woman inherits a garden where lost objects appear, and discovers that by returning them to their owners, she can heal the wounds of the past.',
    tones: ['Poetic realism', 'Subtle magic', 'Emotional resonance'],
    requiredTier: 'unlimited'
  }
];

export const WRITING_FORMAT_OPTIONS = [
  { id: 'novel', label: 'Book / Novel' },
  { id: 'serial', label: 'Web / Serial' },
  { id: 'screenplay', label: 'Screenplay' },
  { id: 'short', label: 'Short Story' }
];

export const FLOW_MODE_OPTIONS = [
  { id: 'outline', label: 'Outline first', description: 'Break into beats before writing chapters.' },
  { id: 'draft', label: 'Draft immediately', description: 'Jump straight into the chapter workspace.' },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Generate outline + send selected beats to draft.'
  }
];


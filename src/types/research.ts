export type ResearchMode = 'quick' | 'general' | 'academic' | 'deep' | 'reasoning';

export interface ResearchModeConfig {
  id: ResearchMode;
  model: string;
  name: string;
  description: string;
  icon: string;
  recencyFilter: string;
  searchMode?: string;
}

export const RESEARCH_MODES: ResearchModeConfig[] = [
  {
    id: 'quick',
    model: 'sonar',
    name: 'Snabb',
    description: 'Snabb sökning för enkla frågor',
    icon: '⚡',
    recencyFilter: 'month',
  },
  {
    id: 'general',
    model: 'sonar-pro',
    name: 'Standard',
    description: 'Multi-step reasoning med fler källor',
    icon: '🔍',
    recencyFilter: 'year',
  },
  {
    id: 'academic',
    model: 'sonar-reasoning',
    name: 'Akademisk',
    description: 'Peer-reviewed artiklar och studier',
    icon: '🎓',
    recencyFilter: 'year',
    searchMode: 'academic',
  },
  {
    id: 'reasoning',
    model: 'sonar-reasoning-pro',
    name: 'Resonemang',
    description: 'Avancerad steg-för-steg analys',
    icon: '🧠',
    recencyFilter: 'year',
  },
  {
    id: 'deep',
    model: 'sonar-deep-research',
    name: 'Djupanalys',
    description: 'Omfattande multi-query expertforskning',
    icon: '🔬',
    recencyFilter: 'year',
  },
];

export interface Citation {
  id: string;
  url: string;
  title?: string;
  source?: string;
  moduleId?: string;
  stepName?: string;
  addedAt: Date;
}

export interface ResearchResult {
  content: string;
  citations: string[];
  topic: string;
  mode: ResearchMode;
  model: string;
  metadata?: {
    citationCount: number;
    searchMode: string;
    recencyFilter: string;
    domainFilter?: string[] | null;
  };
}

export interface WebSearchResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
}

export interface ScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
}

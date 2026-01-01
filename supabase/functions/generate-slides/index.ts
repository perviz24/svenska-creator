import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideContent {
  slideNumber: number;
  title: string;
  subtitle?: string;
  content: string;
  bulletPoints?: string[];
  keyTakeaway?: string;
  speakerNotes: string;
  layout: 'title' | 'title-content' | 'two-column' | 'image-focus' | 'quote' | 'bullet-points' | 'key-point' | 'comparison' | 'timeline' | 'stats';
  suggestedImageQuery: string;
  suggestedBackgroundColor?: string;
  iconSuggestion?: string;
  visualType?: 'photo' | 'illustration' | 'vector' | 'diagram' | 'icon-grid' | 'abstract';
  imagePosition?: 'background' | 'left' | 'right' | 'top' | 'inline' | 'corner';
  imageUrl?: string;
  imageSource?: string;
  imageAttribution?: string;
}

// Generation parameters inspired by Presenton API
type Tone = 'default' | 'casual' | 'professional' | 'educational' | 'sales_pitch';
type Verbosity = 'concise' | 'standard' | 'text-heavy';

interface GenerationOptions {
  tone?: Tone;
  verbosity?: Verbosity;
  includeTableOfContents?: boolean;
  includeTitleSlide?: boolean;
  industry?: string;
  audienceType?: string;
}

interface StockPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  source: string;
  attribution: string;
}

// ============================================
// BEST PRACTICE ALGORITHMS FOR IMAGE MATCHING
// ============================================

// ALGORITHM 1: RAKE-inspired Keyword Extraction
// Extracts multi-word phrases that are more semantically meaningful
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
  'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'also', 'being', 'our', 'your', 'their', 'its', 'my', 'me', 'him', 'her', 'us', 'them',
  // Swedish stopwords
  'och', 'i', 'att', 'en', 'ett', 'på', 'är', 'av', 'för', 'med', 'till', 'den', 'det',
  'de', 'om', 'som', 'var', 'har', 'vi', 'kan', 'ska', 'vid', 'eller', 'inte', 'från',
  'finns', 'sig', 'man', 'så', 'men', 'hur', 'sin', 'detta', 'dessa', 'vilka', 'samt'
]);

function extractKeyPhrases(text: string): string[] {
  // Split text into sentences, then extract candidate phrases between stopwords
  const sentences = text.toLowerCase()
    .replace(/[^\w\sÀ-ÿ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  const phrases: string[] = [];
  let currentPhrase: string[] = [];
  
  for (const word of sentences) {
    if (STOPWORDS.has(word)) {
      if (currentPhrase.length > 0 && currentPhrase.length <= 4) {
        phrases.push(currentPhrase.join(' '));
      }
      currentPhrase = [];
    } else {
      currentPhrase.push(word);
    }
  }
  
  if (currentPhrase.length > 0 && currentPhrase.length <= 4) {
    phrases.push(currentPhrase.join(' '));
  }
  
  return phrases;
}

// Score phrases by word frequency and co-occurrence (simplified TF-IDF)
function scoreKeyPhrases(phrases: string[]): Map<string, number> {
  const phraseFreq = new Map<string, number>();
  const wordFreq = new Map<string, number>();
  
  // Count phrase and word frequencies
  for (const phrase of phrases) {
    phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
    for (const word of phrase.split(' ')) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  // Score phrases: degree/frequency ratio (RAKE algorithm)
  const scores = new Map<string, number>();
  for (const phrase of phraseFreq.keys()) {
    const words = phrase.split(' ');
    let score = 0;
    for (const word of words) {
      const wordDegree = words.length; // co-occurrence degree
      const wordFrequency = wordFreq.get(word) || 1;
      score += wordDegree / wordFrequency;
    }
    // Boost multi-word phrases
    score *= (1 + 0.3 * (words.length - 1));
    scores.set(phrase, score);
  }
  
  return scores;
}

// ALGORITHM 2: Semantic Concept to Visual Mapping
// Maps abstract concepts to concrete, searchable visual terms
const CONCEPT_TO_VISUAL: Record<string, string[]> = {
  // Abstract concepts → concrete visuals
  'growth': ['plant sprouting', 'arrow trending upward', 'tree growing', 'seedling'],
  'success': ['person celebrating', 'trophy award', 'mountain peak summit', 'finish line'],
  'teamwork': ['diverse team collaborating', 'hands together huddle', 'group discussion meeting'],
  'innovation': ['lightbulb glowing', 'creative brainstorming', 'futuristic technology'],
  'strategy': ['chess pieces', 'planning whiteboard', 'roadmap diagram', 'compass direction'],
  'leadership': ['person leading team', 'guiding light', 'captain steering'],
  'transformation': ['butterfly metamorphosis', 'before after comparison', 'evolution stages'],
  'connection': ['network nodes connected', 'handshake partnership', 'bridge linking'],
  'security': ['shield protection', 'lock secure', 'fortress stronghold', 'umbrella coverage'],
  'efficiency': ['gears mechanism', 'streamlined flow', 'fast speed motion'],
  'quality': ['diamond excellence', 'gold standard', 'precision craftsmanship'],
  'sustainability': ['green energy solar', 'recycling nature', 'earth planet care'],
  'digital': ['binary code screen', 'digital interface', 'technology circuit'],
  'analytics': ['data visualization charts', 'graphs statistics', 'dashboard metrics'],
  'communication': ['speech bubbles dialogue', 'megaphone announcement', 'video conference'],
  'learning': ['books open reading', 'graduation cap', 'brain neurons knowledge'],
  'health': ['healthy heart', 'medical stethoscope', 'wellness fitness'],
  'finance': ['coins money stacked', 'investment portfolio', 'stock market trading'],
  'time': ['clock hourglass', 'calendar schedule', 'timeline progression'],
  'challenge': ['mountain climbing', 'obstacle course', 'puzzle solving'],
  'balance': ['scales equilibrium', 'yin yang harmony', 'work life balance'],
  'focus': ['magnifying glass target', 'spotlight center', 'lens sharp clarity'],
  // Swedish mappings
  'tillväxt': ['plant sprouting growth', 'arrow trending upward chart'],
  'framgång': ['success celebration trophy', 'achievement summit'],
  'samarbete': ['team collaboration meeting', 'partnership handshake'],
  'utveckling': ['progress development stages', 'evolution growth'],
  'kunskap': ['knowledge books learning', 'brain education'],
  'hälsa': ['health medical wellness', 'healthcare professional'],
  'säkerhet': ['security protection shield', 'safety lock'],
};

function mapConceptToVisual(text: string): string[] {
  const lower = text.toLowerCase();
  const visualTerms: string[] = [];
  
  for (const [concept, visuals] of Object.entries(CONCEPT_TO_VISUAL)) {
    if (lower.includes(concept)) {
      visualTerms.push(...visuals);
    }
  }
  
  return visualTerms;
}

// ALGORITHM 3: Query Expansion with Synonyms and Hypernyms
const SYNONYM_EXPANSION: Record<string, string[]> = {
  // Expand generic terms to specific visual alternatives
  'doctor': ['physician', 'surgeon', 'medical professional', 'healthcare worker'],
  'hospital': ['medical center', 'clinic', 'healthcare facility', 'emergency room'],
  'business': ['corporate office', 'company headquarters', 'professional workplace'],
  'technology': ['digital innovation', 'computer systems', 'tech startup', 'software development'],
  'education': ['classroom learning', 'academic institution', 'student studying', 'teaching'],
  'money': ['currency', 'financial investment', 'banking', 'wealth management'],
  'nature': ['landscape scenery', 'outdoor wilderness', 'natural environment', 'greenery'],
  'people': ['diverse professionals', 'team members', 'group of colleagues', 'workforce'],
  'office': ['modern workspace', 'corporate environment', 'business meeting room'],
  'data': ['analytics dashboard', 'statistics visualization', 'information graphics'],
  // Action verbs to scenes
  'analyze': ['data analysis screen', 'researcher examining'],
  'present': ['speaker presentation', 'business pitch', 'conference stage'],
  'collaborate': ['team brainstorming', 'group workshop', 'co-working session'],
  'plan': ['strategic planning', 'roadmap whiteboard', 'project timeline'],
  'implement': ['construction building', 'development process', 'execution'],
  'measure': ['metrics dashboard', 'performance tracking', 'measurement tools'],
};

function expandQueryWithSynonyms(query: string): string {
  const words = query.toLowerCase().split(' ');
  const expanded: string[] = [...words];
  
  for (const word of words) {
    const synonyms = SYNONYM_EXPANSION[word];
    if (synonyms && synonyms.length > 0) {
      // Add one relevant synonym
      expanded.push(synonyms[0]);
    }
  }
  
  return expanded.join(' ');
}

// ALGORITHM 4: Industry-Specific Visual Vocabulary
const INDUSTRY_VISUAL_VOCABULARY: Record<string, {
  primaryVisuals: string[];
  colorMood: string;
  styleHints: string[];
  avoidTerms: string[];
}> = {
  healthcare: {
    primaryVisuals: ['medical professional stethoscope', 'modern hospital interior', 'patient care consultation', 'medical equipment technology', 'anatomical diagram'],
    colorMood: 'clean clinical blue white',
    styleHints: ['professional', 'trustworthy', 'clean', 'modern'],
    avoidTerms: ['generic', 'stock photo obvious', 'outdated equipment'],
  },
  finance: {
    primaryVisuals: ['financial analyst dashboard', 'stock market trading floor', 'business professionals meeting', 'investment growth chart', 'banking corporate'],
    colorMood: 'professional blue green gold',
    styleHints: ['corporate', 'sophisticated', 'trustworthy', 'premium'],
    avoidTerms: ['cheap', 'cluttered', 'amateur'],
  },
  technology: {
    primaryVisuals: ['software developer coding', 'futuristic technology interface', 'data center servers', 'startup office modern', 'artificial intelligence visualization'],
    colorMood: 'modern blue purple gradient',
    styleHints: ['innovative', 'cutting-edge', 'sleek', 'minimalist'],
    avoidTerms: ['outdated', 'clip art', 'cartoon'],
  },
  education: {
    primaryVisuals: ['students learning classroom', 'teacher explaining whiteboard', 'university campus', 'books library studying', 'online learning laptop'],
    colorMood: 'warm inviting orange yellow',
    styleHints: ['inspiring', 'accessible', 'engaging', 'diverse'],
    avoidTerms: ['boring', 'old-fashioned', 'empty classroom'],
  },
  marketing: {
    primaryVisuals: ['creative team brainstorming', 'digital marketing campaign', 'brand strategy planning', 'social media engagement', 'customer analytics'],
    colorMood: 'vibrant creative colorful',
    styleHints: ['dynamic', 'creative', 'bold', 'trendy'],
    avoidTerms: ['dull', 'corporate', 'static'],
  },
  environment: {
    primaryVisuals: ['renewable energy solar panels', 'sustainable forest nature', 'clean energy wind turbines', 'eco-friendly green technology', 'climate action'],
    colorMood: 'natural green blue earth tones',
    styleHints: ['natural', 'hopeful', 'authentic', 'sustainable'],
    avoidTerms: ['pollution', 'destruction', 'negative'],
  },
  legal: {
    primaryVisuals: ['lawyer professional office', 'legal documents contract', 'courthouse interior', 'justice scales balance', 'professional consultation'],
    colorMood: 'serious navy burgundy dark',
    styleHints: ['authoritative', 'professional', 'serious', 'trustworthy'],
    avoidTerms: ['informal', 'casual', 'playful'],
  },
  general: {
    primaryVisuals: ['professional team meeting', 'modern office workspace', 'business success celebration', 'collaboration teamwork', 'innovation concept'],
    colorMood: 'professional neutral warm',
    styleHints: ['professional', 'modern', 'clean', 'versatile'],
    avoidTerms: ['cliché', 'overused', 'generic handshake'],
  },
};

// ALGORITHM 5: Layout-Aware Visual Selection
// Different layouts need different types of images
const LAYOUT_VISUAL_RULES: Record<string, {
  preferredVisualTypes: string[];
  imageCharacteristics: string;
  aspectRatio: string;
  contentBalance: string;
}> = {
  'title': {
    preferredVisualTypes: ['abstract', 'photo'],
    imageCharacteristics: 'wide panoramic hero image with space for text overlay',
    aspectRatio: '16:9 landscape',
    contentBalance: 'visual dominant with minimal text',
  },
  'key-point': {
    preferredVisualTypes: ['illustration', 'photo', 'icon-grid'],
    imageCharacteristics: 'impactful single subject with clear focal point',
    aspectRatio: 'square or portrait for side placement',
    contentBalance: 'image supports main message',
  },
  'bullet-points': {
    preferredVisualTypes: ['illustration', 'vector', 'corner'],
    imageCharacteristics: 'subtle supportive visual that doesn\'t compete with text',
    aspectRatio: 'flexible, often smaller',
    contentBalance: 'text dominant with accent visual',
  },
  'stats': {
    preferredVisualTypes: ['diagram', 'icon-grid', 'abstract'],
    imageCharacteristics: 'infographic style, charts, data visualization aesthetic',
    aspectRatio: 'varies based on data type',
    contentBalance: 'data visualization primary',
  },
  'comparison': {
    preferredVisualTypes: ['illustration', 'photo'],
    imageCharacteristics: 'side by side comparison, split visual, before/after',
    aspectRatio: 'split layout or single with duality',
    contentBalance: 'equal visual weight for comparison items',
  },
  'quote': {
    preferredVisualTypes: ['abstract', 'photo'],
    imageCharacteristics: 'atmospheric background, inspirational scene, portrait of speaker',
    aspectRatio: '16:9 background',
    contentBalance: 'quote text overlay on visual',
  },
  'image-focus': {
    preferredVisualTypes: ['photo'],
    imageCharacteristics: 'high impact, full bleed, storytelling image',
    aspectRatio: '16:9 full screen',
    contentBalance: 'image is the content',
  },
  'timeline': {
    preferredVisualTypes: ['diagram', 'illustration'],
    imageCharacteristics: 'progression visual, path, journey metaphor',
    aspectRatio: 'wide horizontal',
    contentBalance: 'timeline graphic dominant',
  },
};

// ALGORITHM 6: Intelligent Query Builder
function buildIntelligentImageQuery(
  slide: { title: string; bulletPoints?: string[]; keyTakeaway?: string; layout: string },
  industry: string,
  visualType: string,
  slideIndex: number
): string {
  const allText = `${slide.title} ${(slide.bulletPoints || []).join(' ')} ${slide.keyTakeaway || ''}`;
  
  // Step 1: Extract key phrases using RAKE algorithm
  const keyPhrases = extractKeyPhrases(allText);
  const phraseScores = scoreKeyPhrases(keyPhrases);
  
  // Sort by score and get top phrases
  const topPhrases = Array.from(phraseScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phrase]) => phrase);
  
  // Step 2: Map abstract concepts to visuals
  const conceptVisuals = mapConceptToVisual(allText);
  
  // Step 3: Get industry-specific vocabulary
  const industryVocab = INDUSTRY_VISUAL_VOCABULARY[industry] || INDUSTRY_VISUAL_VOCABULARY.general;
  
  // Step 4: Get layout-specific requirements
  const layoutRules = LAYOUT_VISUAL_RULES[slide.layout] || LAYOUT_VISUAL_RULES['bullet-points'];
  
  // Step 5: Build query components
  const queryParts: string[] = [];
  
  // Add top key phrase (most specific to content)
  if (topPhrases[0]) {
    queryParts.push(topPhrases[0]);
  }
  
  // Add concept visual if found
  if (conceptVisuals.length > 0) {
    queryParts.push(conceptVisuals[0]);
  }
  
  // Add industry primary visual
  const industryVisual = industryVocab.primaryVisuals[slideIndex % industryVocab.primaryVisuals.length];
  if (industryVisual && queryParts.length < 2) {
    queryParts.push(industryVisual);
  }
  
  // Add visual type modifier
  const visualModifiers: Record<string, string> = {
    'photo': 'professional photography',
    'illustration': 'digital illustration flat design',
    'vector': 'vector icon minimal',
    'diagram': 'infographic diagram',
    'icon-grid': 'icon set minimal',
    'abstract': 'abstract background gradient',
  };
  
  if (visualModifiers[visualType]) {
    queryParts.push(visualModifiers[visualType]);
  }
  
  // Add style hints
  if (industryVocab.styleHints.length > 0) {
    queryParts.push(industryVocab.styleHints[0]);
  }
  
  // Step 6: Expand with synonyms
  let query = queryParts.join(' ').substring(0, 100); // Limit query length
  query = expandQueryWithSynonyms(query);
  
  // Step 7: Clean and deduplicate
  const words = query.toLowerCase().split(' ');
  const uniqueWords = [...new Set(words)].filter(w => w.length > 2).slice(0, 10);
  
  return uniqueWords.join(' ');
}

// Cache utilities
async function generateCacheKey(functionName: string, params: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ functionName, params }));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCachedResponse(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response, id, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    supabase
      .from('ai_response_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('id', data.id)
      .then(() => console.log('Cache hit count updated'));
    
    console.log('Cache HIT for key:', cacheKey.substring(0, 16) + '...');
    return data.response;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

async function setCachedResponse(
  supabase: any,
  cacheKey: string,
  functionName: string,
  requestHash: string,
  response: any,
  ttlHours: number = 24
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('ai_response_cache')
      .upsert({
        cache_key: cacheKey,
        function_name: functionName,
        request_hash: requestHash,
        response,
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
    
    console.log('Response cached with TTL:', ttlHours, 'hours');
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

// Search stock photos from Unsplash and Pexels with improved scoring
async function searchStockPhotos(query: string, visualType?: string): Promise<StockPhoto | null> {
  const photos: (StockPhoto & { relevanceScore: number })[] = [];
  
  // Search Unsplash
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (unsplashKey) {
    try {
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
      const unsplashResponse = await fetch(unsplashUrl, {
        headers: { 'Authorization': `Client-ID ${unsplashKey}` }
      });
      
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json();
        const unsplashPhotos = (unsplashData.results || []).map((photo: any, idx: number) => ({
          id: photo.id,
          url: photo.urls?.regular || photo.urls?.small,
          thumbnailUrl: photo.urls?.thumb,
          width: photo.width,
          height: photo.height,
          photographer: photo.user?.name || 'Unknown',
          photographerUrl: photo.user?.links?.html || '',
          source: 'unsplash',
          attribution: `Photo by ${photo.user?.name || 'Unknown'} on Unsplash`,
          // Score by position (Unsplash already ranks by relevance) and image quality
          relevanceScore: (5 - idx) + (photo.width > 2000 ? 2 : 0) + (photo.likes > 100 ? 1 : 0),
        }));
        photos.push(...unsplashPhotos);
      }
    } catch (e) {
      console.error('Unsplash search error:', e);
    }
  }
  
  // Search Pexels
  const pexelsKey = Deno.env.get('PEXELS_API_KEY');
  if (pexelsKey) {
    try {
      const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
      const pexelsResponse = await fetch(pexelsUrl, {
        headers: { 'Authorization': pexelsKey }
      });
      
      if (pexelsResponse.ok) {
        const pexelsData = await pexelsResponse.json();
        const pexelsPhotos = (pexelsData.photos || []).map((photo: any, idx: number) => ({
          id: String(photo.id),
          url: photo.src?.large || photo.src?.medium,
          thumbnailUrl: photo.src?.tiny,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer || 'Unknown',
          photographerUrl: photo.photographer_url || '',
          source: 'pexels',
          attribution: `Photo by ${photo.photographer || 'Unknown'} on Pexels`,
          relevanceScore: (5 - idx) + (photo.width > 2000 ? 2 : 0),
        }));
        photos.push(...pexelsPhotos);
      }
    } catch (e) {
      console.error('Pexels search error:', e);
    }
  }
  
  if (photos.length > 0) {
    // Filter for landscape and sort by relevance score
    const landscapePhotos = photos.filter(p => p.width > p.height);
    const sortedPhotos = (landscapePhotos.length > 0 ? landscapePhotos : photos)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Return the best match
    const best = sortedPhotos[0];
    return {
      id: best.id,
      url: best.url,
      thumbnailUrl: best.thumbnailUrl,
      width: best.width,
      height: best.height,
      photographer: best.photographer,
      photographerUrl: best.photographerUrl,
      source: best.source,
      attribution: best.attribution,
    };
  }
  
  return null;
}

// Clean any markdown from content - ROBUST version
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[\s]*[-•]\s*/gm, '')
    .replace(/^[\s]*\d+\.\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
}

// Industry detection for context-aware generation
function detectIndustry(content: string): string {
  const lower = content.toLowerCase();
  if (/health|medical|hospital|patient|doctor|clinic|anatomy|diagnos|treatment|medicin|läkare|sjukhus/i.test(lower)) return 'healthcare';
  if (/financ|bank|invest|stock|crypto|trading/i.test(lower)) return 'finance';
  if (/tech|software|digital|ai|machine learning|data|cloud/i.test(lower)) return 'technology';
  if (/education|school|learn|student|teach|course/i.test(lower)) return 'education';
  if (/market|brand|customer|sales|advertis/i.test(lower)) return 'marketing';
  if (/nature|environment|sustain|green|eco|climate/i.test(lower)) return 'environment';
  if (/law|legal|compliance|regulation/i.test(lower)) return 'legal';
  return 'general';
}

// Get image keywords based on industry
function getIndustryImageGuidance(industry: string): string {
  const guidance: Record<string, string> = {
    healthcare: 'Use medical professional photos, clinical settings, anatomical diagrams. Keywords: doctor, hospital, medical equipment, patient care, surgery, diagnosis. For illustrations use: medical infographic, anatomy illustration, healthcare icon.',
    finance: 'Use business professional photos, charts, graphs, office settings. Keywords: business meeting, financial charts, corporate office, investment. For illustrations use: financial infographic, business diagram, money icon.',
    technology: 'Use modern tech imagery, abstract digital visuals, clean interfaces. Keywords: technology, digital, innovation, software, data visualization. For illustrations use: tech illustration, circuit pattern, digital abstract.',
    education: 'Use classroom, learning, books, students. Keywords: education, learning, classroom, students, teaching, knowledge. For illustrations use: educational infographic, learning diagram, academic icon.',
    marketing: 'Use dynamic, engaging visuals with people. Keywords: marketing, branding, team collaboration, creative. For illustrations use: marketing infographic, business growth chart, target illustration.',
    environment: 'Use nature photography, sustainability themes. Keywords: nature, environment, sustainable, green energy. For illustrations use: eco infographic, nature illustration, environmental icon.',
    legal: 'Use professional settings, documents, courtrooms. Keywords: legal, law, contract, professional. For illustrations use: legal document illustration, scales of justice icon.',
    general: 'Use professional business photography. Keywords: professional, business, teamwork, success. For illustrations use: business infographic, professional icon set.',
  };
  return guidance[industry] || guidance.general;
}

// Determine best image position based on layout and visual type
function determineImagePosition(layout: string, visualType: string, slideIndex: number): string {
  if (layout === 'title') return 'background';
  if (layout === 'image-focus') return 'background';
  
  if (visualType === 'illustration' || visualType === 'vector') {
    const positions = ['right', 'left', 'corner'];
    return positions[slideIndex % positions.length];
  }
  
  if (visualType === 'diagram') {
    return slideIndex % 2 === 0 ? 'top' : 'right';
  }
  
  if (layout === 'two-column') {
    return slideIndex % 2 === 0 ? 'left' : 'right';
  }
  
  if (layout === 'stats' || layout === 'comparison') {
    return 'corner';
  }
  
  const positions = ['background', 'right', 'left', 'background', 'corner'];
  return positions[slideIndex % positions.length];
}

// Determine visual type based on content and layout
function determineVisualType(layout: string, content: string, slideIndex: number): string {
  const lowerContent = content.toLowerCase();
  
  if (layout === 'stats') {
    return slideIndex % 2 === 0 ? 'diagram' : 'icon-grid';
  }
  
  if (layout === 'comparison') return 'illustration';
  if (layout === 'quote') return 'abstract';
  
  if (layout === 'key-point') {
    return slideIndex % 3 === 0 ? 'illustration' : slideIndex % 3 === 1 ? 'photo' : 'vector';
  }
  
  if (/diagram|chart|graph|flow|process|step/i.test(lowerContent)) return 'diagram';
  if (/icon|symbol|represent/i.test(lowerContent)) return 'icon-grid';
  if (/illustrat|draw|concept|abstract/i.test(lowerContent)) return 'illustration';
  
  return slideIndex % 3 === 0 ? 'illustration' : 'photo';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      script, 
      moduleTitle, 
      courseTitle, 
      language = 'sv', 
      autoFetchImages = true, 
      maxSlides = 10, 
      demoMode = false, 
      skipCache = false,
      tone = 'professional',
      verbosity = 'standard',
      includeTableOfContents = false,
      includeTitleSlide = true,
      audienceType = 'general',
    } = await req.json();

    const effectiveTone = (tone as Tone) || 'professional';
    const effectiveVerbosity = (verbosity as Verbosity) || 'standard';

    const scriptContent = typeof script === 'object' ? JSON.stringify(script.sections || script) : script;
    const effectiveModuleTitle = moduleTitle || (typeof script === 'object' ? script.moduleTitle : 'Module');

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ error: 'Script content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const cacheParams = { scriptContent: scriptContent.substring(0, 1000), moduleTitle: effectiveModuleTitle, courseTitle, language, maxSlides, demoMode };
    const cacheKey = await generateCacheKey('generate-slides-v4', cacheParams);

    if (!skipCache) {
      const cachedResponse = await getCachedResponse(supabase, cacheKey);
      if (cachedResponse) {
        let slides = cachedResponse.slides as SlideContent[];
        
        if (autoFetchImages) {
          console.log('Cache HIT - fetching fresh images with intelligent queries...');
          const detectedIndustry = detectIndustry(scriptContent);
          
          const slidesWithImages = await Promise.all(
            slides.map(async (slide, idx) => {
              if (!slide.imageUrl) {
                try {
                  // Use intelligent query builder for cached slides too
                  const smartQuery = buildIntelligentImageQuery(slide, detectedIndustry, slide.visualType || 'photo', idx);
                  console.log(`Smart query for slide ${idx + 1}: "${smartQuery}"`);
                  
                  const photo = await searchStockPhotos(smartQuery, slide.visualType);
                  if (photo) {
                    return { ...slide, imageUrl: photo.url, imageSource: photo.source, imageAttribution: photo.attribution };
                  }
                } catch (e) {
                  console.error(`Error fetching image for slide ${slide.slideNumber}:`, e);
                }
              }
              return slide;
            })
          );
          slides = slidesWithImages;
        }
        
        return new Response(JSON.stringify({ slides, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const effectiveMaxSlides = demoMode ? Math.min(maxSlides, 3) : maxSlides;
    const detectedIndustry = detectIndustry(scriptContent);
    const industryImageGuidance = getIndustryImageGuidance(detectedIndustry);
    const industryVocab = INDUSTRY_VISUAL_VOCABULARY[detectedIndustry] || INDUSTRY_VISUAL_VOCABULARY.general;
    
    console.log('Cache MISS - generating slides. Demo mode:', demoMode, 'Max slides:', effectiveMaxSlides);
    console.log('Generation params: tone=', tone, ', verbosity=', verbosity, ', industry=', detectedIndustry, ', audience=', audienceType);
    console.log('Industry visual vocabulary:', industryVocab.primaryVisuals.slice(0, 2).join(', '));

    const toneGuidance: Record<Tone, string> = {
      default: 'Use neutral, balanced language.',
      casual: 'Use conversational, approachable language. Be friendly and accessible.',
      professional: 'Use formal, authoritative language. Be precise and credible.',
      educational: 'Use clear, instructive language. Focus on teaching and explaining concepts step-by-step.',
      sales_pitch: 'Use persuasive, compelling language. Focus on benefits and call-to-action.',
    };

    const verbosityGuidance: Record<Verbosity, { bullets: string; notes: string }> = {
      concise: { bullets: '2-3 very short bullets per slide. Maximum 8 words per bullet.', notes: '1 sentence speaker notes.' },
      standard: { bullets: '3-5 bullets per slide. 5-12 words per bullet.', notes: '2-3 sentences speaker notes with key talking points.' },
      'text-heavy': { bullets: '5-7 detailed bullets per slide. Full sentences allowed.', notes: 'Detailed speaker notes with full explanations.' },
    };

    const audienceGuidance: Record<string, string> = {
      executives: 'Focus on high-level insights, strategic value, and ROI. Skip technical details.',
      technical: 'Include detailed specifications, diagrams, and technical terminology.',
      students: 'Use engaging, accessible language. Include examples and clear explanations.',
      general: 'Balance detail with accessibility. Avoid jargon.',
    };

    // ENHANCED: Add intelligent image query guidance to system prompt
    const imageQueryExamples = industryVocab.primaryVisuals.slice(0, 3).join('", "');
    
    const systemPrompt = language === 'sv' 
      ? `Du är en EXPERT-presentationsdesigner. Du skapar PROFESSIONELLA och VISUELLT IMPONERANDE slides.

TON: ${toneGuidance[effectiveTone]}
DETALJNIVÅ: ${verbosityGuidance[effectiveVerbosity].bullets}
MÅLGRUPP: ${audienceGuidance[audienceType] || audienceGuidance.general}
BRANSCH: ${detectedIndustry.toUpperCase()} - ${industryImageGuidance}

ABSOLUTA REGLER:
1. ENDAST PLAIN TEXT - aldrig markdown (*#_\`)
2. ${verbosityGuidance[effectiveVerbosity].bullets}
3. VARIERA LAYOUTER - använd ALLA typer, inte bara bullet-points
4. SKRIV SPECIFIKA BILDTERMER på engelska för varje slide

AVANCERAD BILDSÖKNING - KRITISKT:
- suggestedImageQuery MÅSTE vara 5-8 ord som beskriver EXAKT vad bilden ska visa
- Använd KONKRETA termer, inte abstrakta (t.ex. "surgeon performing minimally invasive surgery" istället för "medicin")
- Exempel för ${detectedIndustry}: "${imageQueryExamples}"
- UNDVIK generiska termer som "professional", "business", "success" ensamma
- Inkludera HANDLINGAR och SCENER: "team discussing strategy whiteboard", "doctor examining patient stethoscope"

LAYOUT-TYPER OCH NÄR DE ANVÄNDS:
- "title": ENDAST första sliden. Har INGEN bulletPoints.
- "key-point": En STOR huvudpoäng. Kräver keyTakeaway-fält. 1-2 stödjande bullets.
- "bullet-points": Standard punkter med fakta.
- "stats": Siffror/statistik. Bullets ska vara "XX% av Y" eller "X miljoner Z".
- "comparison": Jämför två alternativ. Bullets: "A: beskrivning", "B: beskrivning".
- "quote": Viktigt citat. keyTakeaway = citatet. subtitle = vem som sa det.
- "image-focus": Stor bild. Endast 1-2 bullets för kontext.

LUCIDE IKONER:
Healthcare: Stethoscope, Heart, Activity, Scan, Pill, Brain, Eye, Ear, Syringe
Technology: Cpu, Code, Cloud, Database, Wifi, Monitor, Smartphone
Education: BookOpen, GraduationCap, Lightbulb, PenTool, Users
Business: TrendingUp, Target, BarChart3, PieChart, Briefcase, Building2

SPEAKER NOTES: ${verbosityGuidance[effectiveVerbosity].notes}`
      : `You are an EXPERT presentation designer creating PROFESSIONAL, VISUALLY IMPRESSIVE slides.

TONE: ${toneGuidance[effectiveTone]}
VERBOSITY: ${verbosityGuidance[effectiveVerbosity].bullets}
AUDIENCE: ${audienceGuidance[audienceType] || audienceGuidance.general}
INDUSTRY: ${detectedIndustry.toUpperCase()} - ${industryImageGuidance}

ABSOLUTE RULES:
1. PLAIN TEXT ONLY - never use markdown (*#_\`)
2. ${verbosityGuidance[effectiveVerbosity].bullets}
3. VARY LAYOUTS - use ALL types, not just bullet-points
4. WRITE SPECIFIC IMAGE TERMS in English for each slide

ADVANCED IMAGE SEARCH - CRITICAL:
- suggestedImageQuery MUST be 5-8 words describing EXACTLY what the image should show
- Use CONCRETE terms, not abstract (e.g., "surgeon performing minimally invasive surgery" instead of "medicine")
- Examples for ${detectedIndustry}: "${imageQueryExamples}"
- AVOID generic terms like "professional", "business", "success" alone
- Include ACTIONS and SCENES: "team discussing strategy whiteboard", "doctor examining patient stethoscope"

LAYOUT TYPES:
- "title": ONLY first slide. Has NO bulletPoints.
- "key-point": One BIG main point. Requires keyTakeaway field. 1-2 supporting bullets.
- "bullet-points": Standard points with facts.
- "stats": Numbers/statistics. Bullets should be "XX% of Y" or "X million Z".
- "comparison": Compare two options. Bullets: "A: description", "B: description".
- "quote": Important quote. keyTakeaway = the quote. subtitle = who said it.
- "image-focus": Large image. Only 1-2 bullets for context.

LUCIDE ICONS:
Healthcare: Stethoscope, Heart, Activity, Scan, Pill, Brain, Eye, Ear, Syringe
Technology: Cpu, Code, Cloud, Database, Wifi, Monitor, Smartphone
Education: BookOpen, GraduationCap, Lightbulb, PenTool, Users
Business: TrendingUp, Target, BarChart3, PieChart, Briefcase, Building2

SPEAKER NOTES: ${verbosityGuidance[effectiveVerbosity].notes}`;

    const demoInstruction = demoMode 
      ? (language === 'sv' 
        ? `\n\nDEMO-LÄGE: Skapa EXAKT ${effectiveMaxSlides} slides.`
        : `\n\nDEMO MODE: Create EXACTLY ${effectiveMaxSlides} slides.`)
      : '';

    const tocInstruction = includeTableOfContents
      ? (language === 'sv' 
        ? '\nInkludera en "Innehållsförteckning" slide som slide 2.'
        : '\nInclude a "Table of Contents" slide as slide 2.')
      : '';

    const userPrompt = language === 'sv'
      ? `MODUL: "${effectiveModuleTitle}"
KURS: "${courseTitle}"
${demoInstruction}${tocInstruction}

MANUS ATT TRANSFORMERA:
${scriptContent}

SKAPA ${demoMode ? effectiveMaxSlides : '6-10'} PROFESSIONELLA SLIDES.

KRAV:
1. ${includeTitleSlide ? 'Slide 1: layout="title", title=modulnamn, subtitle=kort beskrivning' : 'Börja direkt med innehåll, hoppa över title slide'}
2. Slides 2-N: VARIERA mellan key-point, bullet-points, stats, comparison
3. VARJE SLIDE (utom title): ${verbosity === 'concise' ? '2-3' : verbosity === 'text-heavy' ? '5-7' : '3-5'} konkreta bulletPoints
4. keyTakeaway för key-point och quote slides
5. suggestedImageQuery: SPECIFIK SCEN (5-8 ord, t.ex. "surgeon operating modern hospital room" eller "team brainstorming creative office whiteboard")
6. iconSuggestion: Lucide-ikon passande för innehållet
7. suggestedBackgroundColor: Mörk HEX-färg (#1a365d, #0f172a, etc.)`
      : `MODULE: "${effectiveModuleTitle}"
COURSE: "${courseTitle}"
${demoInstruction}${tocInstruction}

SCRIPT TO TRANSFORM:
${scriptContent}

CREATE ${demoMode ? effectiveMaxSlides : '6-10'} PROFESSIONAL SLIDES.

REQUIREMENTS:
1. ${includeTitleSlide ? 'Slide 1: layout="title", title=module name, subtitle=short description' : 'Start directly with content, skip title slide'}
2. Slides 2-N: VARY between key-point, bullet-points, stats, comparison
3. EVERY SLIDE (except title): ${verbosity === 'concise' ? '2-3' : verbosity === 'text-heavy' ? '5-7' : '3-5'} concrete bulletPoints
4. keyTakeaway for key-point and quote slides
5. suggestedImageQuery: SPECIFIC SCENE (5-8 words, e.g., "surgeon operating modern hospital room" or "team brainstorming creative office whiteboard")
6. iconSuggestion: Lucide icon matching the content
7. suggestedBackgroundColor: Dark HEX color (#1a365d, #0f172a, etc.)`;

    console.log('Generating slides for module:', effectiveModuleTitle);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_slides',
              description: 'Create professional presentation slides with rich structured content',
              parameters: {
                type: 'object',
                properties: {
                  slides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        slideNumber: { type: 'number', description: 'Sequential slide number starting from 1' },
                        title: { type: 'string', description: 'Short headline (2-6 words, UPPERCASE for emphasis)' },
                        subtitle: { type: 'string', description: 'Supporting text or context' },
                        bulletPoints: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'REQUIRED: 3-5 concrete bullet points (except for title slides)'
                        },
                        keyTakeaway: { type: 'string', description: 'Main message (REQUIRED for key-point and quote layouts)' },
                        content: { type: 'string', description: 'Leave empty - use bulletPoints instead' },
                        speakerNotes: { type: 'string', description: 'Detailed notes for the presenter (2-3 sentences)' },
                        layout: { 
                          type: 'string',
                          enum: ['title', 'key-point', 'bullet-points', 'stats', 'comparison', 'quote', 'image-focus'],
                          description: 'Visual layout - VARY these across slides'
                        },
                        suggestedImageQuery: { type: 'string', description: 'SPECIFIC scene description in English (5-8 words describing exact visual with action and context, e.g., "surgeon performing laparoscopic surgery operating room" or "diverse team celebrating success modern office")' },
                        iconSuggestion: { type: 'string', description: 'Lucide icon name (Brain, Heart, Target, Scan, Activity, TrendingUp, Users, etc.)' },
                        visualType: { 
                          type: 'string', 
                          enum: ['photo', 'illustration', 'vector', 'diagram', 'icon-grid', 'abstract'],
                          description: 'Type of visual: photo (real photography), illustration (drawn/painted style), vector (flat design icons), diagram (charts/flows), icon-grid (multiple icons), abstract (patterns/shapes)'
                        },
                        imagePosition: {
                          type: 'string',
                          enum: ['background', 'left', 'right', 'top', 'inline', 'corner'],
                          description: 'Where to place image: background (full slide), left/right (side column), top (above content), inline (within text), corner (small decorative)'
                        },
                        suggestedBackgroundColor: { type: 'string', description: 'Dark HEX color (#1a365d, #0f172a, #134e4a)' }
                      },
                      required: ['slideNumber', 'title', 'bulletPoints', 'speakerNotes', 'layout', 'suggestedImageQuery', 'visualType', 'imagePosition']
                    }
                  }
                },
                required: ['slides']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_slides' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'create_slides') {
      throw new Error('Unexpected AI response format');
    }

    const slidesData = JSON.parse(toolCall.function.arguments);
    let slides: SlideContent[] = slidesData.slides;

    // Post-process with intelligent query enhancement
    slides = slides.map((slide, idx) => {
      const cleanedTitle = cleanMarkdown(slide.title);
      const cleanedContent = cleanMarkdown(slide.content || '');
      const cleanedSubtitle = slide.subtitle ? cleanMarkdown(slide.subtitle) : undefined;
      const cleanedKeyTakeaway = slide.keyTakeaway ? cleanMarkdown(slide.keyTakeaway) : undefined;
      
      let cleanedBulletPoints = (slide.bulletPoints || []).map(bp => cleanMarkdown(bp)).filter(Boolean);
      
      if (slide.layout !== 'title' && cleanedBulletPoints.length === 0) {
        if (cleanedContent) {
          cleanedBulletPoints = cleanedContent.split('\n').filter(line => line.trim()).slice(0, 5);
        }
        if (cleanedBulletPoints.length === 0 && cleanedKeyTakeaway) {
          cleanedBulletPoints = [cleanedKeyTakeaway];
        }
        if (cleanedBulletPoints.length === 0) {
          cleanedBulletPoints = [`Viktiga aspekter av ${cleanedTitle.toLowerCase()}`];
        }
      }
      
      let bgColor = slide.suggestedBackgroundColor;
      if (!bgColor || bgColor === '#ffffff' || bgColor === '#FFFFFF') {
        const darkColors = ['#1a365d', '#0f172a', '#134e4a', '#3f3f46', '#1e1b4b', '#292524'];
        bgColor = darkColors[idx % darkColors.length];
      }
      
      const visualType = (slide.visualType || determineVisualType(slide.layout, `${cleanedTitle} ${cleanedBulletPoints.join(' ')}`, idx)) as SlideContent['visualType'];
      const imagePosition = (slide.imagePosition || determineImagePosition(slide.layout, visualType || 'photo', idx)) as SlideContent['imagePosition'];
      
      // ENHANCED: Use intelligent query builder if AI query is too generic
      let imageQuery = slide.suggestedImageQuery;
      const isGenericQuery = !imageQuery || 
        imageQuery.length < 20 || 
        /^(professional|business|modern|success|teamwork)\s/i.test(imageQuery) ||
        (imageQuery.split(' ').length < 4);
      
      if (isGenericQuery) {
        imageQuery = buildIntelligentImageQuery(
          {
            title: cleanedTitle,
            bulletPoints: cleanedBulletPoints,
            keyTakeaway: cleanedKeyTakeaway,
            layout: slide.layout
          },
          detectedIndustry,
          visualType || 'photo',
          idx
        );
        console.log(`Enhanced query for slide ${idx + 1}: "${slide.suggestedImageQuery}" → "${imageQuery}"`);
      }
      
      return {
        ...slide,
        slideNumber: idx + 1,
        title: cleanedTitle,
        subtitle: cleanedSubtitle,
        content: '',
        bulletPoints: cleanedBulletPoints,
        keyTakeaway: cleanedKeyTakeaway,
        speakerNotes: cleanMarkdown(slide.speakerNotes || ''),
        suggestedBackgroundColor: bgColor,
        suggestedImageQuery: imageQuery,
        visualType,
        imagePosition,
      };
    });

    if (demoMode && slides.length > effectiveMaxSlides) {
      console.log(`Demo mode: limiting slides from ${slides.length} to ${effectiveMaxSlides}`);
      slides = slides.slice(0, effectiveMaxSlides);
    }

    console.log(`Generated ${slides.length} slides for module "${effectiveModuleTitle}"`);
    
    slides.forEach((s, i) => {
      console.log(`Slide ${i + 1}: layout=${s.layout}, visual=${s.visualType}, position=${s.imagePosition}, bullets=${s.bulletPoints?.length || 0}, query="${s.suggestedImageQuery?.substring(0, 50)}..."`);
    });

    await setCachedResponse(supabase, cacheKey, 'generate-slides-v4', cacheKey, { slides }, 12);

    if (autoFetchImages) {
      console.log('Auto-fetching stock photos with intelligent queries...');
      
      const slidesWithImages = await Promise.all(
        slides.map(async (slide) => {
          if (slide.suggestedImageQuery) {
            try {
              const photo = await searchStockPhotos(slide.suggestedImageQuery, slide.visualType);
              if (photo) {
                console.log(`Found image for slide ${slide.slideNumber}: ${photo.source} (query: "${slide.suggestedImageQuery?.substring(0, 30)}...")`);
                return {
                  ...slide,
                  imageUrl: photo.url,
                  imageSource: photo.source,
                  imageAttribution: photo.attribution,
                };
              }
            } catch (e) {
              console.error(`Error fetching image for slide ${slide.slideNumber}:`, e);
            }
          }
          return slide;
        })
      );
      
      slides = slidesWithImages;
      
      const slidesWithImages_count = slides.filter(s => s.imageUrl).length;
      console.log(`Fetched images for ${slidesWithImages_count}/${slides.length} slides`);
    }

    return new Response(JSON.stringify({ slides, fromCache: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating slides:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate slides' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

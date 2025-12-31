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
  visualType?: 'photo' | 'illustration' | 'diagram' | 'icon-grid';
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

// Search stock photos from Unsplash and Pexels
async function searchStockPhotos(query: string): Promise<StockPhoto | null> {
  const photos: StockPhoto[] = [];
  
  // Search Unsplash
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (unsplashKey) {
    try {
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
      const unsplashResponse = await fetch(unsplashUrl, {
        headers: { 'Authorization': `Client-ID ${unsplashKey}` }
      });
      
      if (unsplashResponse.ok) {
        const unsplashData = await unsplashResponse.json();
        const unsplashPhotos = (unsplashData.results || []).map((photo: any) => ({
          id: photo.id,
          url: photo.urls?.regular || photo.urls?.small,
          thumbnailUrl: photo.urls?.thumb,
          width: photo.width,
          height: photo.height,
          photographer: photo.user?.name || 'Unknown',
          photographerUrl: photo.user?.links?.html || '',
          source: 'unsplash',
          attribution: `Photo by ${photo.user?.name || 'Unknown'} on Unsplash`,
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
      const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
      const pexelsResponse = await fetch(pexelsUrl, {
        headers: { 'Authorization': pexelsKey }
      });
      
      if (pexelsResponse.ok) {
        const pexelsData = await pexelsResponse.json();
        const pexelsPhotos = (pexelsData.photos || []).map((photo: any) => ({
          id: String(photo.id),
          url: photo.src?.large || photo.src?.medium,
          thumbnailUrl: photo.src?.tiny,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer || 'Unknown',
          photographerUrl: photo.photographer_url || '',
          source: 'pexels',
          attribution: `Photo by ${photo.photographer || 'Unknown'} on Pexels`,
        }));
        photos.push(...pexelsPhotos);
      }
    } catch (e) {
      console.error('Pexels search error:', e);
    }
  }
  
  if (photos.length > 0) {
    const landscapePhotos = photos.filter(p => p.width > p.height);
    return landscapePhotos.length > 0 ? landscapePhotos[0] : photos[0];
  }
  
  return null;
}

// Clean any markdown from content - ROBUST version
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Remove bold formatting: **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic formatting: *text* or _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove any remaining asterisks
    .replace(/\*/g, '')
    // Remove headers: # ## ### etc
    .replace(/^#{1,6}\s*/gm, '')
    // Remove bullet prefixes (we add our own later)
    .replace(/^[\s]*[-•]\s*/gm, '')
    // Remove numbered list prefixes
    .replace(/^[\s]*\d+\.\s*/gm, '')
    // Remove code backticks
    .replace(/`([^`]+)`/g, '$1')
    .replace(/`/g, '')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Clean up any double spaces
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
    healthcare: 'Use medical professional photos, clinical settings, anatomical diagrams. Keywords: doctor, hospital, medical equipment, patient care, surgery, diagnosis.',
    finance: 'Use business professional photos, charts, graphs, office settings. Keywords: business meeting, financial charts, corporate office, investment.',
    technology: 'Use modern tech imagery, abstract digital visuals, clean interfaces. Keywords: technology, digital, innovation, software, data visualization.',
    education: 'Use classroom, learning, books, students. Keywords: education, learning, classroom, students, teaching, knowledge.',
    marketing: 'Use dynamic, engaging visuals with people. Keywords: marketing, branding, team collaboration, creative.',
    environment: 'Use nature photography, sustainability themes. Keywords: nature, environment, sustainable, green energy.',
    legal: 'Use professional settings, documents, courtrooms. Keywords: legal, law, contract, professional.',
    general: 'Use professional business photography. Keywords: professional, business, teamwork, success.',
  };
  return guidance[industry] || guidance.general;
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
      // New Presenton-inspired options
      tone = 'professional',
      verbosity = 'standard',
      includeTableOfContents = false,
      includeTitleSlide = true,
      audienceType = 'general',
    } = await req.json();

    // Type-safe accessors for tone and verbosity
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
    const cacheKey = await generateCacheKey('generate-slides-v3', cacheParams);

    if (!skipCache) {
      const cachedResponse = await getCachedResponse(supabase, cacheKey);
      if (cachedResponse) {
        let slides = cachedResponse.slides as SlideContent[];
        
        if (autoFetchImages) {
          console.log('Cache HIT - fetching fresh images for cached slides...');
          const slidesWithImages = await Promise.all(
            slides.map(async (slide) => {
              if (slide.suggestedImageQuery && !slide.imageUrl) {
                try {
                  const photo = await searchStockPhotos(slide.suggestedImageQuery);
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
    
    // Detect industry from content for context-aware generation
    const detectedIndustry = detectIndustry(scriptContent);
    const industryImageGuidance = getIndustryImageGuidance(detectedIndustry);
    
    console.log('Cache MISS - generating slides. Demo mode:', demoMode, 'Max slides:', effectiveMaxSlides);
    console.log('Generation params: tone=', tone, ', verbosity=', verbosity, ', industry=', detectedIndustry, ', audience=', audienceType);

    // Build tone guidance
    const toneGuidance: Record<Tone, string> = {
      default: 'Use neutral, balanced language.',
      casual: 'Use conversational, approachable language. Be friendly and accessible.',
      professional: 'Use formal, authoritative language. Be precise and credible.',
      educational: 'Use clear, instructive language. Focus on teaching and explaining concepts step-by-step.',
      sales_pitch: 'Use persuasive, compelling language. Focus on benefits and call-to-action.',
    };

    // Build verbosity guidance
    const verbosityGuidance: Record<Verbosity, { bullets: string; notes: string }> = {
      concise: { bullets: '2-3 very short bullets per slide. Maximum 8 words per bullet.', notes: '1 sentence speaker notes.' },
      standard: { bullets: '3-5 bullets per slide. 5-12 words per bullet.', notes: '2-3 sentences speaker notes with key talking points.' },
      'text-heavy': { bullets: '5-7 detailed bullets per slide. Full sentences allowed.', notes: 'Detailed speaker notes with full explanations.' },
    };

    // Build audience guidance
    const audienceGuidance: Record<string, string> = {
      executives: 'Focus on high-level insights, strategic value, and ROI. Skip technical details.',
      technical: 'Include detailed specifications, diagrams, and technical terminology.',
      students: 'Use engaging, accessible language. Include examples and clear explanations.',
      general: 'Balance detail with accessibility. Avoid jargon.',
    };

    // ENHANCED SYSTEM PROMPT with Presenton-inspired structure
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

LAYOUT-TYPER OCH NÄR DE ANVÄNDS:
- "title": ENDAST första sliden${includeTitleSlide ? '' : ' (HOPPA ÖVER OM EJ BEHÖVS)'}. Har INGEN bulletPoints.
- "key-point": En STOR huvudpoäng. Kräver keyTakeaway-fält. 1-2 stödjande bullets.
- "bullet-points": Standard punkter med fakta.
- "stats": Siffror/statistik. Bullets ska vara "XX% av Y" eller "X miljoner Z".
- "comparison": Jämför två alternativ. Bullets: "A: beskrivning", "B: beskrivning".
- "quote": Viktigt citat. keyTakeaway = citatet. subtitle = vem som sa det.
- "image-focus": Stor bild. Endast 1-2 bullets för kontext.

LUCIDE IKONER - använd relevanta för varje slide:
Healthcare: Stethoscope, Heart, Activity, Scan, Pill, Brain, Eye, Ear, Syringe
Technology: Cpu, Code, Cloud, Database, Wifi, Monitor, Smartphone
Education: BookOpen, GraduationCap, Lightbulb, PenTool, Users
Business: TrendingUp, Target, BarChart3, PieChart, Briefcase, Building2
General: CheckCircle, Star, Award, Zap, Shield, Clock, Calendar

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

LAYOUT TYPES AND WHEN TO USE:
- "title": ONLY first slide${includeTitleSlide ? '' : ' (SKIP IF NOT NEEDED)'}. Has NO bulletPoints.
- "key-point": One BIG main point. Requires keyTakeaway field. 1-2 supporting bullets.
- "bullet-points": Standard points with facts.
- "stats": Numbers/statistics. Bullets should be "XX% of Y" or "X million Z".
- "comparison": Compare two options. Bullets: "A: description", "B: description".
- "quote": Important quote. keyTakeaway = the quote. subtitle = who said it.
- "image-focus": Large image. Only 1-2 bullets for context.

LUCIDE ICONS - use relevant ones for each slide:
Healthcare: Stethoscope, Heart, Activity, Scan, Pill, Brain, Eye, Ear, Syringe
Technology: Cpu, Code, Cloud, Database, Wifi, Monitor, Smartphone
Education: BookOpen, GraduationCap, Lightbulb, PenTool, Users
Business: TrendingUp, Target, BarChart3, PieChart, Briefcase, Building2
General: CheckCircle, Star, Award, Zap, Shield, Clock, Calendar

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
5. suggestedImageQuery: SPECIFIK engelsk sökterm (3-5 ord) - ${industryImageGuidance}
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
5. suggestedImageQuery: SPECIFIC English search term (3-5 words) - ${industryImageGuidance}
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
                        suggestedImageQuery: { type: 'string', description: 'SPECIFIC English image search (e.g., "surgeon performing endoscopy procedure")' },
                        iconSuggestion: { type: 'string', description: 'Lucide icon name (Brain, Heart, Target, Scan, Activity, etc.)' },
                        visualType: { 
                          type: 'string', 
                          enum: ['photo', 'illustration', 'diagram', 'icon-grid'],
                          description: 'Type of visual'
                        },
                        suggestedBackgroundColor: { type: 'string', description: 'Dark HEX color (#1a365d, #0f172a, #134e4a)' }
                      },
                      required: ['slideNumber', 'title', 'bulletPoints', 'speakerNotes', 'layout', 'suggestedImageQuery']
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

    // Post-process: ensure every non-title slide has bullets
    slides = slides.map((slide, idx) => {
      const cleanedTitle = cleanMarkdown(slide.title);
      const cleanedContent = cleanMarkdown(slide.content || '');
      const cleanedSubtitle = slide.subtitle ? cleanMarkdown(slide.subtitle) : undefined;
      const cleanedKeyTakeaway = slide.keyTakeaway ? cleanMarkdown(slide.keyTakeaway) : undefined;
      
      let cleanedBulletPoints = (slide.bulletPoints || []).map(bp => cleanMarkdown(bp)).filter(Boolean);
      
      // If non-title slide has no bullets, try to extract from content or generate fallback
      if (slide.layout !== 'title' && cleanedBulletPoints.length === 0) {
        if (cleanedContent) {
          cleanedBulletPoints = cleanedContent.split('\n').filter(line => line.trim()).slice(0, 5);
        }
        // If still empty, create fallback from keyTakeaway or title
        if (cleanedBulletPoints.length === 0 && cleanedKeyTakeaway) {
          cleanedBulletPoints = [cleanedKeyTakeaway];
        }
        if (cleanedBulletPoints.length === 0) {
          cleanedBulletPoints = [`Viktiga aspekter av ${cleanedTitle.toLowerCase()}`];
        }
      }
      
      // Ensure dark background colors
      let bgColor = slide.suggestedBackgroundColor;
      if (!bgColor || bgColor === '#ffffff' || bgColor === '#FFFFFF') {
        const darkColors = ['#1a365d', '#0f172a', '#134e4a', '#3f3f46', '#1e1b4b', '#292524'];
        bgColor = darkColors[idx % darkColors.length];
      }
      
      return {
        ...slide,
        slideNumber: idx + 1,
        title: cleanedTitle,
        subtitle: cleanedSubtitle,
        content: '', // Clear content - use bulletPoints instead
        bulletPoints: cleanedBulletPoints,
        keyTakeaway: cleanedKeyTakeaway,
        speakerNotes: cleanMarkdown(slide.speakerNotes || ''),
        suggestedBackgroundColor: bgColor,
      };
    });

    // Enforce demo mode slide limit
    if (demoMode && slides.length > effectiveMaxSlides) {
      console.log(`Demo mode: limiting slides from ${slides.length} to ${effectiveMaxSlides}`);
      slides = slides.slice(0, effectiveMaxSlides);
    }

    console.log(`Generated ${slides.length} slides for module "${effectiveModuleTitle}"`);
    
    // Log slide structure for debugging
    slides.forEach((s, i) => {
      console.log(`Slide ${i + 1}: layout=${s.layout}, bullets=${s.bulletPoints?.length || 0}, keyTakeaway=${!!s.keyTakeaway}`);
    });

    // Cache the slides
    await setCachedResponse(supabase, cacheKey, 'generate-slides-v3', cacheKey, { slides }, 12);

    // Auto-fetch images
    if (autoFetchImages) {
      console.log('Auto-fetching stock photos for slides...');
      
      const slidesWithImages = await Promise.all(
        slides.map(async (slide) => {
          if (slide.suggestedImageQuery) {
            try {
              const photo = await searchStockPhotos(slide.suggestedImageQuery);
              if (photo) {
                console.log(`Found image for slide ${slide.slideNumber}: ${photo.source}`);
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

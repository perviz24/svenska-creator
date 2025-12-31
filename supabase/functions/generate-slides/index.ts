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
  
  // Return the best match (first result, prioritizing landscape images)
  if (photos.length > 0) {
    const landscapePhotos = photos.filter(p => p.width > p.height);
    return landscapePhotos.length > 0 ? landscapePhotos[0] : photos[0];
  }
  
  return null;
}

// Clean any markdown from content
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Remove bold/italic markers
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Remove heading markers
    .replace(/^#{1,6}\s*/gm, '')
    // Remove list markers but keep text
    .replace(/^[\s]*[-•]\s*/gm, '')
    // Remove numbered list markers
    .replace(/^[\s]*\d+\.\s*/gm, '')
    // Remove underscores for emphasis
    .replace(/__/g, '')
    .replace(/_([^_]+)_/g, '$1')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove backticks
    .replace(/`/g, '')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, moduleTitle, courseTitle, language = 'sv', autoFetchImages = true, maxSlides = 10, demoMode = false, skipCache = false } = await req.json();

    // Handle script content - it can be the script object or a string
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

    // Initialize Supabase client for caching
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Create cache key (exclude autoFetchImages as that's a post-processing step)
    const cacheParams = { scriptContent: scriptContent.substring(0, 1000), moduleTitle: effectiveModuleTitle, courseTitle, language, maxSlides, demoMode };
    const cacheKey = await generateCacheKey('generate-slides-v2', cacheParams);

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cachedResponse = await getCachedResponse(supabase, cacheKey);
      if (cachedResponse) {
        let slides = cachedResponse.slides as SlideContent[];
        
        // Still fetch images if needed (images may change)
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

    // In demo mode, limit slides to 3 max
    const effectiveMaxSlides = demoMode ? Math.min(maxSlides, 3) : maxSlides;
    console.log('Cache MISS - generating slides. Demo mode:', demoMode, 'Max slides:', effectiveMaxSlides);

    const systemPrompt = language === 'sv' 
      ? `Du är en professionell presentationsdesigner med expertis inom visuell kommunikation och pedagogik.
         
DITT MÅL: Skapa VISUELLT TILLTALANDE och PROFESSIONELLA presentationsslides som ser ut som om de skapats av en grafisk designer.

KRITISKA REGLER FÖR INNEHÅLL:
1. ABSOLUT INGEN MARKDOWN - skriv enbart PLAIN TEXT
   - Använd ALDRIG asterisker (*), hashtags (#), understreck (_) eller backticks
   - Skriv rubriker och nyckelord med STORA BOKSTÄVER för betoning
   - Separera punkter med radbrytningar
   
2. KONCIST OCH VISUELLT - varje slide ska vara lättläst på 3 sekunder
   - Max 3-5 korta punkter per slide
   - Max 6-8 ord per punkt
   - Använd handlingskraftiga verb
   
3. STRUKTURERAT INNEHÅLL:
   - Varje slide fokuserar på EN huvudidé
   - Använd "bulletPoints" array för punkter (inte i content-strängen)
   - Lägg nyckeltakeaway i "keyTakeaway" fältet

4. VARIERA LAYOUT för visuell dynamik:
   - 'title': Endast för öppningsslide
   - 'key-point': En stor huvudpoäng med stödtext  
   - 'bullet-points': 3-5 tydliga punkter
   - 'stats': Siffror/statistik med stor text
   - 'comparison': Jämförelse av två saker
   - 'quote': Viktigt citat eller påstående
   - 'image-focus': Bildcentrerad slide
   
5. BILDFÖRSLAG - specifika och sökbara på engelska:
   - BRA: "doctor examining patient clinic" 
   - BRA: "microscope laboratory scientist"
   - DÅLIGT: "healthcare concept" eller "medical abstract"
   
6. IKONFÖRSLAG - enkla, igenkännbara ikoner:
   - Föreslå Lucide-ikonnamn som: "Stethoscope", "Heart", "Brain", "Activity"
   - Matcha ikon med slide-innehållet`
      : `You are a professional presentation designer with expertise in visual communication and pedagogy.
         
YOUR GOAL: Create VISUALLY APPEALING and PROFESSIONAL presentation slides that look like they were created by a graphic designer.

CRITICAL RULES FOR CONTENT:
1. ABSOLUTELY NO MARKDOWN - write PLAIN TEXT only
   - NEVER use asterisks (*), hashtags (#), underscores (_) or backticks
   - Write headings and keywords in CAPITALS for emphasis
   - Separate points with line breaks
   
2. CONCISE AND VISUAL - each slide should be readable in 3 seconds
   - Max 3-5 short points per slide
   - Max 6-8 words per point
   - Use action verbs
   
3. STRUCTURED CONTENT:
   - Each slide focuses on ONE main idea
   - Use "bulletPoints" array for points (not in content string)
   - Put key takeaway in "keyTakeaway" field

4. VARY LAYOUT for visual dynamics:
   - 'title': Only for opening slide
   - 'key-point': One big main point with supporting text  
   - 'bullet-points': 3-5 clear points
   - 'stats': Numbers/statistics with large text
   - 'comparison': Comparison of two things
   - 'quote': Important quote or statement
   - 'image-focus': Image-centered slide
   
5. IMAGE SUGGESTIONS - specific and searchable in English:
   - GOOD: "doctor examining patient clinic" 
   - GOOD: "microscope laboratory scientist"
   - BAD: "healthcare concept" or "medical abstract"
   
6. ICON SUGGESTIONS - simple, recognizable icons:
   - Suggest Lucide icon names like: "Stethoscope", "Heart", "Brain", "Activity"
   - Match icon with slide content`;

    const demoInstruction = demoMode 
      ? (language === 'sv' 
        ? `DEMO-LÄGE: Skapa ENDAST ${effectiveMaxSlides} slides. Håll allt kort och koncist.`
        : `DEMO MODE: Create ONLY ${effectiveMaxSlides} slides. Keep everything short and concise.`)
      : '';

    const userPrompt = language === 'sv'
      ? `Analysera detta manus för modulen "${effectiveModuleTitle}" i kursen "${courseTitle}" och skapa PROFESSIONELLA presentationsslides.
${demoInstruction}

MANUS:
${scriptContent}

SKAPA SLIDES MED FÖLJANDE STRUKTUR:

Varje slide ska ha EXAKT dessa fält:
- slideNumber: Nummer (börja med 1)
- title: Kort rubrik, 2-6 ord, PLAIN TEXT, inga specialtecken
- subtitle: Valfri underrubrik för kontext
- bulletPoints: Array med 2-5 korta punkter (varje punkt max 10 ord)
- keyTakeaway: Huvudbudskapet i EN mening (om relevant)
- content: Tom sträng eller kort sammanfattning (PLAIN TEXT)
- speakerNotes: Detaljerade anteckningar för presentatören
- layout: Välj bland - 'title', 'key-point', 'bullet-points', 'stats', 'comparison', 'quote', 'image-focus'
- suggestedImageQuery: SPECIFIKT sökord på ENGELSKA (3-5 ord) för stockfoto
- iconSuggestion: Lucide-ikonnamn som passar innehållet (t.ex. "Brain", "Heart", "Target")
- visualType: 'photo', 'illustration', 'diagram', eller 'icon-grid'
- suggestedBackgroundColor: HEX-färg som passar temat

EXEMPEL PÅ BRA SLIDE:
{
  "slideNumber": 2,
  "title": "Näsans Struktur",
  "subtitle": "De viktigaste anatomiska delarna",
  "bulletPoints": [
    "Septum delar näshålan i två delar",
    "Näsmusslorna konditionerar inandningsluften",
    "Bihålorna minskar kraniets vikt"
  ],
  "keyTakeaway": "Näsans anatomi är optimerad för luftflöde och filtrering",
  "content": "",
  "speakerNotes": "Förklara hur varje del bidrar till näsans funktion...",
  "layout": "bullet-points",
  "suggestedImageQuery": "human nose anatomy diagram medical",
  "iconSuggestion": "Scan",
  "visualType": "diagram",
  "suggestedBackgroundColor": "#1a365d"
}

EXEMPEL PÅ DÅLIG SLIDE (UNDVIK DETTA):
{
  "title": "*ANATOMI (BYGGSTENARNA):**",  <- FEL: markdown-tecken
  "content": "**Septum & Näshåla:** Grunden för luftflöde...",  <- FEL: markdown i content
  ...
}

Skapa ${demoMode ? effectiveMaxSlides : '6-12'} slides${demoMode ? '' : ' beroende på innehållets längd'}. 
Första sliden ska vara en titelslide med layout 'title'.
VARIERA layouts - använd inte samma layout på varje slide!`
      : `Analyze this script for the module "${effectiveModuleTitle}" in the course "${courseTitle}" and create PROFESSIONAL presentation slides.
${demoInstruction}

SCRIPT:
${scriptContent}

CREATE SLIDES WITH THE FOLLOWING STRUCTURE:

Each slide must have EXACTLY these fields:
- slideNumber: Number (start with 1)
- title: Short headline, 2-6 words, PLAIN TEXT, no special characters
- subtitle: Optional subtitle for context
- bulletPoints: Array with 2-5 short points (each point max 10 words)
- keyTakeaway: Main message in ONE sentence (if relevant)
- content: Empty string or brief summary (PLAIN TEXT only)
- speakerNotes: Detailed notes for the presenter
- layout: Choose from - 'title', 'key-point', 'bullet-points', 'stats', 'comparison', 'quote', 'image-focus'
- suggestedImageQuery: SPECIFIC search term in ENGLISH (3-5 words) for stock photo
- iconSuggestion: Lucide icon name matching the content (e.g., "Brain", "Heart", "Target")
- visualType: 'photo', 'illustration', 'diagram', or 'icon-grid'
- suggestedBackgroundColor: HEX color matching the theme

Create ${demoMode ? effectiveMaxSlides : '6-12'} slides${demoMode ? '' : ' depending on content length'}. 
First slide should be a title slide with layout 'title'.
VARY layouts - don't use the same layout on every slide!`;

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
              description: 'Create professional presentation slides from script content',
              parameters: {
                type: 'object',
                properties: {
                  slides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        slideNumber: { type: 'number', description: 'Sequential slide number starting from 1' },
                        title: { type: 'string', description: 'Short, engaging headline (2-6 words, PLAIN TEXT only)' },
                        subtitle: { type: 'string', description: 'Optional subtitle for additional context' },
                        bulletPoints: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Array of 2-5 short bullet points (each max 10 words, PLAIN TEXT)'
                        },
                        keyTakeaway: { type: 'string', description: 'Main takeaway message in one sentence' },
                        content: { type: 'string', description: 'Brief summary or empty string (PLAIN TEXT only)' },
                        speakerNotes: { type: 'string', description: 'Detailed notes for the presenter' },
                        layout: { 
                          type: 'string',
                          enum: ['title', 'title-content', 'two-column', 'image-focus', 'quote', 'bullet-points', 'key-point', 'comparison', 'timeline', 'stats'],
                          description: 'Visual layout type for the slide'
                        },
                        suggestedImageQuery: { type: 'string', description: 'Specific image search terms in English (3-5 words)' },
                        iconSuggestion: { type: 'string', description: 'Lucide icon name (e.g., Heart, Brain, Target)' },
                        visualType: { 
                          type: 'string', 
                          enum: ['photo', 'illustration', 'diagram', 'icon-grid'],
                          description: 'Type of visual to use'
                        },
                        suggestedBackgroundColor: { type: 'string', description: 'HEX color code for background' }
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
    
    // Extract slides from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'create_slides') {
      throw new Error('Unexpected AI response format');
    }

    const slidesData = JSON.parse(toolCall.function.arguments);
    let slides: SlideContent[] = slidesData.slides;

    // Post-process slides to clean any remaining markdown and structure content
    slides = slides.map(slide => {
      // Clean all text fields
      const cleanedTitle = cleanMarkdown(slide.title);
      const cleanedContent = cleanMarkdown(slide.content || '');
      const cleanedSubtitle = slide.subtitle ? cleanMarkdown(slide.subtitle) : undefined;
      const cleanedKeyTakeaway = slide.keyTakeaway ? cleanMarkdown(slide.keyTakeaway) : undefined;
      
      // Clean bullet points
      const cleanedBulletPoints = (slide.bulletPoints || []).map(bp => cleanMarkdown(bp));
      
      // If bulletPoints is empty but content has text, try to extract bullet points
      let finalBulletPoints = cleanedBulletPoints;
      if (finalBulletPoints.length === 0 && cleanedContent) {
        const lines = cleanedContent.split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          finalBulletPoints = lines.slice(0, 5).map(line => cleanMarkdown(line));
        }
      }
      
      return {
        ...slide,
        title: cleanedTitle,
        subtitle: cleanedSubtitle,
        content: cleanedContent,
        bulletPoints: finalBulletPoints,
        keyTakeaway: cleanedKeyTakeaway,
        speakerNotes: cleanMarkdown(slide.speakerNotes || ''),
      };
    });

    // Enforce demo mode slide limit
    if (demoMode && slides.length > effectiveMaxSlides) {
      console.log(`Demo mode: limiting slides from ${slides.length} to ${effectiveMaxSlides}`);
      slides = slides.slice(0, effectiveMaxSlides);
    }

    console.log(`Generated ${slides.length} slides for module "${effectiveModuleTitle}"`);

    // Cache the slides (without images - 12 hour TTL)
    await setCachedResponse(supabase, cacheKey, 'generate-slides-v2', cacheKey, { slides }, 12);

    // Auto-fetch images for each slide if enabled
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

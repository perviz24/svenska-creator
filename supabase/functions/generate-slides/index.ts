import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideContent {
  slideNumber: number;
  title: string;
  content: string;
  speakerNotes: string;
  layout: 'title' | 'title-content' | 'two-column' | 'image-focus' | 'quote' | 'bullet-points';
  suggestedImageQuery: string;
  suggestedBackgroundColor?: string;
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
    // Prefer images with good aspect ratio for slides (landscape)
    const landscapePhotos = photos.filter(p => p.width > p.height);
    return landscapePhotos.length > 0 ? landscapePhotos[0] : photos[0];
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, moduleTitle, courseTitle, language = 'sv', autoFetchImages = true } = await req.json();

    if (!script) {
      return new Response(
        JSON.stringify({ error: 'Script content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = language === 'sv' 
      ? `Du är en expert på att skapa professionella presentationsbilder från kursmanus. 
         Skapa visuellt tilltalande och pedagogiskt effektiva slides.
         Varje slide ska ha en tydlig struktur och vara lätt att följa.
         
         KRITISKT FÖR BILDFÖRSLAG:
         - Föreslå SPECIFIKA och KONKRETA bildförslag på engelska för stockfotosökning
         - Undvik abstrakta eller vaga termer som "concept", "abstract", "metaphor"
         - Använd beskrivande fraser som "professional business meeting in modern office"
         - För tekniska ämnen, föreslå bilder på verkliga föremål eller situationer
         - Bildförslaget ska matcha slide-innehållet EXAKT, inte vara en tolkning
         - Prioritera bilder med människor, arbetsplatser, konkreta objekt över abstrakta illustrationer
         - Använd max 4-5 ord för bildförslag för bättre sökresultat`
      : `You are an expert at creating professional presentation slides from course scripts.
         Create visually appealing and pedagogically effective slides.
         Each slide should have a clear structure and be easy to follow.
         
         CRITICAL FOR IMAGE SUGGESTIONS:
         - Suggest SPECIFIC and CONCRETE image queries in English for stock photo search
         - Avoid abstract or vague terms like "concept", "abstract", "metaphor"
         - Use descriptive phrases like "professional business meeting in modern office"
         - For technical topics, suggest images of real objects or situations
         - Image suggestion must match slide content EXACTLY, not be an interpretation
         - Prioritize images with people, workplaces, concrete objects over abstract illustrations
         - Use max 4-5 words for image suggestions for better search results`;

    const userPrompt = language === 'sv'
      ? `Analysera detta manus för modulen "${moduleTitle}" i kursen "${courseTitle}" och skapa presentationsslides.

MANUS:
${script}

Skapa en JSON-array med slides. Varje slide ska ha:
- slideNumber: Löpnummer (börja med 1)
- title: Kort, engagerande rubrik (max 8 ord)
- content: Huvudinnehåll (markdown-format, max 3-4 punkter eller ett kort stycke)
- speakerNotes: Detaljerade anteckningar för presentatören
- layout: En av 'title', 'title-content', 'two-column', 'image-focus', 'quote', 'bullet-points'
- suggestedImageQuery: KONKRET sökord på ENGELSKA för stockfoto (max 4-5 ord). Exempel:
  * BRA: "team meeting whiteboard office"
  * BRA: "laptop analytics dashboard desk"
  * DÅLIGT: "success concept" eller "growth metaphor"
- suggestedBackgroundColor: Valfri HEX-färgkod för bakgrund

Skapa 5-10 slides beroende på innehållets längd. Första sliden ska vara en titelslide.
VIKTIGT: suggestedImageQuery MÅSTE vara specifik och sökbar - inga abstrakta koncept!`
      : `Analyze this script for the module "${moduleTitle}" in the course "${courseTitle}" and create presentation slides.

SCRIPT:
${script}

Create a JSON array of slides. Each slide should have:
- slideNumber: Sequential number (start with 1)
- title: Short, engaging headline (max 8 words)
- content: Main content (markdown format, max 3-4 bullet points or a short paragraph)
- speakerNotes: Detailed notes for the presenter
- layout: One of 'title', 'title-content', 'two-column', 'image-focus', 'quote', 'bullet-points'
- suggestedImageQuery: CONCRETE search terms in ENGLISH for stock photo (max 4-5 words). Examples:
  * GOOD: "team meeting whiteboard office"
  * GOOD: "laptop analytics dashboard desk"
  * BAD: "success concept" or "growth metaphor"
- suggestedBackgroundColor: Optional HEX color code for background

Create 5-10 slides depending on content length. First slide should be a title slide.
IMPORTANT: suggestedImageQuery MUST be specific and searchable - no abstract concepts!`;

    console.log('Generating slides for module:', moduleTitle);

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
              description: 'Create presentation slides from script content',
              parameters: {
                type: 'object',
                properties: {
                  slides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        slideNumber: { type: 'number' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        speakerNotes: { type: 'string' },
                        layout: { 
                          type: 'string',
                          enum: ['title', 'title-content', 'two-column', 'image-focus', 'quote', 'bullet-points']
                        },
                        suggestedImageQuery: { type: 'string' },
                        suggestedBackgroundColor: { type: 'string' }
                      },
                      required: ['slideNumber', 'title', 'content', 'speakerNotes', 'layout', 'suggestedImageQuery']
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

    console.log(`Generated ${slides.length} slides for module "${moduleTitle}"`);

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
      console.log(`Successfully fetched images for ${slidesWithImages_count}/${slides.length} slides`);
    }

    return new Response(
      JSON.stringify({ slides }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating slides:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate slides' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

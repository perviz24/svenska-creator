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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, moduleTitle, courseTitle, language = 'sv' } = await req.json();

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
         - Prioritera bilder med människor, arbetsplatser, konkreta objekt över abstrakta illustrationer`
      : `You are an expert at creating professional presentation slides from course scripts.
         Create visually appealing and pedagogically effective slides.
         Each slide should have a clear structure and be easy to follow.
         
         CRITICAL FOR IMAGE SUGGESTIONS:
         - Suggest SPECIFIC and CONCRETE image queries in English for stock photo search
         - Avoid abstract or vague terms like "concept", "abstract", "metaphor"
         - Use descriptive phrases like "professional business meeting in modern office"
         - For technical topics, suggest images of real objects or situations
         - Image suggestion must match slide content EXACTLY, not be an interpretation
         - Prioritize images with people, workplaces, concrete objects over abstract illustrations`;

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
- suggestedImageQuery: KONKRET sökord på ENGELSKA för stockfoto. Exempel:
  * BRA: "professional team collaborating at whiteboard in bright office"
  * BRA: "laptop showing analytics dashboard on wooden desk"
  * DÅLIGT: "success concept" eller "growth metaphor" eller "abstract business"
- suggestedBackgroundColor: Valfri HEX-färgkod för bakgrund

Skapa 5-10 slides beroende på innehållets längd. Första sliden ska vara en titelslide.
VIKTIGT: suggestedImageQuery MÅSTE vara specifik och sökbar på Unsplash/Pexels - inga abstrakta koncept!`
      : `Analyze this script for the module "${moduleTitle}" in the course "${courseTitle}" and create presentation slides.

SCRIPT:
${script}

Create a JSON array of slides. Each slide should have:
- slideNumber: Sequential number (start with 1)
- title: Short, engaging headline (max 8 words)
- content: Main content (markdown format, max 3-4 bullet points or a short paragraph)
- speakerNotes: Detailed notes for the presenter
- layout: One of 'title', 'title-content', 'two-column', 'image-focus', 'quote', 'bullet-points'
- suggestedImageQuery: CONCRETE search terms in ENGLISH for stock photo. Examples:
  * GOOD: "professional team collaborating at whiteboard in bright office"
  * GOOD: "laptop showing analytics dashboard on wooden desk"
  * BAD: "success concept" or "growth metaphor" or "abstract business"
- suggestedBackgroundColor: Optional HEX color code for background

Create 5-10 slides depending on content length. First slide should be a title slide.
IMPORTANT: suggestedImageQuery MUST be specific and searchable on Unsplash/Pexels - no abstract concepts!`;

    console.log('Generating slides for module:', moduleTitle);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
    const slides: SlideContent[] = slidesData.slides;

    console.log(`Generated ${slides.length} slides for module "${moduleTitle}"`);

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

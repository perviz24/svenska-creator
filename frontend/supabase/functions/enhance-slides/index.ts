import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Slide {
  title: string;
  content: string;
  layout: string;
  speakerNotes?: string;
  backgroundColor?: string;
}

interface EnhanceRequest {
  slides: Slide[];
  enhanceType: 'design' | 'content' | 'full';
  courseTitle: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, enhanceType, courseTitle, language = 'sv' }: EnhanceRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Enhancing ${slides.length} slides with type: ${enhanceType}`);

    const systemPrompt = language === 'sv' 
      ? `Du är en expert på presentationsdesign och pedagogik. Din uppgift är att analysera och förbättra presentationsslides för kursen "${courseTitle}".

${enhanceType === 'design' || enhanceType === 'full' ? `
DESIGNFÖRBÄTTRINGAR:
- Föreslå lämpliga färgscheman (returnera hex-koder)
- Rekommendera typsnitt som passar innehållet
- Optimera layouter för bättre läsbarhet
- Föreslå bildtyper/illustrationer som passar varje slide
` : ''}

${enhanceType === 'content' || enhanceType === 'full' ? `
INNEHÅLLSFÖRBÄTTRINGAR:
- Förbättra rubriker för att vara mer engagerande
- Kondensera text till tydliga bullet points
- Lägg till relevanta speaker notes
- Föreslå övergångar mellan slides
` : ''}

Returnera förbättrade slides i samma format men med förbättringar.`
      : `You are an expert in presentation design and pedagogy. Your task is to analyze and enhance presentation slides for the course "${courseTitle}".

${enhanceType === 'design' || enhanceType === 'full' ? `
DESIGN ENHANCEMENTS:
- Suggest appropriate color schemes (return hex codes)
- Recommend fonts that suit the content
- Optimize layouts for better readability
- Suggest image types/illustrations that fit each slide
` : ''}

${enhanceType === 'content' || enhanceType === 'full' ? `
CONTENT ENHANCEMENTS:
- Improve titles to be more engaging
- Condense text into clear bullet points
- Add relevant speaker notes
- Suggest transitions between slides
` : ''}

Return enhanced slides in the same format but with improvements.`;

    const userPrompt = `Analysera och förbättra dessa slides:

${JSON.stringify(slides.map((s, i) => ({
  slideNumber: i + 1,
  title: s.title,
  content: s.content,
  layout: s.layout,
  backgroundColor: s.backgroundColor,
  speakerNotes: s.speakerNotes
})), null, 2)}

Returnera förbättrade versioner med designförslag och innehållsförbättringar.`;

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
              name: 'enhance_slides',
              description: 'Return enhanced slides with design and content improvements',
              parameters: {
                type: 'object',
                properties: {
                  enhancedSlides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Improved slide title' },
                        content: { type: 'string', description: 'Improved slide content' },
                        layout: { 
                          type: 'string', 
                          enum: ['title', 'title-content', 'two-column', 'image-focus', 'quote', 'bullet-points'],
                          description: 'Recommended layout'
                        },
                        backgroundColor: { type: 'string', description: 'Suggested background color (hex)' },
                        speakerNotes: { type: 'string', description: 'Enhanced speaker notes' },
                        designSuggestions: {
                          type: 'object',
                          properties: {
                            fontFamily: { type: 'string', description: 'Suggested font family' },
                            accentColor: { type: 'string', description: 'Accent color (hex)' },
                            imagePrompt: { type: 'string', description: 'Suggested image description' }
                          }
                        }
                      },
                      required: ['title', 'content', 'layout']
                    }
                  },
                  overallSuggestions: {
                    type: 'object',
                    properties: {
                      colorScheme: {
                        type: 'object',
                        properties: {
                          primary: { type: 'string' },
                          secondary: { type: 'string' },
                          accent: { type: 'string' },
                          background: { type: 'string' }
                        }
                      },
                      fontPairing: {
                        type: 'object',
                        properties: {
                          heading: { type: 'string' },
                          body: { type: 'string' }
                        }
                      },
                      designNotes: { type: 'string' }
                    }
                  }
                },
                required: ['enhancedSlides']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'enhance_slides' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      enhancedSlides: result.enhancedSlides,
      overallSuggestions: result.overallSuggestions,
      originalCount: slides.length,
      enhancedCount: result.enhancedSlides?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error enhancing slides:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to enhance slides' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

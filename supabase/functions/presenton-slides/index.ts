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
  layout: string;
  imageUrl?: string;
  imageSource?: string;
  imageAttribution?: string;
}

interface PresentonRequest {
  topic: string;
  numSlides: number;
  language?: string;
  style?: 'professional' | 'creative' | 'minimal' | 'corporate';
  additionalContext?: string;
}

// Presenton API endpoint (self-hosted or cloud)
const PRESENTON_API_URL = Deno.env.get('PRESENTON_API_URL') || 'https://api.presenton.ai';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      numSlides = 10, 
      language = 'en',
      style = 'professional',
      additionalContext = '',
      scriptContent,
      moduleTitle,
      courseTitle,
    }: PresentonRequest & { scriptContent?: string; moduleTitle?: string; courseTitle?: string } = await req.json();

    if (!topic && !scriptContent) {
      return new Response(
        JSON.stringify({ error: 'Topic or script content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PRESENTON_API_KEY = Deno.env.get('PRESENTON_API_KEY');
    
    // If Presenton API key is available, use their cloud API
    if (PRESENTON_API_KEY) {
      console.log('Using Presenton Cloud API for slide generation');
      
      const presentonPayload = {
        topic: topic || moduleTitle || courseTitle,
        n_slides: Math.min(numSlides, 100), // Presenton supports up to 100 slides
        language: language === 'sv' ? 'Swedish' : 'English',
        style: style,
        additional_context: additionalContext || scriptContent?.substring(0, 5000) || '',
      };

      const presentonResponse = await fetch(`${PRESENTON_API_URL}/v1/presentations/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PRESENTON_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presentonPayload),
      });

      if (!presentonResponse.ok) {
        const errorText = await presentonResponse.text();
        console.error('Presenton API error:', presentonResponse.status, errorText);
        
        if (presentonResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Presenton rate limit exceeded. Try again later.', fallback: true }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Return fallback flag so frontend can use internal generation
        return new Response(
          JSON.stringify({ 
            error: `Presenton API error: ${presentonResponse.status}`,
            fallback: true 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const presentonData = await presentonResponse.json();
      console.log('Presenton response received:', presentonData.presentation_id);

      // Transform Presenton response to our slide format
      const slides: SlideContent[] = (presentonData.slides || []).map((slide: any, index: number) => ({
        slideNumber: index + 1,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || slide.bullet_points?.join('\n') || '',
        speakerNotes: slide.speaker_notes || slide.notes || '',
        layout: mapPresentonLayout(slide.layout || 'content'),
        imageUrl: slide.image_url,
        imageSource: slide.image_url ? 'presenton' : undefined,
        imageAttribution: slide.image_attribution,
        suggestedImageQuery: slide.image_query || slide.title,
      }));

      return new Response(
        JSON.stringify({
          slides,
          presentationId: presentonData.presentation_id,
          downloadUrl: presentonData.path,
          editUrl: presentonData.edit_path,
          source: 'presenton',
          creditsConsumed: presentonData.credits_consumed || slides.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Use Lovable AI to generate professional slides
    console.log('Presenton API key not configured, using Lovable AI fallback');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Neither PRESENTON_API_KEY nor LOVABLE_API_KEY is configured');
    }

    const systemPrompt = `You are an expert presentation designer. Create professional, visually-oriented slides that:
- Have concise, impactful titles (max 8 words)
- Use bullet points with 3-5 items max per slide
- Include speaker notes with detailed talking points
- Suggest specific, searchable image queries
- Vary layouts for visual interest
- Follow the ${style} presentation style

Output clean, professional content suitable for ${language === 'sv' ? 'Swedish' : 'English'} business presentations.`;

    const userPrompt = `Create ${numSlides} professional presentation slides about: "${topic || moduleTitle}"
${courseTitle ? `Course context: ${courseTitle}` : ''}
${additionalContext ? `Additional context: ${additionalContext}` : ''}
${scriptContent ? `Base content:\n${scriptContent.substring(0, 4000)}` : ''}

Return a JSON array of slides with: slideNumber, title, content (bullet points separated by \\n), speakerNotes, layout (title/title-content/two-column/image-focus/bullet-points), suggestedImageQuery (specific English terms for stock photos).`;

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
              name: 'create_presentation',
              description: 'Create professional presentation slides',
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
                          enum: ['title', 'title-content', 'two-column', 'image-focus', 'bullet-points']
                        },
                        suggestedImageQuery: { type: 'string' }
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
        tool_choice: { type: 'function', function: { name: 'create_presentation' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('Unexpected AI response format');
    }

    const slidesData = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({
        slides: slidesData.slides,
        source: 'lovable-ai',
        fallback: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Presenton slides error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapPresentonLayout(layout: string): string {
  const layoutMap: Record<string, string> = {
    'title': 'title',
    'title_slide': 'title',
    'content': 'title-content',
    'two_column': 'two-column',
    'image': 'image-focus',
    'image_left': 'image-focus',
    'image_right': 'image-focus',
    'bullets': 'bullet-points',
    'quote': 'quote',
  };
  return layoutMap[layout.toLowerCase()] || 'title-content';
}

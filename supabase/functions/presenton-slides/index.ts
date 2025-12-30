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

// Presenton API endpoint
const PRESENTON_API_URL = 'https://api.presenton.ai';

// Helper to poll for task completion
async function pollTaskStatus(taskId: string, apiKey: string, maxAttempts = 30, delayMs = 2000): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/status/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      throw new Error(`Status check failed: ${statusResponse.status} ${errorText}`);
    }

    const statusData = await statusResponse.json();
    console.log(`Task ${taskId} status: ${statusData.status}`);

    if (statusData.status === 'completed') {
      return statusData;
    }

    if (statusData.status === 'failed') {
      throw new Error(`Presenton task failed: ${statusData.message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Presenton task timeout - generation took too long');
}

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
      
      // Build content string for Presenton
      const contentText = scriptContent || additionalContext || topic || moduleTitle || courseTitle || '';
      
      const presentonPayload = {
        content: contentText.substring(0, 10000), // Presenton content limit
        n_slides: Math.min(numSlides, 100),
        language: language === 'sv' ? 'Swedish' : 'English',
        template: 'general',
        tone: style === 'professional' ? 'default' : style,
        verbosity: 'standard',
        markdown_emphasis: true,
        web_search: false,
        image_type: 'stock',
        include_title_slide: true,
        include_table_of_contents: false,
        export_as: 'pptx',
      };

      console.log('Calling Presenton async endpoint...');
      
      // Step 1: Start async generation
      const generateResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/generate/async`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PRESENTON_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presentonPayload),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('Presenton API error:', generateResponse.status, errorText);
        console.log('Presenton API unavailable, falling back to Lovable AI');
      } else {
        const taskData = await generateResponse.json();
        console.log('Presenton task created:', taskData.id, 'status:', taskData.status);

        // Step 2: Poll for completion
        try {
          const completedTask = await pollTaskStatus(taskData.id, PRESENTON_API_KEY);
          console.log('Presenton task completed:', completedTask.data?.presentation_id);

          // The async API returns download URLs, not individual slides
          // We need to return the presentation info for the frontend to handle
          return new Response(
            JSON.stringify({
              slides: [], // Presenton async doesn't return slide data directly
              presentationId: completedTask.data?.presentation_id,
              downloadUrl: completedTask.data?.path,
              editUrl: completedTask.data?.edit_path,
              source: 'presenton',
              creditsConsumed: completedTask.data?.credits_consumed || numSlides,
              // Signal that this is a PPTX download, not slide data
              isPptxDownload: true,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (pollError) {
          console.error('Presenton polling error:', pollError);
          console.log('Falling back to Lovable AI');
        }
      }
    }

    // Fallback: Use Lovable AI to generate professional slides
    console.log('Using Lovable AI for slide generation');
    
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

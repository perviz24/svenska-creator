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
  // For status checking
  taskId?: string;
  action?: 'generate' | 'status';
}

// Presenton API endpoint
const PRESENTON_API_URL = 'https://api.presenton.ai';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { 
      topic, 
      numSlides = 10, 
      language = 'en',
      style = 'professional',
      additionalContext = '',
      scriptContent,
      moduleTitle,
      courseTitle,
      taskId,
      action = 'generate',
    }: PresentonRequest & { scriptContent?: string; moduleTitle?: string; courseTitle?: string } = requestBody;

    const PRESENTON_API_KEY = Deno.env.get('PRESENTON_API_KEY');

    // Handle status check action
    if (action === 'status' && taskId && PRESENTON_API_KEY) {
      console.log('Checking Presenton task status:', taskId);
      
      const statusResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/status/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PRESENTON_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check failed:', statusResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Status check failed', status: 'error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusData = await statusResponse.json();
      console.log('Task status:', statusData.status);

      if (statusData.status === 'completed') {
        return new Response(
          JSON.stringify({
            status: 'completed',
            presentationId: statusData.data?.presentation_id,
            downloadUrl: statusData.data?.path,
            editUrl: statusData.data?.edit_path,
            creditsConsumed: statusData.data?.credits_consumed,
            source: 'presenton',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (statusData.status === 'failed') {
        return new Response(
          JSON.stringify({ status: 'failed', error: statusData.message || 'Generation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Still pending/processing
      return new Response(
        JSON.stringify({ status: statusData.status, taskId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate action
    if (!topic && !scriptContent) {
      return new Response(
        JSON.stringify({ error: 'Topic or script content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If Presenton API key is available, use their cloud API
    if (PRESENTON_API_KEY) {
      console.log('Using Presenton Cloud API for slide generation');
      
      const contentText = scriptContent || additionalContext || topic || moduleTitle || courseTitle || '';
      
      const presentonPayload = {
        content: contentText.substring(0, 10000),
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

        // Return task ID immediately for frontend to poll
        return new Response(
          JSON.stringify({
            status: 'pending',
            taskId: taskData.id,
            source: 'presenton',
            message: 'Presentation generation started. Poll for status.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: Use Lovable AI to generate professional slides (synchronous)
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
        status: 'completed',
        slides: slidesData.slides,
        source: 'lovable-ai',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Presenton slides error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

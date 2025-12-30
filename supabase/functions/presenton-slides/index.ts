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
  style?: string;
  tone?: string;
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
      tone,
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

      const mapLanguage = (lang?: string) => (lang === 'sv' ? 'Swedish' : 'English');

      // Map to valid Presenton tones: default, casual, professional, funny, educational, sales_pitch
      const mapTone = (input?: string): string => {
        const raw = (input || '').toLowerCase().trim();
        const validTones = ['default', 'casual', 'professional', 'funny', 'educational', 'sales_pitch'];
        if (validTones.includes(raw)) return raw;
        // Map app tones to Presenton tones
        if (['formal', 'very-formal'].includes(raw)) return 'professional';
        if (['friendly', 'relaxed', 'very-casual'].includes(raw)) return 'casual';
        if (['inspirational'].includes(raw)) return 'educational';
        return 'professional'; // Default to professional for best quality
      };

      // Map to valid Presenton templates: general, modern, standard, swift
      const mapTemplate = (input?: string): string => {
        const raw = (input || '').toLowerCase().trim();
        // Direct matches
        if (raw === 'modern') return 'modern';
        if (raw === 'standard' || raw === 'classic') return 'standard';
        if (raw === 'swift') return 'swift';
        // Map app styles to best matching Presenton templates
        if (raw === 'minimal') return 'modern'; // Modern is cleanest
        if (raw === 'creative') return 'swift'; // Swift is most dynamic
        if (raw === 'corporate') return 'standard'; // Standard is most conservative
        return 'general'; // Safe default
      };

      // Map styles to Presenton themes for visual variety
      // Available: edge-yellow, mint-blue, light-rose, professional-blue, professional-dark
      const mapTheme = (inputStyle?: string, inputTone?: string): string => {
        const style = (inputStyle || '').toLowerCase().trim();
        const tone = (inputTone || '').toLowerCase().trim();
        
        // Creative/dynamic styles get vibrant themes
        if (style === 'creative') return 'edge-yellow';
        if (style === 'minimal') return 'mint-blue';
        if (style === 'classic') return 'light-rose';
        
        // Corporate/formal tones get professional themes
        if (style === 'corporate' || tone === 'formal' || tone === 'professional') return 'professional-blue';
        if (tone === 'casual' || tone === 'friendly') return 'mint-blue';
        
        // Modern default
        if (style === 'modern') return 'professional-blue';
        
        return 'professional-blue'; // Safe professional default
      };

      const effectiveTone = mapTone(tone || style);
      const effectiveTemplate = mapTemplate(style);
      const effectiveTheme = mapTheme(style, tone);

      // Build instructions for better content generation
      const buildInstructions = (styleName?: string, toneName?: string): string => {
        const parts: string[] = [];
        
        if (styleName === 'minimal') {
          parts.push('Use minimal text, focus on key points only, maximize white space.');
        } else if (styleName === 'creative') {
          parts.push('Use creative language, bold statements, and engaging visuals.');
        } else if (styleName === 'corporate') {
          parts.push('Use formal business language, include data points and metrics where relevant.');
        } else if (styleName === 'classic') {
          parts.push('Use traditional presentation structure with clear hierarchy.');
        }
        
        if (toneName === 'casual' || toneName === 'friendly') {
          parts.push('Keep the tone conversational and approachable.');
        } else if (toneName === 'inspirational') {
          parts.push('Include motivational elements and inspiring language.');
        }
        
        parts.push('Ensure each slide has a clear single message. Use bullet points effectively.');
        
        return parts.join(' ');
      };

      const effectiveInstructions = buildInstructions(style, tone);

      console.log('Presenton parameters:', { 
        template: effectiveTemplate, 
        theme: effectiveTheme, 
        tone: effectiveTone,
        n_slides: Math.min(numSlides, 50),
        style_input: style,
        tone_input: tone
      });

      const presentonPayload = {
        content: contentText.substring(0, 10000),
        n_slides: Math.min(numSlides, 50), // API supports 1-50
        language: mapLanguage(language),
        template: effectiveTemplate,
        theme: effectiveTheme,
        tone: effectiveTone,
        instructions: effectiveInstructions,
        verbosity: 'standard',
        web_search: false,
        image_type: 'ai-generated', // Use AI-generated for better visuals
        include_title_slide: true,
        include_table_of_contents: numSlides > 8, // Only for longer presentations
        export_as: 'pptx',
      };

      console.log('Calling Presenton async endpoint with payload:', JSON.stringify(presentonPayload, null, 2));

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
    console.log('Using Lovable AI for slide generation');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Neither PRESENTON_API_KEY nor LOVABLE_API_KEY is configured');
    }

    // Determine presentation structure based on content and slide count
    const contentForAnalysis = scriptContent || additionalContext || topic || '';
    const hasRichContent = contentForAnalysis.length > 500;
    const isEducational = courseTitle || moduleTitle;
    
    // Build narrative arc structure recommendation
    const narrativeStructure = numSlides <= 5 
      ? 'Hook → Problem → Solution → Evidence → Call-to-Action'
      : numSlides <= 10
        ? 'Title → Context → 3-5 Key Points → Case Study/Example → Summary → Next Steps'
        : 'Title → Agenda → Introduction → 5-8 Main Sections (each with supporting evidence) → Recap → Q&A';

    const systemPrompt = `You are a world-class presentation designer and storytelling expert. Your slides win awards for clarity, visual hierarchy, and persuasive narrative flow.

## Core Principles:
1. **ONE IDEA PER SLIDE** - Each slide communicates exactly one concept
2. **6x6 RULE** - Maximum 6 bullet points, 6 words per bullet
3. **VISUAL HIERARCHY** - Titles are scannable in 3 seconds
4. **NARRATIVE ARC** - Every presentation tells a compelling story
5. **PROGRESSIVE DISCLOSURE** - Build complexity gradually

## Slide Design Rules:
- **Titles**: Action-oriented, benefit-focused (e.g., "Reduce Costs by 40%" not "Cost Analysis")
- **Bullets**: Start with strong verbs, parallel structure, specific outcomes
- **Data**: Always contextualize numbers (comparisons, percentages, trends)
- **Transitions**: Each slide flows logically to the next

## Layout Selection Guide:
- \`title\`: Opening/closing slides, major section breaks
- \`title-content\`: Key statements with supporting detail
- \`bullet-points\`: Lists of 3-5 related items, process steps
- \`two-column\`: Comparisons, before/after, pros/cons
- \`image-focus\`: Emotional moments, product showcases, metaphors
- \`data-visualization\`: Statistics, trends, metrics
- \`quote\`: Expert testimony, customer feedback, key takeaways

## Speaker Notes Guidelines:
- Write as natural speech (contractions, conversational tone)
- Include: key message, supporting evidence, transition phrase to next slide
- Add timing suggestions (30-60 seconds per slide)
- Include audience engagement prompts where appropriate

## Image Query Best Practices:
- Be SPECIFIC and LITERAL: "business team celebrating success high-five" not "teamwork"
- Include context: "modern office", "professional setting", "diverse group"
- Specify mood: "bright", "confident", "focused"
- Avoid clichés: no handshakes, puzzle pieces, or light bulbs unless truly relevant

## Style: ${style}
${style === 'professional' ? '- Clean, corporate aesthetic. Data-driven. Credible authority tone.' : ''}
${style === 'creative' ? '- Bold visuals, unexpected metaphors, memorable phrases. Inspire and energize.' : ''}
${style === 'minimal' ? '- Maximum whitespace, essential words only, elegant typography focus.' : ''}
${style === 'corporate' ? '- Conservative, structured, formal. Risk-averse language, clear hierarchy.' : ''}

## Language: ${language === 'sv' ? 'Swedish (formal business Swedish, avoid anglicisms)' : 'English (clear, international business English)'}`;

    // Build context-aware user prompt
    const contentSource = scriptContent 
      ? `\n\n## Source Material to Structure:\n${scriptContent.substring(0, 6000)}`
      : '';
    
    const contextInfo = [
      courseTitle && `Course: "${courseTitle}"`,
      moduleTitle && `Module: "${moduleTitle}"`,
      additionalContext && `Context: ${additionalContext}`
    ].filter(Boolean).join('\n');

    const userPrompt = `Create a ${numSlides}-slide presentation${topic ? ` on: "${topic}"` : ''}.

## Narrative Structure to Follow:
${narrativeStructure}

${contextInfo ? `## Background Information:\n${contextInfo}` : ''}
${contentSource}

## Requirements:
1. Start with a compelling hook that establishes relevance
2. Build tension/interest through the middle slides
3. Provide clear resolution and actionable takeaways
4. ${isEducational ? 'Include learning objectives early and reinforce key concepts' : 'Focus on persuasion and memorable key messages'}
5. End with a strong call-to-action or memorable closing thought

## Output Format:
Generate exactly ${numSlides} slides with variety in layouts. Ensure each slide has:
- A punchy, benefit-oriented title (max 8 words)
- Concise content following the 6x6 rule
- Detailed speaker notes (50-100 words) with transition to next slide
- Appropriate layout that matches the content type
- Specific, searchable image query for relevant visuals`;

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
              description: 'Create a professional presentation with narrative flow and visual variety',
              parameters: {
                type: 'object',
                properties: {
                  presentationTitle: { 
                    type: 'string',
                    description: 'The overall title/theme of the presentation'
                  },
                  slides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        slideNumber: { type: 'number' },
                        title: { 
                          type: 'string',
                          description: 'Action-oriented, benefit-focused title (max 8 words)'
                        },
                        subtitle: {
                          type: 'string',
                          description: 'Optional supporting subtitle for context'
                        },
                        content: { 
                          type: 'string',
                          description: 'Main content - bullet points separated by \\n, following 6x6 rule'
                        },
                        keyMessage: {
                          type: 'string',
                          description: 'The ONE takeaway the audience should remember from this slide'
                        },
                        speakerNotes: { 
                          type: 'string',
                          description: 'Detailed talking points in conversational tone, including transition to next slide'
                        },
                        layout: { 
                          type: 'string',
                          enum: ['title', 'title-content', 'two-column', 'image-focus', 'bullet-points', 'data-visualization', 'quote']
                        },
                        suggestedImageQuery: { 
                          type: 'string',
                          description: 'Specific, literal image search query with context and mood descriptors'
                        },
                        dataVisualization: {
                          type: 'object',
                          description: 'Optional data for charts/graphs',
                          properties: {
                            type: { type: 'string', enum: ['bar', 'line', 'pie', 'stat'] },
                            description: { type: 'string' }
                          }
                        }
                      },
                      required: ['slideNumber', 'title', 'content', 'keyMessage', 'speakerNotes', 'layout', 'suggestedImageQuery']
                    }
                  }
                },
                required: ['presentationTitle', 'slides']
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
      
      // Return user-friendly error messages
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            status: 'error',
            retryable: true,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment required. Please add credits to continue.',
            status: 'error',
            retryable: false,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response:', JSON.stringify(data).substring(0, 500));
      throw new Error('Unexpected AI response format - no structured slide data returned');
    }

    let slidesData;
    try {
      slidesData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse AI response:', toolCall.function.arguments?.substring(0, 500));
      throw new Error('Failed to parse slide data from AI');
    }
    
    if (!slidesData.slides || slidesData.slides.length === 0) {
      console.error('No slides in parsed response:', slidesData);
      throw new Error('AI did not generate any slides');
    }
    
    console.log(`Successfully generated ${slidesData.slides.length} slides with enhanced prompting`);
    
    return new Response(
      JSON.stringify({
        status: 'completed',
        presentationTitle: slidesData.presentationTitle,
        slides: slidesData.slides,
        source: 'lovable-ai',
        slideCount: slidesData.slides.length,
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

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
  // Context-aware generation parameters
  audienceType?: string; // e.g., 'executives', 'students', 'general', 'technical'
  purpose?: string; // e.g., 'inform', 'persuade', 'educate', 'inspire'
  industry?: string; // e.g., 'healthcare', 'finance', 'tech', 'education'
  imageStyle?: string; // e.g., 'photography', 'illustrations', 'icons', 'mixed'
}

// Context analysis utilities
const analyzeTopicContext = (topic: string, additionalContext?: string): {
  industry: string;
  imageStyle: string;
  colorScheme: string;
  visualMood: string;
} => {
  const combined = `${topic} ${additionalContext || ''}`.toLowerCase();
  
  // Industry detection
  let industry = 'general';
  // English + Swedish keywords
  if (/health|medical|hospital|pharma|patient|doctor|clinic|anatomy|physiology|pathology|diagnos|treatment/i.test(combined) ||
      /anatomi|fysiologi|patologi|klinisk|patient|sjukdom|diagnostik|behandling|läkare|sjukhus|medicin|hälsa/i.test(combined)) {
    industry = 'healthcare';
  } else if (/financ|bank|invest|money|stock|crypto|trading/i.test(combined)) industry = 'finance';
  else if (/tech|software|digital|ai|machine learning|data|cloud|app/i.test(combined)) industry = 'technology';
  else if (/education|school|learn|student|teach|course|training/i.test(combined)) industry = 'education';
  else if (/market|brand|customer|sales|advertis|campaign/i.test(combined)) industry = 'marketing';
  else if (/nature|environment|sustain|green|eco|climate/i.test(combined)) industry = 'environment';
  else if (/food|restaurant|culinary|recipe|cook|nutrition/i.test(combined)) industry = 'food';
  else if (/travel|tourism|hotel|vacation|destination/i.test(combined)) industry = 'travel';
  else if (/law|legal|compliance|regulation|court/i.test(combined)) industry = 'legal';
  else if (/construction|architect|building|real estate|property/i.test(combined)) industry = 'real-estate';

  
  // Image style recommendation based on industry and content
  let imageStyle = 'photography';
  if (industry === 'technology' || /diagram|process|workflow|system/i.test(combined)) imageStyle = 'illustrations';
  else if (industry === 'education' || /concept|idea|abstract/i.test(combined)) imageStyle = 'mixed';
  else if (industry === 'finance' || industry === 'legal') imageStyle = 'photography';
  else if (/creative|art|design|visual/i.test(combined)) imageStyle = 'illustrations';
  
  // Color scheme suggestion
  let colorScheme = 'professional-blue';
  if (industry === 'healthcare') colorScheme = 'mint-blue';
  else if (industry === 'finance') colorScheme = 'professional-dark';
  else if (industry === 'technology') colorScheme = 'professional-blue';
  else if (industry === 'education') colorScheme = 'light-rose';
  else if (industry === 'environment') colorScheme = 'mint-blue';
  else if (industry === 'marketing' || /creative|dynamic/i.test(combined)) colorScheme = 'edge-yellow';
  
  // Visual mood
  let visualMood = 'confident';
  if (/inspire|motivat|empower|success/i.test(combined)) visualMood = 'inspiring';
  else if (/serious|important|critical|urgent/i.test(combined)) visualMood = 'serious';
  else if (/fun|creative|innovate|exciting/i.test(combined)) visualMood = 'energetic';
  else if (/calm|peace|wellness|relax/i.test(combined)) visualMood = 'calm';
  
  return { industry, imageStyle, colorScheme, visualMood };
};

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
      audienceType = 'general',
      purpose = 'inform',
      industry: providedIndustry,
      imageStyle: providedImageStyle,
    }: PresentonRequest & { scriptContent?: string; moduleTitle?: string; courseTitle?: string } = requestBody;
    
    // Analyze topic for context-aware styling
    const topicContext = analyzeTopicContext(topic || moduleTitle || courseTitle || '', additionalContext);
    const effectiveIndustry = providedIndustry || topicContext.industry;
    const effectiveImageStyle = providedImageStyle || topicContext.imageStyle;

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
      console.log('Full Presenton status response:', JSON.stringify(statusData, null, 2));

      if (statusData.status === 'completed') {
        console.log('Presenton completed! Presentation ID:', statusData.data?.presentation_id);
        console.log('Download URL:', statusData.data?.path);
        console.log('Edit URL:', statusData.data?.edit_path);
        console.log('Credits consumed:', statusData.data?.credits_consumed);
        
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

      const normalizeForPresenton = (input: string) => {
        // Normalize to avoid strange combining-character issues
        return (input || '').normalize('NFC');
      };

      const rawContentText = scriptContent || additionalContext || topic || moduleTitle || courseTitle || '';
      const contentText = normalizeForPresenton(rawContentText);

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
        if (raw === 'general') return 'general';
        // Map app styles to best matching Presenton templates
        if (raw === 'minimal') return 'modern'; // clean
        if (raw === 'creative') return 'swift'; // most dynamic
        if (raw === 'corporate') return 'standard'; // conservative
        return 'swift'; // Default to swift for less-minimal, more designed output
      };

      // Map styles to Presenton themes - now context-aware
      // Available: edge-yellow, mint-blue, light-rose, professional-blue, professional-dark
      const mapTheme = (inputStyle?: string, inputTone?: string, contextTheme?: string): string => {
        if (contextTheme) return contextTheme;
        
        const localStyle = (inputStyle || '').toLowerCase().trim();
        const localTone = (inputTone || '').toLowerCase().trim();
        
        if (localStyle === 'creative') return 'edge-yellow';
        if (localStyle === 'minimal') return 'mint-blue';
        if (localStyle === 'classic') return 'light-rose';
        if (localStyle === 'corporate' || localTone === 'formal' || localTone === 'professional') return 'professional-blue';
        if (localTone === 'casual' || localTone === 'friendly') return 'mint-blue';
        if (localStyle === 'modern') return 'professional-blue';
        
        return 'professional-blue';
      };

      // Enhanced instructions builder with context awareness
      const buildInstructions = (
        styleName?: string, 
        toneName?: string, 
        contextIndustry?: string,
        contextImageStyle?: string,
        contextMood?: string,
        audience?: string,
        presentationPurpose?: string
      ): string => {
        const parts: string[] = [];
        
        // Industry-specific guidance
        if (contextIndustry === 'healthcare') {
          parts.push('Use professional medical imagery. Clean, clinical aesthetics.');
        } else if (contextIndustry === 'finance') {
          parts.push('Use charts, graphs, professional imagery. Convey trust and stability.');
        } else if (contextIndustry === 'technology') {
          parts.push('Use modern tech imagery, abstract visuals, clean diagrams.');
        } else if (contextIndustry === 'education') {
          parts.push('Use engaging educational imagery and diagrams.');
        } else if (contextIndustry === 'marketing') {
          parts.push('Use dynamic, engaging visuals that capture attention.');
        } else if (contextIndustry === 'environment') {
          parts.push('Use nature photography and sustainability-focused visuals.');
        }
        
        // Image style guidance
        if (contextImageStyle === 'illustrations') {
          parts.push('Prefer illustrations and diagrams over photography.');
        } else if (contextImageStyle === 'photography') {
          parts.push('Use high-quality professional photography.');
        }
        
        // Mood guidance
        if (contextMood === 'inspiring') {
          parts.push('Use uplifting imagery with success themes.');
        } else if (contextMood === 'serious') {
          parts.push('Use professional, focused imagery.');
        } else if (contextMood === 'energetic') {
          parts.push('Use dynamic, vibrant imagery with energy.');
        }
        
        // Audience guidance
        if (audience === 'executives') {
          parts.push('Focus on high-level insights and strategic value.');
        } else if (audience === 'technical') {
          parts.push('Include detailed diagrams and technical specifications.');
        } else if (audience === 'students') {
          parts.push('Use engaging, accessible language with clear explanations.');
        }
        
        // Purpose guidance
        if (presentationPurpose === 'persuade') {
          parts.push('Structure for persuasion: problem-solution-benefit.');
        } else if (presentationPurpose === 'educate') {
          parts.push('Structure for learning: concept-example-practice.');
        } else if (presentationPurpose === 'inspire') {
          parts.push('Structure for inspiration: story-vision-action.');
        }
        
        // Style guidance
        if (styleName === 'minimal') {
          parts.push('Use minimal text, maximize white space.');
        } else if (styleName === 'creative') {
          parts.push('Use creative language and bold statements.');
        } else if (styleName === 'corporate') {
          parts.push('Use formal business language with data points.');
        } else if (styleName === 'classic') {
          parts.push('Use traditional presentation structure.');
        }
        
        if (toneName === 'casual' || toneName === 'friendly') {
          parts.push('Keep conversational and approachable.');
        } else if (toneName === 'inspirational') {
          parts.push('Include motivational elements.');
        }
        
        parts.push('Each slide: one clear message. Select images that directly relate to content.');
        
        return parts.join(' ');
      };

      const effectiveTone = mapTone(tone || style);
      const effectiveTemplate = mapTemplate(style);
      const effectiveTheme = mapTheme(style, tone, topicContext.colorScheme);
      const effectiveInstructions = buildInstructions(
        style, 
        tone, 
        effectiveIndustry, 
        effectiveImageStyle, 
        topicContext.visualMood, 
        audienceType, 
        purpose
      );

      console.log('Presenton parameters:', { 
        template: effectiveTemplate, 
        theme: effectiveTheme, 
        tone: effectiveTone,
        n_slides: Math.min(numSlides, 50),
        style_input: style,
        tone_input: tone,
        detected_industry: effectiveIndustry,
        detected_image_style: effectiveImageStyle,
        detected_mood: topicContext.visualMood,
      });

      // Build optimized instructions for best visual output (keep it short + design-first)
      const enhancedInstructions = [
        effectiveInstructions,
        'Prioritize premium visual design: strong layout, consistent spacing, and clear hierarchy.',
        'Keep text concise (max 5 bullets). Use impactful headings.',
        'Use relevant high-quality imagery and icons that directly support the slide message.',
        'Ensure consistent theme styling across all slides.',
      ].filter(Boolean).join(' ');

      // Presenton docs: https://docs.presenton.ai/api-reference/presentation/generate-presentation-async
      // Key changes for quality:
      // - image_type: "stock" (typically higher, more consistent quality than AI-generated images)
      // - include allow_access_to_user_info + trigger_webhook fields (doc parity)
      // - web_search: false (reduce off-topic drift)
      const presentonPayload = {
        content: contentText.substring(0, 10000),
        n_slides: Math.min(numSlides, 50),
        language: mapLanguage(language),
        template: effectiveTemplate,
        theme: effectiveTheme,
        tone: effectiveTone,
        instructions: enhancedInstructions,
        verbosity: 'standard',
        markdown_emphasis: true,
        web_search: false,
        image_type: 'stock',
        include_title_slide: true,
        include_table_of_contents: numSlides > 8,
        allow_access_to_user_info: true,
        export_as: 'pptx',
        trigger_webhook: false,
      };

      console.log('Calling Presenton async endpoint with payload:', JSON.stringify(presentonPayload, null, 2));

      // Presenton seems to sometimes mis-handle UTF-8 in request bodies (mojibake like "innehÃ¥llsfÃ¶rteckning").
      // To make the payload encoding unambiguous, we escape all non-ASCII characters as \uXXXX sequences.
      const escapeUnicodeInJson = (json: string) =>
        json.replace(/[\u0080-\uFFFF]/g, (ch) => {
          const code = ch.charCodeAt(0);
          return `\\u${code.toString(16).padStart(4, '0')}`;
        });

      const presentonBody = escapeUnicodeInJson(JSON.stringify(presentonPayload));

      const generateResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/generate/async`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PRESENTON_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: presentonBody,
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error('Presenton API error:', generateResponse.status, errorText);

        // If Presenton returns a client error (4xx), do NOT silently fall back.
        // This is almost always a configuration / credits / auth issue.
        if (generateResponse.status >= 400 && generateResponse.status < 500) {
          // Try to keep the original error detail if it's JSON
          let detail: string | undefined;
          try {
            const parsed = JSON.parse(errorText);
            detail = parsed?.detail || parsed?.message;
          } catch {
            detail = errorText;
          }

          const msg = detail || 'Presenton request failed.';
          const isCredits = /not enough credits/i.test(msg);

          return new Response(
            JSON.stringify({
              status: 'failed',
              source: 'presenton',
              error: msg,
              code: isCredits ? 'presenton_insufficient_credits' : 'presenton_request_failed',
              retryable: false,
            }),
            {
              status: isCredits ? 402 : 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // For transient errors (5xx), fall back to Lovable AI
        console.log('Presenton API unavailable (server error), falling back to Lovable AI');
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
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    // Log slide generation parameters
    console.log('Lovable AI slide generation:', { numSlides, language, style, topic: topic?.substring(0, 50) });

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

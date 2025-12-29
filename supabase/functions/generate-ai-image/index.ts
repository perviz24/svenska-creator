import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, slideTitle, courseContext, style = 'professional' } = await req.json();

    if (!prompt) {
      throw new Error('Image prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Enhance prompt for educational context
    const styleGuides: Record<string, string> = {
      professional: 'Clean, modern, corporate style with subtle gradients and professional lighting',
      academic: 'Educational, textbook-style illustration with clear diagrams and informative visuals',
      creative: 'Vibrant, engaging visuals with creative compositions and dynamic elements',
      minimal: 'Minimalist design with clean lines, simple shapes, and lots of whitespace',
    };

    const enhancedPrompt = `${prompt}. ${styleGuides[style] || styleGuides.professional}. Suitable for an educational presentation slide. High quality, 16:9 aspect ratio.${courseContext ? ` Context: ${courseContext}.` : ''}${slideTitle ? ` For slide titled: "${slideTitle}".` : ''}`;

    console.log(`Generating AI image with prompt: ${enhancedPrompt.substring(0, 100)}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          { 
            role: 'user', 
            content: enhancedPrompt
          }
        ],
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
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image URL from response
    const content = data.choices?.[0]?.message?.content;
    let imageUrl = null;

    // Check if content contains image data or URL
    if (typeof content === 'string' && content.startsWith('data:image')) {
      imageUrl = content;
    } else if (data.choices?.[0]?.message?.images?.[0]) {
      imageUrl = data.choices[0].message.images[0];
    }

    if (!imageUrl) {
      // Fallback - return a placeholder or error
      console.log('No image generated, response:', JSON.stringify(data).substring(0, 500));
      throw new Error('Could not generate image');
    }

    return new Response(JSON.stringify({
      imageUrl,
      prompt: enhancedPrompt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-image:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

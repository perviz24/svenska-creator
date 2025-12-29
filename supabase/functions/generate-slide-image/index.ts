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
    const { prompt, style = 'professional' } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const stylePrompts: Record<string, string> = {
      professional: 'Professional, corporate photography style, clean and modern, neutral colors, suitable for business presentation, photorealistic, no text overlays',
      educational: 'Educational setting, bright and clear, classroom or learning environment, photorealistic, suitable for course content, no text overlays',
      creative: 'Creative and artistic, vibrant but balanced colors, modern design aesthetic, no text overlays',
      minimalist: 'Minimalist design, soft gradients, simple geometric shapes, muted elegant colors, no text overlays',
      tech: 'Technology themed, modern devices, digital workspace, clean and professional, no text overlays',
    };

    // Enhance the prompt to be more specific and avoid abstract AI imagery
    const enhancedPrompt = `Create a realistic, high-quality photograph or illustration for a presentation slide.
Subject: ${prompt}
Style requirements: ${stylePrompts[style] || stylePrompts.professional}
Technical requirements: 
- 16:9 aspect ratio landscape orientation
- Suitable as slide background with space for text overlay
- No text, watermarks, or logos in the image
- Professional quality, well-lit, in focus
- Realistic and contextually appropriate for educational/business use
- Avoid abstract concepts, surreal imagery, or AI-typical artifacts`;

    console.log('Generating AI image with prompt:', enhancedPrompt.substring(0, 150) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Image API error:', response.status, errorText);
      
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
      
      throw new Error(`AI Image API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      throw new Error('No image generated');
    }

    console.log('AI image generated successfully');

    return new Response(
      JSON.stringify({ 
        imageUrl: imageData,
        source: 'ai-generated',
        attribution: 'AI-generated image'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating slide image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const { 
      title, 
      content, 
      comprehensiveLevel = 'intermediate',
      courseLengthPreset = 'standard',
      language = 'sv' 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!title && !content) {
      throw new Error('Either title or content is required');
    }

    console.log('Analyzing course structure for:', title || 'uploaded content');
    console.log('Level:', comprehensiveLevel, 'Preset:', courseLengthPreset);

    // Determine base parameters from preset
    const presetConfigs: Record<string, { minModules: number; maxModules: number; avgSlidesPerModule: number; duration: number }> = {
      short: { minModules: 3, maxModules: 5, avgSlidesPerModule: 10, duration: 30 },
      standard: { minModules: 6, maxModules: 10, avgSlidesPerModule: 15, duration: 60 },
      comprehensive: { minModules: 10, maxModules: 20, avgSlidesPerModule: 20, duration: 120 },
    };
    const presetParams = presetConfigs[courseLengthPreset] || presetConfigs.standard;

    // Adjust based on comprehensiveness level
    const levelMultipliers: Record<string, number> = {
      beginner: 0.7,
      intermediate: 1.0,
      advanced: 1.4,
    };
    const levelMultiplier = levelMultipliers[comprehensiveLevel] || 1.0;

    const systemPrompt = language === 'sv'
      ? `Du är en expert på kursdesign och utbildningsplanering.
         Analysera ämnet/innehållet och ge en strukturerad rekommendation för kursupplägg.
         
         Basera din analys på:
         - Önskad nivå: ${comprehensiveLevel === 'beginner' ? 'nybörjare' : comprehensiveLevel === 'intermediate' ? 'medel' : 'avancerad'}
         - Kurslängd: ${presetParams.duration} minuter
         
         Svara ENDAST med giltig JSON.`
      : `You are an expert in course design and educational planning.
         Analyze the topic/content and provide a structured recommendation for the course layout.
         
         Base your analysis on:
         - Target level: ${comprehensiveLevel}
         - Course length: ${presetParams.duration} minutes
         
         Respond ONLY with valid JSON.`;

    const userPrompt = language === 'sv'
      ? `Analysera detta ämne/innehåll för kursstruktur:

${title ? `Kurstitel: "${title}"` : ''}
${content ? `Uppladdad innehåll:\n${content.substring(0, 3000)}...` : ''}

Ge en rekommendation för kursstruktur i detta JSON-format:
{
  "estimatedModules": <antal moduler, ${presetParams.minModules}-${presetParams.maxModules}>,
  "estimatedSubmodulesPerModule": <antal delämnen per modul, 2-5>,
  "estimatedSlidesPerModule": <antal slides per modul, 10-25>,
  "estimatedTotalSlides": <totalt antal slides>,
  "estimatedDurationMinutes": <uppskattad längd i minuter>,
  "confidence": <säkerhet 0-1>,
  "reasoning": "Kort motivering för rekommendationen på svenska"
}`
      : `Analyze this topic/content for course structure:

${title ? `Course title: "${title}"` : ''}
${content ? `Uploaded content:\n${content.substring(0, 3000)}...` : ''}

Provide a recommendation for course structure in this JSON format:
{
  "estimatedModules": <number of modules, ${presetParams.minModules}-${presetParams.maxModules}>,
  "estimatedSubmodulesPerModule": <subtopics per module, 2-5>,
  "estimatedSlidesPerModule": <slides per module, 10-25>,
  "estimatedTotalSlides": <total slides>,
  "estimatedDurationMinutes": <estimated duration in minutes>,
  "confidence": <confidence 0-1>,
  "reasoning": "Brief reasoning for the recommendation"
}`;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let jsonContent = responseContent;
    const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const preview = JSON.parse(jsonContent);
    
    // Apply level multiplier to estimates
    const adjustedPreview = {
      ...preview,
      estimatedModules: Math.round(preview.estimatedModules * levelMultiplier),
      estimatedSlidesPerModule: Math.round(preview.estimatedSlidesPerModule * levelMultiplier),
      estimatedTotalSlides: Math.round(preview.estimatedTotalSlides * levelMultiplier),
      estimatedDurationMinutes: Math.round(preview.estimatedDurationMinutes * levelMultiplier),
    };

    console.log('Structure preview generated:', adjustedPreview);

    return new Response(JSON.stringify({ preview: adjustedPreview }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error analyzing course structure:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

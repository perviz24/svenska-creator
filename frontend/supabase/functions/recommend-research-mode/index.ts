import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEARCH_MODES = {
  general: {
    id: 'general',
    name: 'Snabb',
    model: 'sonar',
    description: 'Fast, lightweight search for quick answers',
    bestFor: 'Quick fact-checking, simple questions, general overviews',
  },
  academic: {
    id: 'academic',
    name: 'Akademisk',
    model: 'sonar-pro',
    description: 'Multi-step reasoning with academic focus',
    bestFor: 'Research papers, scholarly content, scientific topics, educational material requiring citations',
  },
  deep: {
    id: 'deep',
    name: 'Djup',
    model: 'sonar-reasoning',
    description: 'Chain-of-thought reasoning with comprehensive analysis',
    bestFor: 'Complex topics, technical subjects, detailed explanations, multi-faceted issues',
  },
  expert: {
    id: 'expert',
    name: 'Expert',
    model: 'sonar-reasoning-pro',
    description: 'Advanced reasoning for expert-level analysis',
    bestFor: 'Highly specialized topics, professional-grade content, nuanced analysis',
  },
  research: {
    id: 'research',
    name: 'Forskning',
    model: 'sonar-deep-research',
    description: 'Expert research with multi-query analysis',
    bestFor: 'In-depth research projects, thesis-level content, comprehensive literature reviews',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { courseTitle, courseOutline, language = 'sv' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const modesDescription = Object.values(RESEARCH_MODES)
      .map(m => `- ${m.id}: ${m.name} (${m.model}) - ${m.description}. Best for: ${m.bestFor}`)
      .join('\n');

    const systemPrompt = `You are an expert at analyzing course content and recommending the optimal research approach.

Available research modes:
${modesDescription}

Analyze the course title and outline to recommend the BEST research mode. Consider:
1. Topic complexity and depth
2. Academic vs practical nature
3. Need for citations and sources
4. Technical vs general audience
5. Scope of research needed

Respond in JSON format:
{
  "recommendedMode": "mode_id",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation in ${language === 'sv' ? 'Swedish' : 'English'}",
  "alternativeMode": "second_best_mode_id",
  "alternativeReasoning": "Why this could also work"
}`;

    const userPrompt = `Analyze this course and recommend the optimal research mode:

COURSE TITLE: ${courseTitle || 'Not specified'}

COURSE OUTLINE:
${courseOutline || 'Not provided'}

Based on the topic complexity, academic nature, and research needs, which research mode is optimal?`;

    console.log('Analyzing course for research mode recommendation...');

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const recommendation = JSON.parse(jsonMatch[0]);
    
    // Validate the recommended mode exists
    if (!RESEARCH_MODES[recommendation.recommendedMode as keyof typeof RESEARCH_MODES]) {
      recommendation.recommendedMode = 'academic'; // Default fallback
    }

    console.log('Recommendation:', recommendation);

    return new Response(JSON.stringify({
      success: true,
      recommendation: {
        mode: recommendation.recommendedMode,
        modeName: RESEARCH_MODES[recommendation.recommendedMode as keyof typeof RESEARCH_MODES]?.name,
        modelUsed: RESEARCH_MODES[recommendation.recommendedMode as keyof typeof RESEARCH_MODES]?.model,
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning,
        alternativeMode: recommendation.alternativeMode,
        alternativeReasoning: recommendation.alternativeReasoning,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error recommending research mode:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

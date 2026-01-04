import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendModelRequest {
  step: string;
  courseTitle: string;
  contentLength?: number;
  complexity?: 'low' | 'medium' | 'high';
}

const STEP_MODEL_RECOMMENDATIONS: Record<string, { 
  primary: string; 
  alternative: string; 
  reasoning: string;
}> = {
  'title': {
    primary: 'google/gemini-2.5-flash',
    alternative: 'openai/gpt-5-mini',
    reasoning: 'Fast model for quick title generation with good creativity',
  },
  'outline': {
    primary: 'google/gemini-2.5-pro',
    alternative: 'openai/gpt-5',
    reasoning: 'Complex reasoning needed for structured course design',
  },
  'script': {
    primary: 'openai/gpt-5',
    alternative: 'google/gemini-2.5-pro',
    reasoning: 'Best for long-form educational content with nuanced explanations',
  },
  'slides': {
    primary: 'google/gemini-2.5-flash',
    alternative: 'openai/gpt-5-mini',
    reasoning: 'Good balance of speed and quality for slide content',
  },
  'exercises': {
    primary: 'google/gemini-2.5-pro',
    alternative: 'openai/gpt-5',
    reasoning: 'Structured thinking for creating effective learning exercises',
  },
  'quiz': {
    primary: 'openai/gpt-5-mini',
    alternative: 'google/gemini-2.5-flash',
    reasoning: 'Efficient for generating multiple choice questions',
  },
  'research': {
    primary: 'google/gemini-2.5-pro',
    alternative: 'openai/gpt-5',
    reasoning: 'Superior context handling for research synthesis',
  },
  'review': {
    primary: 'openai/gpt-5-mini',
    alternative: 'google/gemini-2.5-flash-lite',
    reasoning: 'Fast and accurate for content review and editing',
  },
  'summary': {
    primary: 'google/gemini-2.5-flash',
    alternative: 'openai/gpt-5-nano',
    reasoning: 'Efficient summarization with good comprehension',
  },
  'translation': {
    primary: 'google/gemini-2.5-flash',
    alternative: 'openai/gpt-5-mini',
    reasoning: 'Strong multilingual capabilities with fast processing',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { step, courseTitle, contentLength, complexity }: RecommendModelRequest = await req.json();

    console.log(`Recommending model for step: ${step}, course: ${courseTitle}`);

    const baseRecommendation = STEP_MODEL_RECOMMENDATIONS[step] || STEP_MODEL_RECOMMENDATIONS['script'];

    // Adjust based on complexity
    let recommendation = { ...baseRecommendation };
    
    if (complexity === 'high' || (contentLength && contentLength > 5000)) {
      // For complex content, prefer more powerful models
      if (step === 'script' || step === 'outline') {
        recommendation = {
          primary: 'openai/gpt-5',
          alternative: 'google/gemini-2.5-pro',
          reasoning: `High complexity content requires the most capable model for accurate ${step} generation`,
        };
      }
    } else if (complexity === 'low' || (contentLength && contentLength < 500)) {
      // For simple content, prefer faster models
      recommendation = {
        primary: 'google/gemini-2.5-flash-lite',
        alternative: 'openai/gpt-5-nano',
        reasoning: `Simple content can use faster models for efficient ${step} generation`,
      };
    }

    // Generate dynamic reasoning based on course title
    const dynamicReasoning = `${recommendation.reasoning}. For "${courseTitle}", ${
      courseTitle.toLowerCase().includes('advanced') || courseTitle.toLowerCase().includes('expert')
        ? 'the advanced topic requires deeper analysis'
        : 'this model provides optimal balance of quality and speed'
    }.`;

    return new Response(
      JSON.stringify({
        recommendedModel: recommendation.primary,
        alternativeModel: recommendation.alternative,
        reasoning: dynamicReasoning,
        confidence: complexity === 'high' ? 0.95 : complexity === 'low' ? 0.85 : 0.9,
        stepSpecific: {
          step,
          modelStrengths: getModelStrengths(recommendation.primary),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error recommending model:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getModelStrengths(model: string): string[] {
  const strengths: Record<string, string[]> = {
    'openai/gpt-5': ['Complex reasoning', 'Long-form content', 'Nuanced explanations', 'High accuracy'],
    'openai/gpt-5-mini': ['Fast processing', 'Cost-effective', 'Good quality', 'Multimodal'],
    'openai/gpt-5-nano': ['Ultra-fast', 'Simple tasks', 'High volume'],
    'google/gemini-2.5-pro': ['Large context', 'Visual understanding', 'Complex reasoning'],
    'google/gemini-2.5-flash': ['Speed', 'Balanced quality', 'Multimodal'],
    'google/gemini-2.5-flash-lite': ['Fastest', 'Classification', 'Summarization'],
  };
  return strengths[model] || ['General purpose'];
}

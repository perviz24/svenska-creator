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
    const { script, moduleTitle, courseTitle, exerciseTemplate, exerciseCount = 3, language = 'sv' } = await req.json();

    if (!script) {
      throw new Error('Script content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const isSwedish = language === 'sv';

    let systemPrompt = isSwedish
      ? `Du är en expert på att skapa praktiska övningar för utbildning. Skapa engagerande och lärorika övningar som hjälper deltagarna att tillämpa kunskaperna från kursen. Varje övning ska ha:
- Tydlig titel och beskrivning
- Steg-för-steg instruktioner
- Förväntade lärandemål
- Bedömningskriterier
- Tidsuppskattning`
      : `You are an expert at creating practical exercises for education. Create engaging and educational exercises that help participants apply course knowledge. Each exercise should have:
- Clear title and description
- Step-by-step instructions
- Expected learning outcomes
- Assessment criteria
- Time estimate`;

    let userPrompt = isSwedish
      ? `Skapa ${exerciseCount} praktiska övningar baserade på följande kursinnehåll för modulen "${moduleTitle}" i kursen "${courseTitle}":\n\n${script}`
      : `Create ${exerciseCount} practical exercises based on the following course content for module "${moduleTitle}" in course "${courseTitle}":\n\n${script}`;

    // If template provided, include it
    if (exerciseTemplate) {
      userPrompt += isSwedish
        ? `\n\nAnvänd följande mall som referens för övningarnas format och stil:\n${exerciseTemplate}`
        : `\n\nUse the following template as reference for exercise format and style:\n${exerciseTemplate}`;
    }

    console.log(`Generating ${exerciseCount} exercises for module: ${moduleTitle}`);

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
              name: 'create_exercises',
              description: 'Create practical exercises for the course module',
              parameters: {
                type: 'object',
                properties: {
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string', description: 'Exercise title' },
                        description: { type: 'string', description: 'Brief description' },
                        type: { type: 'string', enum: ['individual', 'group', 'reflection', 'practical', 'case-study'] },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        estimatedTime: { type: 'number', description: 'Time in minutes' },
                        instructions: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Step-by-step instructions'
                        },
                        learningObjectives: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'What participants will learn'
                        },
                        materials: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Required materials or resources'
                        },
                        assessmentCriteria: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'How to evaluate completion'
                        },
                        sampleSolution: { type: 'string', description: 'Optional model answer or solution' }
                      },
                      required: ['id', 'title', 'description', 'type', 'difficulty', 'estimatedTime', 'instructions', 'learningObjectives']
                    }
                  }
                },
                required: ['exercises']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_exercises' } }
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
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'create_exercises') {
      throw new Error('Unexpected AI response format');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      exercises: result.exercises,
      moduleTitle,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-exercises:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

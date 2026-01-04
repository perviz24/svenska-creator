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
    const { script, moduleTitle, questionCount = 5, language = 'sv' } = await req.json();

    if (!script) {
      throw new Error('Script content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const isSwedish = language === 'sv';

    const systemPrompt = isSwedish
      ? `Du är en expert på att skapa pedagogiska quiz-frågor. Skapa engagerande flervalsfrågor baserade på kursinnehållet. Varje fråga ska testa förståelse, inte bara memorering. Inkludera förklaringar till rätt svar.`
      : `You are an expert at creating educational quiz questions. Create engaging multiple-choice questions based on course content. Each question should test understanding, not just memorization. Include explanations for correct answers.`;

    const userPrompt = isSwedish
      ? `Skapa ${questionCount} quiz-frågor baserade på följande kursinnehåll för modulen "${moduleTitle}":\n\n${script}\n\nSkapa varierande frågor som testar olika aspekter av innehållet.`
      : `Create ${questionCount} quiz questions based on the following course content for module "${moduleTitle}":\n\n${script}\n\nCreate varied questions that test different aspects of the content.`;

    console.log(`Generating ${questionCount} quiz questions for module: ${moduleTitle}`);

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
              name: 'create_quiz',
              description: 'Create a quiz with multiple choice questions',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        question: { type: 'string', description: 'The question text' },
                        options: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              text: { type: 'string' }
                            },
                            required: ['id', 'text']
                          },
                          minItems: 4,
                          maxItems: 4
                        },
                        correctOptionId: { type: 'string', description: 'ID of the correct option' },
                        explanation: { type: 'string', description: 'Explanation of why the answer is correct' },
                        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
                      },
                      required: ['id', 'question', 'options', 'correctOptionId', 'explanation', 'difficulty']
                    }
                  }
                },
                required: ['questions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_quiz' } }
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
    
    if (!toolCall || toolCall.function.name !== 'create_quiz') {
      throw new Error('Unexpected AI response format');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      questions: result.questions,
      moduleTitle,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-quiz:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

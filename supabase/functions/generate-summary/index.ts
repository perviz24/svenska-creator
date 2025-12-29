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
    const { script, moduleTitle, language = 'sv' } = await req.json();

    if (!script) {
      throw new Error('Script content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const isSwedish = language === 'sv';

    const systemPrompt = isSwedish
      ? `Du är en expert på att sammanfatta utbildningsinnehåll. Skapa en koncis och informativ sammanfattning som fångar de viktigaste punkterna och lärandemålen.`
      : `You are an expert at summarizing educational content. Create a concise and informative summary that captures the key points and learning objectives.`;

    const userPrompt = isSwedish
      ? `Sammanfatta följande kursmodul "${moduleTitle}":\n\n${script}\n\nInkludera:\n- Huvudpunkter (3-5 bullet points)\n- Nyckelbegrepp\n- Kort sammanfattning (2-3 meningar)`
      : `Summarize the following course module "${moduleTitle}":\n\n${script}\n\nInclude:\n- Key points (3-5 bullet points)\n- Key concepts\n- Brief summary (2-3 sentences)`;

    console.log(`Generating summary for module: ${moduleTitle}`);

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
              name: 'create_summary',
              description: 'Create a structured summary of the module',
              parameters: {
                type: 'object',
                properties: {
                  briefSummary: { type: 'string', description: '2-3 sentence overview' },
                  keyPoints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Main takeaways'
                  },
                  keyConcepts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        term: { type: 'string' },
                        definition: { type: 'string' }
                      },
                      required: ['term', 'definition']
                    }
                  },
                  actionItems: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Recommended next steps or actions'
                  }
                },
                required: ['briefSummary', 'keyPoints', 'keyConcepts']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_summary' } }
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
    
    if (!toolCall || toolCall.function.name !== 'create_summary') {
      throw new Error('Unexpected AI response format');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      summary: result,
      moduleTitle,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-summary:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

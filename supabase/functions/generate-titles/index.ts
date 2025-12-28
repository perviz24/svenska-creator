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
    const { title, language = 'sv' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Course title is required');
    }

    console.log('Generating title suggestions for:', title);

    const systemPrompt = language === 'sv' 
      ? `Du är en expert på att skapa engagerande kurstitlar för vårdutbildning. 
         Generera exakt 5 alternativa kurstitlar baserade på användarens input.
         Varje titel ska vara professionell, tydlig och attraktiv för vårdpersonal.
         Svara ENDAST med giltig JSON i detta format:
         {
           "suggestions": [
             {"id": "1", "title": "Titel här", "explanation": "Kort förklaring varför denna titel fungerar bra"},
             {"id": "2", "title": "Titel här", "explanation": "Kort förklaring"},
             {"id": "3", "title": "Titel här", "explanation": "Kort förklaring"},
             {"id": "4", "title": "Titel här", "explanation": "Kort förklaring"},
             {"id": "5", "title": "Titel här", "explanation": "Kort förklaring"}
           ]
         }`
      : `You are an expert at creating engaging course titles for healthcare education.
         Generate exactly 5 alternative course titles based on the user's input.
         Each title should be professional, clear, and appealing to healthcare professionals.
         Respond ONLY with valid JSON in this format:
         {
           "suggestions": [
             {"id": "1", "title": "Title here", "explanation": "Brief explanation of why this title works well"},
             {"id": "2", "title": "Title here", "explanation": "Brief explanation"},
             {"id": "3", "title": "Title here", "explanation": "Brief explanation"},
             {"id": "4", "title": "Title here", "explanation": "Brief explanation"},
             {"id": "5", "title": "Title here", "explanation": "Brief explanation"}
           ]
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
          { role: 'user', content: `Original course title/topic: "${title}"` }
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonContent);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-titles:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

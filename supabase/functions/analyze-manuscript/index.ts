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
    const { manuscript, moduleTitle, courseTitle, action, language = 'sv' } = await req.json();

    if (!manuscript) {
      throw new Error('Manuscript text is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const isSwedish = language === 'sv';

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'expand') {
      systemPrompt = isSwedish
        ? `Du är en expert på att skapa utbildningsmaterial. Din uppgift är att expandera och berika det givna materialet med mer detaljer, exempel och förklaringar. Behåll den ursprungliga strukturen men gör innehållet mer omfattande och pedagogiskt.`
        : `You are an expert at creating educational content. Your task is to expand and enrich the given material with more details, examples, and explanations. Keep the original structure but make the content more comprehensive and pedagogical.`;

      userPrompt = isSwedish
        ? `Expandera följande kursmaterial för modulen "${moduleTitle}" i kursen "${courseTitle}":\n\n${manuscript}\n\nGör innehållet mer detaljerat och lärorikt.`
        : `Expand the following course material for module "${moduleTitle}" in course "${courseTitle}":\n\n${manuscript}\n\nMake the content more detailed and educational.`;
    } else if (action === 'convert') {
      systemPrompt = isSwedish
        ? `Du är en expert på att skapa presentationsmanus. Konvertera det givna materialet till ett strukturerat manus som kan användas för att generera slides. Dela upp innehållet i tydliga sektioner med titlar. Varje sektion ska ha ett flytande manus som kan läsas upp.`
        : `You are an expert at creating presentation scripts. Convert the given material into a structured script that can be used to generate slides. Divide the content into clear sections with titles. Each section should have a flowing script that can be read aloud.`;

      userPrompt = isSwedish
        ? `Konvertera följande kursmaterial till ett presentationsmanus för modulen "${moduleTitle}" i kursen "${courseTitle}":\n\n${manuscript}\n\nStrukturera det i sektioner med titlar och manustext.`
        : `Convert the following course material into a presentation script for module "${moduleTitle}" in course "${courseTitle}":\n\n${manuscript}\n\nStructure it into sections with titles and script text.`;
    } else {
      // Default: analyze and improve
      systemPrompt = isSwedish
        ? `Du är en expert på att analysera och förbättra utbildningsmaterial. Analysera det givna materialet och föreslå förbättringar. Korrigera eventuella fel, förbättra strukturen och gör innehållet mer engagerande och pedagogiskt.`
        : `You are an expert at analyzing and improving educational content. Analyze the given material and suggest improvements. Correct any errors, improve structure, and make the content more engaging and pedagogical.`;

      userPrompt = isSwedish
        ? `Analysera och förbättra följande kursmaterial för modulen "${moduleTitle}" i kursen "${courseTitle}":\n\n${manuscript}`
        : `Analyze and improve the following course material for module "${moduleTitle}" in course "${courseTitle}":\n\n${manuscript}`;
    }

    console.log(`Processing manuscript with action: ${action}`);

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
              name: 'create_script',
              description: 'Create a structured script from the analyzed content',
              parameters: {
                type: 'object',
                properties: {
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Section title' },
                        content: { type: 'string', description: 'Section content/script text' },
                        slideMarkers: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Suggested slide content for this section'
                        }
                      },
                      required: ['title', 'content']
                    }
                  },
                  summary: { type: 'string', description: 'Brief summary of changes made' }
                },
                required: ['sections', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_script' } }
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
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'create_script') {
      throw new Error('Unexpected AI response format');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Calculate word count and duration
    const totalWords = result.sections.reduce((acc: number, s: any) => 
      acc + (s.content?.split(/\s+/).filter((w: string) => w).length || 0), 0);
    const estimatedDuration = Math.ceil(totalWords / 150);

    return new Response(JSON.stringify({
      sections: result.sections.map((s: any, idx: number) => ({
        id: `section-${idx}`,
        title: s.title,
        content: s.content,
        slideMarkers: s.slideMarkers || []
      })),
      summary: result.summary,
      totalWords,
      estimatedDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-manuscript:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

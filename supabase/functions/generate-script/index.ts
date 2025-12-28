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
    const { module, courseTitle, style = 'professional', language = 'sv' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!module) {
      throw new Error('Module data is required');
    }

    console.log('Generating script for module:', module.title);

    const systemPrompt = language === 'sv'
      ? `Du är en expert på att skriva manus för vårdutbildningsvideor.
         Skriv ett komplett manus för en utbildningsmodul på svenska.
         
         Stilen ska vara ${style === 'professional' ? 'professionell och tydlig' : style === 'conversational' ? 'konversationell och engagerande' : 'akademisk och formell'}.
         
         Manuset ska:
         - Vara cirka ${module.duration} minuter långt när det läses upp (ungefär 130 ord per minut)
         - Inkludera tydliga markeringar för bildbyten med formatet: [BILD: beskrivning av bilden]
         - Täcka alla lärandemål och delteman
         - Vara pedagogiskt och lätt att följa
         - Inkludera introduktion och sammanfattning
         
         Svara ENDAST med giltig JSON i detta format:
         {
           "script": {
             "moduleId": "${module.id}",
             "moduleTitle": "${module.title}",
             "totalWords": 0,
             "estimatedDuration": ${module.duration},
             "sections": [
               {
                 "id": "section-1",
                 "title": "Sektion titel",
                 "content": "Manustext här med [BILD: bildförslag] markeringar...",
                 "slideMarkers": ["BILD: beskrivning 1", "BILD: beskrivning 2"]
               }
             ]
           }
         }`
      : `You are an expert at writing scripts for healthcare education videos.
         Write a complete script for an educational module in English.
         
         The style should be ${style}.
         
         The script should:
         - Be approximately ${module.duration} minutes long when read aloud (about 130 words per minute)
         - Include clear markers for slide changes with the format: [SLIDE: description of the slide]
         - Cover all learning objectives and subtopics
         - Be pedagogical and easy to follow
         - Include an introduction and summary
         
         Respond ONLY with valid JSON in this format:
         {
           "script": {
             "moduleId": "${module.id}",
             "moduleTitle": "${module.title}",
             "totalWords": 0,
             "estimatedDuration": ${module.duration},
             "sections": [
               {
                 "id": "section-1",
                 "title": "Section title",
                 "content": "Script text here with [SLIDE: slide suggestion] markers...",
                 "slideMarkers": ["SLIDE: description 1", "SLIDE: description 2"]
               }
             ]
           }
         }`;

    const userPrompt = `Course: "${courseTitle}"
Module ${module.number}: "${module.title}"
Description: ${module.description}
Duration: ${module.duration} minutes

Learning Objectives:
${module.learningObjectives.map((lo: { text: string }) => `- ${lo.text}`).join('\n')}

Subtopics:
${module.subTopics.map((st: { title: string; duration: number }) => `- ${st.title} (${st.duration} min)`).join('\n')}

Write a complete, professional script for this module.`;

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

    console.log('Script generated successfully');

    // Parse JSON from response
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
    console.error('Error in generate-script:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

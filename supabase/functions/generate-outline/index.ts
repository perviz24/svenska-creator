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
    const { title, targetDuration = 60, style = 'professional', language = 'sv' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Course title is required');
    }

    console.log('Generating course outline for:', title, 'Duration:', targetDuration, 'minutes');

    const moduleCount = Math.max(4, Math.min(10, Math.floor(targetDuration / 8)));

    const systemPrompt = language === 'sv'
      ? `Du är en expert på att skapa kursplaner för vårdutbildning.
         Skapa en detaljerad kursöversikt med ${moduleCount} moduler för en kurs som är cirka ${targetDuration} minuter lång.
         Stilen ska vara ${style === 'professional' ? 'professionell' : style === 'conversational' ? 'konversationell' : 'akademisk'}.
         
         Svara ENDAST med giltig JSON i detta format:
         {
           "outline": {
             "title": "Kurstitel",
             "description": "En kort, engagerande beskrivning av kursen (2-3 meningar)",
             "totalDuration": ${targetDuration},
             "modules": [
               {
                 "id": "module-1",
                 "number": 1,
                 "title": "Modultitel",
                 "description": "Kort beskrivning av modulen",
                 "duration": 8,
                 "learningObjectives": [
                   {"id": "lo-1-1", "text": "Lärandemål 1"},
                   {"id": "lo-1-2", "text": "Lärandemål 2"}
                 ],
                 "subTopics": [
                   {"id": "st-1-1", "title": "Deltema 1", "duration": 3},
                   {"id": "st-1-2", "title": "Deltema 2", "duration": 5}
                 ]
               }
             ]
           }
         }
         
         Varje modul ska ha 2-4 lärandemål och 2-4 delteman.
         Summan av alla modulers längd ska vara ungefär ${targetDuration} minuter.`
      : `You are an expert at creating course outlines for healthcare education.
         Create a detailed course outline with ${moduleCount} modules for a course that is approximately ${targetDuration} minutes long.
         The style should be ${style}.
         
         Respond ONLY with valid JSON in this format:
         {
           "outline": {
             "title": "Course Title",
             "description": "A short, engaging description of the course (2-3 sentences)",
             "totalDuration": ${targetDuration},
             "modules": [
               {
                 "id": "module-1",
                 "number": 1,
                 "title": "Module Title",
                 "description": "Brief description of the module",
                 "duration": 8,
                 "learningObjectives": [
                   {"id": "lo-1-1", "text": "Learning objective 1"},
                   {"id": "lo-1-2", "text": "Learning objective 2"}
                 ],
                 "subTopics": [
                   {"id": "st-1-1", "title": "Subtopic 1", "duration": 3},
                   {"id": "st-1-2", "title": "Subtopic 2", "duration": 5}
                 ]
               }
             ]
           }
         }
         
         Each module should have 2-4 learning objectives and 2-4 subtopics.
         The sum of all module durations should be approximately ${targetDuration} minutes.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a course outline for: "${title}"` }
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

    console.log('AI response received, parsing...');

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
    console.error('Error in generate-outline:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
      targetDuration = 60, 
      style = 'professional', 
      language = 'sv',
      maxModules = 10,
      slidesPerModule = 15,
      comprehensiveLevel = 'intermediate',
      courseLengthPreset = 'standard',
      demoMode = false
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Course title is required');
    }

    console.log('Generating course outline for:', title);
    console.log('Settings - Duration:', targetDuration, 'Modules:', maxModules, 'Level:', comprehensiveLevel, 'Demo:', demoMode);

    // In demo mode: very short output (2 modules, minimal content)
    const effectiveMaxModules = demoMode ? 2 : maxModules;
    const effectiveDuration = demoMode ? 5 : targetDuration;
    
    // Use provided maxModules or calculate based on duration
    const moduleCount = demoMode ? 2 : Math.max(3, Math.min(effectiveMaxModules, Math.ceil(effectiveDuration / 6)));
    
    // Adjust detail level based on demo mode and comprehensiveness
    const detailMultiplier: Record<string, number> = {
      beginner: 0.7,
      intermediate: 1.0,
      advanced: 1.3,
    };
    const multiplier = demoMode ? 0.5 : (detailMultiplier[comprehensiveLevel] || 1.0);
    const subTopicsPerModule = demoMode ? 2 : Math.round(3 * multiplier);
    const learningObjectivesPerModule = demoMode ? 2 : Math.round(3 * multiplier);

    // Use effective duration for prompts
    const promptDuration = demoMode ? 5 : effectiveDuration;

    const levelDescriptionsSv: Record<string, string> = {
      beginner: 'grundläggande nivå för nybörjare',
      intermediate: 'mellannivå med balanserat djup',
      advanced: 'avancerad nivå med djupgående innehåll',
    };
    const levelDescSv = levelDescriptionsSv[comprehensiveLevel] || 'mellannivå';

    const demoInstructionSv = demoMode 
      ? 'VIKTIGT: Detta är en demo-version. Håll innehållet MYCKET kort och koncist. Endast 2 moduler med 2 delämnen vardera. Totalt max 5 minuter.'
      : '';
    
    const demoInstructionEn = demoMode
      ? 'IMPORTANT: This is a demo version. Keep content VERY short and concise. Only 2 modules with 2 subtopics each. Total max 5 minutes.'
      : '';

    const systemPrompt = language === 'sv'
      ? `Du är en expert på att skapa kursplaner för vårdutbildning.
         Skapa en detaljerad kursöversikt med ${moduleCount} moduler för en kurs som är cirka ${promptDuration} minuter lång.
         Kursen ska vara på ${levelDescSv}.
         Stilen ska vara ${style === 'professional' ? 'professionell' : style === 'conversational' ? 'konversationell' : 'akademisk'}.
         ${demoInstructionSv}
         
         Svara ENDAST med giltig JSON i detta format:
         {
           "outline": {
             "title": "Kurstitel",
             "description": "En kort, engagerande beskrivning av kursen (1-2 meningar)",
             "totalDuration": ${promptDuration},
             "modules": [
               {
                 "id": "module-1",
                 "number": 1,
                 "title": "Modultitel",
                 "description": "Kort beskrivning av modulen",
                 "duration": ${demoMode ? 2 : 8},
                 "learningObjectives": [
                   {"id": "lo-1-1", "text": "Lärandemål 1"},
                   {"id": "lo-1-2", "text": "Lärandemål 2"}
                 ],
                 "subTopics": [
                   {"id": "st-1-1", "title": "Deltema 1", "duration": ${demoMode ? 1 : 3}},
                   {"id": "st-1-2", "title": "Deltema 2", "duration": ${demoMode ? 1 : 5}}
                 ]
               }
             ]
           }
         }
         
         Varje modul ska ha ${learningObjectivesPerModule} lärandemål och ${subTopicsPerModule} delteman.
         Summan av alla modulers längd ska vara ungefär ${promptDuration} minuter.`
      : `You are an expert at creating course outlines for healthcare education.
         Create a detailed course outline with ${moduleCount} modules for a course that is approximately ${promptDuration} minutes long.
         The course should be at ${comprehensiveLevel} level.
         The style should be ${style}.
         ${demoInstructionEn}
         
         Respond ONLY with valid JSON in this format:
         {
           "outline": {
             "title": "Course Title",
             "description": "A short, engaging description of the course (1-2 sentences)",
             "totalDuration": ${promptDuration},
             "modules": [
               {
                 "id": "module-1",
                 "number": 1,
                 "title": "Module Title",
                 "description": "Brief description of the module",
                 "duration": ${demoMode ? 2 : 8},
                 "learningObjectives": [
                   {"id": "lo-1-1", "text": "Learning objective 1"},
                   {"id": "lo-1-2", "text": "Learning objective 2"}
                 ],
                 "subTopics": [
                   {"id": "st-1-1", "title": "Subtopic 1", "duration": ${demoMode ? 1 : 3}},
                   {"id": "st-1-2", "title": "Subtopic 2", "duration": ${demoMode ? 1 : 5}}
                 ]
               }
             ]
           }
         }
         
         Each module should have ${learningObjectivesPerModule} learning objectives and ${subTopicsPerModule} subtopics.
         The sum of all module durations should be approximately ${promptDuration} minutes.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
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

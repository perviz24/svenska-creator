import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache utilities
async function generateCacheKey(functionName: string, params: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ functionName, params }));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCachedResponse(supabase: any, cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response, id, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    // Update hit count in background
    supabase
      .from('ai_response_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('id', data.id)
      .then(() => console.log('Cache hit count updated'));
    
    console.log('Cache HIT for key:', cacheKey.substring(0, 16) + '...');
    return data.response;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

async function setCachedResponse(
  supabase: any,
  cacheKey: string,
  functionName: string,
  requestHash: string,
  response: any,
  ttlHours: number = 24
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('ai_response_cache')
      .upsert({
        cache_key: cacheKey,
        function_name: functionName,
        request_hash: requestHash,
        response,
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
    
    console.log('Response cached with TTL:', ttlHours, 'hours');
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

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
      demoMode = false,
      skipCache = false
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Course title is required');
    }

    // Initialize Supabase client for caching
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Create cache key from relevant parameters
    const cacheParams = { title, targetDuration, style, language, maxModules, comprehensiveLevel, courseLengthPreset, demoMode };
    const cacheKey = await generateCacheKey('generate-outline', cacheParams);

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const cachedResponse = await getCachedResponse(supabase, cacheKey);
      if (cachedResponse) {
        return new Response(JSON.stringify({ ...cachedResponse, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Cache MISS - generating new outline for:', title);
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

    // Cache the response (24 hour TTL for outlines)
    await setCachedResponse(supabase, cacheKey, 'generate-outline', cacheKey, parsed, 24);

    return new Response(JSON.stringify({ ...parsed, fromCache: false }), {
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

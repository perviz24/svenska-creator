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

// Professional exercise template based on GeniusMotion format
const DEFAULT_EXERCISE_TEMPLATE = `
ÖVNINGSFORMAT (Professionell mall):

# Övning [nummer]: [Titel]

## Syfte
[Beskriv vad deltagaren ska lära sig/uppnå]

## Del 1: [Huvudavsnitt]
### [Underrubrik]
[Beskrivning eller kontext]

**[Kategorinamn]:**
- □ Alternativ 1
- □ Alternativ 2
- □ Alternativ 3
- □ Annat: _______________________________

## Del 2: [Annat huvudavsnitt]
### [Kategori med checkboxar]
- □ Punkt 1
- □ Punkt 2
- □ Punkt 3

### [Öppen fråga/reflektion]
1. ________________________________
2. ________________________________

## Del 3: [Sammanfattning/Rangordning]
**Rangordna dina svar:**

**[Kategori 1]:**
1.
2.

**[Kategori 2]:**
- □ Val 1
- □ Val 2
- □ Val 3

---
Formatteringsregler:
- Använd checkboxar (□) för flervalsfrågor
- Använd numrerade listor för öppna svar
- Använd understreck (___) för fritextfält
- Dela upp i tydliga delar (Del 1, Del 2, etc.)
- Inkludera alltid "Annat:" som alternativ
- Avsluta med företagets/kursens footer
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      script, 
      moduleTitle, 
      courseTitle, 
      exerciseTemplate, 
      exerciseCount = 3, 
      language = 'sv',
      exerciseType = 'mixed',
      skipCache = false
    } = await req.json();

    if (!script) {
      throw new Error('Script content is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client for caching
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Create cache key
    const scriptSample = typeof script === 'string' ? script.substring(0, 500) : JSON.stringify(script).substring(0, 500);
    const cacheParams = { scriptSample, moduleTitle, courseTitle, exerciseCount, language, exerciseType };
    const cacheKey = await generateCacheKey('generate-exercises', cacheParams);

    // Check cache first
    if (!skipCache) {
      const cachedResponse = await getCachedResponse(supabase, cacheKey);
      if (cachedResponse) {
        return new Response(JSON.stringify({ ...cachedResponse, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Cache MISS - generating ${exerciseCount} exercises for module: ${moduleTitle}`);

    const isSwedish = language === 'sv';
    const templateToUse = exerciseTemplate || DEFAULT_EXERCISE_TEMPLATE;

    let systemPrompt = isSwedish
      ? `Du är en expert på att skapa professionella, interaktiva övningar för utbildning inom vård och omsorg.

Skapa övningar med följande struktur (baserat på mallen):
1. Tydlig titel med övningsnummer
2. Syfte - vad deltagaren ska uppnå
3. Flera delar (Del 1, Del 2, Del 3) med olika typer av uppgifter:
   - Checkboxlistor med □ för flerval
   - Kategoriserade alternativ (Fysiska, Mentala, Känslomässiga, etc.)
   - Öppna reflektionsfrågor med numrerade linjer
   - Rangordningsuppgifter
   - Fritextfält markerade med ___
4. Alltid inkludera "Annat: ___" som ett alternativ
5. Avsluta med en professionell footer

Övningarna ska vara:
- Praktiskt tillämpbara
- Självreflekterande
- Kopplade till verkliga arbetsscenarier
- Anpassade för individuell genomgång`
      : `You are an expert at creating professional, interactive exercises for healthcare education.

Create exercises with the following structure (based on the template):
1. Clear title with exercise number
2. Purpose - what the participant should achieve
3. Multiple parts (Part 1, Part 2, Part 3) with different task types:
   - Checkbox lists with □ for multiple choice
   - Categorized options (Physical, Mental, Emotional, etc.)
   - Open reflection questions with numbered lines
   - Ranking tasks
   - Free text fields marked with ___
4. Always include "Other: ___" as an option
5. End with a professional footer

Exercises should be:
- Practically applicable
- Self-reflective
- Connected to real work scenarios
- Adapted for individual completion`;

    let userPrompt = isSwedish
      ? `Skapa ${exerciseCount} professionella övningar baserade på följande kursinnehåll för modulen "${moduleTitle}" i kursen "${courseTitle}".

Övningstyp: ${exerciseType === 'mixed' ? 'Blandade typer (checklistor, reflektion, praktiska)' : exerciseType}

KURSINNEHÅLL:
${script}

MALL ATT FÖLJA:
${templateToUse}

Viktigt:
- Följ mallens format exakt med checkboxar (□), numrerade listor och delar
- Anpassa innehållet till kursämnet men behåll strukturen
- Inkludera alltid "Annat: ___" som alternativ
- Skapa varierande övningstyper om "mixed" är valt`
      : `Create ${exerciseCount} professional exercises based on the following course content for module "${moduleTitle}" in course "${courseTitle}".

Exercise type: ${exerciseType === 'mixed' ? 'Mixed types (checklists, reflection, practical)' : exerciseType}

COURSE CONTENT:
${script}

TEMPLATE TO FOLLOW:
${templateToUse}

Important:
- Follow the template format exactly with checkboxes (□), numbered lists and parts
- Adapt content to the course topic but keep the structure
- Always include "Other: ___" as an option
- Create varied exercise types if "mixed" is selected`;

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
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_exercises',
              description: 'Create professional exercises with structured format',
              parameters: {
                type: 'object',
                properties: {
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string', description: 'Exercise title with number, e.g. "Övning 1.2: Titel"' },
                        purpose: { type: 'string', description: 'The purpose/syfte of the exercise' },
                        type: { type: 'string', enum: ['checklist', 'reflection', 'practical', 'case-study', 'self-assessment'] },
                        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                        estimatedTime: { type: 'number', description: 'Time in minutes' },
                        parts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              partNumber: { type: 'number' },
                              partTitle: { type: 'string' },
                              sections: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    sectionTitle: { type: 'string' },
                                    sectionType: { type: 'string', enum: ['checkbox-list', 'numbered-list', 'free-text', 'ranking', 'description'] },
                                    description: { type: 'string' },
                                    items: {
                                      type: 'array',
                                      items: { type: 'string' }
                                    },
                                    includeOther: { type: 'boolean', description: 'Whether to include "Annat: ___" option' }
                                  },
                                  required: ['sectionTitle', 'sectionType']
                                }
                              }
                            },
                            required: ['partNumber', 'partTitle', 'sections']
                          }
                        },
                        learningObjectives: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'What participants will learn'
                        },
                        footer: { type: 'string', description: 'Professional footer text' }
                      },
                      required: ['id', 'title', 'purpose', 'type', 'difficulty', 'estimatedTime', 'parts', 'learningObjectives']
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
    const responseData = { exercises: result.exercises, moduleTitle };

    // Cache the response (24 hour TTL)
    await setCachedResponse(supabase, cacheKey, 'generate-exercises', cacheKey, responseData, 24);

    return new Response(JSON.stringify({ ...responseData, fromCache: false }), {
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

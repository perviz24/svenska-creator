import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchResearch(topic: string, context: string, language: string): Promise<{ research: string; citations: string[] }> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!PERPLEXITY_API_KEY) {
    console.log('Perplexity not configured, skipping research');
    return { research: '', citations: [] };
  }

  try {
    const systemPrompt = language === 'sv'
      ? `Du är en forskningsassistent. Ge kortfattad, faktabaserad information med källor. Max 300 ord.`
      : `You are a research assistant. Provide concise, fact-based information with sources. Max 300 words.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Research for healthcare education: ${topic}\nContext: ${context}` }
        ],
        search_recency_filter: 'year',
      }),
    });

    if (!response.ok) {
      console.error('Perplexity error:', response.status);
      return { research: '', citations: [] };
    }

    const data = await response.json();
    return {
      research: data.choices?.[0]?.message?.content || '',
      citations: data.citations || []
    };
  } catch (error) {
    console.error('Research fetch error:', error);
    return { research: '', citations: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      module, 
      courseTitle, 
      style = 'professional', 
      language = 'sv', 
      enableResearch = true, 
      demoMode = false,
      medicalDomain = true, // Enable medical terminology by default
      targetAudience = 'medical_professionals' // 'medical_professionals', 'nurses', 'general'
    } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!module) {
      throw new Error('Module data is required');
    }

    console.log('Generating script for module:', module.title, 'with research:', enableResearch, 'demo:', demoMode, 'medical:', medicalDomain);

    // Skip research in demo mode for faster generation
    let researchData = { research: '', citations: [] as string[] };
    if (enableResearch && !demoMode) {
      researchData = await fetchResearch(module.title, courseTitle, language);
      console.log('Research fetched with', researchData.citations.length, 'citations');
    }

    const researchSection = researchData.research 
      ? `\n\nRELEVANT RESEARCH AND FACTS:\n${researchData.research}\n\nSOURCES TO CITE:\n${researchData.citations.map((c, i) => `[${i + 1}] ${c}`).join('\n')}`
      : '';

    // Demo mode: very short script (2 min, ~260 words)
    const effectiveDuration = demoMode ? 2 : module.duration;
    const wordsPerMinute = 130;
    const targetWords = demoMode ? 260 : effectiveDuration * wordsPerMinute;

    const demoInstructionSv = demoMode 
      ? 'VIKTIGT: Detta är en DEMO. Skriv ett MYCKET kort manus på max 260 ord (2 min). Bara 2 korta sektioner. Inga långa förklaringar.'
      : '';
    
    const demoInstructionEn = demoMode
      ? 'IMPORTANT: This is a DEMO. Write a VERY short script of max 260 words (2 min). Only 2 short sections. No long explanations.'
      : '';

    // Medical domain-specific instructions
    const medicalGuidelinesSv = medicalDomain ? `
MEDICINSKA RIKTLINJER (KRITISKT):
- Använd korrekt medicinsk terminologi på svenska (t.ex. "hypertoni" inte "högt blodtryck" i professionellt sammanhang)
- Ange alltid evidensgrad för påståenden (t.ex. "enligt aktuella riktlinjer", "stark evidens visar")
- Inkludera doseringar, indikationer och kontraindikationer där relevant
- Följ svenska vårdpraxis och Läkemedelsverkets rekommendationer
- Använd SI-enheter konsekvent
- Vid osäkerhet, var tydlig med begränsningar ("konsultera alltid aktuella riktlinjer")
- Undvik generaliseringar - var specifik med patientgrupper och tillstånd
- Inkludera praktiska kliniska tips och fallgropar att undvika

MÅLGRUPP: ${targetAudience === 'medical_professionals' ? 'Läkare och specialister' : targetAudience === 'nurses' ? 'Sjuksköterskor och vårdpersonal' : 'Vårdpersonal'}
` : '';

    const medicalGuidelinesEn = medicalDomain ? `
MEDICAL GUIDELINES (CRITICAL):
- Use correct medical terminology appropriate for healthcare professionals
- Always indicate evidence level for claims (e.g., "current guidelines recommend", "strong evidence shows")
- Include dosages, indications, and contraindications where relevant
- Follow evidence-based practice standards
- Use SI units consistently
- When uncertain, be clear about limitations ("always consult current guidelines")
- Avoid generalizations - be specific about patient populations and conditions
- Include practical clinical tips and pitfalls to avoid

TARGET AUDIENCE: ${targetAudience === 'medical_professionals' ? 'Physicians and specialists' : targetAudience === 'nurses' ? 'Nurses and healthcare staff' : 'Healthcare workers'}
` : '';

    const systemPrompt = language === 'sv'
      ? `Du är en expert på att skriva manus för medicinsk utbildning och vårdutbildningsvideor.
         Skriv ett komplett manus för en utbildningsmodul på svenska.
         ${demoInstructionSv}
         ${medicalGuidelinesSv}
         
         Stilen ska vara ${style === 'professional' ? 'professionell och tydlig med auktoritet' : style === 'conversational' ? 'konversationell men fortfarande kliniskt korrekt' : 'akademisk och formell med vetenskaplig precision'}.
         
         Manuset ska:
         - Vara cirka ${effectiveDuration} minuter långt (${targetWords} ord)
         - Inkludera tydliga markeringar för bildbyten med formatet: [BILD: beskrivning av bilden]
         - Vara pedagogiskt strukturerat med tydlig progression
         - Använda kliniska exempel och case där det förstärker förståelsen
         ${demoMode ? '- MAX 2 sektioner, väldigt kort' : '- Täcka alla lärandemål och delteman systematiskt'}
         ${researchData.citations.length > 0 ? '- Integrera den forskning och de källor som tillhandahålls naturligt, med inline-citeringar [1], [2] etc.' : ''}
         - Avsluta varje sektion med en kort sammanfattning av nyckelbudskapen
         
         Svara ENDAST med giltig JSON i detta format:
         {
           "script": {
             "moduleId": "${module.id}",
             "moduleTitle": "${module.title}",
             "totalWords": ${targetWords},
             "estimatedDuration": ${effectiveDuration},
             "citations": [],
             "medicalTerms": [],
             "sections": [
               {
                 "id": "section-1",
                 "title": "Sektion titel",
                 "content": "Manustext här med [BILD: bildförslag] markeringar...",
                 "slideMarkers": ["BILD: beskrivning 1"],
                 "keyTakeaways": ["Nyckelbudskap 1", "Nyckelbudskap 2"],
                 "estimatedDurationSeconds": 120
               }
             ]
           }
         }`
      : `You are an expert at writing scripts for medical education and healthcare training videos.
         Write a complete script for an educational module in English.
         ${demoInstructionEn}
         ${medicalGuidelinesEn}
         
         The style should be ${style === 'professional' ? 'professional and authoritative' : style === 'conversational' ? 'conversational but clinically accurate' : 'academic with scientific precision'}.
         
         The script should:
         - Be approximately ${effectiveDuration} minutes long (${targetWords} words)
         - Include clear markers for slide changes with the format: [SLIDE: description of the slide]
         - Be pedagogically structured with clear progression
         - Use clinical examples and cases where they enhance understanding
         ${demoMode ? '- MAX 2 sections, very short' : '- Cover all learning objectives and subtopics systematically'}
         ${researchData.citations.length > 0 ? '- Naturally integrate the provided research with inline citations [1], [2] etc.' : ''}
         - End each section with a brief summary of key messages
         
         Respond ONLY with valid JSON in this format:
         {
           "script": {
             "moduleId": "${module.id}",
             "moduleTitle": "${module.title}",
             "totalWords": ${targetWords},
             "estimatedDuration": ${effectiveDuration},
             "citations": [],
             "medicalTerms": [],
             "sections": [
               {
                 "id": "section-1",
                 "title": "Section title",
                 "content": "Script text here with [SLIDE: slide suggestion] markers...",
                 "slideMarkers": ["SLIDE: description 1"],
                 "keyTakeaways": ["Key message 1", "Key message 2"],
                 "estimatedDurationSeconds": 120
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
${researchSection}

Write a complete, evidence-based professional script for this medical education module.`;

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
    
    // Add citations from research to the script
    if (researchData.citations.length > 0 && parsed.script) {
      parsed.script.citations = researchData.citations;
    }

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

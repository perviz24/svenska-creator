import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIAction = 'improve' | 'expand' | 'simplify' | 'shorten' | 'translate' | 'professional' | 'conversational' | 'custom';
type ContentType = 'title' | 'description' | 'outline' | 'script' | 'slide' | 'exercise' | 'quiz';

const ACTION_PROMPTS: Record<AIAction, string> = {
  improve: 'Förbättra denna text. Gör den tydligare, mer engagerande och professionell. Behåll samma längd och ton.',
  expand: 'Expandera denna text med mer detaljer, exempel och förklaringar. Behåll samma stil och ton.',
  simplify: 'Förenkla denna text. Använd enklare ord och kortare meningar. Gör den lättare att förstå.',
  shorten: 'Korta ner denna text till det väsentliga. Behåll huvudbudskapet men ta bort onödiga detaljer.',
  translate: 'Översätt denna text till engelska om den är på svenska, eller till svenska om den är på engelska.',
  professional: 'Omformulera denna text med en mer professionell och formell ton. Behåll innehållet.',
  conversational: 'Omformulera denna text med en mer avslappnad och konversationell ton. Behåll innehållet.',
  custom: '', // Will be provided via customInstruction
};

const CONTENT_CONTEXT: Record<ContentType, string> = {
  title: 'Detta är en kurstitel för en utbildning.',
  description: 'Detta är en beskrivning för utbildningsmaterial.',
  outline: 'Detta är en kursöversikt eller modulbeskrivning.',
  script: 'Detta är ett manus för en utbildningsvideo eller presentation.',
  slide: 'Detta är innehåll för en presentationsslide.',
  exercise: 'Detta är en övning för kursdeltagare.',
  quiz: 'Detta är en quizfråga eller svar för kunskapstest.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      action, 
      customInstruction,
      contentType,
      context,
      language = 'sv'
    } = await req.json();

    if (!content) {
      throw new Error('Content is required');
    }

    if (!action) {
      throw new Error('Action is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const isSwedish = language === 'sv';
    const contentContext = CONTENT_CONTEXT[contentType as ContentType] || '';
    
    let actionPrompt = ACTION_PROMPTS[action as AIAction] || '';
    if (action === 'custom' && customInstruction) {
      actionPrompt = customInstruction;
    }

    const systemPrompt = isSwedish
      ? `Du är en expert redaktör som hjälper till att förbättra utbildningsinnehåll.
${contentContext}
${context ? `Kontext: ${context}` : ''}

Regler:
- Svara ENDAST med den omarbetade texten
- Ingen inledning, förklaring eller kommentarer
- Behåll originalspråket om inget annat anges
- Följ instruktionen exakt`
      : `You are an expert editor helping to improve educational content.
${contentContext}
${context ? `Context: ${context}` : ''}

Rules:
- Respond ONLY with the revised text
- No introduction, explanation, or comments
- Keep the original language unless instructed otherwise
- Follow the instruction exactly`;

    const userPrompt = isSwedish
      ? `${actionPrompt}\n\nOriginaltext:\n${content}`
      : `${actionPrompt}\n\nOriginal text:\n${content}`;

    console.log(`AI Review: ${action} on ${contentType}`);

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
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error('No result from AI');
    }

    console.log('AI Review completed successfully');

    return new Response(JSON.stringify({
      result: result.trim(),
      action,
      contentType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-review-edit:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

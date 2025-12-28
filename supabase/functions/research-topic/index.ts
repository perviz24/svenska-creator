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
    const { topic, context, language = 'sv' } = await req.json();
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    if (!topic) {
      throw new Error('Topic is required');
    }

    console.log('Researching topic:', topic);

    const systemPrompt = language === 'sv'
      ? `Du är en forskningsassistent som hittar aktuell och pålitlig information om vårdämnen.
         Samla relevant, faktabaserad information med citat från pålitliga källor.
         Fokusera på:
         - Aktuella riktlinjer och bästa praxis
         - Statistik och forskningsresultat
         - Praktiska tillämpningar i vården
         
         Svara på svenska med tydliga källhänvisningar.`
      : `You are a research assistant that finds current and reliable information about healthcare topics.
         Gather relevant, fact-based information with citations from reliable sources.
         Focus on:
         - Current guidelines and best practices
         - Statistics and research findings
         - Practical applications in healthcare
         
         Respond with clear source citations.`;

    const userPrompt = context 
      ? `Research the following topic in the context of ${context}:\n\n${topic}`
      : `Research the following healthcare education topic:\n\n${topic}`;

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
          { role: 'user', content: userPrompt }
        ],
        search_recency_filter: 'year',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const citations = data.citations || [];
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    console.log('Research completed with', citations.length, 'citations');

    return new Response(JSON.stringify({
      research: content,
      citations: citations,
      topic: topic
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in research-topic:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

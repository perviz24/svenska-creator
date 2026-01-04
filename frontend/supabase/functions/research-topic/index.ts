import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Research modes with optimized configurations
const RESEARCH_MODES = {
  general: {
    model: 'sonar-pro', // Multi-step reasoning with 2x more citations
    recencyFilter: 'year',
    description: 'General research with comprehensive citations'
  },
  academic: {
    model: 'sonar-reasoning', // Chain-of-thought reasoning
    recencyFilter: 'year',
    searchMode: 'academic',
    description: 'Academic and peer-reviewed sources'
  },
  deep: {
    model: 'sonar-deep-research', // Expert research with multi-query analysis
    recencyFilter: 'year',
    description: 'Deep multi-query expert analysis'
  },
  quick: {
    model: 'sonar', // Fast, lightweight
    recencyFilter: 'month',
    description: 'Quick overview with recent sources'
  },
  reasoning: {
    model: 'sonar-reasoning-pro', // Advanced reasoning based on DeepSeek R1
    recencyFilter: 'year',
    description: 'Complex reasoning with step-by-step analysis'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      context, 
      language = 'sv',
      researchMode = 'general', // 'general', 'academic', 'deep', 'quick', 'reasoning'
      knowledgeBase, // Optional: uploaded content to include in research
      urlsToScrape, // Optional: URLs to include in research context
      domainFilter, // Optional: specific domains to search
      dateFilter, // Optional: 'day', 'week', 'month', 'year'
      maxCitations = 10
    } = await req.json();

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    if (!topic) {
      throw new Error('Topic is required');
    }

    // Get research mode configuration
    const modeConfig = RESEARCH_MODES[researchMode as keyof typeof RESEARCH_MODES] || RESEARCH_MODES.general;
    console.log(`Researching topic: "${topic}" with mode: ${researchMode} (${modeConfig.model})`);

    // Build enhanced system prompt based on research type
    let systemPrompt = language === 'sv'
      ? `Du är en expert forskningsassistent specialiserad på ${researchMode === 'academic' ? 'akademisk forskning och vetenskapliga studier' : 'omfattande informationssökning'}.

Ditt uppdrag:
1. Hitta aktuell, verifierad och pålitlig information
2. Prioritera ${researchMode === 'academic' ? 'peer-reviewed artiklar, akademiska publikationer och forskningsrapporter' : 'officiella källor, expertutlåtanden och dokumenterad data'}
3. Strukturera informationen logiskt med tydliga rubriker
4. Inkludera specifika fakta, statistik och citat
5. Ange alltid källorna med fullständiga referenser

Svarsformat:
- Använd markdown-formatering
- Inkludera sektioner: Översikt, Huvudfynd, Detaljer, Praktisk tillämpning, Källor
- Markera osäkerhet eller motstridiga uppgifter
- Ange publiceringsdatum för tidskänslig information`
      : `You are an expert research assistant specialized in ${researchMode === 'academic' ? 'academic research and scientific studies' : 'comprehensive information gathering'}.

Your mission:
1. Find current, verified, and reliable information
2. Prioritize ${researchMode === 'academic' ? 'peer-reviewed articles, academic publications, and research reports' : 'official sources, expert opinions, and documented data'}
3. Structure information logically with clear headings
4. Include specific facts, statistics, and quotes
5. Always cite sources with complete references

Response format:
- Use markdown formatting
- Include sections: Overview, Key Findings, Details, Practical Application, Sources
- Note uncertainty or conflicting information
- Include publication dates for time-sensitive information`;

    // Build enhanced user prompt with optional context
    let userPrompt = '';

    // Add knowledge base context if provided
    if (knowledgeBase && knowledgeBase.length > 0) {
      userPrompt += language === 'sv'
        ? `INTERN KUNSKAPSBAS (använd som referens):\n${knowledgeBase}\n\n`
        : `INTERNAL KNOWLEDGE BASE (use as reference):\n${knowledgeBase}\n\n`;
    }

    // Add URL context if scraping was requested
    if (urlsToScrape && urlsToScrape.length > 0) {
      userPrompt += language === 'sv'
        ? `EXTERNA KÄLLOR ATT INKLUDERA:\n${urlsToScrape.join('\n')}\n\n`
        : `EXTERNAL SOURCES TO INCLUDE:\n${urlsToScrape.join('\n')}\n\n`;
    }

    // Main research query
    userPrompt += language === 'sv'
      ? `FORSKNINGSFRÅGA: ${topic}`
      : `RESEARCH QUESTION: ${topic}`;

    if (context) {
      userPrompt += language === 'sv'
        ? `\n\nKONTEXT: ${context}`
        : `\n\nCONTEXT: ${context}`;
    }

    // Add research depth instructions based on mode
    if (researchMode === 'academic') {
      userPrompt += language === 'sv'
        ? `\n\nSOKFOKUS: Vetenskapliga studier, peer-reviewed artiklar, forskningsrapporter, akademiska publikationer. Inkludera metodologi och begränsningar där relevant.`
        : `\n\nSEARCH FOCUS: Scientific studies, peer-reviewed articles, research reports, academic publications. Include methodology and limitations where relevant.`;
    } else if (researchMode === 'deep') {
      userPrompt += language === 'sv'
        ? `\n\nDJUPANALYS: Utför en omfattande flerstegsanalys. Undersök ämnet från flera perspektiv. Identifiera mönster, motsägelser och kunskapsluckor.`
        : `\n\nDEEP ANALYSIS: Perform comprehensive multi-step analysis. Examine topic from multiple perspectives. Identify patterns, contradictions, and knowledge gaps.`;
    }

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: modeConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      search_recency_filter: dateFilter || modeConfig.recencyFilter,
    };

    // Add search mode for academic
    if (researchMode === 'academic' || ('searchMode' in modeConfig && modeConfig.searchMode === 'academic')) {
      requestBody.search_mode = 'academic';
    }

    // Add domain filter if specified
    if (domainFilter && domainFilter.length > 0) {
      requestBody.search_domain_filter = domainFilter;
    }

    console.log('Calling Perplexity API with model:', modeConfig.model);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const citations = data.citations || [];
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    console.log(`Research completed: ${citations.length} citations, mode: ${researchMode}`);

    return new Response(JSON.stringify({
      research: content,
      citations: citations.slice(0, maxCitations),
      topic: topic,
      researchMode: researchMode,
      modelUsed: modeConfig.model,
      metadata: {
        citationCount: citations.length,
        searchMode: requestBody.search_mode || 'web',
        recencyFilter: requestBody.search_recency_filter,
        domainFilter: domainFilter || null
      }
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

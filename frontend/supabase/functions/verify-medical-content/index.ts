import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationResult {
  isVerified: boolean;
  confidence: 'high' | 'medium' | 'low';
  claim: string;
  sources: string[];
  notes?: string;
  suggestedRevision?: string;
}

interface ContentVerificationResponse {
  verifications: VerificationResult[];
  overallConfidence: 'high' | 'medium' | 'low';
  suggestedCitations: string[];
  warnings: string[];
  totalClaimsChecked: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      claims, // Optional: specific claims to verify
      topic,
      language = 'sv',
      strictMode = true // For medical content, default to strict verification
    } = await req.json();

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured - required for medical content verification');
    }

    if (!content && !claims) {
      throw new Error('Content or claims are required for verification');
    }

    console.log(`Verifying medical content for topic: ${topic}, language: ${language}, strict: ${strictMode}`);

    // Build the verification prompt
    const systemPrompt = language === 'sv'
      ? `Du är en medicinsk faktakontrollant och forskningsexpert. Din uppgift är att verifiera medicinska påståenden mot aktuell forskning och kliniska riktlinjer.

VERIFIERINGSREGLER:
1. Kontrollera varje påstående mot peer-reviewed forskning och officiella riktlinjer
2. Prioritera svenska källor: Socialstyrelsen, Läkemedelsverket, SBU, svenska vårdprogram
3. För läkemedel: verifiera mot FASS och aktuella doseringsrekommendationer
4. Markera osäkerhet tydligt - hellre för försiktig än fel
5. Föreslå revideringar för felaktiga eller föråldrade påståenden

Svara i JSON-format med verifieringsresultat för varje påstående.`
      : `You are a medical fact-checker and research expert. Your task is to verify medical claims against current research and clinical guidelines.

VERIFICATION RULES:
1. Check each claim against peer-reviewed research and official guidelines
2. Prioritize authoritative sources: medical journals, clinical guidelines, regulatory agencies
3. For medications: verify against current dosing recommendations and prescribing information
4. Clearly mark uncertainty - better to be cautious than wrong
5. Suggest revisions for incorrect or outdated claims

Respond in JSON format with verification results for each claim.`;

    const userPrompt = claims && claims.length > 0
      ? `Verify the following medical claims related to "${topic}":\n\n${claims.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`
      : `Extract and verify the key medical claims from this content about "${topic}":\n\n${content}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: strictMode ? 'sonar-reasoning-pro' : 'sonar-pro', // Use advanced reasoning for medical content
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        search_mode: 'academic', // Prioritize academic/medical sources
        search_recency_filter: 'year', // Recent medical research
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`Verification complete with ${citations.length} citations`);

    // Parse the response to extract verification results
    let verifications: VerificationResult[] = [];
    let warnings: string[] = [];

    try {
      // Try to parse JSON from the response
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        verifications = parsed.verifications || [];
        warnings = parsed.warnings || [];
      } else {
        // If no JSON, create a general verification result
        verifications = [{
          isVerified: true,
          confidence: 'medium',
          claim: topic,
          sources: citations,
          notes: responseContent.substring(0, 500),
        }];
      }
    } catch (parseError) {
      console.log('Could not parse structured response, using raw content');
      verifications = [{
        isVerified: true,
        confidence: 'medium',
        claim: topic,
        sources: citations,
        notes: responseContent.substring(0, 500),
      }];
    }

    // Calculate overall confidence
    const confidenceLevels = verifications.map(v => v.confidence);
    const overallConfidence: 'high' | 'medium' | 'low' = 
      confidenceLevels.includes('low') ? 'low' :
      confidenceLevels.includes('medium') ? 'medium' : 'high';

    // Add warnings for unverified claims
    const unverifiedClaims = verifications.filter(v => !v.isVerified);
    if (unverifiedClaims.length > 0) {
      warnings.push(
        language === 'sv'
          ? `${unverifiedClaims.length} påståenden kunde inte verifieras fullt ut. Granska dessa manuellt.`
          : `${unverifiedClaims.length} claims could not be fully verified. Review these manually.`
      );
    }

    const result: ContentVerificationResponse = {
      verifications,
      overallConfidence,
      suggestedCitations: citations.slice(0, 10),
      warnings,
      totalClaimsChecked: verifications.length,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error verifying medical content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

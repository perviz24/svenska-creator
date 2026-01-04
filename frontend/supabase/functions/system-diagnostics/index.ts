import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: DiagnosticResult[] = [];
  const startTime = Date.now();

  try {
    const { runAll = true, tests = [] } = await req.json().catch(() => ({ runAll: true, tests: [] }));

    // 1. Test Supabase Connection
    const supabaseStart = Date.now();
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.from('courses').select('count').limit(1);
      
      if (error) throw error;
      
      results.push({
        name: 'Supabase Database',
        status: 'success',
        message: 'Database connection successful',
        duration: Date.now() - supabaseStart,
      });
    } catch (error) {
      results.push({
        name: 'Supabase Database',
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
        duration: Date.now() - supabaseStart,
      });
    }

    // 2. Test Lovable AI
    const aiStart = Date.now();
    try {
      const apiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!apiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: 'Say "OK"' }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
      }

      results.push({
        name: 'Lovable AI Gateway',
        status: 'success',
        message: 'AI connection successful',
        duration: Date.now() - aiStart,
      });
    } catch (error) {
      results.push({
        name: 'Lovable AI Gateway',
        status: 'error',
        message: error instanceof Error ? error.message : 'AI connection failed',
        duration: Date.now() - aiStart,
      });
    }

    // 3. Test HeyGen API
    const heygenStart = Date.now();
    try {
      const heygenKey = Deno.env.get('HEYGEN_API_KEY');
      if (!heygenKey) {
        results.push({
          name: 'HeyGen API',
          status: 'warning',
          message: 'HEYGEN_API_KEY not configured',
          duration: Date.now() - heygenStart,
        });
      } else {
        const response = await fetch('https://api.heygen.com/v2/avatars', {
          headers: { 'X-Api-Key': heygenKey },
        });

        if (response.ok) {
          results.push({
            name: 'HeyGen API',
            status: 'success',
            message: 'HeyGen connection successful',
            duration: Date.now() - heygenStart,
          });
        } else {
          throw new Error(`HeyGen API error: ${response.status}`);
        }
      }
    } catch (error) {
      results.push({
        name: 'HeyGen API',
        status: 'error',
        message: error instanceof Error ? error.message : 'HeyGen connection failed',
        duration: Date.now() - heygenStart,
      });
    }

    // 4. Test ElevenLabs
    const elevenStart = Date.now();
    try {
      const elevenKey = Deno.env.get('ELEVENLABS_API_KEY');
      if (!elevenKey) {
        results.push({
          name: 'ElevenLabs API',
          status: 'warning',
          message: 'ELEVENLABS_API_KEY not configured',
          duration: Date.now() - elevenStart,
        });
      } else {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': elevenKey },
        });

        if (response.ok) {
          results.push({
            name: 'ElevenLabs API',
            status: 'success',
            message: 'ElevenLabs connection successful',
            duration: Date.now() - elevenStart,
          });
        } else {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }
      }
    } catch (error) {
      results.push({
        name: 'ElevenLabs API',
        status: 'error',
        message: error instanceof Error ? error.message : 'ElevenLabs connection failed',
        duration: Date.now() - elevenStart,
      });
    }

    // 5. Test Perplexity
    const perplexityStart = Date.now();
    try {
      const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
      if (!perplexityKey) {
        results.push({
          name: 'Perplexity API',
          status: 'warning',
          message: 'PERPLEXITY_API_KEY not configured',
          duration: Date.now() - perplexityStart,
        });
      } else {
        results.push({
          name: 'Perplexity API',
          status: 'success',
          message: 'Perplexity API key configured',
          duration: Date.now() - perplexityStart,
        });
      }
    } catch (error) {
      results.push({
        name: 'Perplexity API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Perplexity check failed',
        duration: Date.now() - perplexityStart,
      });
    }

    // 6. Test Firecrawl
    const firecrawlStart = Date.now();
    try {
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!firecrawlKey) {
        results.push({
          name: 'Firecrawl API',
          status: 'warning',
          message: 'FIRECRAWL_API_KEY not configured',
          duration: Date.now() - firecrawlStart,
        });
      } else {
        results.push({
          name: 'Firecrawl API',
          status: 'success',
          message: 'Firecrawl API key configured',
          duration: Date.now() - firecrawlStart,
        });
      }
    } catch (error) {
      results.push({
        name: 'Firecrawl API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Firecrawl check failed',
        duration: Date.now() - firecrawlStart,
      });
    }

    // 7. Test Unsplash
    const unsplashStart = Date.now();
    try {
      const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
      if (!unsplashKey) {
        results.push({
          name: 'Unsplash API',
          status: 'warning',
          message: 'UNSPLASH_ACCESS_KEY not configured',
          duration: Date.now() - unsplashStart,
        });
      } else {
        const response = await fetch(`https://api.unsplash.com/photos/random?client_id=${unsplashKey}`);
        if (response.ok) {
          results.push({
            name: 'Unsplash API',
            status: 'success',
            message: 'Unsplash connection successful',
            duration: Date.now() - unsplashStart,
          });
        } else {
          throw new Error(`Unsplash API error: ${response.status}`);
        }
      }
    } catch (error) {
      results.push({
        name: 'Unsplash API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unsplash connection failed',
        duration: Date.now() - unsplashStart,
      });
    }

    // 8. Test Pexels
    const pexelsStart = Date.now();
    try {
      const pexelsKey = Deno.env.get('PEXELS_API_KEY');
      if (!pexelsKey) {
        results.push({
          name: 'Pexels API',
          status: 'warning',
          message: 'PEXELS_API_KEY not configured',
          duration: Date.now() - pexelsStart,
        });
      } else {
        results.push({
          name: 'Pexels API',
          status: 'success',
          message: 'Pexels API key configured',
          duration: Date.now() - pexelsStart,
        });
      }
    } catch (error) {
      results.push({
        name: 'Pexels API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Pexels check failed',
        duration: Date.now() - pexelsStart,
      });
    }

    // 9. Test Bunny CDN
    const bunnyStart = Date.now();
    try {
      const bunnyKey = Deno.env.get('BUNNY_API_KEY');
      const bunnyLibrary = Deno.env.get('BUNNY_LIBRARY_ID');
      if (!bunnyKey || !bunnyLibrary) {
        results.push({
          name: 'Bunny CDN',
          status: 'warning',
          message: 'Bunny CDN not fully configured',
          duration: Date.now() - bunnyStart,
        });
      } else {
        results.push({
          name: 'Bunny CDN',
          status: 'success',
          message: 'Bunny CDN configured',
          duration: Date.now() - bunnyStart,
        });
      }
    } catch (error) {
      results.push({
        name: 'Bunny CDN',
        status: 'error',
        message: error instanceof Error ? error.message : 'Bunny check failed',
        duration: Date.now() - bunnyStart,
      });
    }

    // Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    const overallStatus = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success';

    return new Response(
      JSON.stringify({
        success: true,
        overallStatus,
        summary: {
          total: results.length,
          success: successCount,
          warnings: warningCount,
          errors: errorCount,
        },
        results,
        totalDuration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Diagnostics error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Diagnostics failed',
        results,
        totalDuration: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

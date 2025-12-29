import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockVideo {
  id: string;
  url: string;
  previewUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  user: string;
  userUrl: string;
  source: 'pexels' | 'pixabay';
  tags?: string[];
  aiRelevanceScore?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, context, perPage = 20 } = await req.json();
    const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!PEXELS_API_KEY) {
      console.error('PEXELS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Pexels API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI-enhanced query generation
    if (action === 'enhance-query') {
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ enhancedQuery: query }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Enhancing search query with AI...');
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a stock video search expert. Generate optimal English search terms for finding relevant stock videos.
              
Rules:
- Output ONLY the search query, no explanations
- Use 2-5 words maximum
- Focus on visual, actionable terms
- Avoid abstract concepts, use concrete visuals
- Consider what would actually be filmed in a video`
            },
            {
              role: 'user',
              content: `Original query: "${query || 'general content'}"
Context: ${context || 'professional presentation'}

Generate the best stock video search terms:`
            }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const enhancedQuery = aiData.choices?.[0]?.message?.content?.trim() || query;
        console.log('Enhanced query:', enhancedQuery);
        return new Response(
          JSON.stringify({ enhancedQuery }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ enhancedQuery: query }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search videos
    if (action === 'search') {
      console.log('Searching Pexels videos for:', query);
      
      const pexelsResponse = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
        {
          headers: {
            'Authorization': PEXELS_API_KEY,
          },
        }
      );

      if (!pexelsResponse.ok) {
        console.error('Pexels API error:', pexelsResponse.status);
        return new Response(
          JSON.stringify({ error: 'Failed to search videos', videos: [] }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pexelsData = await pexelsResponse.json();
      console.log(`Found ${pexelsData.videos?.length || 0} videos`);

      const videos: StockVideo[] = (pexelsData.videos || []).map((video: any) => {
        // Get the best quality video file (prefer HD/Full HD)
        const videoFiles = video.video_files || [];
        const hdFile = videoFiles.find((f: any) => f.quality === 'hd' || f.quality === 'sd') 
          || videoFiles[0];
        
        // Get preview (lower quality for fast loading)
        const previewFile = videoFiles.find((f: any) => f.quality === 'sd') 
          || videoFiles[videoFiles.length - 1] 
          || hdFile;

        return {
          id: `pexels-${video.id}`,
          url: hdFile?.link || video.url,
          previewUrl: previewFile?.link || hdFile?.link || video.url,
          thumbnailUrl: video.image || video.video_pictures?.[0]?.picture || '',
          duration: video.duration || 0,
          width: hdFile?.width || video.width || 1920,
          height: hdFile?.height || video.height || 1080,
          user: video.user?.name || 'Unknown',
          userUrl: video.user?.url || 'https://pexels.com',
          source: 'pexels' as const,
          tags: video.tags?.map((t: any) => t.title || t) || [],
        };
      });

      // If we have AI capability, score relevance
      if (LOVABLE_API_KEY && context && videos.length > 0) {
        try {
          console.log('Scoring video relevance with AI...');
          const scoringResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `You score stock videos for relevance to content. Return a JSON array of scores.
Output format: [0.85, 0.72, 0.95, ...] - one score per video, 0-1 range.
Higher = more relevant to the context.`
                },
                {
                  role: 'user',
                  content: `Context: ${context}
Search query: ${query}
Videos (by ID and tags):
${videos.slice(0, 10).map((v, i) => `${i + 1}. Tags: ${v.tags?.join(', ') || 'no tags'}`).join('\n')}

Return relevance scores as JSON array:`
                }
              ],
            }),
          });

          if (scoringResponse.ok) {
            const scoringData = await scoringResponse.json();
            const scoresText = scoringData.choices?.[0]?.message?.content || '';
            try {
              const match = scoresText.match(/\[[\d.,\s]+\]/);
              if (match) {
                const scores = JSON.parse(match[0]);
                videos.forEach((v, i) => {
                  if (i < scores.length) {
                    v.aiRelevanceScore = scores[i];
                  }
                });
                // Sort by relevance
                videos.sort((a, b) => (b.aiRelevanceScore || 0) - (a.aiRelevanceScore || 0));
              }
            } catch (parseErr) {
              console.log('Could not parse AI scores, using default order');
            }
          }
        } catch (aiErr) {
          console.log('AI scoring skipped:', aiErr);
        }
      }

      return new Response(
        JSON.stringify({ videos, total: pexelsData.total_results || videos.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-stock-videos:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
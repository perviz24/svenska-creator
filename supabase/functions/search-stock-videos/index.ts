import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type StockVideoProvider = 'pexels' | 'pixabay' | 'storyblocks' | 'shutterstock';

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
  source: StockVideoProvider;
  tags?: string[];
  aiRelevanceScore?: number;
}

// Get user-specific API credentials from database
async function getUserCredentials(userId: string, provider: string): Promise<{ apiKey?: string; apiSecret?: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('stock_provider_settings')
    .select('api_key, api_secret')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_enabled', true)
    .single();

  if (error || !data) return null;
  return { apiKey: data.api_key, apiSecret: data.api_secret };
}

// Search Pexels (free, uses system key)
async function searchPexels(query: string, perPage: number): Promise<StockVideo[]> {
  const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
  if (!PEXELS_API_KEY) throw new Error('Pexels API not configured');

  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { 'Authorization': PEXELS_API_KEY } }
  );

  if (!response.ok) throw new Error('Pexels API error');
  const data = await response.json();

  return (data.videos || []).map((video: any) => {
    const videoFiles = video.video_files || [];
    const hdFile = videoFiles.find((f: any) => f.quality === 'hd' || f.quality === 'sd') || videoFiles[0];
    const previewFile = videoFiles.find((f: any) => f.quality === 'sd') || videoFiles[videoFiles.length - 1] || hdFile;

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
}

// Search Pixabay (user key required)
async function searchPixabay(query: string, perPage: number, apiKey: string): Promise<StockVideo[]> {
  const response = await fetch(
    `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${perPage}`,
  );

  if (!response.ok) throw new Error('Pixabay API error');
  const data = await response.json();

  return (data.hits || []).map((video: any) => ({
    id: `pixabay-${video.id}`,
    url: video.videos?.large?.url || video.videos?.medium?.url || '',
    previewUrl: video.videos?.tiny?.url || video.videos?.small?.url || '',
    thumbnailUrl: `https://i.vimeocdn.com/video/${video.picture_id}_640x360.jpg`,
    duration: video.duration || 0,
    width: video.videos?.large?.width || 1920,
    height: video.videos?.large?.height || 1080,
    user: video.user || 'Unknown',
    userUrl: `https://pixabay.com/users/${video.user_id}/`,
    source: 'pixabay' as const,
    tags: video.tags?.split(',').map((t: string) => t.trim()) || [],
  }));
}

// Search Storyblocks (premium, user key required)
async function searchStoryblocks(query: string, perPage: number, apiKey: string, apiSecret: string): Promise<StockVideo[]> {
  // Storyblocks uses HMAC authentication
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(apiSecret + apiKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp.toString()));
  const hmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

  const response = await fetch(
    `https://api.storyblocks.com/api/v2/videos/search?project_id=${apiKey}&user_id=user&keywords=${encodeURIComponent(query)}&page_size=${perPage}`,
    {
      headers: {
        'APIK': apiKey,
        'HMAC': hmac,
        'EXPIRES': timestamp.toString(),
      }
    }
  );

  if (!response.ok) {
    console.error('Storyblocks error:', response.status);
    throw new Error('Storyblocks API error');
  }
  
  const data = await response.json();
  return (data.results || []).map((video: any) => ({
    id: `storyblocks-${video.id}`,
    url: video.preview_url || '',
    previewUrl: video.thumbnail_url || '',
    thumbnailUrl: video.thumbnail_url || '',
    duration: video.duration || 0,
    width: 1920,
    height: 1080,
    user: 'Storyblocks',
    userUrl: 'https://www.storyblocks.com',
    source: 'storyblocks' as const,
    tags: video.keywords || [],
  }));
}

// Search Shutterstock (premium, user key required)
async function searchShutterstock(query: string, perPage: number, apiKey: string, apiSecret: string): Promise<StockVideo[]> {
  const auth = btoa(`${apiKey}:${apiSecret}`);
  
  const response = await fetch(
    `https://api.shutterstock.com/v2/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&view=full`,
    {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    }
  );

  if (!response.ok) {
    console.error('Shutterstock error:', response.status);
    throw new Error('Shutterstock API error');
  }
  
  const data = await response.json();
  return (data.data || []).map((video: any) => ({
    id: `shutterstock-${video.id}`,
    url: video.assets?.preview_mp4?.url || '',
    previewUrl: video.assets?.preview_webm?.url || video.assets?.preview_mp4?.url || '',
    thumbnailUrl: video.assets?.thumb_jpg?.url || '',
    duration: video.duration || 0,
    width: video.assets?.preview_mp4?.width || 1920,
    height: video.assets?.preview_mp4?.height || 1080,
    user: video.contributor?.id || 'Shutterstock',
    userUrl: 'https://www.shutterstock.com',
    source: 'shutterstock' as const,
    tags: video.keywords || [],
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, context, perPage = 20, provider = 'pexels', userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

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
      console.log(`Searching ${provider} videos for:`, query);
      
      let videos: StockVideo[] = [];

      try {
        switch (provider as StockVideoProvider) {
          case 'pexels':
            videos = await searchPexels(query, perPage);
            break;
          
          case 'pixabay':
            if (!userId) throw new Error('User authentication required for Pixabay');
            const pixabayCredentials = await getUserCredentials(userId, 'pixabay');
            if (!pixabayCredentials?.apiKey) throw new Error('Pixabay API key not configured. Please add your API key in settings.');
            videos = await searchPixabay(query, perPage, pixabayCredentials.apiKey);
            break;
          
          case 'storyblocks':
            if (!userId) throw new Error('User authentication required for Storyblocks');
            const storyblocksCredentials = await getUserCredentials(userId, 'storyblocks');
            if (!storyblocksCredentials?.apiKey || !storyblocksCredentials?.apiSecret) {
              throw new Error('Storyblocks API credentials not configured. Please add your API key and secret in settings.');
            }
            videos = await searchStoryblocks(query, perPage, storyblocksCredentials.apiKey, storyblocksCredentials.apiSecret);
            break;
          
          case 'shutterstock':
            if (!userId) throw new Error('User authentication required for Shutterstock');
            const shutterstockCredentials = await getUserCredentials(userId, 'shutterstock');
            if (!shutterstockCredentials?.apiKey || !shutterstockCredentials?.apiSecret) {
              throw new Error('Shutterstock API credentials not configured. Please add your API key and secret in settings.');
            }
            videos = await searchShutterstock(query, perPage, shutterstockCredentials.apiKey, shutterstockCredentials.apiSecret);
            break;
          
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
      } catch (providerError) {
        console.error(`Error with provider ${provider}:`, providerError);
        return new Response(
          JSON.stringify({ 
            error: providerError instanceof Error ? providerError.message : 'Provider error',
            videos: [],
            provider 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${videos.length} videos from ${provider}`);

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
        JSON.stringify({ videos, total: videos.length, provider }),
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
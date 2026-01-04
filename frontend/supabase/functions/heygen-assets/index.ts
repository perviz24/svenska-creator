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
    const { action, apiKey } = await req.json();

    const HEYGEN_API_KEY = apiKey || Deno.env.get('HEYGEN_API_KEY');
    if (!HEYGEN_API_KEY) {
      throw new Error('HeyGen API key is required');
    }

    if (action === 'list-avatars') {
      console.log('Fetching HeyGen avatars...');
      
      const response = await fetch('https://api.heygen.com/v2/avatars', {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error:', response.status, errorText);
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse and structure avatars
      const avatars = data.data?.avatars?.map((avatar: any) => ({
        avatar_id: avatar.avatar_id,
        avatar_name: avatar.avatar_name,
        preview_image_url: avatar.preview_image_url,
        preview_video_url: avatar.preview_video_url,
        gender: avatar.gender,
        type: avatar.type, // 'public' or 'private'
      })) || [];

      return new Response(JSON.stringify({ avatars }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-voices') {
      console.log('Fetching HeyGen voices...');
      
      const response = await fetch('https://api.heygen.com/v2/voices', {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();
      
      const voices = data.data?.voices?.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        language: voice.language,
        gender: voice.gender,
        preview_audio: voice.preview_audio,
      })) || [];

      return new Response(JSON.stringify({ voices }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "list-avatars" or "list-voices"');

  } catch (error) {
    console.error('Error in heygen-assets:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeyGenRequest {
  action: 'list-avatars' | 'generate-video';
  // For generate-video
  script?: string;
  avatarId?: string;
  voiceId?: string;
  title?: string;
}

interface Avatar {
  id: string;
  name: string;
  thumbnailUrl: string;
  gender: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    
    if (!HEYGEN_API_KEY) {
      throw new Error('HeyGen API key not configured. Please add HEYGEN_API_KEY to your secrets.');
    }

    const { action, script, avatarId, voiceId, title }: HeyGenRequest = await req.json();

    console.log(`HeyGen action: ${action}`);

    if (action === 'list-avatars') {
      // Fetch available avatars
      const response = await fetch('https://api.heygen.com/v2/avatars', {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('HeyGen API error:', error);
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform avatar data
      const avatars: Avatar[] = data.data?.avatars?.map((avatar: any) => ({
        id: avatar.avatar_id,
        name: avatar.avatar_name,
        thumbnailUrl: avatar.preview_image_url || avatar.thumbnail_url,
        gender: avatar.gender,
      })) || [];

      console.log(`Found ${avatars.length} avatars`);

      return new Response(
        JSON.stringify({ avatars }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'generate-video') {
      if (!script || !avatarId) {
        throw new Error('Script and avatarId are required for video generation');
      }

      console.log(`Generating video with avatar ${avatarId}, script length: ${script.length}`);

      // Create video generation task
      const response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: avatarId,
                avatar_style: 'normal',
              },
              voice: voiceId ? {
                type: 'voice_id',
                voice_id: voiceId,
              } : {
                type: 'text',
                input_text: script,
              },
              background: {
                type: 'color',
                value: '#1e3a5f',
              },
            },
          ],
          title: title || 'Course Video',
          dimension: {
            width: 1920,
            height: 1080,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('HeyGen video generation error:', error);
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Video generation started:', data);

      return new Response(
        JSON.stringify({
          videoId: data.data?.video_id,
          status: 'processing',
          message: 'Video generation started. Check status with the video ID.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('HeyGen function error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

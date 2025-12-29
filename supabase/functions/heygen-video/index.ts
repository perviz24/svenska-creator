const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeyGenRequest {
  action: 'list-avatars' | 'generate-video' | 'check-status';
  // For generate-video
  script?: string;
  avatarId?: string;
  voiceId?: string;
  title?: string;
  // For check-status
  videoId?: string;
  // User-provided API key
  apiKey?: string;
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
    const body: HeyGenRequest = await req.json();
    const { action, script, avatarId, voiceId, title, videoId, apiKey } = body;

    // Use user-provided API key or fall back to environment variable
    const HEYGEN_API_KEY = apiKey || Deno.env.get('HEYGEN_API_KEY');
    
    if (!HEYGEN_API_KEY) {
      throw new Error('HeyGen API key not configured. Please add your API key in Settings.');
    }

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
      // HeyGen requires a valid voice_id when using voice type
      // Default to a HeyGen default voice if none provided
      const defaultVoiceId = '1bd001e7e50f421d891986aad5158bc8'; // HeyGen default English voice
      
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
              voice: {
                type: 'text',
                input_text: script,
                voice_id: voiceId || defaultVoiceId,
              },
              background: {
                type: 'color',
                value: '#1e3a5f',
              },
            },
          ],
          title: title || 'Course Video',
          dimension: {
            width: 1280,
            height: 720,
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

    if (action === 'check-status') {
      if (!videoId) {
        throw new Error('videoId is required for status check');
      }

      console.log(`Checking status for video ${videoId}`);

      const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('HeyGen status check error:', error);
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Video status:', data);

      return new Response(
        JSON.stringify({
          videoId: videoId,
          status: data.data?.status || 'unknown',
          videoUrl: data.data?.video_url || null,
          thumbnailUrl: data.data?.thumbnail_url || null,
          duration: data.data?.duration || null,
          error: data.data?.error || null,
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

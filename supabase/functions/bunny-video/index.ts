import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY');
    const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID');
    
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      throw new Error('Bunny.net API key or Library ID not configured');
    }

    const { action, videoUrl, title, videoId } = await req.json();
    console.log(`Bunny.net action: ${action}`);

    const baseUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}`;

    // List all videos in the library
    if (action === 'list') {
      console.log('Fetching video list from Bunny.net');
      const response = await fetch(`${baseUrl}/videos?page=1&itemsPerPage=100&orderBy=date`, {
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Found ${data.items?.length || 0} videos`);
      
      const videos = (data.items || []).map((video: any) => ({
        id: video.guid,
        title: video.title,
        status: video.status, // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
        length: video.length,
        views: video.views,
        dateUploaded: video.dateUploaded,
        thumbnailUrl: `https://vz-${video.videoLibraryId}.b-cdn.net/${video.guid}/${video.thumbnailFileName}`,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.guid}`,
        directPlayUrl: `https://iframe.mediadelivery.net/play/${BUNNY_LIBRARY_ID}/${video.guid}`,
      }));

      return new Response(JSON.stringify({ videos }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch video from URL (for external URLs)
    if (action === 'fetch') {
      if (!videoUrl) {
        throw new Error('Video URL is required');
      }

      console.log(`Fetching video from URL: ${videoUrl}`);
      const response = await fetch(`${baseUrl}/videos/fetch`, {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          title: title || 'Untitled Video',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch video: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Video fetch initiated: ${data.guid}`);

      return new Response(JSON.stringify({
        success: true,
        videoId: data.guid,
        message: 'Video fetch initiated. Processing will take a few minutes.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create video placeholder (step 1 of direct upload)
    if (action === 'create') {
      console.log(`Creating video placeholder: ${title}`);
      const response = await fetch(`${baseUrl}/videos`, {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Untitled Video',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create video: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Video placeholder created: ${data.guid}`);

      // Return upload URL for direct PUT
      return new Response(JSON.stringify({
        success: true,
        videoId: data.guid,
        uploadUrl: `${baseUrl}/videos/${data.guid}`,
        accessKey: BUNNY_API_KEY, // Client needs this for direct upload
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get video status
    if (action === 'status') {
      if (!videoId) {
        throw new Error('Video ID is required');
      }

      console.log(`Getting status for video: ${videoId}`);
      const response = await fetch(`${baseUrl}/videos/${videoId}`, {
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get video status: ${response.statusText}`);
      }

      const video = await response.json();
      const statusMap: Record<number, string> = {
        0: 'created',
        1: 'uploaded',
        2: 'processing',
        3: 'transcoding',
        4: 'finished',
        5: 'error',
        6: 'upload_failed',
      };

      return new Response(JSON.stringify({
        id: video.guid,
        title: video.title,
        status: statusMap[video.status] || 'unknown',
        statusCode: video.status,
        length: video.length,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.guid}`,
        directPlayUrl: `https://iframe.mediadelivery.net/play/${BUNNY_LIBRARY_ID}/${video.guid}`,
        thumbnailUrl: video.thumbnailFileName 
          ? `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net/${video.guid}/${video.thumbnailFileName}`
          : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('Bunny.net error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

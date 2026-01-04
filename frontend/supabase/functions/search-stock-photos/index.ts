import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl?: string;
  source: string;
  attribution: string;
  downloadUrl?: string;
}

async function searchUnsplash(query: string, perPage: number = 10): Promise<StockPhoto[]> {
  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) {
    console.log('Unsplash API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.thumb,
      width: photo.width,
      height: photo.height,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      source: 'unsplash',
      attribution: `Photo by ${photo.user.name} on Unsplash`,
      downloadUrl: photo.links.download_location,
    }));
  } catch (error) {
    console.error('Unsplash search error:', error);
    return [];
  }
}

async function searchPexels(query: string, perPage: number = 10): Promise<StockPhoto[]> {
  const apiKey = Deno.env.get('PEXELS_API_KEY');
  if (!apiKey) {
    console.log('Pexels API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          'Authorization': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      thumbnailUrl: photo.src.tiny,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      source: 'pexels',
      attribution: `Photo by ${photo.photographer} on Pexels`,
      downloadUrl: photo.src.original,
    }));
  } catch (error) {
    console.error('Pexels search error:', error);
    return [];
  }
}

async function searchShutterstock(query: string, perPage: number = 10, apiKey?: string, apiSecret?: string): Promise<StockPhoto[]> {
  if (!apiKey || !apiSecret) {
    console.log('Shutterstock API credentials not provided');
    return [];
  }

  try {
    const auth = btoa(`${apiKey}:${apiSecret}`);
    const response = await fetch(
      `https://api.shutterstock.com/v2/images/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=horizontal&image_type=photo`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Shutterstock API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.data.map((photo: any) => ({
      id: photo.id,
      url: photo.assets.huge_thumb?.url || photo.assets.large_thumb?.url,
      thumbnailUrl: photo.assets.small_thumb?.url,
      width: photo.assets.huge_thumb?.width || 500,
      height: photo.assets.huge_thumb?.height || 300,
      photographer: photo.contributor?.id || 'Shutterstock',
      source: 'shutterstock',
      attribution: `Licensed from Shutterstock`,
      downloadUrl: photo.id, // Need to use licensing API for actual download
    }));
  } catch (error) {
    console.error('Shutterstock search error:', error);
    return [];
  }
}

async function searchAdobeStock(query: string, perPage: number = 10, apiKey?: string): Promise<StockPhoto[]> {
  if (!apiKey) {
    console.log('Adobe Stock API key not provided');
    return [];
  }

  try {
    const response = await fetch(
      `https://stock.adobe.io/Rest/Media/1/Search/Files?locale=en_US&search_parameters[words]=${encodeURIComponent(query)}&search_parameters[limit]=${perPage}&search_parameters[filters][orientation]=horizontal`,
      {
        headers: {
          'x-api-key': apiKey,
          'x-product': 'KursGenerator',
        },
      }
    );

    if (!response.ok) {
      console.error('Adobe Stock API error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.files || []).map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.thumbnail_500_url,
      thumbnailUrl: photo.thumbnail_110_url,
      width: photo.width,
      height: photo.height,
      photographer: photo.creator_name || 'Adobe Stock',
      source: 'adobe',
      attribution: `Licensed from Adobe Stock`,
      downloadUrl: photo.id,
    }));
  } catch (error) {
    console.error('Adobe Stock search error:', error);
    return [];
  }
}

async function searchGettyImages(query: string, perPage: number = 10, apiKey?: string): Promise<StockPhoto[]> {
  if (!apiKey) {
    console.log('Getty Images API key not provided');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.gettyimages.com/v3/search/images?phrase=${encodeURIComponent(query)}&page_size=${perPage}&orientations=horizontal`,
      {
        headers: {
          'Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error('Getty Images API error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.images || []).map((photo: any) => ({
      id: photo.id,
      url: photo.display_sizes.find((s: any) => s.name === 'comp')?.uri || photo.display_sizes[0]?.uri,
      thumbnailUrl: photo.display_sizes.find((s: any) => s.name === 'thumb')?.uri,
      width: 800,
      height: 600,
      photographer: photo.artist || 'Getty Images',
      source: 'getty',
      attribution: `Licensed from Getty Images`,
      downloadUrl: photo.id,
    }));
  } catch (error) {
    console.error('Getty Images search error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      providers = ['unsplash', 'pexels'],
      perPage = 8,
      providerCredentials = {}
    } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: "${query}" on providers: ${providers.join(', ')}`);

    const searchPromises: Promise<StockPhoto[]>[] = [];

    if (providers.includes('unsplash')) {
      searchPromises.push(searchUnsplash(query, perPage));
    }
    if (providers.includes('pexels')) {
      searchPromises.push(searchPexels(query, perPage));
    }
    if (providers.includes('shutterstock') && providerCredentials.shutterstock) {
      searchPromises.push(searchShutterstock(
        query, 
        perPage, 
        providerCredentials.shutterstock.apiKey,
        providerCredentials.shutterstock.apiSecret
      ));
    }
    if (providers.includes('adobe') && providerCredentials.adobe) {
      searchPromises.push(searchAdobeStock(query, perPage, providerCredentials.adobe.apiKey));
    }
    if (providers.includes('getty') && providerCredentials.getty) {
      searchPromises.push(searchGettyImages(query, perPage, providerCredentials.getty.apiKey));
    }

    const results = await Promise.all(searchPromises);
    const allPhotos = results.flat();

    // Shuffle to mix providers
    const shuffledPhotos = allPhotos.sort(() => Math.random() - 0.5);

    console.log(`Found ${shuffledPhotos.length} photos`);

    return new Response(
      JSON.stringify({ photos: shuffledPhotos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching stock photos:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to search photos' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('URLs array is required');
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured. Please connect Firecrawl in settings.');
    }

    console.log(`Scraping ${urls.length} URLs`);

    const results = await Promise.all(
      urls.slice(0, 5).map(async (url: string) => { // Limit to 5 URLs
        try {
          // Format URL
          let formattedUrl = url.trim();
          if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = `https://${formattedUrl}`;
          }

          console.log('Scraping:', formattedUrl);

          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: formattedUrl,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error(`Failed to scrape ${formattedUrl}:`, errorData);
            return {
              url: formattedUrl,
              success: false,
              error: `HTTP ${response.status}`,
              content: null,
            };
          }

          const data = await response.json();
          const content = data.data?.markdown || data.markdown || '';
          const title = data.data?.metadata?.title || data.metadata?.title || formattedUrl;

          return {
            url: formattedUrl,
            success: true,
            title,
            content: content.slice(0, 10000), // Limit content size
            wordCount: content.split(/\s+/).length,
          };
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
          return {
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            content: null,
          };
        }
      })
    );

    const successfulResults = results.filter(r => r.success);
    const combinedContent = successfulResults
      .map(r => `## ${r.title}\nKälla: ${r.url}\n\n${r.content}`)
      .join('\n\n---\n\n');

    console.log(`Successfully scraped ${successfulResults.length}/${urls.length} URLs`);

    return new Response(JSON.stringify({
      success: true,
      results,
      combinedContent,
      totalUrls: urls.length,
      successfulUrls: successfulResults.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-url:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

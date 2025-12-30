const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideData {
  title: string;
  content?: string;
  layout: string;
  speakerNotes?: string;
  imageUrl?: string;
  backgroundColor?: string;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Generate HTML that's optimized for Google Slides import
function generateGoogleSlidesHtml(slides: SlideData[], courseTitle: string, moduleTitle: string): string {
  const slidePages = slides.map((slide, index) => {
    const bgColor = slide.backgroundColor || '#FFFFFF';
    const contentLines = slide.content?.split('\n').filter(line => line.trim()) || [];
    
    return `
    <div class="slide" style="width: 960px; height: 540px; background: ${bgColor}; border: 1px solid #e0e0e0; margin: 20px auto; padding: 50px; box-sizing: border-box; position: relative; page-break-after: always; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div style="font-size: 11px; color: #9e9e9e; position: absolute; top: 15px; right: 20px;">Slide ${index + 1} av ${slides.length}</div>
      
      <h2 style="font-size: 36px; font-weight: 700; color: #1a237e; margin: 0 0 30px 0; line-height: 1.2;">
        ${escapeHtml(slide.title)}
      </h2>
      
      <div style="font-size: 20px; color: #333; line-height: 1.6;">
        ${contentLines.length > 0 ? `
          <ul style="margin: 0; padding-left: 25px; list-style: disc;">
            ${contentLines.map(line => `
              <li style="margin-bottom: 12px;">${escapeHtml(line.replace(/^[-•*]\s*/, '').trim())}</li>
            `).join('')}
          </ul>
        ` : ''}
      </div>
      
      ${slide.speakerNotes ? `
        <div style="position: absolute; bottom: 15px; left: 50px; right: 50px; font-size: 11px; color: #757575; border-top: 1px solid #e0e0e0; padding-top: 10px;">
          <strong>Noteringar:</strong> ${escapeHtml(slide.speakerNotes.substring(0, 150))}${slide.speakerNotes.length > 150 ? '...' : ''}
        </div>
      ` : ''}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(courseTitle)} - ${escapeHtml(moduleTitle)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .instructions {
      max-width: 960px;
      margin: 0 auto 30px;
      padding: 25px;
      background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
      border-radius: 12px;
      border: 1px solid #a5d6a7;
    }
    
    .instructions h3 {
      color: #2e7d32;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .instructions ol {
      margin: 0;
      padding-left: 25px;
      color: #1b5e20;
      line-height: 1.8;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #1a237e;
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .header p {
      color: #5c6bc0;
      font-size: 18px;
    }
    
    @media print {
      body { background: white; padding: 0; }
      .instructions { display: none; }
      .header { display: none; }
      .slide { 
        box-shadow: none !important; 
        margin: 0 !important;
        border: none !important;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="instructions">
    <h3>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      Importera till Google Slides
    </h3>
    <ol>
      <li>Tryck <strong>Ctrl+P</strong> (eller ⌘+P på Mac)</li>
      <li>Välj <strong>"Spara som PDF"</strong> som destination</li>
      <li>Öppna <a href="https://slides.google.com" target="_blank" style="color: #1565c0; font-weight: 600;">slides.google.com</a></li>
      <li>Skapa ny presentation → <strong>Arkiv</strong> → <strong>Importera slides</strong></li>
      <li>Välj <strong>Ladda upp</strong> och välj PDF-filen du sparade</li>
    </ol>
  </div>

  <div class="header">
    <h1>${escapeHtml(courseTitle)}</h1>
    <p>${escapeHtml(moduleTitle)} • ${slides.length} slides</p>
  </div>
  
  ${slidePages}
  
  <div style="text-align: center; padding: 30px; color: #9e9e9e; font-size: 13px;">
    Genererad ${new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, courseTitle, moduleTitle } = await req.json();

    if (!slides || slides.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No slides provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Exporting ${slides.length} slides for Google Slides import`);

    // Generate HTML content
    const htmlContent = generateGoogleSlidesHtml(slides, courseTitle, moduleTitle);
    
    // Create base64 data URL for download
    const encoder = new TextEncoder();
    const bytes = encoder.encode(htmlContent);
    const base64Content = btoa(String.fromCharCode(...bytes));
    const downloadUrl = `data:text/html;base64,${base64Content}`;
    
    const safeTitle = (moduleTitle || 'presentation').replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, '').replace(/\s+/g, '-');
    const filename = `${safeTitle}-google-slides.html`;

    return new Response(
      JSON.stringify({
        downloadUrl,
        filename,
        format: 'html',
        slideCount: slides.length,
        message: 'Spara som PDF och importera till Google Slides'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error exporting to Google Slides:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
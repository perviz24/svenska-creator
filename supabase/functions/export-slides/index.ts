const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Slide {
  title: string;
  content: string;
  speakerNotes?: string;
  layout: string;
  imageUrl?: string;
  backgroundColor?: string;
}

interface ExportRequest {
  slides: Slide[];
  courseTitle: string;
  moduleTitle: string;
  format: 'pptx' | 'pdf';
  demoMode?: boolean;
}

// Demo watermark SVG for exports
const DEMO_WATERMARK_SVG = `
<svg viewBox="0 0 200 100" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); opacity: 0.15; pointer-events: none; z-index: 1000;">
  <text x="100" y="50" text-anchor="middle" dominant-baseline="middle" font-size="32" font-weight="bold" fill="#F59E0B" font-family="Arial, sans-serif">DEMO</text>
  <text x="100" y="75" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#F59E0B" font-family="Arial, sans-serif">Testversion - Ej för distribution</text>
</svg>
`;

const DEMO_BADGE_HTML = `
<div style="position: absolute; top: 10px; right: 10px; background: rgba(245, 158, 11, 0.9); color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; z-index: 1001;">
  DEMO
</div>
`;

// Generate PPTX XML content
function generatePPTX(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false): string {
  // Create a simple PPTX-compatible XML structure
  const slidesXml = slides.map((slide, index) => `
    <slide index="${index + 1}">
      <title>${escapeXml(slide.title)}</title>
      <content>${escapeXml(slide.content || '')}</content>
      <notes>${escapeXml(slide.speakerNotes || '')}</notes>
      <layout>${slide.layout}</layout>
      ${slide.imageUrl ? `<image url="${escapeXml(slide.imageUrl)}" />` : ''}
      ${demoMode ? `<watermark>DEMO - Testversion</watermark>` : ''}
    </slide>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<presentation>
  <meta>
    <title>${escapeXml(courseTitle)}</title>
    <module>${escapeXml(moduleTitle)}</module>
    <slideCount>${slides.length}</slideCount>
    <created>${new Date().toISOString()}</created>
    ${demoMode ? `<demoMode>true</demoMode>` : ''}
  </meta>
  <slides>
    ${slidesXml}
  </slides>
</presentation>`;
}

// Generate HTML that can be printed as PDF
function generatePDFHtml(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false): string {
  const slidePages = slides.map((slide, index) => `
    <div class="slide-page" style="page-break-after: always; padding: 40px; min-height: 100vh; box-sizing: border-box; position: relative;">
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 32px; height: calc(100vh - 80px); display: flex; flex-direction: column; position: relative; overflow: hidden; ${slide.backgroundColor ? `background-color: ${slide.backgroundColor};` : 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'}">
        ${slide.imageUrl ? `<img src="${escapeHtml(slide.imageUrl)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.2; border-radius: 8px;" />` : ''}
        ${demoMode ? DEMO_WATERMARK_SVG : ''}
        ${demoMode ? DEMO_BADGE_HTML : ''}
        <div style="position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 12px; color: rgba(255,255,255,0.7);">${escapeHtml(moduleTitle)}</span>
            <span style="font-size: 12px; color: rgba(255,255,255,0.7);">Slide ${index + 1} / ${slides.length}</span>
          </div>
          <h1 style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 24px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${escapeHtml(slide.title)}</h1>
          <div style="flex: 1; font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.9); white-space: pre-wrap;">${escapeHtml(slide.content || '')}</div>
        </div>
      </div>
      ${slide.speakerNotes ? `
        <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 4px;">
          <strong style="font-size: 12px; color: #666;">Talarnoteringar:</strong>
          <p style="font-size: 12px; color: #333; margin-top: 8px; white-space: pre-wrap;">${escapeHtml(slide.speakerNotes)}</p>
        </div>
      ` : ''}
    </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(courseTitle)} - ${escapeHtml(moduleTitle)}${demoMode ? ' (DEMO)' : ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media print {
      .slide-page { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="cover-page" style="page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%); color: white; padding: 40px; position: relative;">
    ${demoMode ? `<div style="position: absolute; top: 20px; right: 20px; background: #F59E0B; color: white; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: bold;">DEMO - TESTVERSION</div>` : ''}
    <h1 style="font-size: 36px; font-weight: bold; margin-bottom: 16px; text-align: center;">${escapeHtml(courseTitle)}</h1>
    <h2 style="font-size: 24px; font-weight: normal; opacity: 0.8; text-align: center;">${escapeHtml(moduleTitle)}</h2>
    <p style="margin-top: 40px; font-size: 14px; opacity: 0.6;">${slides.length} slides</p>
    ${demoMode ? `<p style="margin-top: 20px; font-size: 12px; opacity: 0.5; text-align: center;">Detta är en demoversion med begränsad funktionalitet.<br/>Registrera dig för full tillgång.</p>` : ''}
  </div>
  ${slidePages}
</body>
</html>`;

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(courseTitle)} - ${escapeHtml(moduleTitle)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media print {
      .slide-page { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="cover-page" style="page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%); color: white; padding: 40px;">
    <h1 style="font-size: 36px; font-weight: bold; margin-bottom: 16px; text-align: center;">${escapeHtml(courseTitle)}</h1>
    <h2 style="font-size: 24px; font-weight: normal; opacity: 0.8; text-align: center;">${escapeHtml(moduleTitle)}</h2>
    <p style="margin-top: 40px; font-size: 14px; opacity: 0.6;">${slides.length} slides</p>
  </div>
  ${slidePages}
</body>
</html>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, courseTitle, moduleTitle, format, demoMode }: ExportRequest = await req.json();

    console.log(`Exporting ${slides.length} slides as ${format} for "${moduleTitle}"${demoMode ? ' (DEMO MODE)' : ''}`);

    if (!slides || slides.length === 0) {
      throw new Error('No slides provided for export');
    }

    let content: string;
    let contentType: string;
    let filename: string;
    const demoSuffix = demoMode ? '_DEMO' : '';

    if (format === 'pptx') {
      // Generate XML representation (can be imported into PowerPoint)
      content = generatePPTX(slides, courseTitle, moduleTitle, demoMode);
      contentType = 'application/xml';
      filename = `${moduleTitle.replace(/[^a-zA-Z0-9]/g, '_')}${demoSuffix}_presentation.xml`;
    } else if (format === 'pdf') {
      // Generate HTML that can be printed/saved as PDF
      content = generatePDFHtml(slides, courseTitle, moduleTitle, demoMode);
      contentType = 'text/html';
      filename = `${moduleTitle.replace(/[^a-zA-Z0-9]/g, '_')}${demoSuffix}_presentation.html`;
    } else {
      throw new Error('Unsupported format. Use "pptx" or "pdf".');
    }

    console.log(`Generated ${format} content, size: ${content.length} bytes`);

    return new Response(
      JSON.stringify({
        content,
        contentType,
        filename,
        format,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

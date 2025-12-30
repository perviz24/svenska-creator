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
  template?: 'professional' | 'modern' | 'minimal' | 'creative';
}

// Professional color palettes
const TEMPLATES = {
  professional: {
    primary: '#1e3a5f',
    secondary: '#2d5a87',
    accent: '#4a90d9',
    background: '#f8fafc',
    text: '#1a1a2e',
    muted: '#64748b',
  },
  modern: {
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#0f172a',
    muted: '#6b7280',
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    accent: '#a1a1aa',
    background: '#fafafa',
    text: '#18181b',
    muted: '#71717a',
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#a855f7',
    accent: '#c084fc',
    background: '#faf5ff',
    text: '#1f2937',
    muted: '#6b7280',
  },
};

// Generate professional HTML for PDF export (print-to-PDF)
function generatePDFHtml(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false, template: keyof typeof TEMPLATES = 'professional'): string {
  const colors = TEMPLATES[template];
  
  const slidePages = slides.map((slide, index) => {
    const contentItems = (slide.content || '').split('\n').filter(line => line.trim());
    
    return `
    <div class="slide-page" style="page-break-after: always; width: 100%; min-height: 100vh; box-sizing: border-box; position: relative; background: ${colors.background}; padding: 60px;">
      ${demoMode ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); opacity: 0.1; font-size: 120px; font-weight: bold; color: #F59E0B; pointer-events: none;">DEMO</div>
        <div style="position: absolute; top: 20px; right: 20px; background: #F59E0B; color: white; padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: bold;">DEMO</div>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid ${colors.accent};">
        <span style="font-size: 14px; color: ${colors.muted}; font-weight: 500;">${escapeHtml(moduleTitle)}</span>
        <span style="font-size: 14px; color: ${colors.muted};">${index + 1} / ${slides.length}</span>
      </div>
      
      <h1 style="font-size: 36px; font-weight: 700; color: ${colors.primary}; margin-bottom: 32px; line-height: 1.2;">
        ${escapeHtml(slide.title)}
      </h1>
      
      <div style="flex: 1;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${contentItems.map(item => `
          <li style="display: flex; align-items: flex-start; margin-bottom: 20px; font-size: 20px; line-height: 1.5; color: ${colors.text};">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; min-width: 28px; background: ${colors.accent}20; color: ${colors.accent}; border-radius: 50%; margin-right: 16px; font-weight: 600; font-size: 14px;">•</span>
            <span>${escapeHtml(item.replace(/^[•\-\*]\s*/, ''))}</span>
          </li>
          `).join('')}
        </ul>
      </div>
      
      ${slide.speakerNotes ? `
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid ${colors.muted}30;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.muted}; margin-bottom: 8px; font-weight: 600;">Talarnoteringar</div>
        <p style="font-size: 13px; color: ${colors.muted}; line-height: 1.6; margin: 0;">${escapeHtml(slide.speakerNotes)}</p>
      </div>
      ` : ''}
    </div>
  `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(courseTitle)} - ${escapeHtml(moduleTitle)}${demoMode ? ' (DEMO)' : ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.background};
      color: ${colors.text};
    }
    @media print {
      .slide-page { page-break-after: always; min-height: 100vh; }
    }
    @page { size: A4 landscape; margin: 0; }
  </style>
</head>
<body>
  <div class="slide-page cover" style="page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: white; padding: 60px; position: relative;">
    ${demoMode ? `<div style="position: absolute; top: 24px; right: 24px; background: #F59E0B; color: white; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700;">DEMO</div>` : ''}
    <div style="text-align: center; max-width: 800px;">
      <h1 style="font-size: 48px; font-weight: 700; margin-bottom: 24px; line-height: 1.1;">${escapeHtml(courseTitle)}</h1>
      <h2 style="font-size: 28px; font-weight: 400; opacity: 0.9; margin-bottom: 48px;">${escapeHtml(moduleTitle)}</h2>
      <div style="display: inline-flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 999px;">
        <span style="font-size: 16px; opacity: 0.9;">${slides.length} slides</span>
        <span style="opacity: 0.5;">•</span>
        <span style="font-size: 16px; opacity: 0.9;">${new Date().toLocaleDateString('sv-SE')}</span>
      </div>
    </div>
    ${demoMode ? `<p style="position: absolute; bottom: 40px; font-size: 13px; opacity: 0.7; text-align: center;">Detta är en demoversion.</p>` : ''}
  </div>
  ${slidePages}
</body>
</html>`;
}

// Generate PPTX-compatible XML that can be opened in PowerPoint
function generatePPTXContent(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false, template: keyof typeof TEMPLATES = 'professional'): string {
  const colors = TEMPLATES[template];
  
  // Create a simplified Open XML format that PowerPoint can read
  const slideContents = slides.map((slide, index) => {
    const contentItems = (slide.content || '').split('\n').filter(line => line.trim());
    
    return {
      slideNumber: index + 1,
      title: slide.title,
      bullets: contentItems.map(item => item.replace(/^[•\-\*]\s*/, '').trim()),
      notes: slide.speakerNotes || '',
    };
  });

  // Generate a well-formed XML structure
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<presentation>
  <metadata>
    <title>${escapeXml(courseTitle)}</title>
    <subject>${escapeXml(moduleTitle)}</subject>
    <slideCount>${slides.length}</slideCount>
    <created>${new Date().toISOString()}</created>
    <template>${template}</template>
    ${demoMode ? '<demoMode>true</demoMode>' : ''}
  </metadata>
  <theme>
    <primaryColor>${colors.primary}</primaryColor>
    <secondaryColor>${colors.secondary}</secondaryColor>
    <accentColor>${colors.accent}</accentColor>
    <backgroundColor>${colors.background}</backgroundColor>
    <textColor>${colors.text}</textColor>
  </theme>
  <slides>
${slideContents.map(s => `    <slide number="${s.slideNumber}">
      <title>${escapeXml(s.title)}</title>
      <content>
${s.bullets.map(b => `        <bullet>${escapeXml(b)}</bullet>`).join('\n')}
      </content>
      ${s.notes ? `<notes>${escapeXml(s.notes)}</notes>` : ''}
    </slide>`).join('\n')}
  </slides>
</presentation>`;

  return xmlContent;
}

// Generate HTML-based PPTX alternative that can be imported to Google Slides
function generatePPTXHtml(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false, template: keyof typeof TEMPLATES = 'professional'): string {
  const colors = TEMPLATES[template];
  
  const slidePages = slides.map((slide, index) => {
    const contentItems = (slide.content || '').split('\n').filter(line => line.trim());
    
    return `
    <div class="slide" style="width: 960px; height: 540px; background: ${slide.backgroundColor || colors.background}; border: 1px solid #ddd; margin: 20px auto; padding: 40px; box-sizing: border-box; position: relative; page-break-after: always;">
      ${demoMode ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); opacity: 0.08; font-size: 80px; font-weight: bold; color: #F59E0B; pointer-events: none;">DEMO</div>
      ` : ''}
      <div style="font-size: 10px; color: ${colors.muted}; margin-bottom: 20px;">Slide ${index + 1}</div>
      <h2 style="font-size: 32px; font-weight: 700; color: ${colors.primary}; margin-bottom: 30px;">${escapeHtml(slide.title)}</h2>
      <ul style="list-style: disc; padding-left: 30px; font-size: 18px; color: ${colors.text}; line-height: 1.8;">
        ${contentItems.map(item => `<li>${escapeHtml(item.replace(/^[•\-\*]\s*/, ''))}</li>`).join('')}
      </ul>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(courseTitle)} - PowerPoint Export</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; background: #f0f0f0; padding: 20px; }
    .slide { box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 4px; }
    @media print { 
      body { background: white; padding: 0; }
      .slide { box-shadow: none; margin: 0; page-break-after: always; }
    }
    .instructions { max-width: 960px; margin: 0 auto 20px; padding: 20px; background: #e3f2fd; border-radius: 8px; }
    @media print { .instructions { display: none; } }
  </style>
</head>
<body>
  <div class="instructions">
    <h3 style="margin: 0 0 10px 0; color: #1565c0;">📥 Importera till PowerPoint eller Google Slides</h3>
    <ol style="margin: 0; padding-left: 20px; color: #333;">
      <li>Tryck <strong>Ctrl+P</strong> (eller Cmd+P på Mac) för att öppna utskrift</li>
      <li>Välj <strong>"Spara som PDF"</strong> som skrivare</li>
      <li>Öppna Google Slides → Arkiv → Importera slides → Välj PDF-filen</li>
      <li>Eller öppna PowerPoint → Infoga → Objekt → Skapa från fil</li>
    </ol>
  </div>
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: ${colors.primary}; margin: 0;">${escapeHtml(courseTitle)}</h1>
    <p style="color: ${colors.muted}; font-size: 18px;">${escapeHtml(moduleTitle)} • ${slides.length} slides</p>
  </div>
  
  ${slidePages}
</body>
</html>`;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slides, courseTitle, moduleTitle, format, demoMode, template = 'professional' }: ExportRequest = await req.json();

    console.log(`Exporting ${slides.length} slides as ${format} using ${template} template${demoMode ? ' (DEMO)' : ''}`);

    if (!slides || slides.length === 0) {
      throw new Error('No slides provided for export');
    }

    let content: string;
    let contentType: string;
    let filename: string;
    const demoSuffix = demoMode ? '_DEMO' : '';
    const safeTitle = (courseTitle || 'presentation').replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, '').replace(/\s+/g, '_');

    if (format === 'pptx') {
      // Generate HTML-based PPTX alternative
      content = generatePPTXHtml(slides, courseTitle, moduleTitle, demoMode, template as keyof typeof TEMPLATES);
      contentType = 'text/html';
      filename = `${safeTitle}${demoSuffix}.html`;
    } else if (format === 'pdf') {
      content = generatePDFHtml(slides, courseTitle, moduleTitle, demoMode, template as keyof typeof TEMPLATES);
      contentType = 'text/html';
      filename = `${safeTitle}${demoSuffix}.html`;
    } else {
      throw new Error('Unsupported format. Use "pptx" or "pdf".');
    }

    console.log(`Generated ${format} content: ${content.length} bytes`);

    return new Response(
      JSON.stringify({
        content,
        contentType,
        filename,
        format,
        template,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
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

// Demo watermark SVG
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

// Generate professional PPTX-compatible XML
function generatePPTX(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false, template: keyof typeof TEMPLATES = 'professional'): string {
  const colors = TEMPLATES[template];
  
  const slidesXml = slides.map((slide, index) => {
    const layoutType = getLayoutType(slide.layout);
    const contentItems = (slide.content || '').split('\n').filter(line => line.trim());
    
    return `
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:nvGrpSpPr>
            <p:cNvPr id="1" name=""/>
            <p:cNvGrpSpPr/>
            <p:nvPr/>
          </p:nvGrpSpPr>
          <p:grpSpPr/>
          
          <!-- Title Shape -->
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="2" name="Title ${index + 1}"/>
              <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
              <p:nvPr><p:ph type="title"/></p:nvPr>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm>
                <a:off x="457200" y="274638"/>
                <a:ext cx="8229600" cy="1143000"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:rPr lang="en-US" sz="4000" b="1">
                    <a:solidFill><a:srgbClr val="${colors.primary.replace('#', '')}"/></a:solidFill>
                    <a:latin typeface="Segoe UI" pitchFamily="34" charset="0"/>
                  </a:rPr>
                  <a:t>${escapeXml(slide.title)}</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
          
          <!-- Content Shape -->
          ${layoutType !== 'title' ? `
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content ${index + 1}"/>
              <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
              <p:nvPr><p:ph idx="1"/></p:nvPr>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm>
                <a:off x="457200" y="1600200"/>
                <a:ext cx="${layoutType === 'two-column' ? '4114800' : '8229600'}" cy="4525963"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:lstStyle/>
              ${contentItems.map(item => `
              <a:p>
                <a:pPr marL="342900" indent="-342900">
                  <a:buFont typeface="Arial" pitchFamily="34" charset="0"/>
                  <a:buChar char="•"/>
                </a:pPr>
                <a:r>
                  <a:rPr lang="en-US" sz="2400">
                    <a:solidFill><a:srgbClr val="${colors.text.replace('#', '')}"/></a:solidFill>
                    <a:latin typeface="Segoe UI" pitchFamily="34" charset="0"/>
                  </a:rPr>
                  <a:t>${escapeXml(item.replace(/^[•\-\*]\s*/, ''))}</a:t>
                </a:r>
              </a:p>
              `).join('')}
            </p:txBody>
          </p:sp>
          ` : ''}
          
          <!-- Slide Number -->
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="4" name="Slide Number"/>
              <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
              <p:nvPr><p:ph type="sldNum" sz="quarter" idx="12"/></p:nvPr>
            </p:nvSpPr>
            <p:spPr/>
            <p:txBody>
              <a:bodyPr/>
              <a:lstStyle/>
              <a:p>
                <a:fld id="{SLIDE_NUM}" type="slidenum">
                  <a:rPr lang="en-US" sz="1200">
                    <a:solidFill><a:srgbClr val="${colors.muted.replace('#', '')}"/></a:solidFill>
                  </a:rPr>
                  <a:t>${index + 1}</a:t>
                </a:fld>
              </a:p>
            </p:txBody>
          </p:sp>
          
          ${demoMode ? `
          <!-- Demo Watermark -->
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="5" name="Watermark"/>
              <p:cNvSpPr/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm rot="-900000">
                <a:off x="3048000" y="2743200"/>
                <a:ext cx="3048000" cy="914400"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:rPr lang="en-US" sz="6000" b="1">
                    <a:solidFill><a:srgbClr val="F59E0B"><a:alpha val="20000"/></a:srgbClr></a:solidFill>
                  </a:rPr>
                  <a:t>DEMO</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
          ` : ''}
        </p:spTree>
      </p:cSld>
      ${slide.speakerNotes ? `
      <p:notes>
        <p:cSld>
          <p:spTree>
            <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
            <p:grpSpPr/>
            <p:sp>
              <p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
              <p:spPr/>
              <p:txBody>
                <a:bodyPr/>
                <a:lstStyle/>
                <a:p><a:r><a:rPr lang="en-US"/><a:t>${escapeXml(slide.speakerNotes)}</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:notes>
      ` : ''}
    </p:sld>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:notesMasterIdLst>
    <p:notesMasterId r:id="rId2"/>
  </p:notesMasterIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <presentationPr>
    <title>${escapeXml(courseTitle)}</title>
    <module>${escapeXml(moduleTitle)}</module>
    <slideCount>${slides.length}</slideCount>
    <created>${new Date().toISOString()}</created>
    <template>${template}</template>
    ${demoMode ? '<demoMode>true</demoMode>' : ''}
  </presentationPr>
  <slides>
    ${slidesXml}
  </slides>
</p:presentation>`;
}

// Generate professional HTML/PDF
function generatePDFHtml(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false, template: keyof typeof TEMPLATES = 'professional'): string {
  const colors = TEMPLATES[template];
  
  const slidePages = slides.map((slide, index) => {
    const layoutClass = getLayoutClass(slide.layout);
    const contentItems = (slide.content || '').split('\n').filter(line => line.trim());
    
    return `
    <div class="slide-page ${layoutClass}" style="page-break-after: always; width: 100%; min-height: 100vh; box-sizing: border-box; position: relative; background: ${colors.background};">
      <div class="slide-container" style="padding: 60px; height: 100%; display: flex; flex-direction: column; position: relative;">
        ${demoMode ? DEMO_WATERMARK_SVG : ''}
        ${demoMode ? DEMO_BADGE_HTML : ''}
        
        <!-- Header -->
        <div class="slide-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid ${colors.accent};">
          <span style="font-size: 14px; color: ${colors.muted}; font-weight: 500;">${escapeHtml(moduleTitle)}</span>
          <span style="font-size: 14px; color: ${colors.muted};">${index + 1} / ${slides.length}</span>
        </div>
        
        <!-- Title -->
        <h1 style="font-size: 36px; font-weight: 700; color: ${colors.primary}; margin-bottom: 32px; line-height: 1.2; letter-spacing: -0.5px;">
          ${escapeHtml(slide.title)}
        </h1>
        
        <!-- Content -->
        <div class="slide-content" style="flex: 1; display: flex; ${slide.layout === 'two-column' ? 'flex-direction: row; gap: 48px;' : 'flex-direction: column;'}">
          ${slide.imageUrl && (slide.layout === 'image-focus' || slide.layout === 'two-column') ? `
          <div style="flex: ${slide.layout === 'image-focus' ? '2' : '1'}; display: flex; align-items: center; justify-content: center;">
            <img src="${escapeHtml(slide.imageUrl)}" alt="" style="max-width: 100%; max-height: 400px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);"/>
          </div>
          ` : ''}
          
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
        </div>
        
        ${slide.speakerNotes ? `
        <div class="speaker-notes" style="margin-top: auto; padding-top: 24px; border-top: 1px solid ${colors.muted}30;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.muted}; margin-bottom: 8px; font-weight: 600;">Speaker Notes</div>
          <p style="font-size: 13px; color: ${colors.muted}; line-height: 1.6; margin: 0;">${escapeHtml(slide.speakerNotes)}</p>
        </div>
        ` : ''}
      </div>
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
      .slide-page { 
        page-break-after: always; 
        min-height: 100vh;
      }
      .speaker-notes { 
        display: block !important; 
      }
    }
    
    @page {
      size: A4 landscape;
      margin: 0;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="slide-page cover" style="page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: white; padding: 60px; position: relative;">
    ${demoMode ? `<div style="position: absolute; top: 24px; right: 24px; background: #F59E0B; color: white; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">DEMO</div>` : ''}
    
    <div style="text-align: center; max-width: 800px;">
      <h1 style="font-size: 48px; font-weight: 700; margin-bottom: 24px; line-height: 1.1; letter-spacing: -1px;">${escapeHtml(courseTitle)}</h1>
      <h2 style="font-size: 28px; font-weight: 400; opacity: 0.9; margin-bottom: 48px;">${escapeHtml(moduleTitle)}</h2>
      <div style="display: inline-flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 999px;">
        <span style="font-size: 16px; opacity: 0.9;">${slides.length} slides</span>
        <span style="opacity: 0.5;">•</span>
        <span style="font-size: 16px; opacity: 0.9;">${new Date().toLocaleDateString('sv-SE')}</span>
      </div>
    </div>
    
    ${demoMode ? `<p style="position: absolute; bottom: 40px; font-size: 13px; opacity: 0.7; text-align: center;">Detta är en demoversion. Registrera dig för full tillgång.</p>` : ''}
  </div>
  
  ${slidePages}
</body>
</html>`;
}

function getLayoutType(layout: string): string {
  const typeMap: Record<string, string> = {
    'title': 'title',
    'title-content': 'content',
    'two-column': 'two-column',
    'image-focus': 'image',
    'quote': 'quote',
    'bullet-points': 'content',
  };
  return typeMap[layout] || 'content';
}

function getLayoutClass(layout: string): string {
  return `layout-${layout.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
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
    const safeModuleTitle = moduleTitle.replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'pptx') {
      content = generatePPTX(slides, courseTitle, moduleTitle, demoMode, template as keyof typeof TEMPLATES);
      contentType = 'application/xml';
      filename = `${safeModuleTitle}${demoSuffix}_presentation.xml`;
    } else if (format === 'pdf') {
      content = generatePDFHtml(slides, courseTitle, moduleTitle, demoMode, template as keyof typeof TEMPLATES);
      contentType = 'text/html';
      filename = `${safeModuleTitle}${demoSuffix}_presentation.html`;
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

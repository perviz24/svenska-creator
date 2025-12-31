import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Slide {
  title: string;
  content: string;
  subtitle?: string;
  bulletPoints?: string[];
  keyTakeaway?: string;
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

// Professional color palettes matching Presenton themes
const TEMPLATES = {
  professional: {
    primary: '#1e3a5f',
    secondary: '#2d5a87',
    accent: '#4a90d9',
    background: '#ffffff',
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
    primary: '#0d9488',
    secondary: '#14b8a6',
    accent: '#2dd4bf',
    background: '#f0fdfa',
    text: '#134e4a',
    muted: '#71717a',
  },
  creative: {
    primary: '#d97706',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#fffbeb',
    text: '#78350f',
    muted: '#6b7280',
  },
};

// Generate native PPTX using pptxgenjs
async function generateNativePPTX(
  slides: Slide[], 
  courseTitle: string, 
  moduleTitle: string, 
  demoMode: boolean = false, 
  template: keyof typeof TEMPLATES = 'professional'
): Promise<string> {
  const colors = TEMPLATES[template];
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = 'Kursgeneratorn';
  pptx.title = courseTitle;
  pptx.subject = moduleTitle;
  pptx.company = 'Kursgeneratorn';
  
  // Define master slide layouts (NO placeholders to avoid dotted boxes/overlaps)
  pptx.defineSlideMaster({
    title: 'TITLE_SLIDE',
    background: { color: colors.primary.replace('#', '') },
    objects: [
      // subtle bottom bar
      { rect: { x: 0, y: 6.9, w: '100%', h: 0.6, fill: { color: colors.secondary.replace('#', '') } } },
    ],
  });

  pptx.defineSlideMaster({
    title: 'CONTENT_SLIDE',
    background: { color: colors.background.replace('#', '') },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.65, fill: { color: colors.primary.replace('#', '') } } },
      { rect: { x: 0, y: 0.65, w: '100%', h: 0.05, fill: { color: colors.accent.replace('#', '') } } },
    ],
  });

  // Add title slide
  const titleSlide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
  const subtitle = moduleTitle && moduleTitle.trim() !== '' && moduleTitle.trim() !== courseTitle.trim() ? moduleTitle : '';

  titleSlide.addText(courseTitle, {
    x: 0.7, y: 2.05, w: 8.6, h: 2.0,
    fontSize: 44,
    color: 'FFFFFF',
    bold: true,
    align: 'center',
    fontFace: 'Arial',
    // Shrink if it doesn't fit
    fit: 'shrink',
  });

  if (subtitle) {
    titleSlide.addText(subtitle, {
      x: 0.9, y: 4.25, w: 8.2, h: 0.7,
      fontSize: 22,
      color: 'FFFFFF',
      align: 'center',
      fontFace: 'Arial',
      fit: 'shrink',
    });
  }

  titleSlide.addText(`${slides.length} slides • ${new Date().toLocaleDateString('sv-SE')}`, {
    x: 0.5, y: 6.6, w: 9, h: 0.4,
    fontSize: 13,
    color: 'E5E7EB',
    align: 'center',
    fontFace: 'Arial',
  });
  
  if (demoMode) {
    titleSlide.addText('DEMO', { 
      x: 8, y: 0.2, w: 1.5, h: 0.4, 
      fontSize: 12, color: 'FFFFFF', bold: true, align: 'center',
      fill: { color: 'F59E0B' },
      fontFace: 'Arial'
    });
  }

  // Remove duplicate title slides coming from the generator (we already create a cover slide above)
  const contentSlidesData = slides.filter((s, idx) => {
    const hasBullets = Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0;
    const hasContent = Boolean((s.content || '').trim());
    const hasTakeaway = Boolean((s.keyTakeaway || '').trim());
    const isDuplicateTitle = s.layout === 'title' && idx === 0 && !hasBullets && !hasContent && !hasTakeaway;
    return !isDuplicateTitle;
  });

  // Add content slides
  for (let i = 0; i < contentSlidesData.length; i++) {
    const slide = contentSlidesData[i];
    const contentSlide = pptx.addSlide({ masterName: 'CONTENT_SLIDE' });

    // Header bar
    contentSlide.addShape('rect', {
      x: 0, y: 0, w: '100%', h: 0.5,
      fill: { color: colors.primary.replace('#', '') },
    });

    // Module title in header
    contentSlide.addText(moduleTitle, {
      x: 0.3, y: 0.12, w: 6.2, h: 0.3,
      fontSize: 10, color: 'FFFFFF', fontFace: 'Arial',
    });

    // Slide number
    contentSlide.addText(`${i + 1} / ${contentSlidesData.length}`, {
      x: 8.5, y: 0.12, w: 1, h: 0.3,
      fontSize: 10, color: 'FFFFFF', align: 'right', fontFace: 'Arial',
    });

    // Demo watermark
    if (demoMode) {
      contentSlide.addText('DEMO', {
        x: 3, y: 2.5, w: 4, h: 1,
        fontSize: 72,
        color: 'F59E0B',
        bold: true,
        align: 'center',
        rotate: -15,
        fontFace: 'Arial',
      });
    }

    // Title
    contentSlide.addText(slide.title, {
      x: 0.5, y: 0.72, w: 9, h: 0.55,
      fontSize: 26,
      color: colors.text.replace('#', ''),
      bold: true,
      fontFace: 'Arial',
      fit: 'shrink',
    });

    // Subtitle
    if (slide.subtitle && slide.subtitle.trim()) {
      contentSlide.addText(slide.subtitle.trim(), {
        x: 0.5, y: 1.22, w: 9, h: 0.35,
        fontSize: 14,
        color: colors.muted.replace('#', ''),
        fontFace: 'Arial',
        fit: 'shrink',
      });
    }

    const bulletsFromContent = (slide.content || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[•\-\*]\s*/, '').trim());

    const bullets = (slide.bulletPoints && slide.bulletPoints.length > 0)
      ? slide.bulletPoints.map((b) => String(b).trim()).filter(Boolean)
      : bulletsFromContent;

    // Layout-aware body
    if (slide.layout === 'key-point' && slide.keyTakeaway && slide.keyTakeaway.trim()) {
      // Key takeaway box
      contentSlide.addShape('roundRect', {
        x: 0.5, y: 1.75, w: 9, h: 1.4,
        fill: { color: colors.accent.replace('#', ''), transparency: 85 },
        line: { color: colors.accent.replace('#', ''), transparency: 60 },
      });

      contentSlide.addText(slide.keyTakeaway.trim(), {
        x: 0.75, y: 1.9, w: 8.5, h: 1.1,
        fontSize: 22,
        color: colors.text.replace('#', ''),
        bold: true,
        fontFace: 'Arial',
        valign: 'middle',
        fit: 'shrink',
      });

      if (bullets.length > 0) {
        const bulletRuns = bullets.slice(0, 3).map((t) => ({
          text: t,
          options: { bullet: { type: 'bullet' as const, color: colors.accent.replace('#', '') }, indentLevel: 0 },
        }));

        contentSlide.addText(bulletRuns, {
          x: 0.8, y: 3.45, w: 8.7, h: 3.4,
          fontSize: 16,
          color: colors.text.replace('#', ''),
          lineSpacing: 24,
          fontFace: 'Arial',
          valign: 'top',
        });
      }
    } else {
      // Default bullets layout
      const bulletRuns = bullets.slice(0, 6).map((t) => ({
        text: t,
        options: { bullet: { type: 'bullet' as const, color: colors.accent.replace('#', '') }, indentLevel: 0 },
      }));

      // If no bullets, fall back to keyTakeaway/content
      if (bulletRuns.length > 0) {
        contentSlide.addText(bulletRuns, {
          x: 0.6,
          y: slide.subtitle && slide.subtitle.trim() ? 1.75 : 1.55,
          w: 8.9,
          h: 5.0,
          fontSize: 18,
          color: colors.text.replace('#', ''),
          lineSpacing: 28,
          fontFace: 'Arial',
          valign: 'top',
        });
      } else if (slide.keyTakeaway && slide.keyTakeaway.trim()) {
        contentSlide.addText(slide.keyTakeaway.trim(), {
          x: 0.6,
          y: slide.subtitle && slide.subtitle.trim() ? 1.75 : 1.55,
          w: 8.9,
          h: 5.0,
          fontSize: 22,
          color: colors.text.replace('#', ''),
          bold: true,
          fontFace: 'Arial',
          valign: 'top',
          fit: 'shrink',
        });
      }
    }

    // Speaker notes
    if (slide.speakerNotes) {
      contentSlide.addNotes(slide.speakerNotes);
    }
  }

  // Generate base64 output
  const pptxBase64 = await pptx.write({ outputType: 'base64' });
  return pptxBase64 as string;
}

// Generate professional HTML for PDF export
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

    const demoSuffix = demoMode ? '_DEMO' : '';
    const safeTitle = (courseTitle || 'presentation').replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, '').replace(/\s+/g, '_');

    if (format === 'pptx') {
      // Generate native PPTX
      const pptxBase64 = await generateNativePPTX(slides, courseTitle, moduleTitle, demoMode, template as keyof typeof TEMPLATES);
      
      console.log(`Generated native PPTX: ${pptxBase64.length} bytes (base64)`);

      return new Response(
        JSON.stringify({
          content: pptxBase64,
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          filename: `${safeTitle}${demoSuffix}.pptx`,
          format: 'pptx',
          template,
          isBase64: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (format === 'pdf') {
      const content = generatePDFHtml(slides, courseTitle, moduleTitle, demoMode, template as keyof typeof TEMPLATES);
      
      console.log(`Generated PDF HTML: ${content.length} bytes`);

      return new Response(
        JSON.stringify({
          content,
          contentType: 'text/html',
          filename: `${safeTitle}${demoSuffix}.html`,
          format: 'pdf',
          template,
          isBase64: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Unsupported format. Use "pptx" or "pdf".');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

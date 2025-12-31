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

// Professional color palettes
const TEMPLATES = {
  professional: {
    primary: '#1e3a5f',
    secondary: '#2d5a87',
    accent: '#4a90d9',
    background: '#ffffff',
    text: '#1a1a2e',
    muted: '#64748b',
    highlight: '#dbeafe',
  },
  modern: {
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#0f172a',
    muted: '#6b7280',
    highlight: '#e0f2fe',
  },
  minimal: {
    primary: '#0d9488',
    secondary: '#14b8a6',
    accent: '#2dd4bf',
    background: '#f0fdfa',
    text: '#134e4a',
    muted: '#71717a',
    highlight: '#ccfbf1',
  },
  creative: {
    primary: '#d97706',
    secondary: '#f59e0b',
    accent: '#fbbf24',
    background: '#fffbeb',
    text: '#78350f',
    muted: '#6b7280',
    highlight: '#fef3c7',
  },
};

// Helper to fetch image as base64 data URL
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log(`Fetching image: ${url}`);
    const response = await fetch(url, { 
      headers: { 'Accept': 'image/*' },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    console.log(`Successfully fetched image (${Math.round(arrayBuffer.byteLength / 1024)}KB)`);
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error(`Error fetching image: ${err}`);
    return null;
  }
}

// Generate native PPTX with layout-specific designs
async function generateNativePPTX(
  slides: Slide[],
  courseTitle: string,
  moduleTitle: string,
  demoMode: boolean = false,
  template: keyof typeof TEMPLATES = 'professional'
): Promise<string> {
  const colors = TEMPLATES[template];
  const pptx = new PptxGenJS();

  // 4:3 layout matches our coordinate system (w=10in, h=7.5in)
  pptx.layout = 'LAYOUT_4X3';

  const SLIDE_W = 10;
  const SLIDE_H = 7.5;

  // Pre-fetch all images in parallel for slides that have imageUrl
  console.log('Pre-fetching stock images for embedding...');
  const imageCache: Map<string, string | null> = new Map();
  const imageUrls = slides
    .map(s => s.imageUrl)
    .filter((url): url is string => Boolean(url && url.startsWith('http')));
  
  const uniqueUrls = [...new Set(imageUrls)];
  const imagePromises = uniqueUrls.map(async url => {
    const base64 = await fetchImageAsBase64(url);
    imageCache.set(url, base64);
  });
  await Promise.all(imagePromises);
  console.log(`Cached ${imageCache.size} images for embedding`);

  pptx.author = 'Kursgeneratorn';
  pptx.title = courseTitle;
  pptx.subject = moduleTitle;
  pptx.company = 'Kursgeneratorn';

  // Define master slides (PptxGenJS does NOT support percentage dimensions)
  pptx.defineSlideMaster({
    title: 'TITLE_SLIDE',
    background: { color: colors.primary.replace('#', '') },
    objects: [
      {
        rect: {
          x: 0,
          y: 6.9,
          w: SLIDE_W,
          h: 0.6,
          fill: { color: colors.secondary.replace('#', '') },
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: 'CONTENT_SLIDE',
    background: { color: colors.background.replace('#', '') },
    objects: [
      {
        rect: {
          x: 0,
          y: 0,
          w: SLIDE_W,
          h: 0.65,
          fill: { color: colors.primary.replace('#', '') },
        },
      },
      {
        rect: {
          x: 0,
          y: 0.65,
          w: SLIDE_W,
          h: 0.05,
          fill: { color: colors.accent.replace('#', '') },
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: 'ACCENT_SLIDE',
    background: { color: colors.secondary.replace('#', '') },
    objects: [],
  });

  // Cover slide
  const titleSlide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
  const subtitle = moduleTitle && moduleTitle.trim() !== courseTitle.trim() ? moduleTitle : '';

  titleSlide.addText(courseTitle, {
    x: 0.7, y: 2.05, w: 8.6, h: 2.0,
    fontSize: 44, color: 'FFFFFF', bold: true, align: 'center', fontFace: 'Arial', fit: 'shrink',
  });

  if (subtitle) {
    titleSlide.addText(subtitle, {
      x: 0.9, y: 4.25, w: 8.2, h: 0.7,
      fontSize: 22, color: 'FFFFFF', align: 'center', fontFace: 'Arial', fit: 'shrink',
    });
  }

  titleSlide.addText(`${slides.length} slides • ${new Date().toLocaleDateString('sv-SE')}`, {
    x: 0.5, y: 6.6, w: 9, h: 0.4,
    fontSize: 13, color: 'E5E7EB', align: 'center', fontFace: 'Arial',
  });
  
  if (demoMode) {
    titleSlide.addText('DEMO', { 
      x: 8, y: 0.2, w: 1.5, h: 0.4, 
      fontSize: 12, color: 'FFFFFF', bold: true, align: 'center',
      fill: { color: 'F59E0B' }, fontFace: 'Arial'
    });
  }

  // Filter duplicate title slides
  const contentSlidesData = slides.filter((s, idx) => {
    const hasBullets = Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0;
    const hasContent = Boolean((s.content || '').trim());
    const hasTakeaway = Boolean((s.keyTakeaway || '').trim());
    const isDuplicateTitle = s.layout === 'title' && idx === 0 && !hasBullets && !hasContent && !hasTakeaway;
    return !isDuplicateTitle;
  });

  // Process each slide with layout-specific rendering
  for (let i = 0; i < contentSlidesData.length; i++) {
    const slide = contentSlidesData[i];
    const layout = slide.layout || 'bullet-points';
    
    // Get bullets from bulletPoints or content
    const bulletsFromContent = (slide.content || '')
      .split('\n').map(l => l.trim()).filter(Boolean)
      .map(l => l.replace(/^[•\-\*]\s*/, '').trim());
    const bullets = (slide.bulletPoints && slide.bulletPoints.length > 0)
      ? slide.bulletPoints.map(b => String(b).trim()).filter(Boolean)
      : bulletsFromContent;

    // Choose master based on layout
    const masterName = ['quote', 'stats'].includes(layout) ? 'ACCENT_SLIDE' : 'CONTENT_SLIDE';
    const contentSlide = pptx.addSlide({ masterName });

    // === FULL-BLEED BACKGROUND IMAGE WITH OVERLAY ===
    const slideImageUrl = slide.imageUrl;
    const cachedImage = slideImageUrl ? imageCache.get(slideImageUrl) : null;
    
    if (cachedImage) {
      // Add full-bleed background image
      contentSlide.addImage({
        data: cachedImage,
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: SLIDE_H,
        sizing: { type: 'cover', w: SLIDE_W, h: SLIDE_H },
      });
      // Add dark overlay for text readability (semi-transparent black)
      contentSlide.addShape('rect', {
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: SLIDE_H,
        fill: { color: '000000', transparency: 50 },
      });
    }

    // Header for content slides (render on top of image/overlay)
    if (masterName === 'CONTENT_SLIDE') {
      contentSlide.addShape('rect', {
        x: 0,
        y: 0,
        w: 10,
        h: 0.5,
        fill: { color: cachedImage ? '000000' : colors.primary.replace('#', ''), transparency: cachedImage ? 30 : 0 },
      });
      contentSlide.addText(moduleTitle, {
        x: 0.3, y: 0.12, w: 6.2, h: 0.3,
        fontSize: 10, color: 'FFFFFF', fontFace: 'Arial',
      });
      contentSlide.addText(`${i + 1} / ${contentSlidesData.length}`, {
        x: 8.5, y: 0.12, w: 1, h: 0.3,
        fontSize: 10, color: 'FFFFFF', align: 'right', fontFace: 'Arial',
      });
    }

    // Demo watermark
    if (demoMode) {
      contentSlide.addText('DEMO', {
        x: 3, y: 2.5, w: 4, h: 1,
        fontSize: 72, color: 'F59E0B', bold: true, align: 'center', rotate: -15, fontFace: 'Arial',
      });
    }

    // Layout-specific rendering - use white text if image background present
    const hasImageBg = Boolean(cachedImage);
    const textColor = hasImageBg ? 'FFFFFF' : colors.text.replace('#', '');
    const mutedColor = hasImageBg ? 'E5E7EB' : colors.muted.replace('#', '');
    const accentColor = hasImageBg ? 'FFFFFF' : colors.accent.replace('#', '');

    switch (layout) {
      case 'key-point': {
        // Title
        contentSlide.addText(slide.title, {
          x: 0.5, y: 0.72, w: 9, h: 0.55,
          fontSize: 26, color: textColor, bold: true, fontFace: 'Arial', fit: 'shrink',
        });
        // Subtitle
        if (slide.subtitle) {
          contentSlide.addText(slide.subtitle, {
            x: 0.5, y: 1.22, w: 9, h: 0.35,
            fontSize: 14, color: mutedColor, fontFace: 'Arial',
          });
        }
        // Key takeaway box - semi-transparent on image bg
        if (slide.keyTakeaway) {
          contentSlide.addShape('roundRect', {
            x: 0.5, y: 1.7, w: 9, h: 1.5,
            fill: { color: hasImageBg ? '000000' : colors.highlight.replace('#', ''), transparency: hasImageBg ? 40 : 0 },
            line: { color: hasImageBg ? 'FFFFFF' : colors.accent.replace('#', ''), width: 2 },
          });
          contentSlide.addText(slide.keyTakeaway, {
            x: 0.75, y: 1.85, w: 8.5, h: 1.2,
            fontSize: 22, color: textColor, bold: true, fontFace: 'Arial',
            valign: 'middle', fit: 'shrink',
          });
        }
        // Supporting bullets
        if (bullets.length > 0) {
          const bulletRuns = bullets.slice(0, 4).map(t => ({
            text: t,
            options: { bullet: { type: 'bullet' as const, color: accentColor }, indentLevel: 0 },
          }));
          contentSlide.addText(bulletRuns, {
            x: 0.6, y: 3.4, w: 8.9, h: 3.2,
            fontSize: 16, color: textColor, lineSpacing: 26, fontFace: 'Arial', valign: 'top',
          });
        }
        break;
      }

      case 'stats': {
        // Stats layout: large centered numbers
        contentSlide.addText(slide.title, {
          x: 0.5, y: 0.5, w: 9, h: 0.6,
          fontSize: 28, color: 'FFFFFF', bold: true, fontFace: 'Arial', align: 'center',
        });
        // Grid of stats
        const statBullets = bullets.slice(0, 4);
        const cols = statBullets.length <= 2 ? statBullets.length : 2;
        const boxW = 4.2;
        const boxH = 2.2;
        const gapX = 0.4;
        const startX = (10 - (cols * boxW + (cols - 1) * gapX)) / 2;
        statBullets.forEach((stat, idx) => {
          const row = Math.floor(idx / 2);
          const col = idx % 2;
          const x = startX + col * (boxW + gapX);
          const y = 1.6 + row * (boxH + 0.3);
          contentSlide.addShape('roundRect', {
            x, y, w: boxW, h: boxH,
            fill: { color: 'FFFFFF', transparency: 10 },
            line: { color: 'FFFFFF', transparency: 70 },
          });
          contentSlide.addText(stat, {
            x: x + 0.2, y: y + 0.3, w: boxW - 0.4, h: boxH - 0.6,
            fontSize: 18, color: 'FFFFFF', bold: true, fontFace: 'Arial', align: 'center', valign: 'middle',
          });
        });
        // Slide number
        contentSlide.addText(`${i + 1} / ${contentSlidesData.length}`, {
          x: 8.5, y: 6.8, w: 1, h: 0.3,
          fontSize: 10, color: 'FFFFFF', align: 'right', fontFace: 'Arial',
        });
        break;
      }

      case 'comparison': {
        // Comparison layout: two columns
        contentSlide.addText(slide.title, {
          x: 0.5, y: 0.72, w: 9, h: 0.55,
          fontSize: 26, color: textColor, bold: true, fontFace: 'Arial', fit: 'shrink',
        });
        const leftBullets = bullets.filter((_, idx) => idx % 2 === 0);
        const rightBullets = bullets.filter((_, idx) => idx % 2 === 1);
        // Left column - semi-transparent on image bg
        contentSlide.addShape('rect', {
          x: 0.4, y: 1.5, w: 4.4, h: 4.8,
          fill: { color: hasImageBg ? '000000' : colors.highlight.replace('#', ''), transparency: hasImageBg ? 50 : 0 },
        });
        if (leftBullets.length > 0) {
          const leftRuns = leftBullets.map(t => ({
            text: t,
            options: { bullet: { type: 'bullet' as const, color: accentColor }, indentLevel: 0 },
          }));
          contentSlide.addText(leftRuns, {
            x: 0.6, y: 1.7, w: 4.0, h: 4.4,
            fontSize: 15, color: textColor, lineSpacing: 24, fontFace: 'Arial', valign: 'top',
          });
        }
        // Right column - semi-transparent on image bg
        contentSlide.addShape('rect', {
          x: 5.2, y: 1.5, w: 4.4, h: 4.8,
          fill: { color: hasImageBg ? '000000' : colors.accent.replace('#', ''), transparency: hasImageBg ? 50 : 90 },
        });
        if (rightBullets.length > 0) {
          const rightRuns = rightBullets.map(t => ({
            text: t,
            options: { bullet: { type: 'bullet' as const, color: hasImageBg ? 'FFFFFF' : colors.primary.replace('#', '') }, indentLevel: 0 },
          }));
          contentSlide.addText(rightRuns, {
            x: 5.4, y: 1.7, w: 4.0, h: 4.4,
            fontSize: 15, color: textColor, lineSpacing: 24, fontFace: 'Arial', valign: 'top',
          });
        }
        break;
      }

      case 'quote': {
        // Quote layout: centered large quote
        const quoteText = slide.keyTakeaway || bullets[0] || slide.content || '';
        const attribution = slide.subtitle || slide.title;
        contentSlide.addText('"', {
          x: 0.5, y: 1.0, w: 1, h: 1,
          fontSize: 120, color: 'FFFFFF', fontFace: 'Georgia', bold: true,
        });
        contentSlide.addText(quoteText, {
          x: 1.2, y: 2.0, w: 7.6, h: 2.5,
          fontSize: 26, color: 'FFFFFF', fontFace: 'Georgia', italic: true, align: 'center', valign: 'middle',
        });
        contentSlide.addText(`— ${attribution}`, {
          x: 1.2, y: 5.0, w: 7.6, h: 0.5,
          fontSize: 16, color: 'E5E7EB', fontFace: 'Arial', align: 'center',
        });
        contentSlide.addText(`${i + 1} / ${contentSlidesData.length}`, {
          x: 8.5, y: 6.8, w: 1, h: 0.3,
          fontSize: 10, color: 'FFFFFF', align: 'right', fontFace: 'Arial',
        });
        break;
      }

      case 'image-focus': {
        // Image focus: text over the embedded image background
        contentSlide.addText(slide.title, {
          x: 0.5, y: 0.72, w: 9, h: 0.55,
          fontSize: 26, color: textColor, bold: true, fontFace: 'Arial', fit: 'shrink',
        });
        // Show 1-2 bullets only
        if (bullets.length > 0) {
          const shortBullets = bullets.slice(0, 2).map(t => ({
            text: t,
            options: { bullet: { type: 'bullet' as const, color: accentColor }, indentLevel: 0 },
          }));
          contentSlide.addText(shortBullets, {
            x: 0.6, y: 1.5, w: 8.9, h: 1.5,
            fontSize: 16, color: textColor, lineSpacing: 24, fontFace: 'Arial', valign: 'top',
          });
        }
        // Only show placeholder if no image background
        if (!hasImageBg) {
          contentSlide.addShape('rect', {
            x: 1.5, y: 3.2, w: 7, h: 3.3,
            fill: { color: mutedColor, transparency: 80 },
            line: { color: mutedColor, dashType: 'dash' },
          });
          contentSlide.addText('[Bild]', {
            x: 1.5, y: 4.5, w: 7, h: 0.5,
            fontSize: 14, color: mutedColor, align: 'center', fontFace: 'Arial',
          });
        }
        break;
      }

      default: {
        // Default bullet-points layout
        contentSlide.addText(slide.title, {
          x: 0.5, y: 0.72, w: 9, h: 0.55,
          fontSize: 26, color: textColor, bold: true, fontFace: 'Arial', fit: 'shrink',
        });
        if (slide.subtitle) {
          contentSlide.addText(slide.subtitle, {
            x: 0.5, y: 1.22, w: 9, h: 0.35,
            fontSize: 14, color: mutedColor, fontFace: 'Arial',
          });
        }
        const yStart = slide.subtitle ? 1.75 : 1.55;
        if (bullets.length > 0) {
          const bulletRuns = bullets.slice(0, 6).map(t => ({
            text: t,
            options: { bullet: { type: 'bullet' as const, color: accentColor }, indentLevel: 0 },
          }));
          contentSlide.addText(bulletRuns, {
            x: 0.6, y: yStart, w: 8.9, h: 5.0,
            fontSize: 18, color: textColor, lineSpacing: 28, fontFace: 'Arial', valign: 'top',
          });
        } else if (slide.keyTakeaway) {
          contentSlide.addText(slide.keyTakeaway, {
            x: 0.6, y: yStart, w: 8.9, h: 5.0,
            fontSize: 22, color: textColor, bold: true, fontFace: 'Arial', valign: 'top', fit: 'shrink',
          });
        }
        break;
      }
    }

    // Speaker notes
    if (slide.speakerNotes) {
      contentSlide.addNotes(slide.speakerNotes);
    }
  }

  const pptxBase64 = await pptx.write({ outputType: 'base64' });
  return pptxBase64 as string;
}

// Generate professional HTML for PDF export
function generatePDFHtml(slides: Slide[], courseTitle: string, moduleTitle: string, demoMode: boolean = false, template: keyof typeof TEMPLATES = 'professional'): string {
  const colors = TEMPLATES[template];
  
  const slidePages = slides.map((slide, index) => {
    const bullets = (slide.bulletPoints && slide.bulletPoints.length > 0)
      ? slide.bulletPoints
      : (slide.content || '').split('\n').filter(line => line.trim());
    
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
      
      <h1 style="font-size: 36px; font-weight: 700; color: ${colors.primary}; margin-bottom: 16px; line-height: 1.2;">
        ${escapeHtml(slide.title)}
      </h1>
      
      ${slide.subtitle ? `<p style="font-size: 18px; color: ${colors.muted}; margin-bottom: 24px;">${escapeHtml(slide.subtitle)}</p>` : ''}
      
      ${slide.keyTakeaway ? `
        <div style="background: ${colors.highlight}; border-left: 4px solid ${colors.accent}; padding: 16px 20px; margin-bottom: 24px; border-radius: 4px;">
          <p style="font-size: 20px; font-weight: 600; color: ${colors.text}; margin: 0;">${escapeHtml(slide.keyTakeaway)}</p>
        </div>
      ` : ''}
      
      <div style="flex: 1;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${bullets.map(item => `
          <li style="display: flex; align-items: flex-start; margin-bottom: 16px; font-size: 18px; line-height: 1.5; color: ${colors.text};">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; min-width: 24px; background: ${colors.highlight}; color: ${colors.accent}; border-radius: 50%; margin-right: 14px; font-weight: 600; font-size: 12px;">•</span>
            <span>${escapeHtml(String(item).replace(/^[•\-\*]\s*/, ''))}</span>
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
    
    // Log slide data for debugging
    slides.forEach((s, i) => {
      console.log(`Slide ${i + 1}: layout=${s.layout}, bullets=${s.bulletPoints?.length || 0}, keyTakeaway=${!!s.keyTakeaway}`);
    });

    if (!slides || slides.length === 0) {
      throw new Error('No slides provided for export');
    }

    const demoSuffix = demoMode ? '_DEMO' : '';
    const safeTitle = (courseTitle || 'presentation').replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, '').replace(/\s+/g, '_');

    if (format === 'pptx') {
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

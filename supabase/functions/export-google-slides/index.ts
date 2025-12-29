import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSlideXml(slide: SlideData, slideIndex: number): string {
  const bgColor = slide.backgroundColor?.replace('#', '') || 'FFFFFF';
  
  // Parse content into bullet points
  const contentLines = slide.content?.split('\n').filter(line => line.trim()) || [];
  
  let contentElements = '';
  const startY = 1800000; // Starting Y position
  const lineHeight = 400000;
  
  contentLines.forEach((line, i) => {
    const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
    contentElements += `
      <a:p>
        <a:pPr marL="342900" indent="-342900">
          <a:buChar char="•"/>
        </a:pPr>
        <a:r>
          <a:rPr lang="sv-SE" sz="2000" dirty="0"/>
          <a:t>${escapeXml(cleanLine)}</a:t>
        </a:r>
      </a:p>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="${bgColor}"/>
        </a:solidFill>
        <a:effectLst/>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="title"/>
          </p:nvPr>
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
              <a:rPr lang="sv-SE" sz="4400" b="1" dirty="0"/>
              <a:t>${escapeXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph idx="1"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="1600200"/>
            <a:ext cx="8229600" cy="4525963"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          ${contentElements || '<a:p><a:endParaRPr lang="sv-SE"/></a:p>'}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
  ${slide.speakerNotes ? `
  <p:notes>
    <p:cSld>
      <p:spTree>
        <p:nvGrpSpPr>
          <p:cNvPr id="1" name=""/>
          <p:cNvGrpSpPr/>
          <p:nvPr/>
        </p:nvGrpSpPr>
        <p:grpSpPr/>
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="2" name="Notes"/>
            <p:cNvSpPr/>
            <p:nvPr>
              <p:ph type="body" idx="1"/>
            </p:nvPr>
          </p:nvSpPr>
          <p:spPr/>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            <a:p>
              <a:r>
                <a:rPr lang="sv-SE"/>
                <a:t>${escapeXml(slide.speakerNotes)}</a:t>
              </a:r>
            </a:p>
          </p:txBody>
        </p:sp>
      </p:spTree>
    </p:cSld>
  </p:notes>
  ` : ''}
</p:sld>`;
}

serve(async (req) => {
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

    console.log(`Exporting ${slides.length} slides to Google Slides format`);

    // Generate presentation XML structure
    const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                saveSubsetFonts="1">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${slides.map((_: SlideData, i: number) => `<p:sldId id="${256 + i}" r:id="rId${10 + i}"/>`).join('\n    ')}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

    // Create a simple HTML-based export that can be copy-pasted
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(courseTitle)} - ${escapeXml(moduleTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .slide { border: 1px solid #ccc; padding: 30px; margin: 20px 0; border-radius: 8px; page-break-after: always; }
    .slide-number { color: #666; font-size: 12px; margin-bottom: 10px; }
    .slide h2 { margin: 0 0 20px 0; color: #333; }
    .slide-content { line-height: 1.6; }
    .slide-content ul { margin: 10px 0; padding-left: 20px; }
    .speaker-notes { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; font-size: 14px; color: #666; }
    .speaker-notes strong { color: #333; }
    @media print { .slide { page-break-after: always; } }
  </style>
</head>
<body>
  <h1>${escapeXml(courseTitle)}</h1>
  <h2>${escapeXml(moduleTitle)}</h2>
  ${slides.map((slide: SlideData, i: number) => `
  <div class="slide" style="background-color: ${slide.backgroundColor || '#ffffff'}">
    <div class="slide-number">Slide ${i + 1}</div>
    <h2>${escapeXml(slide.title)}</h2>
    <div class="slide-content">
      ${slide.content ? `<ul>${slide.content.split('\n').filter((l: string) => l.trim()).map((line: string) => `<li>${escapeXml(line.replace(/^[-•*]\s*/, ''))}</li>`).join('')}</ul>` : ''}
    </div>
    ${slide.speakerNotes ? `<div class="speaker-notes"><strong>Talarnoteringar:</strong> ${escapeXml(slide.speakerNotes)}</div>` : ''}
  </div>`).join('')}
</body>
</html>`;

    // Create a data URL for download
    const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));
    const downloadUrl = `data:text/html;base64,${base64Content}`;

    const filename = `${moduleTitle.replace(/[^a-zA-Z0-9]/g, '-')}-presentation.html`;

    return new Response(
      JSON.stringify({
        downloadUrl,
        filename,
        format: 'html',
        slideCount: slides.length,
        message: 'Open this HTML file in your browser and use File > Print > Save as PDF, then upload to Google Slides'
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FreelancerRequest {
  action: 'prepare-package' | 'generate-brief' | 'export-for-designer';
  slides?: any[];
  courseTitle?: string;
  moduleTitle?: string;
  designNotes?: string;
  platform?: 'fiverr' | 'upwork' | 'generic';
  includeExercises?: boolean;
  stylePreferences?: {
    colorScheme?: string;
    brandColors?: string[];
    logoUrl?: string;
    style?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      slides,
      courseTitle,
      moduleTitle,
      designNotes,
      platform = 'generic',
      includeExercises,
      stylePreferences,
    }: FreelancerRequest = await req.json();

    console.log(`Freelancer integration action: ${action}, platform: ${platform}`);

    if (action === 'prepare-package') {
      // Prepare slides in a format suitable for freelance designers
      const unstyedSlides = slides?.map((slide, index) => ({
        slideNumber: index + 1,
        title: slide.title,
        content: slide.content,
        layout: slide.layout,
        speakerNotes: slide.speakerNotes,
        suggestedImageQuery: slide.suggestedImageQuery,
        // Remove styling for designer to apply their own
        backgroundColor: null,
        imageUrl: null,
      })) || [];

      // Generate a design brief
      const designBrief = generateDesignBrief(
        courseTitle || 'Untitled Course',
        moduleTitle,
        unstyedSlides,
        stylePreferences,
        platform
      );

      return new Response(
        JSON.stringify({
          success: true,
          package: {
            designBrief,
            slides: unstyedSlides,
            metadata: {
              courseTitle,
              moduleTitle,
              totalSlides: unstyedSlides.length,
              platform,
              createdAt: new Date().toISOString(),
            },
            stylePreferences,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'generate-brief') {
      // Generate a detailed brief for freelancers
      const brief = generateFreelancerBrief(
        courseTitle || 'Untitled Course',
        slides || [],
        stylePreferences,
        designNotes,
        platform
      );

      return new Response(
        JSON.stringify({
          success: true,
          brief,
          platformGuidelines: getPlatformGuidelines(platform),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'export-for-designer') {
      // Export slides in multiple formats for designers
      const exportPackage = {
        // Plain text format for content
        textContent: slides?.map((slide, i) => 
          `=== SLIDE ${i + 1} ===\nTitle: ${slide.title}\nContent: ${slide.content}\nLayout: ${slide.layout}\nImage suggestion: ${slide.suggestedImageQuery || 'None'}\n`
        ).join('\n'),
        
        // JSON format for structured import
        jsonContent: JSON.stringify({
          courseTitle,
          moduleTitle,
          slides: slides?.map((slide, i) => ({
            number: i + 1,
            title: slide.title,
            content: slide.content,
            layout: slide.layout,
            imageQuery: slide.suggestedImageQuery,
          })),
          styleGuidelines: stylePreferences,
          designNotes,
        }, null, 2),

        // CSV format for spreadsheet import
        csvContent: generateCSV(slides || []),
        
        // Markdown format
        markdownContent: generateMarkdown(courseTitle || '', slides || []),
      };

      return new Response(
        JSON.stringify({
          success: true,
          exports: exportPackage,
          recommendations: getDesignerRecommendations(platform),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('Freelancer integration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateDesignBrief(
  courseTitle: string,
  moduleTitle: string | undefined,
  slides: any[],
  stylePreferences: any,
  platform: string
): string {
  return `
# Slide Design Brief

## Project Overview
- **Course Title**: ${courseTitle}
${moduleTitle ? `- **Module**: ${moduleTitle}` : ''}
- **Total Slides**: ${slides.length}
- **Platform**: ${platform === 'fiverr' ? 'Fiverr' : platform === 'upwork' ? 'Upwork' : 'Freelance'}

## Style Requirements
${stylePreferences?.colorScheme ? `- **Color Scheme**: ${stylePreferences.colorScheme}` : '- **Color Scheme**: Professional, modern'}
${stylePreferences?.brandColors?.length ? `- **Brand Colors**: ${stylePreferences.brandColors.join(', ')}` : ''}
${stylePreferences?.style ? `- **Style**: ${stylePreferences.style}` : '- **Style**: Clean, professional, educational'}
${stylePreferences?.logoUrl ? `- **Logo**: Included (see attachment)` : ''}

## Deliverables
1. PowerPoint/Google Slides presentation
2. Individual slide images (PNG/JPEG)
3. Source files (if applicable)

## Slide Layouts Required
${[...new Set(slides.map(s => s.layout))].map(l => `- ${l}`).join('\n')}

## Content Summary
${slides.slice(0, 5).map((s, i) => `${i + 1}. ${s.title}`).join('\n')}
${slides.length > 5 ? `... and ${slides.length - 5} more slides` : ''}

## Additional Notes
- Slides should be 16:9 aspect ratio
- Use high-quality stock photos or illustrations
- Ensure text is readable and follows accessibility guidelines
- Include speaker notes area in the design
`.trim();
}

function generateFreelancerBrief(
  courseTitle: string,
  slides: any[],
  stylePreferences: any,
  designNotes: string | undefined,
  platform: string
): string {
  const platformIntro = platform === 'fiverr' 
    ? 'Hello! I need a professional presentation designed.'
    : platform === 'upwork'
    ? 'Project Description: Professional Presentation Design'
    : 'Presentation Design Brief';

  return `
${platformIntro}

## Project Details

I need ${slides.length} slides designed for an educational course called "${courseTitle}".

### Requirements:
- Format: PowerPoint (.pptx) and PDF
- Aspect Ratio: 16:9
- Style: ${stylePreferences?.style || 'Modern, professional, educational'}
${stylePreferences?.colorScheme ? `- Colors: ${stylePreferences.colorScheme}` : ''}

### What I'll Provide:
- All slide content (titles, text, bullet points)
- Image suggestions for each slide
- Any brand guidelines or logos

### What I Need:
1. Professionally designed slides
2. Consistent visual theme throughout
3. High-quality images (stock photos or illustrations)
4. Clean, readable typography
5. Source files for future edits

${designNotes ? `### Additional Notes:\n${designNotes}` : ''}

### Timeline:
- Please provide estimated delivery time with your proposal

### Budget:
- Please quote per slide or for the full project

Looking forward to your proposals!
`.trim();
}

function getPlatformGuidelines(platform: string): Record<string, string> {
  const guidelines: Record<string, Record<string, string>> = {
    fiverr: {
      messageTitle: 'Fiverr Order Requirements',
      tip1: 'Include all content in your first message to avoid delays',
      tip2: 'Request revisions clearly if needed',
      tip3: 'Use the "Requirements" section to attach files',
      searchTerms: 'presentation design, PowerPoint design, slide design',
    },
    upwork: {
      messageTitle: 'Upwork Job Posting Tips',
      tip1: 'Post as a fixed-price project for presentations',
      tip2: 'Include number of slides in the job title',
      tip3: 'Look for designers with presentation-specific portfolios',
      searchTerms: 'presentation designer, PowerPoint expert, slide designer',
    },
    generic: {
      messageTitle: 'Freelancer Brief',
      tip1: 'Provide clear content and expectations',
      tip2: 'Set realistic deadlines',
      tip3: 'Request samples or portfolio review',
      searchTerms: 'presentation design services',
    },
  };

  return guidelines[platform] || guidelines.generic;
}

function getDesignerRecommendations(platform: string): string[] {
  return [
    'Include your brand colors and logo if available',
    'Specify any fonts that must be used',
    'Provide examples of designs you like',
    'Clarify if you need editable source files',
    'Mention any accessibility requirements',
    'Include deadline and revision expectations',
  ];
}

function generateCSV(slides: any[]): string {
  const headers = ['Slide Number', 'Title', 'Content', 'Layout', 'Image Suggestion'];
  const rows = slides.map((slide, i) => [
    i + 1,
    `"${(slide.title || '').replace(/"/g, '""')}"`,
    `"${(slide.content || '').replace(/"/g, '""')}"`,
    slide.layout,
    `"${(slide.suggestedImageQuery || '').replace(/"/g, '""')}"`,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateMarkdown(courseTitle: string, slides: any[]): string {
  let md = `# ${courseTitle}\n\n`;
  
  slides.forEach((slide, i) => {
    md += `## Slide ${i + 1}: ${slide.title}\n\n`;
    md += `${slide.content}\n\n`;
    if (slide.suggestedImageQuery) {
      md += `*Image suggestion: ${slide.suggestedImageQuery}*\n\n`;
    }
    md += `---\n\n`;
  });
  
  return md;
}

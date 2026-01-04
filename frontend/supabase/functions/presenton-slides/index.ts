import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SlideContent {
  slideNumber: number;
  title: string;
  content: string;
  speakerNotes: string;
  layout: string;
  imageUrl?: string;
  imageSource?: string;
  imageAttribution?: string;
}

interface PresentonRequest {
  topic: string;
  numSlides: number;
  language?: string;
  style?: string;
  tone?: string;
  verbosity?: "concise" | "standard" | "text-heavy";
  additionalContext?: string;
  taskId?: string;
  action?: "generate" | "status" | "get" | "edit" | "export" | "derive";
  presentationId?: string;
  slides?: Array<{
    index: number;
    content: Record<string, unknown>;
  }>;
  exportFormat?: "pptx" | "pdf";
  audienceType?: string;
  purpose?: string;
  industry?: string;
  imageStyle?: string;
  imageType?: "stock" | "ai-generated";
  webSearch?: boolean;
  includeTableOfContents?: boolean;
  includeTitleSlide?: boolean;
  slidesMarkdown?: string[];
}

// Enhanced content type detection
const detectContentType = (topic: string, context: string): string => {
  const combined = `${topic} ${context}`.toLowerCase();

  if (/tutorial|guide|how to|step by step|walkthrough|instructions/i.test(combined)) return "tutorial";
  if (/compare|versus|vs\.|differences|advantages|disadvantages|contrast/i.test(combined)) return "comparison";
  if (/pitch|proposal|investment|funding|venture|startup/i.test(combined)) return "pitch";
  if (/report|research|findings|data|study|analysis|results/i.test(combined)) return "report";
  if (/training|course|lesson|workshop|seminar|education/i.test(combined)) return "training";
  if (/timeline|history|evolution|roadmap|milestones/i.test(combined)) return "timeline";
  if (/case study|success story|customer story|testimonial/i.test(combined)) return "case-study";

  return "general";
};

// Content-specific layout guidance
const getLayoutGuidance = (contentType: string): string => {
  const guides: Record<string, string> = {
    tutorial:
      "Structure as step-by-step progression. Each slide: action-oriented title with step number, 3-4 concise action bullets starting with verbs, visual diagram or screenshot. Include 'Prerequisites' slide early and 'Next Steps' slide at end. Use numbered progression throughout.",
    comparison:
      "Use two-column layouts extensively for side-by-side comparison. Create comparison matrix slide with key attributes. Include pros/cons summary slide. Use consistent visual icons/colors for each option being compared. End with recommendation slide based on use case.",
    pitch:
      "Follow pitch deck structure: Hook slide (attention-grabbing stat/question), Problem slide (market pain with data), Solution slide (your product/service benefits), Traction slide (proof points/metrics), Market Opportunity slide (TAM/SAM/SOM), Business Model slide (revenue streams), Competition slide (positioning), Team slide (credentials), Financials slide (projections), Ask/Conclusion slide (clear CTA). Use bold headlines that can stand alone.",
    report:
      "Start with Executive Summary slide (1-sentence overview, 3-5 key findings). Use data visualization heavily - charts for trends, tables for comparisons. Include Methodology slide. Each finding gets dedicated slide with supporting data. End with Recommendations slide (actionable items) and Appendix slide references.",
    training:
      "Open with Learning Objectives slide (3-5 specific, measurable outcomes). Use Concept → Example → Practice structure. Include Knowledge Check slides after major sections. Use progressive disclosure - build complexity gradually. Add visual summaries/cheat sheets. End with Key Takeaways slide and Resources slide.",
    timeline:
      "Use chronological progression. Each major milestone gets a slide with: date/period, what happened, why it matters, visual timeline graphic. Use consistent date formatting. Include context for each era/phase. End with 'Where We Are Now' and 'What's Next' slides.",
    "case-study":
      "Structure: Context/Background slide, Challenge/Problem slide, Solution/Approach slide (what was done), Results/Impact slide (quantified outcomes with before/after), Lessons Learned slide, Testimonial/Quote slide. Use real data and specific numbers. Include customer logo/branding where appropriate.",
    general:
      "Use proven narrative structure: Hook/Opening (why this matters now), Context/Background (set the stage), 3-5 Main Points (each with supporting evidence), Practical Application/Implications, Summary/Key Takeaways, Call to Action/Next Steps. Vary layouts - avoid repetitive bullet-point slides.",
  };

  return guides[contentType] || guides.general;
};

// Enhanced text density instructions
const getTextDensityInstructions = (verbosity: string, contentType: string): string => {
  if (verbosity === "concise") {
    return `CRITICAL TEXT DENSITY RULES:
- Maximum 15 words per slide body (total, not per bullet)
- Headlines: 5-7 words maximum, must be scannable in 2 seconds
- Bullets: 3-5 bullets max, each 3-5 words (short phrases only)
- Font sizes: Minimum 28pt for body text, 40pt+ for headlines
- Use VAST white space - text should occupy <40% of slide area
- NO paragraphs or full sentences in body text
- Use impactful single words or short phrases
- Speaker notes: 80-120 words with full context`;
  } else if (verbosity === "text-heavy") {
    return `DETAILED TEXT DENSITY RULES:
- Maximum 60 words per slide body (still avoid walls of text)
- Headlines: 8-12 words, can be full sentences
- Bullets: 5-7 bullets max, each 8-12 words (can be full sentences)
- Font sizes: Minimum 18pt for body, 32pt+ for headlines
- Use subheadings to organize longer content
- Allow brief paragraphs (2-3 sentences) for context
- Include detailed explanations but maintain visual hierarchy
- Speaker notes: 150-200 words with comprehensive detail`;
  } else {
    // standard
    return `BALANCED TEXT DENSITY RULES:
- Maximum 30-35 words per slide body
- Headlines: 6-10 words, benefit-focused and action-oriented
- Bullets: 4-5 bullets, each 5-8 words (short complete thoughts)
- Font sizes: Minimum 22pt for body, 36pt+ for headlines
- Use mix of short and medium-length bullets
- Occasional short paragraphs (1-2 sentences) for complex ideas
- Maintain clear visual hierarchy with size and weight
- Speaker notes: 100-130 words with additional context and examples`;
  }
};

// Enhanced context analysis with presentation structure detection
const analyzeTopicContext = (
  topic: string,
  additionalContext?: string,
): {
  industry: string;
  imageStyle: string;
  colorScheme: string;
  visualMood: string;
  presentationStructure: string;
  audienceLevel: string;
} => {
  const combined = `${topic} ${additionalContext || ""}`.toLowerCase();

  // Enhanced industry detection
  let industry = "general";
  if (
    /health|medical|hospital|pharma|patient|doctor|clinic|anatomy|physiology|pathology|diagnos|treatment|care|therapy|wellness|clinical|surgery|medicine/i.test(
      combined,
    )
  ) {
    industry = "healthcare";
  } else if (
    /financ|bank|invest|money|stock|crypto|trading|budget|accounting|economy|market analysis|portfolio|asset|wealth|insurance|fintech/i.test(
      combined,
    )
  ) {
    industry = "finance";
  } else if (
    /tech|software|digital|ai|machine learning|data|cloud|app|computer|algorithm|programming|code|development|platform|saas|api|devops/i.test(
      combined,
    )
  ) {
    industry = "technology";
  } else if (
    /education|school|learn|student|teach|course|training|curriculum|academy|university|college|class|lesson|pedagogy/i.test(
      combined,
    )
  ) {
    industry = "education";
  } else if (
    /market|brand|customer|sales|advertis|campaign|promotion|consumer|audience|conversion|funnel|engagement|lead|seo|content marketing/i.test(
      combined,
    )
  ) {
    industry = "marketing";
  } else if (
    /nature|environment|sustain|green|eco|climate|conservation|renewable|biodiversity|pollution|earth|ecosystem|carbon/i.test(
      combined,
    )
  ) {
    industry = "environment";
  } else if (
    /manufacture|production|supply chain|logistics|operations|factory|assembly|quality control|lean|six sigma/i.test(
      combined,
    )
  ) {
    industry = "manufacturing";
  } else if (
    /law|legal|compliance|regulation|court|attorney|contract|litigation|intellectual property|gdpr/i.test(
      combined,
    )
  ) {
    industry = "legal";
  }

  // Enhanced image style determination
  let imageStyle = "photography";
  if (industry === "technology" || /diagram|process|workflow|system|architecture|concept|abstract/i.test(combined)) {
    imageStyle = "illustrations";
  } else if (industry === "education" || industry === "training") {
    imageStyle = "mixed";
  } else if (industry === "marketing" || /creative|design|visual|artistic|branding/i.test(combined)) {
    imageStyle = "illustrations";
  } else if (industry === "healthcare" && /anatomy|procedure|medical device/i.test(combined)) {
    imageStyle = "mixed";
  }

  // Better theme selection
  let colorScheme = "professional-blue";
  if (industry === "healthcare") colorScheme = "mint-blue";
  else if (industry === "finance" || industry === "legal") colorScheme = "professional-dark";
  else if (industry === "environment") colorScheme = "mint-blue";
  else if (industry === "marketing") colorScheme = "edge-yellow";
  else if (industry === "education") colorScheme = "light-rose";
  else if (/creative|design|innovative/i.test(combined)) colorScheme = "edge-yellow";

  // Visual mood detection
  let visualMood = "confident";
  if (/inspire|motivat|empower|success|achievement|aspiration/i.test(combined)) visualMood = "inspiring";
  else if (/serious|important|critical|urgent|essential|mandatory/i.test(combined)) visualMood = "serious";
  else if (/fun|creative|innovate|exciting|dynamic|energetic/i.test(combined)) visualMood = "energetic";
  else if (/calm|peace|wellness|relax|harmony|balance|mindful/i.test(combined)) visualMood = "calm";

  // Presentation structure detection
  let presentationStructure = "standard";
  if (/compare|versus|vs\.|advantages|disadvantages|alternative/i.test(combined)) {
    presentationStructure = "comparison";
  } else if (/step|guide|tutorial|how to|process|workflow|procedure/i.test(combined)) {
    presentationStructure = "process";
  } else if (/research|study|finding|analysis|data|report|result|investigation/i.test(combined)) {
    presentationStructure = "research";
  } else if (/pitch|proposal|business plan|investment|funding/i.test(combined)) {
    presentationStructure = "pitch";
  } else if (/story|journey|case study|experience|narrative/i.test(combined)) {
    presentationStructure = "narrative";
  } else if (/problem|solution|challenge|opportunity/i.test(combined)) {
    presentationStructure = "problem-solution";
  }

  // Audience level detection
  let audienceLevel = "general";
  if (/executive|c-level|board|leadership|strategic/i.test(combined)) audienceLevel = "executive";
  else if (/technical|engineer|developer|architect|specialist/i.test(combined)) audienceLevel = "technical";
  else if (/beginner|introduction|basics|fundamentals|101/i.test(combined)) audienceLevel = "beginner";
  else if (/advanced|expert|deep dive|comprehensive|detailed/i.test(combined)) audienceLevel = "advanced";

  return { industry, imageStyle, colorScheme, visualMood, presentationStructure, audienceLevel };
};

// Enhanced instruction builder
const buildEnhancedInstructions = (params: {
  contentType: string;
  verbosity: string;
  style?: string;
  tone?: string;
  industry: string;
  imageStyle: string;
  mood: string;
  audience?: string;
  audienceLevel: string;
  purpose?: string;
  presentationStructure: string;
}): string => {
  const parts: string[] = [];

  // Content-specific structure guidance
  parts.push(getLayoutGuidance(params.contentType));

  // Text density control
  parts.push(getTextDensityInstructions(params.verbosity, params.contentType));

  // Typography rules
  parts.push(
    `TYPOGRAPHY HIERARCHY: Use clear size progression - 44-48pt for main titles, 32-36pt for subtitles, 24-28pt for section headers, 20-24pt for body text. Bold key terms and numbers. Use consistent font family throughout (prefer sans-serif for modern look, serif for traditional/academic). Maintain 1.4-1.6 line spacing for readability.`,
  );

  // Spacing and layout rules
  parts.push(
    `SPACING & LAYOUT: Generous margins minimum 8-10% on all sides. Maintain consistent padding between elements (24-32px). Group related items visually with proximity. Use grid alignment - no arbitrary positioning. Create clear visual paths for eye movement (Z-pattern for text-heavy, F-pattern for scan-friendly). Balance text and white space at 50-50 or 40-60 ratio.`,
  );

  // Visual hierarchy
  parts.push(
    `VISUAL HIERARCHY: Most critical information in top-left or center (F-pattern reading). Use size, color, position, and weight to establish importance. Headlines should communicate key message even if body text is ignored. Bullet points should be scannable in 3 seconds. Numbers and statistics should stand out visually. Use color sparingly for emphasis.`,
  );

  // Presentation structure-specific guidance
  if (params.presentationStructure === "comparison") {
    parts.push(
      `COMPARISON STRUCTURE: Introduce both options upfront with neutral framing. Create side-by-side comparison slides with parallel structure. Use consistent attributes/criteria for evaluation. Include visual differentiation (colors/icons for each option). Provide pros/cons analysis. Conclude with recommendation matrix based on different use cases or priorities.`,
    );
  } else if (params.presentationStructure === "process") {
    parts.push(
      `PROCESS STRUCTURE: Number each step clearly. Use progressive reveal - don't overwhelm with entire process upfront. Include transition slides between major phases. Show how steps connect with flow arrows or diagrams. Estimate time/resources for each step. Include checkpoints or validation criteria. End with troubleshooting or FAQ slide.`,
    );
  } else if (params.presentationStructure === "research") {
    parts.push(
      `RESEARCH STRUCTURE: Context/Background → Research Question/Hypothesis → Methodology → Findings (with data) → Analysis/Discussion → Implications → Conclusions → Limitations → Future Research. Use data visualizations heavily. Include sample sizes and statistical significance. Cite sources properly. Maintain academic rigor while being accessible.`,
    );
  } else if (params.presentationStructure === "pitch") {
    parts.push(
      `PITCH STRUCTURE: Hook (compelling stat/question), Problem (market pain with TAM data), Solution (your unique value), Traction (proof points/metrics), Market Opportunity (SAM/SOM), Business Model (revenue streams), Competition (why you win), Team (relevant credentials), Financials (3-5 year projections), Ask (specific funding amount and use of funds). Every claim needs data support. Use bold, benefit-driven headlines.`,
    );
  } else if (params.presentationStructure === "narrative") {
    parts.push(
      `NARRATIVE STRUCTURE: Situation (establish context and characters), Complication (introduce conflict/challenge), Resolution (how overcome), Transformation (what changed), Lesson (universal takeaway). Use storytelling techniques: specific details, emotional arc, relatable protagonists. Include quotes or testimonials. Build tension then relief. End with call-to-action tied to story lesson.`,
    );
  } else if (params.presentationStructure === "problem-solution") {
    parts.push(
      `PROBLEM-SOLUTION STRUCTURE: Establish problem urgency with data/examples. Quantify impact (cost, time, risk). Build tension before revealing solution. Present solution with clear benefits and proof. Address objections proactively. Show implementation path. Include ROI or success metrics. End with clear next steps.`,
    );
  }

  // Industry-specific design guidance
  if (params.industry === "healthcare") {
    parts.push(
      `HEALTHCARE DESIGN: Use professional medical imagery with clean, clinical aesthetics. Prioritize data accuracy and scientific rigor. Include clear citations for medical claims. Use calming blues, greens, and whites. Medical diagrams should be anatomically accurate and professionally illustrated. Include disclaimers where appropriate. Use HIPAA-compliant example data (never real patient info). Icons should be universally recognized medical symbols.`,
    );
  } else if (params.industry === "finance") {
    parts.push(
      `FINANCE DESIGN: Every claim requires data support with sources. Use charts for trends (line/area), tables for detailed numbers, bar charts for comparisons. Conservative color palette (blues, grays, minimal accent colors). Include disclaimers and risk disclosures. Focus on ROI, metrics, and quantifiable outcomes. Use financial terminology correctly. Show before/after comparisons with actual numbers.`,
    );
  } else if (params.industry === "technology") {
    parts.push(
      `TECHNOLOGY DESIGN: Use modern geometric shapes and clean lines. Code snippets in monospace font with syntax highlighting. System architecture diagrams with clear component relationships. Feature-benefit pairs (technical capability → user value). Use tech-appropriate iconography. Include API examples or integration diagrams where relevant. Distinguish between features (what it does) and benefits (why it matters). Use data flow diagrams for complex processes.`,
    );
  } else if (params.industry === "education") {
    parts.push(
      `EDUCATION DESIGN: Include learning objectives slide early (3-5 specific, measurable outcomes). Use engaging educational imagery and clear explanatory diagrams. Create visual hierarchy for key concepts vs. supporting details. Include knowledge check questions after major sections. Use mnemonic devices or visual metaphors for complex topics. Add progress indicators. Provide real-world examples and applications. End with summary/review slide and additional resources.`,
    );
  } else if (params.industry === "marketing") {
    parts.push(
      `MARKETING DESIGN: Use dynamic, attention-grabbing visuals. Include customer journey maps or funnel diagrams. Show before/after transformations. Use compelling statistics and social proof. Include brand personality through color and imagery. Feature real customer testimonials with photos. Use persuasive language focused on benefits and outcomes. Include CTAs throughout. Show campaign results with metrics (CTR, conversion rate, ROI).`,
    );
  } else if (params.industry === "environment") {
    parts.push(
      `ENVIRONMENTAL DESIGN: Use nature photography and sustainability-focused visuals. Include data visualizations for environmental impact (CO2 reduction, resource savings). Use earth tones and greens. Show before/after environmental improvements. Include lifecycle analyses or carbon footprint calculations. Use infographics for complex environmental systems. Feature real-world case studies of positive impact.`,
    );
  }

  // Image-text balance guidance
  if (params.imageStyle === "photography") {
    parts.push(
      `IMAGE PLACEMENT: High-quality photos should occupy 40-60% of slide area. Never obscure text with images - use darkened overlays or side placement. Images should directly relate to slide content (no generic stock photos). Use consistent photo treatment (filters, cropping style). Ensure images are high resolution (minimum 1920x1080). Include proper attribution if required.`,
    );
  } else if (params.imageStyle === "illustrations") {
    parts.push(
      `ILLUSTRATION USAGE: Use diagrams and icons to explain concepts visually. Place inline with text for flow diagrams (process flows, timelines). Use consistent illustration style throughout (flat design, line art, or detailed). Icons should be simple and universally understood. Color code related elements. Use white space around diagrams. Include legends for complex diagrams.`,
    );
  } else if (params.imageStyle === "mixed") {
    parts.push(
      `MIXED MEDIA APPROACH: Use photos for real-world context and credibility. Use illustrations for abstract concepts and processes. Use diagrams for relationships and flows. Use icons for lists and categories. Maintain visual consistency despite mixed media. Photos should feel authentic (avoid cheesy stock imagery). Illustrations should match photo color palette.`,
    );
  }

  // Audience level adjustments
  if (params.audienceLevel === "executive") {
    parts.push(
      `EXECUTIVE AUDIENCE: Focus on high-level insights, strategic value, and business outcomes. Lead with bottom line and key metrics. Minimize technical details. Use executive summary slide early. Include financial impact and ROI. Show competitive positioning. Emphasize decision points and recommendations. Use data visualizations over raw data. Time estimates and resource requirements should be clear.`,
    );
  } else if (params.audienceLevel === "technical") {
    parts.push(
      `TECHNICAL AUDIENCE: Include detailed diagrams, technical specifications, and implementation details. Use precise terminology and technical jargon appropriately. Show architecture diagrams, data flows, and API schemas. Include code examples or pseudocode. Discuss technical tradeoffs and constraints. Cover edge cases and error handling. Provide performance metrics and benchmarks.`,
    );
  } else if (params.audienceLevel === "beginner") {
    parts.push(
      `BEGINNER AUDIENCE: Use simple, accessible language - define all jargon. Build concepts progressively from basic to complex. Use abundant examples and analogies. Include visual aids and diagrams extensively. Avoid overwhelming with too much info per slide. Include glossary or reference slide. Use "why this matters" statements. Provide clear takeaways and action items.`,
    );
  } else if (params.audienceLevel === "advanced") {
    parts.push(
      `ADVANCED AUDIENCE: Skip basics and dive into nuanced details. Discuss edge cases, limitations, and advanced scenarios. Compare with alternative approaches. Include research references and citations. Address controversial or debated aspects. Use technical depth appropriate to expertise. Provide opportunities for deeper exploration (appendix, resources).`,
    );
  }

  // Mood/tone guidance
  if (params.mood === "inspiring") {
    parts.push(
      `INSPIRING TONE: Use uplifting imagery with achievement and aspiration themes. Include aspirational quotes from recognized leaders. Use forward-looking statements and vision-casting language. Feature success stories and transformations. Show the journey from current state to ideal future. Use energizing colors and dynamic compositions. End with empowering call-to-action.`,
    );
  } else if (params.mood === "serious") {
    parts.push(
      `SERIOUS TONE: Use professional, focused imagery. Maintain formal language and data-driven content. Use conservative color palette. Emphasize credibility through citations and expert sources. Include risk assessments and compliance considerations. Focus on accuracy and precision over creativity. Use matter-of-fact delivery without hype.`,
    );
  } else if (params.mood === "energetic") {
    parts.push(
      `ENERGETIC TONE: Use dynamic, vibrant imagery with movement and energy. Include bold statement slides and engaging questions. Use bright accent colors and strong contrasts. Break up content with interactive elements (polls, challenges). Use active voice and action verbs throughout. Create momentum with pacing and transitions. Include surprising facts or "did you know" moments.`,
    );
  }

  // Style-specific guidance
  if (params.style === "minimal") {
    parts.push(
      `MINIMAL STYLE: Use minimal text (max 15-20 words per slide). Maximize white space to 60-70% of slide. One concept per slide - no exceptions. Use large, bold typography as design element. Rely on strong imagery and negative space. Remove all non-essential elements. Use subtle color palette (1-2 colors max). Let breathing room do the work.`,
    );
  } else if (params.style === "creative") {
    parts.push(
      `CREATIVE STYLE: Use unexpected visual metaphors and creative analogies. Include bold statements and provocative questions. Break grid occasionally for visual interest. Use playful typography variations. Include surprising statistics or facts. Use color boldly. Challenge conventional presentation norms where appropriate. Make memorable impression over traditional polish.`,
    );
  } else if (params.style === "corporate") {
    parts.push(
      `CORPORATE STYLE: Use formal business language with industry-standard terminology. Include data points, statistics, and quantifiable metrics. Emphasize ROI, efficiency, and business value. Use company branding elements consistently. Include org charts or process flows. Reference industry benchmarks. Maintain professional polish throughout.`,
    );
  }

  // Universal best practices and quality checks
  parts.push(
    `UNIVERSAL QUALITY STANDARDS: (1) 5-Second Rule: Can viewer understand the key message in 5 seconds? (2) Narrative Flow: Does each slide advance the story logically? (3) Image Relevance: Are all images directly related and high-quality? (4) Legibility Test: Is text readable from 10 feet away? (5) Color Contrast: Do colors have sufficient contrast (WCAG AA minimum)? (6) Consistency: Are fonts, colors, and spacing consistent throughout? (7) Data Integrity: Are all statistics accurate and properly sourced?`,
  );

  // Presenter notes guidance
  parts.push(
    `SPEAKER NOTES: Include comprehensive presenter notes for each slide (80-150 words). Notes should contain: key talking points, transition phrases to next slide, additional examples not on slide, potential audience questions with answers, timing guidance, and emphasis points. Notes should read naturally as speaking script.`,
  );

  return parts.join(" ");
};

const PRESENTON_API_URL = "https://api.presenton.ai";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const {
      topic,
      numSlides = 10,
      language = "en",
      style = "professional",
      tone,
      additionalContext = "",
      scriptContent,
      moduleTitle,
      courseTitle,
      taskId,
      action = "generate",
      presentationId,
      slides: editSlides,
      exportFormat = "pptx",
      audienceType = "general",
      purpose = "inform",
      industry: providedIndustry,
      imageStyle: providedImageStyle,
      verbosity = "standard",
      imageType = "stock",
      webSearch = false,
      includeTableOfContents,
      includeTitleSlide = true,
      slidesMarkdown,
    }: PresentonRequest & { scriptContent?: string; moduleTitle?: string; courseTitle?: string } = requestBody;

    // Analyze context for intelligent defaults
    const contentForAnalysis = scriptContent || additionalContext || topic || moduleTitle || courseTitle || "";
    const topicContext = analyzeTopicContext(topic || moduleTitle || courseTitle || "", additionalContext);
    const contentType = detectContentType(topic || moduleTitle || courseTitle || "", contentForAnalysis);

    const effectiveIndustry = providedIndustry || topicContext.industry;
    const effectiveImageStyle = providedImageStyle || topicContext.imageStyle;

    // Smart defaults
    const effectiveIncludeTOC = includeTableOfContents !== undefined ? includeTableOfContents : numSlides > 8;

    const PRESENTON_API_KEY = Deno.env.get("PRESENTON_API_KEY");

    // ==========================================
    // ACTION: GET PRESENTATION DATA
    // ==========================================
    if (action === "get" && presentationId && PRESENTON_API_KEY) {
      console.log("Fetching Presenton presentation data:", presentationId);

      const getResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/${presentationId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PRESENTON_API_KEY}`,
        },
      });

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error("Get presentation failed:", getResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch presentation", status: "error", details: errorText }),
          { status: getResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const presentationData = await getResponse.json();
      console.log("Retrieved presentation with", presentationData.n_slides, "slides");

      return new Response(
        JSON.stringify({
          status: "success",
          presentation: {
            id: presentationData.id,
            title: presentationData.title,
            slideCount: presentationData.n_slides,
            language: presentationData.language,
            tone: presentationData.tone,
            theme: presentationData.theme,
            slides: presentationData.slides?.map((slide: any) => ({
              index: slide.index,
              layout: slide.layout,
              layoutGroup: slide.layout_group,
              content: slide.content,
              speakerNote: slide.speaker_note,
              properties: slide.properties,
            })),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================
    // ACTION: EDIT PRESENTATION
    // ==========================================
    if (action === "edit" && presentationId && editSlides && PRESENTON_API_KEY) {
      console.log("Editing Presenton presentation:", presentationId, "Slides to edit:", editSlides.length);

      const editPayload = {
        presentation_id: presentationId,
        slides: editSlides.map((slide) => ({
          index: slide.index,
          content: slide.content,
        })),
        export_as: exportFormat,
      };

      console.log("Edit payload:", JSON.stringify(editPayload, null, 2));

      const editResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/edit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PRESENTON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editPayload),
      });

      if (!editResponse.ok) {
        const errorText = await editResponse.text();
        console.error("Edit presentation failed:", editResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to edit presentation", status: "error", details: errorText }),
          { status: editResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const editResult = await editResponse.json();
      console.log("Edit result:", JSON.stringify(editResult, null, 2));

      return new Response(
        JSON.stringify({
          status: "completed",
          presentationId: editResult.presentation_id,
          downloadUrl: editResult.path,
          editUrl: editResult.edit_path,
          source: "presenton-edit",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================
    // ACTION: EXPORT PRESENTATION
    // ==========================================
    if (action === "export" && presentationId && PRESENTON_API_KEY) {
      console.log("Exporting Presenton presentation:", presentationId, "Format:", exportFormat);

      const exportPayload = {
        presentation_id: presentationId,
        export_as: exportFormat,
      };

      const exportResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PRESENTON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportPayload),
      });

      if (!exportResponse.ok) {
        const errorText = await exportResponse.text();
        console.error("Export presentation failed:", exportResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to export presentation", status: "error", details: errorText }),
          { status: exportResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const exportResult = await exportResponse.json();
      console.log("Export result:", JSON.stringify(exportResult, null, 2));

      return new Response(
        JSON.stringify({
          status: "completed",
          downloadUrl: exportResult.path,
          format: exportFormat,
          source: "presenton-export",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================
    // ACTION: DERIVE/CLONE PRESENTATION
    // ==========================================
    if (action === "derive" && presentationId && PRESENTON_API_KEY) {
      console.log("Deriving/cloning Presenton presentation:", presentationId);

      const derivePayload: Record<string, unknown> = {
        presentation_id: presentationId,
      };

      if (style) derivePayload.theme = style;
      if (tone) derivePayload.tone = tone;
      if (language) derivePayload.language = language === "sv" ? "Swedish" : "English";
      if (additionalContext) derivePayload.instructions = additionalContext;
      if (editSlides && editSlides.length > 0) derivePayload.slides = editSlides;

      const deriveResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/derive`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PRESENTON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(derivePayload),
      });

      if (!deriveResponse.ok) {
        const errorText = await deriveResponse.text();
        console.error("Derive presentation failed:", deriveResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to derive presentation", status: "error", details: errorText }),
          { status: deriveResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const deriveResult = await deriveResponse.json();
      console.log("Derive result:", JSON.stringify(deriveResult, null, 2));

      return new Response(
        JSON.stringify({
          status: "completed",
          presentationId: deriveResult.presentation_id || deriveResult.id,
          downloadUrl: deriveResult.path,
          editUrl: deriveResult.edit_path,
          source: "presenton-derive",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==========================================
    // ACTION: STATUS CHECK
    // ==========================================
    if (action === "status" && taskId && PRESENTON_API_KEY) {
      console.log("Checking Presenton task status:", taskId);

      const statusResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/status/${taskId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PRESENTON_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("Status check failed:", statusResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Status check failed", status: "error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusData = await statusResponse.json();
      console.log("Task status:", statusData.status);
      console.log("Full Presenton status response:", JSON.stringify(statusData, null, 2));

      if (statusData.status === "completed") {
        console.log("Presenton completed! Presentation ID:", statusData.data?.presentation_id);
        console.log("Download URL:", statusData.data?.path);
        console.log("Edit URL:", statusData.data?.edit_path);
        console.log("Credits consumed:", statusData.data?.credits_consumed);

        return new Response(
          JSON.stringify({
            status: "completed",
            presentationId: statusData.data?.presentation_id,
            downloadUrl: statusData.data?.path,
            editUrl: statusData.data?.edit_path,
            creditsConsumed: statusData.data?.credits_consumed,
            source: "presenton",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (statusData.status === "failed") {
        return new Response(JSON.stringify({ status: "failed", error: statusData.message || "Generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: statusData.status, taskId, message: statusData.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ACTION: GENERATE (default)
    // ==========================================
    if (!topic && !scriptContent) {
      return new Response(JSON.stringify({ error: "Topic or script content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (PRESENTON_API_KEY) {
      console.log("Using Presenton Cloud API for slide generation");
      console.log("Content type detected:", contentType);
      console.log("Industry:", effectiveIndustry);
      console.log("Presentation structure:", topicContext.presentationStructure);
      console.log("Audience level:", topicContext.audienceLevel);

      const normalizeForPresenton = (input: string) => (input || "").normalize("NFC");
      const rawContentText = scriptContent || additionalContext || topic || moduleTitle || courseTitle || "";
      const contentText = normalizeForPresenton(rawContentText);

      const mapLanguage = (lang?: string) => (lang === "sv" ? "Swedish" : "English");

      const mapTone = (input?: string): string => {
        const raw = (input || "").toLowerCase().trim();
        const validTones = ["default", "casual", "professional", "funny", "educational", "sales_pitch"];
        if (validTones.includes(raw)) return raw;
        if (["formal", "very-formal"].includes(raw)) return "professional";
        if (["friendly", "relaxed", "very-casual"].includes(raw)) return "casual";
        if (["inspirational"].includes(raw)) return "educational";
        return "professional";
      };

      const mapTemplate = (input?: string): string => {
        const raw = (input || "").toLowerCase().trim();
        const validTemplates = ["general", "modern", "standard", "swift"];
        if (validTemplates.includes(raw)) return raw;
        if (raw === "classic") return "standard";
        if (raw === "minimal") return "modern";
        if (raw === "creative") return "swift";
        if (raw === "corporate") return "standard";
        return "general";
      };

      const mapTheme = (inputStyle?: string, inputTone?: string, contextTheme?: string): string => {
        const validThemes = ["edge-yellow", "mint-blue", "light-rose", "professional-blue", "professional-dark"];
        if (contextTheme && validThemes.includes(contextTheme)) return contextTheme;
        const explicitTheme = (inputStyle || "").toLowerCase().trim();
        if (validThemes.includes(explicitTheme)) return explicitTheme;

        const styleL = (inputStyle || "").toLowerCase().trim();
        const toneL = (inputTone || "").toLowerCase().trim();

        if (styleL === "creative" || toneL === "inspirational") return "edge-yellow";
        if (styleL === "minimal" || toneL === "casual" || toneL === "friendly") return "mint-blue";
        if (styleL === "classic") return "light-rose";
        if (styleL === "corporate" || toneL === "formal" || toneL === "professional") return "professional-blue";
        if (styleL === "serious" || toneL === "very-formal") return "professional-dark";

        return "professional-blue";
      };

      const effectiveTone = mapTone(tone || style);
      const effectiveTemplate = mapTemplate(style);
      const effectiveTheme = mapTheme(style, tone, topicContext.colorScheme);

      // Build enhanced instructions
      const effectiveInstructions = buildEnhancedInstructions({
        contentType,
        verbosity: verbosity || "standard",
        style,
        tone,
        industry: effectiveIndustry,
        imageStyle: effectiveImageStyle,
        mood: topicContext.visualMood,
        audience: audienceType,
        audienceLevel: topicContext.audienceLevel,
        purpose,
        presentationStructure: topicContext.presentationStructure,
      });

      console.log("Presenton parameters:", {
        template: effectiveTemplate,
        theme: effectiveTheme,
        tone: effectiveTone,
        verbosity,
        imageType,
        webSearch,
        n_slides: Math.min(numSlides, 50),
      });

      let enhancedInstructions = effectiveInstructions;

      // Generate per-slide image keywords using Lovable AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let imageKeywordsGuidance = "";

      if (LOVABLE_API_KEY && contentText.length > 50) {
        try {
          console.log("Generating per-slide image keywords with Lovable AI...");

          const keywordPrompt = `You are an expert at selecting stock photography for professional presentations.
Given this presentation content, generate highly specific image search keywords for each major topic/slide.

For each slide/topic, provide:
1. Primary keyword (most important visual concept)
2. 2-3 secondary keywords (supporting visuals)
3. Both Swedish AND English versions for each keyword

Content to analyze:
"""
${contentText.substring(0, 4000)}
"""

Respond ONLY with a JSON object in this exact format:
{
  "slides": [
    {
      "topic": "brief topic name",
      "primary_en": "main visual keyword in English",
      "primary_sv": "main visual keyword in Swedish",
      "secondary_en": ["keyword1", "keyword2"],
      "secondary_sv": ["keyword1", "keyword2"]
    }
  ],
  "overall_theme_en": "overall visual theme suggestion",
  "overall_theme_sv": "overall visual theme suggestion in Swedish"
}`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: keywordPrompt }],
              max_tokens: 1500,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const rawContent = aiData.choices?.[0]?.message?.content || "";
            let jsonStr = rawContent;
            const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();

            try {
              const keywords = JSON.parse(jsonStr);
              console.log("Generated image keywords:", JSON.stringify(keywords, null, 2));

              const keywordParts: string[] = [];
              if (keywords.overall_theme_en) {
                keywordParts.push(
                  `Overall visual theme: ${keywords.overall_theme_en} (${keywords.overall_theme_sv || keywords.overall_theme_en}).`,
                );
              }
              if (keywords.slides && Array.isArray(keywords.slides)) {
                keywords.slides.forEach((slide: any, idx: number) => {
                  const allKeywords = [
                    slide.primary_en,
                    slide.primary_sv,
                    ...(slide.secondary_en || []),
                    ...(slide.secondary_sv || []),
                  ]
                    .filter(Boolean)
                    .join(", ");
                  if (allKeywords) {
                    keywordParts.push(
                      `Slide ${idx + 1} (${slide.topic || "topic"}): use images showing ${allKeywords}.`,
                    );
                  }
                });
              }
              imageKeywordsGuidance = keywordParts.join(" ");
              console.log("Image keywords guidance:", imageKeywordsGuidance);
            } catch (parseErr) {
              console.warn("Failed to parse AI keyword response as JSON:", parseErr);
            }
          } else {
            console.warn("Lovable AI keyword generation failed:", aiResponse.status);
          }
        } catch (aiErr) {
          console.warn("Error generating image keywords:", aiErr);
        }
      }

      if (imageKeywordsGuidance) {
        enhancedInstructions += ` IMAGE GUIDANCE: ${imageKeywordsGuidance}`;
      } else {
        enhancedInstructions += " Use relevant high-quality imagery and icons that directly support the slide message.";
      }

      const presentonPayload: Record<string, unknown> = {
        content: contentText.substring(0, 10000),
        n_slides: Math.min(numSlides, 50),
        language: mapLanguage(language),
        template: effectiveTemplate,
        theme: effectiveTheme,
        tone: effectiveTone,
        instructions: enhancedInstructions,
        verbosity: verbosity,
        markdown_emphasis: true,
        web_search: webSearch,
        image_type: imageType,
        include_title_slide: includeTitleSlide,
        include_table_of_contents: effectiveIncludeTOC,
        allow_access_to_user_info: true,
        export_as: exportFormat,
        trigger_webhook: false,
      };

      if (slidesMarkdown && slidesMarkdown.length > 0) {
        presentonPayload.slides_markdown = slidesMarkdown;
        console.log("Using provided slides_markdown for structured generation");
      }

      console.log("Calling Presenton async endpoint");

      const escapeUnicodeInJson = (json: string) =>
        json.replace(/[\u0080-\uFFFF]/g, (ch) => {
          const code = ch.charCodeAt(0);
          return `\\u${code.toString(16).padStart(4, "0")}`;
        });

      const presentonBody = escapeUnicodeInJson(JSON.stringify(presentonPayload));

      const generateResponse = await fetch(`${PRESENTON_API_URL}/api/v1/ppt/presentation/generate/async`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PRESENTON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: presentonBody,
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("Presenton API error:", generateResponse.status, errorText);

        if (generateResponse.status >= 400 && generateResponse.status < 500) {
          let detail: string | undefined;
          try {
            const parsed = JSON.parse(errorText);
            detail = parsed?.detail || parsed?.message;
          } catch {
            detail = errorText;
          }
          const msg = detail || "Presenton request failed.";
          const isCredits = /not enough credits/i.test(msg);
          return new Response(
            JSON.stringify({
              status: "failed",
              source: "presenton",
              error: msg,
              code: isCredits ? "presenton_insufficient_credits" : "presenton_request_failed",
              retryable: false,
            }),
            { status: isCredits ? 402 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.log("Presenton API unavailable (server error), falling back to Lovable AI");
      } else {
        const taskData = await generateResponse.json();
        console.log("Presenton task created:", taskData.id, "status:", taskData.status);

        return new Response(
          JSON.stringify({
            status: "pending",
            taskId: taskData.id,
            source: "presenton",
            message: "Presentation generation started. Poll for status.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ==========================================
    // FALLBACK: LOVABLE AI
    // ==========================================
    console.log("Using Lovable AI for slide generation");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Lovable AI slide generation:", { numSlides, language, style, topic: topic?.substring(0, 50) });

    const contentForAnalysis = scriptContent || additionalContext || topic || "";
    const isEducational = courseTitle || moduleTitle;

    const narrativeStructure =
      numSlides <= 5
        ? "Hook → Problem → Solution → Evidence → Call-to-Action"
        : numSlides <= 10
          ? "Title → Context → 3-5 Key Points → Case Study/Example → Summary → Next Steps"
          : "Title → Agenda → Introduction → 5-8 Main Sections (each with supporting evidence) → Recap → Q&A";

    const systemPrompt = `You are a world-class presentation designer and storytelling expert. Your slides win awards for clarity, visual hierarchy, and persuasive narrative flow.

## Core Principles:
1. **ONE IDEA PER SLIDE** - Each slide communicates exactly one concept
2. **6x6 RULE** - Maximum 6 bullet points, 6 words per bullet
3. **VISUAL HIERARCHY** - Titles are scannable in 3 seconds
4. **NARRATIVE ARC** - Every presentation tells a compelling story
5. **PROGRESSIVE DISCLOSURE** - Build complexity gradually

## Slide Design Rules:
- **Titles**: Action-oriented, benefit-focused (e.g., "Reduce Costs by 40%" not "Cost Analysis")
- **Bullets**: Start with strong verbs, parallel structure, specific outcomes
- **Data**: Always contextualize numbers (comparisons, percentages, trends)
- **Transitions**: Each slide flows logically to the next

## Layout Selection Guide:
- \`title\`: Opening/closing slides, major section breaks
- \`title-content\`: Key statements with supporting detail
- \`bullet-points\`: Lists of 3-5 related items, process steps
- \`two-column\`: Comparisons, before/after, pros/cons
- \`image-focus\`: Emotional moments, product showcases, metaphors
- \`data-visualization\`: Statistics, trends, metrics
- \`quote\`: Expert testimony, customer feedback, key takeaways

## Style: ${style}
## Language: ${language === "sv" ? "Swedish (formal business Swedish, avoid anglicisms)" : "English (clear, international business English)"}`;

    const contentSource = scriptContent
      ? `\n\n## Source Material to Structure:\n${scriptContent.substring(0, 6000)}`
      : "";

    const contextInfo = [
      courseTitle && `Course: "${courseTitle}"`,
      moduleTitle && `Module: "${moduleTitle}"`,
      additionalContext && `Context: ${additionalContext}`,
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = `Create a ${numSlides}-slide presentation${topic ? ` on: "${topic}"` : ""}.

## Narrative Structure to Follow:
${narrativeStructure}

${contextInfo ? `## Background Information:\n${contextInfo}` : ""}
${contentSource}

## Requirements:
1. Start with a compelling hook that establishes relevance
2. Build tension/interest through the middle slides
3. Provide clear resolution and actionable takeaways
4. ${isEducational ? "Include learning objectives early and reinforce key concepts" : "Focus on persuasion and memorable key messages"}
5. End with a strong call-to-action or memorable closing thought

## Output Format:
Generate exactly ${numSlides} slides with variety in layouts.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_presentation",
              description: "Create a professional presentation with narrative flow and visual variety",
              parameters: {
                type: "object",
                properties: {
                  presentationTitle: { type: "string" },
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slideNumber: { type: "number" },
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        content: { type: "string" },
                        keyMessage: { type: "string" },
                        speakerNotes: { type: "string" },
                        layout: {
                          type: "string",
                          enum: [
                            "title",
                            "title-content",
                            "two-column",
                            "image-focus",
                            "bullet-points",
                            "data-visualization",
                            "quote",
                          ],
                        },
                        suggestedImageQuery: { type: "string" },
                      },
                      required: [
                        "slideNumber",
                        "title",
                        "content",
                        "keyMessage",
                        "speakerNotes",
                        "layout",
                        "suggestedImageQuery",
                      ],
                    },
                  },
                },
                required: ["presentationTitle", "slides"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_presentation" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
            status: "error",
            retryable: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Payment required. Please add credits to continue.",
            status: "error",
            retryable: false,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in AI response");
      throw new Error("Unexpected AI response format");
    }

    let slidesData;
    try {
      slidesData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse AI response");
      throw new Error("Failed to parse slide data from AI");
    }

    if (!slidesData.slides || slidesData.slides.length === 0) {
      throw new Error("AI did not generate any slides");
    }

    console.log(`Successfully generated ${slidesData.slides.length} slides`);

    return new Response(
      JSON.stringify({
        status: "completed",
        presentationTitle: slidesData.presentationTitle,
        slides: slidesData.slides,
        source: "lovable-ai",
        slideCount: slidesData.slides.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Presenton slides error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

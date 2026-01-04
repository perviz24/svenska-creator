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
  // New parameters from Presenton API docs
  verbosity?: "concise" | "standard" | "text-heavy";
  webSearch?: boolean;
  includeTableOfContents?: boolean;
  includeTitleSlide?: boolean;
  slidesMarkdown?: string[];
}

// Context analysis utilities
const analyzeTopicContext = (
  topic: string,
  additionalContext?: string,
): {
  industry: string;
  imageStyle: string;
  colorScheme: string;
  visualMood: string;
} => {
  const combined = `${topic} ${additionalContext || ""}`.toLowerCase();

  let industry = "general";
  if (
    /health|medical|hospital|pharma|patient|doctor|clinic|anatomy|physiology|pathology|diagnos|treatment/i.test(
      combined,
    ) ||
    /anatomi|fysiologi|patologi|klinisk|patient|sjukdom|diagnostik|behandling|läkare|sjukhus|medicin|hälsa/i.test(
      combined,
    )
  ) {
    industry = "healthcare";
  } else if (/financ|bank|invest|money|stock|crypto|trading/i.test(combined)) industry = "finance";
  else if (/tech|software|digital|ai|machine learning|data|cloud|app/i.test(combined)) industry = "technology";
  else if (/education|school|learn|student|teach|course|training/i.test(combined)) industry = "education";
  else if (/market|brand|customer|sales|advertis|campaign/i.test(combined)) industry = "marketing";
  else if (/nature|environment|sustain|green|eco|climate/i.test(combined)) industry = "environment";
  else if (/food|restaurant|culinary|recipe|cook|nutrition/i.test(combined)) industry = "food";
  else if (/travel|tourism|hotel|vacation|destination/i.test(combined)) industry = "travel";
  else if (/law|legal|compliance|regulation|court/i.test(combined)) industry = "legal";
  else if (/construction|architect|building|real estate|property/i.test(combined)) industry = "real-estate";

  let imageStyle = "photography";
  if (industry === "technology" || /diagram|process|workflow|system/i.test(combined)) imageStyle = "illustrations";
  else if (industry === "education" || /concept|idea|abstract/i.test(combined)) imageStyle = "mixed";
  else if (industry === "finance" || industry === "legal") imageStyle = "photography";
  else if (/creative|art|design|visual/i.test(combined)) imageStyle = "illustrations";

  let colorScheme = "professional-blue";
  if (industry === "healthcare") colorScheme = "mint-blue";
  else if (industry === "finance") colorScheme = "professional-dark";
  else if (industry === "technology") colorScheme = "professional-blue";
  else if (industry === "education") colorScheme = "light-rose";
  else if (industry === "environment") colorScheme = "mint-blue";
  else if (industry === "marketing" || /creative|dynamic/i.test(combined)) colorScheme = "edge-yellow";

  let visualMood = "confident";
  if (/inspire|motivat|empower|success/i.test(combined)) visualMood = "inspiring";
  else if (/serious|important|critical|urgent/i.test(combined)) visualMood = "serious";
  else if (/fun|creative|innovate|exciting/i.test(combined)) visualMood = "energetic";
  else if (/calm|peace|wellness|relax/i.test(combined)) visualMood = "calm";

  return { industry, imageStyle, colorScheme, visualMood };
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
      // New Presenton API parameters
      verbosity = "standard",
      webSearch = false,
      includeTableOfContents,
      includeTitleSlide = true,
      slidesMarkdown,
    }: PresentonRequest & { scriptContent?: string; moduleTitle?: string; courseTitle?: string } = requestBody;

    const topicContext = analyzeTopicContext(topic || moduleTitle || courseTitle || "", additionalContext);
    const effectiveIndustry = providedIndustry || topicContext.industry;
    const effectiveImageStyle = providedImageStyle || topicContext.imageStyle;

    // Smart defaults for table of contents based on slide count
    const effectiveIncludeTOC = includeTableOfContents !== undefined ? includeTableOfContents : numSlides > 8;

    const PRESENTON_API_KEY = Deno.env.get("PRESENTON_API_KEY");

    // ==========================================
    // ACTION: GET PRESENTATION DATA
    // Fetches full presentation structure for editing
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
    // Modifies specific slides in an existing presentation
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

      // Edit creates a NEW presentation
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
    // Export existing presentation in different format
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
    // Create variation from existing presentation
    // ==========================================
    if (action === "derive" && presentationId && PRESENTON_API_KEY) {
      console.log("Deriving/cloning Presenton presentation:", presentationId);

      const derivePayload: Record<string, unknown> = {
        presentation_id: presentationId,
      };

      // Add optional modifications if provided
      if (style) derivePayload.theme = style;
      if (tone) derivePayload.tone = tone;
      if (language) derivePayload.language = language === "sv" ? "Swedish" : "English";
      if (additionalContext) derivePayload.instructions = additionalContext;

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
    // Poll for async generation status
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
    // Start async presentation generation
    // ==========================================
    if (!topic && !scriptContent) {
      return new Response(JSON.stringify({ error: "Topic or script content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (PRESENTON_API_KEY) {
      console.log("Using Presenton Cloud API for slide generation");

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

      // Replace the existing mapTemplate and mapTheme functions with these enhanced versions
      const mapTemplate = (input?: string): string => {
        const raw = (input || "").toLowerCase().trim();

        // Direct mappings to Presenton templates
        const validTemplates = ["general", "modern", "standard", "swift"];
        if (validTemplates.includes(raw)) return raw;

        // Handle aliases
        if (raw === "classic") return "standard";
        if (raw === "minimal") return "modern";
        if (raw === "creative") return "swift";
        if (raw === "corporate") return "standard";

        // Default to general template which is versatile
        return "general";
      };

      const mapTheme = (inputStyle?: string, inputTone?: string, contextTheme?: string): string => {
        // Presenton built-in themes
        const validThemes = ["edge-yellow", "mint-blue", "light-rose", "professional-blue", "professional-dark"];

        // If context analysis suggests a theme, use it
        if (contextTheme && validThemes.includes(contextTheme)) return contextTheme;

        // Handle explicit theme names
        const explicitTheme = (inputStyle || "").toLowerCase().trim();
        if (validThemes.includes(explicitTheme)) return explicitTheme;

        // Smart mappings based on style and tone
        const style = (inputStyle || "").toLowerCase().trim();
        const tone = (inputTone || "").toLowerCase().trim();

        if (style === "creative" || tone === "inspirational") return "edge-yellow";

        if (style === "minimal" || tone === "casual" || tone === "friendly") return "mint-blue";

        if (style === "classic") return "light-rose";

        if (style === "corporate" || tone === "formal" || tone === "professional") return "professional-blue";

        if (style === "serious" || tone === "very-formal") return "professional-dark";

        // Default theme
        return "professional-blue";
      };

      const buildInstructions = (
        styleName?: string,
        toneName?: string,
        contextIndustry?: string,
        contextImageStyle?: string,
        contextMood?: string,
        audience?: string,
        presentationPurpose?: string,
      ): string => {
        const parts: string[] = [];

        if (contextIndustry === "healthcare")
          parts.push("Use professional medical imagery. Clean, clinical aesthetics.");
        else if (contextIndustry === "finance")
          parts.push("Use charts, graphs, professional imagery. Convey trust and stability.");
        else if (contextIndustry === "technology")
          parts.push("Use modern tech imagery, abstract visuals, clean diagrams.");
        else if (contextIndustry === "education") parts.push("Use engaging educational imagery and diagrams.");
        else if (contextIndustry === "marketing") parts.push("Use dynamic, engaging visuals that capture attention.");
        else if (contextIndustry === "environment")
          parts.push("Use nature photography and sustainability-focused visuals.");

        if (contextImageStyle === "illustrations") parts.push("Prefer illustrations and diagrams over photography.");
        else if (contextImageStyle === "photography") parts.push("Use high-quality professional photography.");

        if (contextMood === "inspiring") parts.push("Use uplifting imagery with success themes.");
        else if (contextMood === "serious") parts.push("Use professional, focused imagery.");
        else if (contextMood === "energetic") parts.push("Use dynamic, vibrant imagery with energy.");

        if (audience === "executives") parts.push("Focus on high-level insights and strategic value.");
        else if (audience === "technical") parts.push("Include detailed diagrams and technical specifications.");
        else if (audience === "students") parts.push("Use engaging, accessible language with clear explanations.");

        if (presentationPurpose === "persuade") parts.push("Structure for persuasion: problem-solution-benefit.");
        else if (presentationPurpose === "educate") parts.push("Structure for learning: concept-example-practice.");
        else if (presentationPurpose === "inspire") parts.push("Structure for inspiration: story-vision-action.");

        if (styleName === "minimal") parts.push("Use minimal text, maximize white space.");
        else if (styleName === "creative") parts.push("Use creative language and bold statements.");
        else if (styleName === "corporate") parts.push("Use formal business language with data points.");
        else if (styleName === "classic") parts.push("Use traditional presentation structure.");

        if (toneName === "casual" || toneName === "friendly") parts.push("Keep conversational and approachable.");
        else if (toneName === "inspirational") parts.push("Include motivational elements.");

        parts.push("Each slide: one clear message. Select images that directly relate to content.");
        return parts.join(" ");
      };
      // Enhanced instruction generation with better structure
      const buildInstructions = (
        styleName?: string,
        toneName?: string,
        contextIndustry?: string,
        contextImageStyle?: string,
        contextMood?: string,
        audience?: string,
        presentationPurpose?: string,
        presentationStructure?: string,
      ): string => {
        const parts: string[] = [];

        // Add structure guidance based on the detected presentation type
        if (presentationStructure === "comparison") {
          parts.push(
            "Structure as comparison: introduce both options, compare key features side-by-side, analyze pros/cons, conclude with recommendations.",
          );
        } else if (presentationStructure === "process") {
          parts.push(
            "Structure as step-by-step guide: introduce goal, outline steps clearly, include transition slides between major phases, conclude with next steps.",
          );
        } else if (presentationStructure === "research") {
          parts.push(
            "Structure as research presentation: context/problem, methodology, findings, analysis, implications, conclusions.",
          );
        } else if (presentationStructure === "pitch") {
          parts.push(
            "Structure as pitch deck: hook, problem, solution, market opportunity, business model, competition, team, financials, ask/conclusion.",
          );
        } else if (presentationStructure === "narrative") {
          parts.push(
            "Structure as narrative: situation, complication, resolution with clear story arc and emotional progression.",
          );
        }

        // Industry-specific design guidance
        if (contextIndustry === "healthcare") {
          parts.push(
            "Use professional medical imagery with clean clinical aesthetics. Include data visualizations for statistics. Maintain HIPAA-compliant example data.",
          );
        } else if (contextIndustry === "finance") {
          parts.push(
            "Use charts, graphs, professional imagery conveying trust and stability. Include financial metrics and ROI data points where relevant.",
          );
        } else if (contextIndustry === "technology") {
          parts.push(
            "Use modern tech imagery, abstract visuals, clean diagrams. Focus on system architecture and user benefits. Visually distinguish features vs benefits.",
          );
        } else if (contextIndustry === "education") {
          parts.push(
            "Use engaging educational imagery and clear diagrams. Include learning objectives early and knowledge check slides. Create visual hierarchy for key concepts.",
          );
        }
        // Enhance the analyzeTopicContext function with more specific industry detection
        const analyzeTopicContext = (
          topic: string,
          additionalContext?: string,
        ): {
          industry: string;
          imageStyle: string;
          colorScheme: string;
          visualMood: string;
          presentationStructure: string;
        } => {
          const combined = `${topic} ${additionalContext || ""}`.toLowerCase();

          // Enhanced industry detection with more specific patterns
          let industry = "general";
          if (
            /health|medical|hospital|pharma|patient|doctor|clinic|anatomy|physiology|pathology|diagnos|treatment|care|therapy|wellness/i.test(
              combined,
            )
          ) {
            industry = "healthcare";
          } else if (
            /financ|bank|invest|money|stock|crypto|trading|budget|accounting|economy|market analysis|portfolio|asset|wealth/i.test(
              combined,
            )
          ) {
            industry = "finance";
          } else if (
            /tech|software|digital|ai|machine learning|data|cloud|app|computer|algorithm|programming|code|development|platform/i.test(
              combined,
            )
          ) {
            industry = "technology";
          } else if (
            /education|school|learn|student|teach|course|training|curriculum|academy|university|college|class|lesson/i.test(
              combined,
            )
          ) {
            industry = "education";
          } else if (
            /market|brand|customer|sales|advertis|campaign|promotion|consumer|audience|conversion|funnel|engagement|lead/i.test(
              combined,
            )
          ) {
            industry = "marketing";
          } else if (
            /nature|environment|sustain|green|eco|climate|conservation|renewable|biodiversity|pollution|earth|ecosystem/i.test(
              combined,
            )
          ) {
            industry = "environment";
          }

          // More comprehensive image style determination
          let imageStyle = "photography";
          if (industry === "technology" || /diagram|process|workflow|system|concept|abstract/i.test(combined)) {
            imageStyle = "illustrations";
          } else if (industry === "education") {
            imageStyle = "mixed";
          } else if (industry === "marketing" || /creative|design|visual|artistic/i.test(combined)) {
            imageStyle = "illustrations";
          }

          // Better theme selection based on industry
          let colorScheme = "professional-blue";
          if (industry === "healthcare") colorScheme = "mint-blue";
          else if (industry === "finance") colorScheme = "professional-dark";
          else if (industry === "environment") colorScheme = "mint-blue";
          else if (industry === "marketing") colorScheme = "edge-yellow";
          else if (industry === "education") colorScheme = "light-rose";

          // Visual mood detection
          let visualMood = "confident";
          if (/inspire|motivat|empower|success|achievement/i.test(combined)) visualMood = "inspiring";
          else if (/serious|important|critical|urgent|essential/i.test(combined)) visualMood = "serious";
          else if (/fun|creative|innovate|exciting|dynamic/i.test(combined)) visualMood = "energetic";
          else if (/calm|peace|wellness|relax|harmony|balance/i.test(combined)) visualMood = "calm";

          // Determine presentation structure based on content
          let presentationStructure = "standard";
          if (/compare|versus|vs\.|advantages|disadvantages/i.test(combined)) {
            presentationStructure = "comparison";
          } else if (/step|guide|tutorial|how to|process|workflow/i.test(combined)) {
            presentationStructure = "process";
          } else if (/research|study|finding|analysis|data|report|result/i.test(combined)) {
            presentationStructure = "research";
          } else if (/pitch|proposal|business plan|investment/i.test(combined)) {
            presentationStructure = "pitch";
          } else if (/story|journey|case study|experience/i.test(combined)) {
            presentationStructure = "narrative";
          }

          return { industry, imageStyle, colorScheme, visualMood, presentationStructure };
        };

        // Image style guidance
        if (contextImageStyle === "illustrations") {
          parts.push(
            "Use vector illustrations and diagrams rather than photos. Maintain consistent illustration style throughout.",
          );
        } else if (contextImageStyle === "photography") {
          parts.push("Use high-quality professional photography with consistent lighting and composition.");
        } else if (contextImageStyle === "mixed") {
          parts.push("Blend photos for real-world context with illustrations for abstract concepts.");
        }

        // Mood/tone guidance
        if (contextMood === "inspiring") {
          parts.push(
            "Use uplifting imagery with achievement themes. Include aspirational quotes and forward-looking statements.",
          );
        } else if (contextMood === "serious") {
          parts.push("Use professional, focused imagery. Maintain formal language and data-driven content.");
        } else if (contextMood === "energetic") {
          parts.push("Use dynamic, vibrant imagery with energy. Include bold statement slides and engaging questions.");
        }

        // Audience tailoring
        if (audience === "executives") {
          parts.push(
            "Focus on high-level insights, strategic value, and business outcomes. Include executive summary slide. Keep technical details minimal.",
          );
        } else if (audience === "technical") {
          parts.push(
            "Include detailed diagrams, technical specifications, and implementation details. Use precise terminology.",
          );
        } else if (audience === "students") {
          parts.push(
            "Use engaging, accessible language with clear explanations. Include review slides and visual summaries.",
          );
        }

        // Presentation style guidance
        if (styleName === "minimal") {
          parts.push("Use minimal text (max 20 words per slide). Maximize white space. One concept per slide.");
        } else if (styleName === "creative") {
          parts.push("Use creative language and bold statements. Include unexpected visual metaphors.");
        } else if (styleName === "corporate") {
          parts.push("Use formal business language with data points. Include company branding elements.");
        }

        // Universal best practices
        parts.push("Each slide should communicate exactly one key message. Ensure clear visual hierarchy.");
        parts.push("Use consistent typography and color scheme throughout. Align elements carefully.");
        parts.push("Include presenter notes with additional context and speaking points.");

        return parts.join(" ");
      };

      const effectiveTone = mapTone(tone || style);
      const effectiveTemplate = mapTemplate(style);
      const effectiveTheme = mapTheme(style, tone, topicContext.colorScheme);
      const effectiveInstructions = buildInstructions(
        style,
        tone,
        effectiveIndustry,
        effectiveImageStyle,
        topicContext.visualMood,
        audienceType,
        purpose,
      );

      console.log("Presenton parameters:", {
        template: effectiveTemplate,
        theme: effectiveTheme,
        tone: effectiveTone,
        n_slides: Math.min(numSlides, 50),
      });

      let enhancedInstructions = [
        effectiveInstructions,
        "Prioritize premium visual design: strong layout, consistent spacing, and clear hierarchy.",
        "Keep text concise (max 5 bullets). Use impactful headings.",
        "Ensure consistent theme styling across all slides.",
      ]
        .filter(Boolean)
        .join(" ");

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
        verbosity: verbosity, // Now configurable: 'concise' | 'standard' | 'text-heavy'
        markdown_emphasis: true,
        web_search: webSearch, // Now configurable - enables real-time web research
        image_type: "stock",
        include_title_slide: includeTitleSlide,
        include_table_of_contents: effectiveIncludeTOC,
        allow_access_to_user_info: true,
        export_as: exportFormat, // Now uses the configurable export format
        trigger_webhook: false,
      };

      // Add slides_markdown if provided for more control over slide structure
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

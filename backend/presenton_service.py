"""
Presenton Slide Generation Service with Enhanced Instructions
"""
import os
import httpx
import json
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class PresentonRequest(BaseModel):
    topic: str
    num_slides: int = 10
    language: str = "sv"
    style: Optional[str] = "professional"
    tone: Optional[str] = None
    verbosity: str = "standard"
    image_type: str = "stock"
    web_search: bool = False
    script_content: Optional[str] = None
    additional_context: Optional[str] = None
    module_title: Optional[str] = None
    course_title: Optional[str] = None
    audience_type: Optional[str] = "general"
    purpose: Optional[str] = "inform"
    industry: Optional[str] = None
    include_table_of_contents: Optional[bool] = None
    include_title_slide: bool = True
    export_format: str = "pptx"


def detect_content_type(topic: str, context: str) -> str:
    """Detect the type of presentation content"""
    combined = f"{topic} {context}".lower()
    
    if any(word in combined for word in ["tutorial", "guide", "how to", "step by step", "walkthrough", "instructions"]):
        return "tutorial"
    if any(word in combined for word in ["compare", "versus", "vs.", "differences", "advantages", "disadvantages", "contrast"]):
        return "comparison"
    if any(word in combined for word in ["pitch", "proposal", "investment", "funding", "venture", "startup"]):
        return "pitch"
    if any(word in combined for word in ["report", "research", "findings", "data", "study", "analysis", "results"]):
        return "report"
    if any(word in combined for word in ["training", "course", "lesson", "workshop", "seminar", "education"]):
        return "training"
    if any(word in combined for word in ["timeline", "history", "evolution", "roadmap", "milestones"]):
        return "timeline"
    if any(word in combined for word in ["case study", "success story", "customer story", "testimonial"]):
        return "case-study"
    
    return "general"


def analyze_topic_context(topic: str, additional_context: Optional[str] = None) -> Dict[str, str]:
    """Analyze topic to determine industry, image style, color scheme, etc."""
    combined = f"{topic} {additional_context or ''}".lower()
    
    # Industry detection
    industry = "general"
    if any(word in combined for word in ["health", "medical", "hospital", "pharma", "patient", "doctor", "clinic", "treatment"]):
        industry = "healthcare"
    elif any(word in combined for word in ["financ", "bank", "invest", "money", "stock", "crypto", "trading", "budget"]):
        industry = "finance"
    elif any(word in combined for word in ["tech", "software", "digital", "ai", "machine learning", "data", "cloud", "app"]):
        industry = "technology"
    elif any(word in combined for word in ["education", "school", "learn", "student", "teach", "course", "training"]):
        industry = "education"
    elif any(word in combined for word in ["market", "brand", "customer", "sales", "advertis", "campaign", "promotion"]):
        industry = "marketing"
    elif any(word in combined for word in ["nature", "environment", "sustain", "green", "eco", "climate", "conservation"]):
        industry = "environment"
    
    # Image style
    image_style = "photography"
    if industry == "technology" or any(word in combined for word in ["diagram", "process", "workflow", "system", "architecture"]):
        image_style = "illustrations"
    elif industry in ["education", "marketing"]:
        image_style = "mixed"
    
    # Color scheme/theme
    color_scheme = "professional-blue"
    if industry == "healthcare":
        color_scheme = "mint-blue"
    elif industry in ["finance", "legal"]:
        color_scheme = "professional-dark"
    elif industry == "environment":
        color_scheme = "mint-blue"
    elif industry == "marketing":
        color_scheme = "edge-yellow"
    elif industry == "education":
        color_scheme = "light-rose"
    
    # Visual mood
    mood = "confident"
    if any(word in combined for word in ["inspire", "motivat", "empower", "success", "achievement"]):
        mood = "inspiring"
    elif any(word in combined for word in ["serious", "important", "critical", "urgent"]):
        mood = "serious"
    elif any(word in combined for word in ["fun", "creative", "innovate", "exciting", "dynamic"]):
        mood = "energetic"
    
    # Presentation structure
    presentation_structure = "standard"
    if any(word in combined for word in ["compare", "versus", "vs.", "advantages", "alternative"]):
        presentation_structure = "comparison"
    elif any(word in combined for word in ["step", "guide", "tutorial", "how to", "process", "workflow"]):
        presentation_structure = "process"
    elif any(word in combined for word in ["research", "study", "finding", "analysis", "data", "report"]):
        presentation_structure = "research"
    elif any(word in combined for word in ["pitch", "proposal", "business plan", "investment"]):
        presentation_structure = "pitch"
    elif any(word in combined for word in ["story", "journey", "case study", "experience"]):
        presentation_structure = "narrative"
    
    # Audience level
    audience_level = "general"
    if any(word in combined for word in ["executive", "c-level", "board", "leadership", "strategic"]):
        audience_level = "executive"
    elif any(word in combined for word in ["technical", "engineer", "developer", "architect"]):
        audience_level = "technical"
    elif any(word in combined for word in ["beginner", "introduction", "basics", "fundamentals", "101"]):
        audience_level = "beginner"
    elif any(word in combined for word in ["advanced", "expert", "deep dive", "comprehensive"]):
        audience_level = "advanced"
    
    return {
        "industry": industry,
        "image_style": image_style,
        "color_scheme": color_scheme,
        "mood": mood,
        "presentation_structure": presentation_structure,
        "audience_level": audience_level
    }


def get_layout_guidance(content_type: str) -> str:
    """Get content-specific layout guidance"""
    guides = {
        "tutorial": "Structure as step-by-step progression. Each slide: action-oriented title with step number, 3-4 concise action bullets starting with verbs, visual diagram or screenshot. Include 'Prerequisites' slide early and 'Next Steps' slide at end. Use numbered progression throughout.",
        
        "comparison": "Use two-column layouts extensively for side-by-side comparison. Create comparison matrix slide with key attributes. Include pros/cons summary slide. Use consistent visual icons/colors for each option being compared. End with recommendation slide based on use case.",
        
        "pitch": "Follow pitch deck structure: Hook slide (attention-grabbing stat/question), Problem slide (market pain with data), Solution slide (your product/service benefits), Traction slide (proof points/metrics), Market Opportunity slide (TAM/SAM/SOM), Business Model slide (revenue streams), Competition slide (positioning), Team slide (credentials), Financials slide (projections), Ask/Conclusion slide (clear CTA). Use bold headlines that can stand alone.",
        
        "report": "Start with Executive Summary slide (1-sentence overview, 3-5 key findings). Use data visualization heavily - charts for trends, tables for comparisons. Include Methodology slide. Each finding gets dedicated slide with supporting data. End with Recommendations slide (actionable items) and Appendix slide references.",
        
        "training": "Open with Learning Objectives slide (3-5 specific, measurable outcomes). Use Concept → Example → Practice structure. Include Knowledge Check slides after major sections. Use progressive disclosure - build complexity gradually. Add visual summaries/cheat sheets. End with Key Takeaways slide and Resources slide.",
        
        "timeline": "Use chronological progression. Each major milestone gets a slide with: date/period, what happened, why it matters, visual timeline graphic. Use consistent date formatting. Include context for each era/phase. End with 'Where We Are Now' and 'What's Next' slides.",
        
        "case-study": "Structure: Context/Background slide, Challenge/Problem slide, Solution/Approach slide (what was done), Results/Impact slide (quantified outcomes with before/after), Lessons Learned slide, Testimonial/Quote slide. Use real data and specific numbers. Include customer logo/branding where appropriate.",
        
        "general": "Use proven narrative structure: Hook/Opening (why this matters now), Context/Background (set the stage), 3-5 Main Points (each with supporting evidence), Practical Application/Implications, Summary/Key Takeaways, Call to Action/Next Steps. Vary layouts - avoid repetitive bullet-point slides."
    }
    return guides.get(content_type, guides["general"])


def get_text_density_instructions(verbosity: str, content_type: str) -> str:
    """Get text density control instructions"""
    if verbosity == "concise":
        return """CRITICAL TEXT DENSITY RULES:
- Maximum 15 words per slide body (total, not per bullet)
- Headlines: 5-7 words maximum, must be scannable in 2 seconds, use action verbs
- Bullets: 3-5 bullets max, each 3-5 words (short phrases only)
- Font sizes: Minimum 28pt for body text, 40pt+ for headlines
- Use VAST white space - text should occupy <40% of slide area
- NO paragraphs or full sentences in body text
- Use impactful single words or short phrases
- Replace long text with icons, diagrams, or visuals
- Each slide should have ONE key takeaway
- Speaker notes: 80-120 words with full context"""

    elif verbosity == "text-heavy":
        return """DETAILED TEXT DENSITY RULES:
- Maximum 60 words per slide body (still avoid walls of text)
- Headlines: 8-12 words, can be full sentences, must clearly state benefit or outcome
- Bullets: 5-7 bullets max, each 8-12 words (can be full sentences)
- Font sizes: Minimum 18pt for body, 32pt+ for headlines
- Use subheadings to organize longer content into scannable sections
- Allow brief paragraphs (2-3 sentences) for context, but break with visuals
- Include detailed explanations but maintain visual hierarchy
- Use numbered lists for sequential information
- Add callout boxes for critical information
- Speaker notes: 150-200 words with comprehensive detail, examples, and transitions"""

    else:  # standard
        return """BALANCED TEXT DENSITY RULES:
- Maximum 30-35 words per slide body
- Headlines: 6-10 words, benefit-focused and action-oriented, answer "why this matters"
- Bullets: 4-5 bullets, each 5-8 words (short complete thoughts)
- Font sizes: Minimum 22pt for body, 36pt+ for headlines
- Use mix of short and medium-length bullets for variety and emphasis
- Occasional short paragraphs (1-2 sentences) for complex ideas
- Maintain clear visual hierarchy with size, weight, and color
- Use parallel structure (all bullets start with verb, noun, etc.)
- Highlight key numbers, terms, or statistics with color or bold
- Speaker notes: 100-130 words with additional context, examples, and smooth transitions"""


def get_image_and_visual_guidance(industry: str, image_style: str, mood: str) -> str:
    """Get detailed image and visual design guidance"""
    base_guidance = """IMAGE QUALITY & SELECTION:
- Every image must directly support the slide message - no generic stock photos
- Use high-resolution images (minimum 1920x1080, prefer 4K)
- Images should evoke emotion and connection, not just fill space
- Prefer authentic, diverse representation of people
- Avoid cliché imagery (handshakes, thumbs up, generic office scenes)
- Use consistent image treatment (filters, overlays) throughout
- Images should have clear focal points and good composition
- When using AI-generated images, ensure photorealistic quality
- Consider cultural context and sensitivity
- Leave breathing room - don't crop too tightly"""

    style_specific = {
        "photography": "Use professional photography with natural lighting. Prefer candid over staged shots. Ensure faces are visible and expressive. Use depth of field to create focus.",
        "illustrations": "Use modern, clean vector illustrations. Maintain consistent style and color palette. Ensure illustrations are simple enough to understand at a glance. Use flat design or subtle gradients.",
        "mixed": "Combine photography for emotional impact and illustrations for concepts/data. Maintain visual consistency through color palette and style. Use photography for people/places, illustrations for processes/ideas."
    }

    mood_guidance = {
        "inspiring": "Use uplifting imagery with bright, warm tones. Show achievement, growth, and success. Use upward movement and aspirational scenes.",
        "serious": "Use professional, subdued imagery. Prefer cool tones and minimal decoration. Focus on credibility and expertise.",
        "energetic": "Use dynamic imagery with bold colors and movement. Show action and excitement. Use diagonal lines and vibrant contrasts.",
        "confident": "Use strong, clear imagery with good contrast. Show competence and reliability. Use balanced composition and professional aesthetics."
    }

    parts = [base_guidance]
    if image_style in style_specific:
        parts.append(f"IMAGE STYLE: {style_specific[image_style]}")
    if mood in mood_guidance:
        parts.append(f"MOOD & TONE: {mood_guidance[mood]}")

    return " ".join(parts)


def get_color_and_design_principles() -> str:
    """Get color theory and design principles"""
    return """COLOR & DESIGN PRINCIPLES:
- Use 60-30-10 rule: 60% dominant color, 30% secondary, 10% accent
- Ensure WCAG AA contrast ratio minimum: 4.5:1 for text, 3:1 for large text
- Use color psychology: Blue=trust/calm, Red=urgency/passion, Green=growth/health, Yellow=optimism/caution
- Create visual rhythm through repetition of colors, shapes, and spacing
- Use whitespace as a design element, not leftover space
- Align elements to create invisible grid structure
- Use the rule of thirds for image placement
- Create balance: symmetrical for formal, asymmetrical for dynamic
- Ensure consistency: same element types should look the same throughout
- Use proximity to group related information
- Create contrast to draw attention to key elements
- Maintain visual unity through consistent style, colors, and fonts"""


def get_slide_type_specific_guidance() -> str:
    """Get guidance for specific slide types"""
    return """SLIDE TYPE BEST PRACTICES:
TITLE SLIDE: Large, bold title (60-72pt). Compelling subtitle explaining benefit. Minimal text. Strong hero image covering 50-70% of slide. Include presenter name/credentials if relevant.

AGENDA/TABLE OF CONTENTS: Maximum 5-7 main points. Use icons for each section. Include time estimates if relevant. Make it scannable - not a wall of text. Consider visual timeline or roadmap instead of bullet list.

DATA VISUALIZATION: One chart per slide. Clear axis labels and legend. Highlight key insights with color or annotations. Include data source. Use appropriate chart type: line for trends, bar for comparisons, pie for proportions (max 5 slices).

QUOTE SLIDE: Large, impactful quote (32-44pt). Clear attribution with photo if available. Minimal other text. Use quotation marks for clarity. Context in speaker notes if needed.

IMAGE SLIDE: Full-bleed or large featured image. Minimal text overlay. Ensure text is readable (use overlay or shadow). Text should complement, not explain the obvious.

COMPARISON SLIDE: Clear two-column or side-by-side layout. Consistent structure for each option. Use color coding to distinguish options. Include summary recommendation if appropriate.

CLOSING/THANK YOU: Clear call-to-action. Contact information. Next steps. Optional QR code for additional resources. Memorable closing statement or visual."""


def build_enhanced_instructions(params: Dict[str, Any]) -> str:
    """Build comprehensive enhanced instructions for Presenton"""
    content_type = params.get("content_type", "general")
    verbosity = params.get("verbosity", "standard")
    industry = params.get("industry", "general")
    image_style = params.get("image_style", "photography")
    mood = params.get("mood", "confident")
    audience_level = params.get("audience_level", "general")
    presentation_structure = params.get("presentation_structure", "standard")

    parts = []

    # Content-specific structure guidance
    parts.append(get_layout_guidance(content_type))

    # Text density control
    parts.append(get_text_density_instructions(verbosity, content_type))

    # Typography rules
    parts.append("TYPOGRAPHY HIERARCHY: Use clear size progression - 44-48pt for main titles, 32-36pt for subtitles, 24-28pt for section headers, 20-24pt for body text. Bold key terms and numbers. Use consistent font family throughout (prefer sans-serif for modern look, serif for traditional/academic). Maintain 1.4-1.6 line spacing for readability. Use font weight (light, regular, bold) to create hierarchy without size changes.")

    # Spacing and layout rules
    parts.append("SPACING & LAYOUT: Generous margins minimum 8-10% on all sides. Maintain consistent padding between elements (24-32px). Group related items visually with proximity. Use grid alignment - no arbitrary positioning. Create clear visual paths for eye movement (Z-pattern for text-heavy, F-pattern for scan-friendly). Balance text and white space at 50-50 or 40-60 ratio. Use the rule of thirds for optimal element placement.")

    # Visual hierarchy
    parts.append("VISUAL HIERARCHY: Most critical information in top-left or center (F-pattern reading). Use size, color, position, and weight to establish importance. Headlines should communicate key message even if body text is ignored. Bullet points should be scannable in 3 seconds. Numbers and statistics should stand out visually with larger size or contrasting color. Use color sparingly for emphasis - maximum 3 colors plus neutrals.")

    # Add new image and visual guidance
    parts.append(get_image_and_visual_guidance(industry, image_style, mood))

    # Add color and design principles
    parts.append(get_color_and_design_principles())

    # Add slide type guidance
    parts.append(get_slide_type_specific_guidance())
    
    # Industry-specific design guidance
    industry_guides = {
        "healthcare": "HEALTHCARE DESIGN: Use professional medical imagery with clean, clinical aesthetics. Prioritize data accuracy and scientific rigor. Include clear citations for medical claims. Use calming blues, greens, and whites. Medical diagrams should be anatomically accurate and professionally illustrated. Include disclaimers where appropriate.",
        
        "finance": "FINANCE DESIGN: Every claim requires data support with sources. Use charts for trends (line/area), tables for detailed numbers, bar charts for comparisons. Conservative color palette (blues, grays, minimal accent colors). Include disclaimers and risk disclosures. Focus on ROI, metrics, and quantifiable outcomes. Use financial terminology correctly.",
        
        "technology": "TECHNOLOGY DESIGN: Use modern geometric shapes and clean lines. Code snippets in monospace font with syntax highlighting. System architecture diagrams with clear component relationships. Feature-benefit pairs (technical capability → user value). Use tech-appropriate iconography. Include API examples or integration diagrams where relevant.",
        
        "education": "EDUCATION DESIGN: Include learning objectives slide early (3-5 specific, measurable outcomes). Use engaging educational imagery and clear explanatory diagrams. Create visual hierarchy for key concepts vs. supporting details. Include knowledge check questions after major sections. Use mnemonic devices or visual metaphors for complex topics.",
        
        "marketing": "MARKETING DESIGN: Use dynamic, attention-grabbing visuals. Include customer journey maps or funnel diagrams. Show before/after transformations. Use compelling statistics and social proof. Include brand personality through color and imagery. Feature real customer testimonials with photos. Use persuasive language focused on benefits and outcomes."
    }
    
    if industry in industry_guides:
        parts.append(industry_guides[industry])
    
    # Universal quality standards - enhanced
    parts.append("""UNIVERSAL QUALITY STANDARDS:
(1) 5-Second Rule: Can viewer understand the key message in 5 seconds without reading everything?
(2) One Idea Per Slide: Each slide should communicate ONE main concept - split complex topics across multiple slides
(3) Narrative Flow: Does each slide advance the story logically? Include clear transitions and connections
(4) Image Relevance: Are all images directly supporting the message? No decorative filler images
(5) Legibility Test: Is text readable from 10 feet away? Test minimum font sizes
(6) Color Contrast: Do colors have sufficient contrast (WCAG AA minimum 4.5:1)? Avoid low-contrast combinations
(7) Consistency: Are fonts, colors, spacing, and alignment consistent throughout? Create visual unity
(8) Data Integrity: Are all statistics accurate and properly sourced? Include citations for claims
(9) Accessibility: Consider colorblind-friendly palettes, alt text concepts, and clear visual hierarchy
(10) Professional Polish: No typos, consistent formatting, proper grammar, aligned elements
(11) Audience Appropriateness: Language, tone, and complexity match audience level and context
(12) Actionable Content: Each slide should drive understanding or action - no filler slides""")

    # Character encoding notice - enhanced
    parts.append("SWEDISH LANGUAGE REQUIREMENTS: Use proper UTF-8 encoding for all Swedish characters (å, ä, ö, Å, Ä, Ö). Ensure all text is properly encoded without character substitutions or encoding errors. Use Swedish grammar conventions and appropriate formality level. Verify all special characters display correctly in final output.")

    # Add storytelling and engagement principles
    parts.append("""STORYTELLING & ENGAGEMENT:
- Start with a hook: compelling question, surprising statistic, or bold statement
- Create emotional connection: use stories, examples, and relatable scenarios
- Build tension and resolution: present problem before solution
- Use the Rule of Three: group information in threes for memorability
- Include surprising or counterintuitive insights to maintain interest
- End with clear takeaway and next steps
- Use transitions that connect slides logically
- Vary slide layouts to maintain visual interest
- Include moments for audience reflection or discussion
- Make content scannable for different audience attention levels""")

    return " ".join(parts)


def preprocess_content(content: str, topic: str, num_slides: int) -> str:
    """Preprocess and optimize content for better Presenton output"""
    if not content or not content.strip():
        return f"Create a comprehensive presentation about: {topic}"

    # Clean the content
    content = content.strip()

    # Remove excessive whitespace
    content = " ".join(content.split())

    # If content is very short, enhance it with context
    if len(content) < 100:
        content = f"""Topic: {topic}

Content: {content}

Please create a detailed, professional presentation with {num_slides} slides that thoroughly covers this topic with clear explanations, relevant examples, and actionable insights."""

    # If content is too long, add structuring guidance
    elif len(content) > 5000:
        content = f"""Create a {num_slides}-slide presentation from the following content.
Focus on the most important points and create a clear narrative arc:

{content[:8000]}"""

    # Add slide count guidance if not mentioned
    if str(num_slides) not in content and "slides" not in content.lower():
        content = f"""Create a presentation with approximately {num_slides} slides covering:

{content}"""

    return content


def optimize_presenton_payload(request: PresentonRequest, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Optimize payload parameters for better output quality"""

    # Ensure verbosity is set appropriately
    if not payload.get("verbosity"):
        # Default to 'standard' for most cases, 'concise' for many slides
        payload["verbosity"] = "concise" if request.num_slides > 15 else "standard"

    # Enable web search for better context if not explicitly disabled
    if payload.get("web_search") is None and not request.script_content:
        payload["web_search"] = True

    # Optimize image settings
    if request.image_type == "ai-generated":
        # Add specific image generation guidance
        payload["image_generation_style"] = "photorealistic"

    # Ensure markdown emphasis for better formatting
    payload["markdown_emphasis"] = True

    # Set quality mode to highest
    if "quality_mode" not in payload:
        payload["quality_mode"] = "high"

    return payload


async def generate_presenton_presentation(request: PresentonRequest) -> Dict[str, Any]:
    """Generate presentation using Presenton API with enhanced instructions"""
    
    PRESENTON_API_KEY = os.getenv("PRESENTON_API_KEY")
    if not PRESENTON_API_KEY:
        raise ValueError("PRESENTON_API_KEY not configured")
    
    PRESENTON_API_URL = "https://api.presenton.ai"
    
    # Analyze content
    content_for_analysis = request.script_content or request.additional_context or request.topic or ""
    topic_context = analyze_topic_context(request.topic, request.additional_context)
    content_type = detect_content_type(request.topic, content_for_analysis)
    
    # Determine effective parameters
    effective_industry = request.industry or topic_context["industry"]
    effective_image_style = topic_context["image_style"]
    
    # Smart defaults
    effective_include_toc = request.include_table_of_contents if request.include_table_of_contents is not None else (request.num_slides > 8)
    
    # Map parameters to Presenton format
    language_map = {"sv": "Swedish", "en": "English"}
    effective_language = language_map.get(request.language, "Swedish")
    
    # Map template (style)
    template_map = {"professional": "general", "modern": "modern", "minimal": "modern", "creative": "swift", "classic": "standard"}
    effective_template = template_map.get(request.style or "professional", "general")
    
    # Map theme (color scheme)
    effective_theme = topic_context["color_scheme"]
    
    # Map tone
    tone_map = {"professional": "professional", "casual": "casual", "funny": "funny", "educational": "educational", "inspirational": "educational"}
    effective_tone = tone_map.get(request.tone or request.style or "professional", "professional")
    
    # Build enhanced instructions
    instruction_params = {
        "content_type": content_type,
        "verbosity": request.verbosity,
        "style": request.style,
        "tone": request.tone,
        "industry": effective_industry,
        "image_style": effective_image_style,
        "mood": topic_context["mood"],
        "audience": request.audience_type,
        "audience_level": topic_context["audience_level"],
        "purpose": request.purpose,
        "presentation_structure": topic_context["presentation_structure"]
    }
    
    enhanced_instructions = build_enhanced_instructions(instruction_params)

    # Preprocess content for better quality
    raw_content = content_for_analysis[:10000]  # Limit to 10k chars
    optimized_content = preprocess_content(raw_content, request.topic, request.num_slides)

    # Build Presenton payload
    payload = {
        "content": optimized_content,
        "n_slides": min(request.num_slides, 50),
        "language": effective_language,
        "template": effective_template,
        "theme": effective_theme,
        "tone": effective_tone,
        "instructions": enhanced_instructions,
        "verbosity": request.verbosity,
        "markdown_emphasis": True,
        "web_search": request.web_search,
        "image_type": request.image_type,
        "include_title_slide": request.include_title_slide,
        "include_table_of_contents": effective_include_toc,
        "allow_access_to_user_info": True,
        "export_as": request.export_format,
        "trigger_webhook": False
    }

    # Optimize payload for better quality
    payload = optimize_presenton_payload(request, payload)

    # Call Presenton async API with increased timeout for better quality
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{PRESENTON_API_URL}/api/v1/ppt/presentation/generate/async",
            headers={
                "Authorization": f"Bearer {PRESENTON_API_KEY}",
                "Content-Type": "application/json; charset=utf-8"
            },
            json=payload
        )
        
        if not response.is_success:
            error_text = response.text
            print(f"Presenton API error: {response.status_code} - {error_text}")
            raise Exception(f"Presenton API error: {response.status_code}")
        
        task_data = response.json()
        return {
            "status": "pending",
            "task_id": task_data.get("id"),
            "message": "Presentation generation started"
        }


async def check_presenton_status(task_id: str) -> Dict[str, Any]:
    """Check status of Presenton generation task"""
    
    PRESENTON_API_KEY = os.getenv("PRESENTON_API_KEY")
    if not PRESENTON_API_KEY:
        raise ValueError("PRESENTON_API_KEY not configured")
    
    PRESENTON_API_URL = "https://api.presenton.ai"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{PRESENTON_API_URL}/api/v1/ppt/presentation/status/{task_id}",
            headers={"Authorization": f"Bearer {PRESENTON_API_KEY}"}
        )
        
        if not response.is_success:
            raise Exception(f"Status check failed: {response.status_code}")
        
        status_data = response.json()
        
        if status_data.get("status") == "completed":
            return {
                "status": "completed",
                "presentation_id": status_data.get("data", {}).get("presentation_id"),
                "download_url": status_data.get("data", {}).get("path"),
                "edit_url": status_data.get("data", {}).get("edit_path"),
                "credits_consumed": status_data.get("data", {}).get("credits_consumed")
            }
        
        return {
            "status": status_data.get("status"),
            "message": status_data.get("message", "")
        }

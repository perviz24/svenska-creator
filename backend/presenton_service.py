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
    web_search: bool = True  # Enable by default for 20-30% quality improvement
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
    """Get simplified text density guidance"""
    guides = {
        "concise": "Create minimal slides with short headlines, few bullet points, and emphasis on visuals over text.",
        "standard": "Balance text and visuals with clear headlines, concise bullets, and good use of white space.",
        "text-heavy": "Include detailed content with comprehensive explanations, more bullets, and thorough coverage of topics."
    }
    return guides.get(verbosity, guides["standard"])


def get_image_and_visual_guidance(industry: str, image_style: str, mood: str) -> str:
    """Get simplified image guidance"""
    return "Use high-quality, relevant images that support the message. Maintain visual consistency throughout."




def build_enhanced_instructions(params: Dict[str, Any]) -> str:
    """Build minimal, focused instructions that let Presenton templates shine"""
    verbosity = params.get("verbosity", "standard")

    parts = []

    # Text density only (user-controlled)
    parts.append(get_text_density_instructions(verbosity, "general"))

    # Swedish encoding - critical (known Presenton bug with Swedish characters)
    parts.append("SWEDISH LANGUAGE: Ensure proper encoding of Swedish characters (å, ä, ö, Å, Ä, Ö). Use correct Swedish grammar and formality level.")

    return " ".join(parts)


def append_user_preferences_to_instructions(instructions: str, request: PresentonRequest) -> str:
    """Append explicit user preferences from additional_context to instructions"""

    if not request.additional_context:
        return instructions

    additions = []
    context = request.additional_context.lower()

    # Parse primary color
    if "primary color:" in context:
        try:
            color = request.additional_context.split("primary color:")[1].split(".")[0].strip()
            additions.append(f"PRIMARY BRAND COLOR: Use {color} as the primary brand color throughout the presentation. Apply this color to headings, key elements, accent items, and important callouts. Ensure consistency across all slides.")
        except:
            pass

    # Parse accent color
    if "accent color:" in context:
        try:
            color = request.additional_context.split("accent color:")[1].split(".")[0].strip()
            additions.append(f"ACCENT COLOR: Use {color} as the secondary accent color for highlights, callouts, buttons, and emphasis elements. Create visual hierarchy through color contrast.")
        except:
            pass

    # Parse image richness
    if "image richness:" in context:
        richness_guides = {
            "minimal": "MINIMAL IMAGE USAGE: Use images sparingly - only 1-2 slides should have images. Focus primarily on text, bullet points, and simple diagrams. When images are used, they should be highly relevant and impactful.",
            "moderate": "MODERATE IMAGE USAGE: Balance images and text content - approximately 40-50% of slides should include relevant, high-quality images. Mix text-focused and image-focused slides for variety.",
            "rich": "RICH IMAGE USAGE: Image-rich presentation - 60-70% of slides should feature high-quality, relevant images. Use large images that support the message. Balance with sufficient white space.",
            "visual-heavy": "VISUAL-HEAVY PRESENTATION: Highly visual presentation - every slide should include compelling, high-quality imagery. Minimize text, use images as primary communication tool. Images should be full-bleed or occupy majority of slide space."
        }

        for richness_level, guide in richness_guides.items():
            if richness_level in context:
                additions.append(guide)
                break

    # Parse charts requirement
    if "include charts" in context or "data visualizations" in context:
        additions.append("CHARTS & DATA VISUALIZATION REQUIREMENT: Include 2-3 data visualization slides with charts, graphs, or diagrams to illustrate key points and data. Use appropriate chart types: line charts for trends over time, bar charts for comparisons between categories, pie charts for proportions (maximum 5 slices), scatter plots for correlations. Ensure all charts have clear titles, labeled axes, legends, and highlight key insights with color or annotations. Include data sources for credibility.")

    # Parse animations requirement
    if "include slide transitions" in context or "include animations" in context:
        additions.append("TRANSITIONS & ANIMATIONS: Design slides with smooth transitions and animations in mind. Create opportunities for progressive disclosure where information builds up step-by-step. Plan visual flow between slides. Use consistent transition styles throughout the presentation.")

    if additions:
        separator = "\n\n" + "="*80 + "\n"
        return instructions + separator + "EXPLICIT USER PREFERENCES:\n" + "\n\n".join(additions)

    return instructions


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

    # Disable web search if user provided their own script content
    # (they probably don't want external content mixed in)
    if request.script_content and request.script_content.strip():
        payload["web_search"] = False

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
    tone_map = {
        "professional": "professional",
        "casual": "casual",
        "funny": "funny",
        "educational": "educational",
        "inspirational": "sales_pitch",  # Better for inspirational content
        "sales_pitch": "sales_pitch"
    }
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

    # Append user preferences from additional_context
    enhanced_instructions = append_user_preferences_to_instructions(enhanced_instructions, request)

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
        "web_search": request.web_search,
        "include_title_slide": request.include_title_slide,
        "include_table_of_contents": effective_include_toc,
        "export_as": request.export_format,
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

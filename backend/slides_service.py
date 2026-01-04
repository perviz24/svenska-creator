"""
Slide Generation Service (Internal AI)
Generates presentation slides using AI with sophisticated image matching
"""
import os
from dotenv import load_dotenv
import json
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Load environment variables
load_dotenv()


# ============================================================================
# Request/Response Models
# ============================================================================

class SlideGenerationRequest(BaseModel):
    script_content: str
    module_title: str
    course_title: str
    num_slides: int = 10
    language: str = "sv"
    tone: str = "professional"
    verbosity: str = "standard"
    include_title_slide: bool = True
    include_table_of_contents: bool = False
    industry: Optional[str] = None
    audience_type: Optional[str] = "general"


class SlideContent(BaseModel):
    slide_number: int
    title: str
    subtitle: Optional[str] = None
    content: Optional[str] = ""  # Allow None, default to empty string
    speaker_notes: Optional[str] = ""  # Allow None, default to empty string
    layout: str = "title-content"  # Default layout
    suggested_image_query: Optional[str] = ""
    image_url: Optional[str] = None
    image_source: Optional[str] = None
    image_attribution: Optional[str] = None


class SlideGenerationResponse(BaseModel):
    presentation_title: str
    slides: List[SlideContent]
    slide_count: int
    source: str = "internal-ai"


# ============================================================================
# AI Service
# ============================================================================

async def call_ai(
    system_prompt: str,
    user_prompt: str,
    session_id: str = "slide-generation"
) -> str:
    """Call AI via Emergent LLM Key"""
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    
    try:
        # Initialize chat with Gemini 2.5 Flash
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Create user message
        user_message = UserMessage(text=user_prompt)
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        if not response:
            raise Exception("No content in AI response")
        
        return response
        
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate limit" in error_msg.lower():
            raise Exception("Rate limit exceeded. Please try again later.")
        elif "402" in error_msg or "credit" in error_msg.lower():
            raise Exception("AI credits exhausted. Please add credits to continue.")
        raise Exception(f"AI error: {error_msg}")


def extract_json_from_response(content: str) -> Dict[str, Any]:
    """Extract JSON from AI response"""
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
    if json_match:
        json_str = json_match.group(1).strip()
    else:
        json_str = content.strip()
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            return json.loads(json_match.group(0))
        raise Exception("Failed to parse JSON from AI response")


# ============================================================================
# Slide Generation
# ============================================================================

async def generate_slides(request: SlideGenerationRequest) -> SlideGenerationResponse:
    """Generate presentation slides using Internal AI"""
    
    if not request.script_content or not request.script_content.strip():
        raise ValueError("Script content is required")
    
    # Build verbosity guidance
    verbosity_guidance = {
        "concise": "Maximum 15 words per slide. Headlines 5-7 words. Use minimal text, maximum 5 bullets with 3-5 words each.",
        "standard": "Maximum 30-35 words per slide. Headlines 6-10 words. Use 4-5 bullets with 5-8 words each.",
        "text-heavy": "Maximum 60 words per slide. Headlines 8-12 words. Use 5-7 bullets with 8-12 words each, can include brief paragraphs."
    }[request.verbosity]
    
    # Build tone guidance
    tone_guidance = {
        "professional": "Formal, authoritative, data-driven language. Use technical terms appropriately.",
        "casual": "Friendly, conversational tone. Use simple language and relatable examples.",
        "educational": "Clear, pedagogical approach. Define concepts, provide examples, check understanding.",
        "inspirational": "Motivational, uplifting language. Focus on transformation and possibility."
    }.get(request.tone, "Professional and clear")
    
    # Build layout variety guidance
    layout_guidance = """
Layout types to use:
- 'title': Opening/closing slides, major section breaks (1-2 slides)
- 'title-content': Key statements with supporting detail (30% of slides)
- 'bullet-points': Lists of related items, process steps (25% of slides)
- 'two-column': Comparisons, before/after, pros/cons (15% of slides)
- 'image-focus': Emotional moments, product showcases (15% of slides)
- 'data-visualization': Statistics, trends, metrics (10% of slides)
- 'quote': Expert testimony, key takeaways (5% of slides)

IMPORTANT: Vary the layouts throughout - avoid using same layout consecutively.
    """
    
    system_prompt = (
        "Du är en världsklass presentationsdesigner och berättarexpert. "
        f"Skapa exakt {request.num_slides} slides för en presentation.\n\n"
        f"VERBOSITY: {verbosity_guidance}\n\n"
        f"TON: {tone_guidance}\n\n"
        f"{layout_guidance}\n"
        "Svara ENDAST med giltig JSON i detta format:\n"
        "{\n"
        '  "presentation_title": "Presentation Title",\n'
        '  "slides": [\n'
        '    {\n'
        '      "slide_number": 1,\n'
        '      "title": "Slide Title",\n'
        '      "subtitle": "Optional subtitle",\n'
        '      "content": "Slide content",\n'
        '      "speaker_notes": "Detailed speaker notes",\n'
        '      "layout": "title-content",\n'
        '      "suggested_image_query": "Search keywords for image"\n'
        '    }\n'
        "  ]\n"
        "}"
    ) if request.language == "sv" else (
        "You are a world-class presentation designer and storytelling expert. "
        f"Create exactly {request.num_slides} slides for a presentation.\n\n"
        f"VERBOSITY: {verbosity_guidance}\n\n"
        f"TONE: {tone_guidance}\n\n"
        f"{layout_guidance}\n"
        "Respond ONLY with valid JSON in this format:\n"
        "{\n"
        '  "presentation_title": "Presentation Title",\n'
        '  "slides": [\n'
        '    {\n'
        '      "slide_number": 1,\n'
        '      "title": "Slide Title",\n'
        '      "subtitle": "Optional subtitle",\n'
        '      "content": "Slide content",\n'
        '      "speaker_notes": "Detailed speaker notes",\n'
        '      "layout": "title-content",\n'
        '      "suggested_image_query": "Search keywords for image"\n'
        '    }\n'
        "  ]\n"
        "}"
    )
    
    user_prompt = (
        f'Module: "{request.module_title}"\n'
        f'Course: "{request.course_title}"\n\n'
        f'Script content:\n{request.script_content[:4000]}'
    )
    
    content = await call_ai(system_prompt, user_prompt, session_id=f"slides-gen-{request.module_title[:20]}")
    data = extract_json_from_response(content)
    
    # Convert to response model
    slides = []
    for slide_data in data.get("slides", []):
        # Handle content field - convert list to string if needed
        content = slide_data.get("content") or ""
        if isinstance(content, list):
            content = "\n".join(str(item) for item in content)
        
        # Handle speaker_notes field - convert list to string if needed  
        speaker_notes = slide_data.get("speaker_notes") or ""
        if isinstance(speaker_notes, list):
            speaker_notes = "\n".join(str(item) for item in speaker_notes)
            
        slides.append(SlideContent(
            slide_number=slide_data.get("slide_number", len(slides) + 1),
            title=slide_data.get("title") or "Untitled",
            subtitle=slide_data.get("subtitle"),
            content=content,
            speaker_notes=speaker_notes,
            layout=slide_data.get("layout") or "title-content",
            suggested_image_query=slide_data.get("suggested_image_query") or "",
            image_url=slide_data.get("image_url"),
            image_source=slide_data.get("image_source"),
            image_attribution=slide_data.get("image_attribution")
        ))
    
    return SlideGenerationResponse(
        presentation_title=data.get("presentation_title", request.module_title),
        slides=slides,
        slide_count=len(slides),
        source="internal-ai"
    )

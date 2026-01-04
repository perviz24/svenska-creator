"""
Slide Generation Service (Internal AI) - Enhanced Version
Generates professional presentation slides with sophisticated design principles
"""
import os
from dotenv import load_dotenv
import json
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
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
    presentation_goal: Optional[str] = None  # inform, persuade, inspire, teach


class SlideContent(BaseModel):
    slide_number: int
    title: str
    subtitle: Optional[str] = None
    content: Optional[str] = ""
    bullet_points: Optional[List[str]] = None
    key_takeaway: Optional[str] = None
    speaker_notes: Optional[str] = ""
    layout: str = "title-content"
    suggested_image_query: Optional[str] = ""
    suggested_icon: Optional[str] = None
    visual_type: Optional[str] = None  # photo, illustration, icon, chart, diagram
    color_accent: Optional[str] = None
    transition_hint: Optional[str] = None
    image_url: Optional[str] = None
    image_source: Optional[str] = None
    image_attribution: Optional[str] = None


class SlideGenerationResponse(BaseModel):
    presentation_title: str
    slides: List[SlideContent]
    slide_count: int
    source: str = "internal-ai"
    narrative_structure: Optional[str] = None
    color_theme: Optional[str] = None


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
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(text=user_prompt)
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
# Enhanced Slide Generation Prompts
# ============================================================================

def get_design_principles(language: str) -> str:
    """Get professional slide design principles"""
    if language == "sv":
        return """
## PROFESSIONELLA DESIGNPRINCIPER

### 1. Visuell Hierarki
- Titel: Stor, fet, fångande (max 8 ord)
- Underrubrik: Stödjande kontext (max 12 ord)  
- Innehåll: Skanningsbart, luftigt

### 2. "Ett Meddelande per Slide"-regeln
- Varje slide = EN huvudidé
- Stöd den idén visuellt och textuellt
- Om du har två idéer, skapa två slides

### 3. Bullet Points som Fungerar
- Börja med aktiva verb: "Implementera", "Analysera", "Skapa"
- Parallell grammatisk struktur
- Max 4-5 punkter per slide
- Varje punkt max 8 ord

### 4. Berättarstruktur (Narrative Arc)
- Öppning: Hook + Problemställning (10% av slides)
- Uppbyggnad: Lösningar + Bevis (70% av slides)
- Klimax: Huvudinsikt eller Transformation (10% av slides)
- Avslutning: Call-to-Action + Sammanfattning (10% av slides)

### 5. Bildval-strategi
- Använd SPECIFIKA sökfrågor: "läkare som konsulterar patient på sjukhus" inte "medicin"
- Undvik klyschor: inga handskakningar, inga pusselbitar, inga glödlampor
- Föredra: Autentiska ögonblick, intressanta vinklar, känslomässig resonans
"""
    else:
        return """
## PROFESSIONAL DESIGN PRINCIPLES

### 1. Visual Hierarchy
- Title: Bold, catchy, max 8 words
- Subtitle: Supporting context, max 12 words
- Content: Scannable, breathable whitespace

### 2. "One Message Per Slide" Rule
- Each slide = ONE main idea
- Support that idea visually and textually
- If you have two ideas, make two slides

### 3. Bullet Points That Work
- Start with action verbs: "Implement", "Analyze", "Create"
- Parallel grammatical structure
- Max 4-5 points per slide
- Each point max 8 words

### 4. Narrative Arc Structure
- Opening: Hook + Problem Statement (10% of slides)
- Build-up: Solutions + Evidence (70% of slides)
- Climax: Key Insight or Transformation (10% of slides)
- Closing: Call-to-Action + Summary (10% of slides)

### 5. Image Selection Strategy
- Use SPECIFIC queries: "doctor consulting patient in hospital" not "medicine"
- Avoid clichés: no handshakes, no puzzle pieces, no lightbulbs
- Prefer: Authentic moments, interesting angles, emotional resonance
"""


def get_layout_guidance(language: str) -> str:
    """Get detailed layout guidance"""
    if language == "sv":
        return """
## LAYOUTTYPER OCH NÄR DE ANVÄNDS

### 'title' - Öppning/Avslutning
- Endast för: Första slide, sista slide, större sektionsbrytningar
- Kännetecken: Stor centrerad titel, minimal text, kraftfull bild
- Bäst för: Maximal visuell impact

### 'title-content' - Arbetshäst-layouten
- För: Huvudidéer med förklaring
- Kännetecken: Rubrik upptill, 2-3 meningar eller korta stycken
- Bäst för: Koncept som behöver kontext

### 'bullet-points' - Listlayouten
- För: Processer, checklistor, funktioner
- Kännetecken: 4-5 punkter, ikoner vid varje punkt
- Bäst för: Skanningsbar information

### 'two-column' - Jämförelselayouten
- För: Före/efter, för/emot, problem/lösning
- Kännetecken: Två distinkta sektioner sida vid sida
- Bäst för: Kontraster och jämförelser

### 'image-focus' - Visuella berättelser
- För: Känslomässiga ögonblick, produktvisning, exempel
- Kännetecken: 70%+ bild, minimal text över
- Bäst för: "Show don't tell"-ögonblick

### 'data-visualization' - Siffror som talar
- För: Statistik, trender, mätvärden
- Kännetecken: Ett nyckeltal stort, stödkontext
- Bäst för: Övertyga med data

### 'quote' - Auktoritet och insikt
- För: Expertutlåtanden, kundcitat, takeaways
- Kännetecken: Stor citerad text, källa under
- Bäst för: Bygga trovärdighet

### VARIATION ÄR NYCKELN
- Använd ALDRIG samma layout 2 gånger i rad
- Sikta på minst 4 olika layouter per 10 slides
- Balansera text-tunga med visuellt tunga slides
"""
    else:
        return """
## LAYOUT TYPES AND WHEN TO USE THEM

### 'title' - Opening/Closing
- Only for: First slide, last slide, major section breaks
- Characteristics: Large centered title, minimal text, powerful image
- Best for: Maximum visual impact

### 'title-content' - Workhorse Layout
- For: Main ideas with explanation
- Characteristics: Heading at top, 2-3 sentences or short paragraphs
- Best for: Concepts that need context

### 'bullet-points' - List Layout
- For: Processes, checklists, features
- Characteristics: 4-5 points, icons for each point
- Best for: Scannable information

### 'two-column' - Comparison Layout
- For: Before/after, pros/cons, problem/solution
- Characteristics: Two distinct sections side by side
- Best for: Contrasts and comparisons

### 'image-focus' - Visual Storytelling
- For: Emotional moments, product showcase, examples
- Characteristics: 70%+ image, minimal overlay text
- Best for: "Show don't tell" moments

### 'data-visualization' - Numbers That Speak
- For: Statistics, trends, metrics
- Characteristics: One key number large, supporting context
- Best for: Persuading with data

### 'quote' - Authority and Insight
- For: Expert statements, customer quotes, takeaways
- Characteristics: Large quoted text, source below
- Best for: Building credibility

### VARIATION IS KEY
- NEVER use same layout 2 times in a row
- Aim for at least 4 different layouts per 10 slides
- Balance text-heavy with visually-heavy slides
"""


def get_verbosity_guidance(verbosity: str, language: str) -> str:
    """Get word count and content density guidance"""
    guidelines = {
        "concise": {
            "sv": """
## KONCIS STIL (TED-talk-stil)
- Titel: 3-6 ord, kraftfulla och minnesvärda
- Innehåll: Max 15 ord totalt per slide
- Bullets: Max 3 punkter, varje punkt 3-5 ord
- Fokus: EN idé, maximalt visuell impact
- Speaker notes: 50-100 ord (detta är vad du SÄGER)
- Bildstrategi: Stora, emotionella bilder dominerar
""",
            "en": """
## CONCISE STYLE (TED-talk style)
- Title: 3-6 words, powerful and memorable
- Content: Max 15 words total per slide
- Bullets: Max 3 points, each point 3-5 words
- Focus: ONE idea, maximum visual impact
- Speaker notes: 50-100 words (this is what you SAY)
- Image strategy: Large, emotional images dominate
"""
        },
        "standard": {
            "sv": """
## STANDARD STIL (Affärspresentation)
- Titel: 5-8 ord, tydliga och beskrivande
- Innehåll: 25-35 ord totalt per slide
- Bullets: 4-5 punkter, varje punkt 5-8 ord
- Fokus: EN huvudidé med stödpunkter
- Speaker notes: 100-150 ord per slide
- Bildstrategi: Balanserad text och visuellt
""",
            "en": """
## STANDARD STYLE (Business presentation)
- Title: 5-8 words, clear and descriptive
- Content: 25-35 words total per slide
- Bullets: 4-5 points, each point 5-8 words
- Focus: ONE main idea with supporting points
- Speaker notes: 100-150 words per slide
- Image strategy: Balanced text and visual
"""
        },
        "text-heavy": {
            "sv": """
## DETALJERAD STIL (Utbildning/Dokumentation)
- Titel: 6-10 ord, informativa
- Innehåll: 50-70 ord totalt per slide
- Bullets: 5-7 punkter, varje punkt 8-12 ord
- Stycken: Korta stycken tillåtna (2-3 meningar)
- Fokus: Fullständig information, självförklarande
- Speaker notes: 150-200 ord
- Bildstrategi: Stödjande illustrationer, diagram
""",
            "en": """
## DETAILED STYLE (Education/Documentation)
- Title: 6-10 words, informative
- Content: 50-70 words total per slide
- Bullets: 5-7 points, each point 8-12 words
- Paragraphs: Short paragraphs allowed (2-3 sentences)
- Focus: Complete information, self-explanatory
- Speaker notes: 150-200 words
- Image strategy: Supporting illustrations, diagrams
"""
        }
    }
    return guidelines.get(verbosity, guidelines["standard"]).get(language, guidelines["standard"]["en"])


def get_tone_guidance(tone: str, language: str) -> str:
    """Get tone and voice guidance"""
    tones = {
        "professional": {
            "sv": "Använd formellt språk, datadriven argumentation, branschterminologi. Trovärdighet och auktoritet.",
            "en": "Use formal language, data-driven arguments, industry terminology. Credibility and authority."
        },
        "casual": {
            "sv": "Konversationston, relaterbara exempel, 'vi' och 'du'. Tillgängligt och engagerande.",
            "en": "Conversational tone, relatable examples, 'we' and 'you'. Accessible and engaging."
        },
        "educational": {
            "sv": "Pedagogiskt upplägg, definiera koncept, använd analogier, bygg stegvis förståelse.",
            "en": "Pedagogical approach, define concepts, use analogies, build understanding step by step."
        },
        "inspirational": {
            "sv": "Motiverande språk, transformation och möjligheter, positiv energi, visioner för framtiden.",
            "en": "Motivational language, transformation and possibilities, positive energy, visions for the future."
        }
    }
    return tones.get(tone, tones["professional"]).get(language, tones["professional"]["en"])


def get_image_query_guidance(language: str) -> str:
    """Get guidance for creating effective image search queries"""
    if language == "sv":
        return """
## BILDVÄLJNINGSSTRATEGI

### Skapa SPECIFIKA sökfrågor:
❌ UNDVIK: "teamwork", "success", "business", "technology"
✅ ANVÄND: "diverse team brainstorming at whiteboard in modern office", "woman celebrating achievement with raised arms", "startup founder presenting to investors"

### Bildkategorier och förslag:
- MÄNNISKOR: Specificera ålder, kontext, aktivitet, känsla
- ARBETSPLATS: Typ av kontor, atmosfär, ljussättning
- KONCEPT: Använd metaforer (berg för utmaningar, horisonter för möjligheter)
- PRODUKT: Användningssammanhang, livsstilskontext

### Undvik klyschor:
- Handskakningar (använd: "business partners in conversation")
- Pusselbitar (använd: "connecting dots on glass board")
- Glödlampor (använd: "lightbulb moment during meeting")
- Generiska stockfoton med falska leenden

### Emotionell resonans:
- Fokusera på autentiska ögonblick
- Sök efter bilder med story/narrativ
- Föredra naturligt ljus och genuina uttryck
"""
    else:
        return """
## IMAGE SELECTION STRATEGY

### Create SPECIFIC search queries:
❌ AVOID: "teamwork", "success", "business", "technology"
✅ USE: "diverse team brainstorming at whiteboard in modern office", "woman celebrating achievement with raised arms", "startup founder presenting to investors"

### Image categories and suggestions:
- PEOPLE: Specify age, context, activity, emotion
- WORKPLACE: Type of office, atmosphere, lighting
- CONCEPTS: Use metaphors (mountains for challenges, horizons for possibilities)
- PRODUCT: Usage context, lifestyle context

### Avoid clichés:
- Handshakes (use: "business partners in conversation")
- Puzzle pieces (use: "connecting dots on glass board")
- Lightbulbs (use: "lightbulb moment during meeting")
- Generic stock photos with fake smiles

### Emotional resonance:
- Focus on authentic moments
- Look for images with story/narrative
- Prefer natural light and genuine expressions
"""


# ============================================================================
# Enhanced Slide Generation
# ============================================================================

async def generate_slides(request: SlideGenerationRequest) -> SlideGenerationResponse:
    """Generate presentation slides using enhanced Internal AI"""
    
    if not request.script_content or not request.script_content.strip():
        raise ValueError("Script content is required")
    
    # Build comprehensive prompt components
    design_principles = get_design_principles(request.language)
    layout_guidance = get_layout_guidance(request.language)
    verbosity_guidance = get_verbosity_guidance(request.verbosity, request.language)
    tone_guidance = get_tone_guidance(request.tone, request.language)
    image_guidance = get_image_query_guidance(request.language)
    
    # Determine narrative structure based on slide count
    narrative_structure = ""
    if request.num_slides >= 5:
        opening_slides = max(1, request.num_slides // 10)
        closing_slides = max(1, request.num_slides // 10)
        body_slides = request.num_slides - opening_slides - closing_slides
        
        if request.language == "sv":
            narrative_structure = f"""
## BERÄTTARSTRUKTUR FÖR {request.num_slides} SLIDES
- Slides 1-{opening_slides}: ÖPPNING - Hook, problemställning, varför detta spelar roll
- Slides {opening_slides + 1}-{opening_slides + body_slides}: HUVUDDEL - Lösningar, bevis, exempel, processer
- Slides {request.num_slides - closing_slides + 1}-{request.num_slides}: AVSLUTNING - Key takeaways, call-to-action, nästa steg
"""
        else:
            narrative_structure = f"""
## NARRATIVE STRUCTURE FOR {request.num_slides} SLIDES
- Slides 1-{opening_slides}: OPENING - Hook, problem statement, why this matters
- Slides {opening_slides + 1}-{opening_slides + body_slides}: BODY - Solutions, evidence, examples, processes
- Slides {request.num_slides - closing_slides + 1}-{request.num_slides}: CLOSING - Key takeaways, call-to-action, next steps
"""

    # Build the enhanced system prompt
    if request.language == "sv":
        system_prompt = f"""Du är en världsledande presentationsdesigner med expertis inom visuell kommunikation och berättande.

{design_principles}

{layout_guidance}

{verbosity_guidance}

{narrative_structure}

TON: {tone_guidance}

{image_guidance}

## INSTRUKTIONER
Skapa exakt {request.num_slides} professionella slides.

SVARA ENDAST med giltig JSON i detta exakta format:
{{
  "presentation_title": "Titel som fångar essensen",
  "narrative_structure": "opening-body-conclusion",
  "slides": [
    {{
      "slide_number": 1,
      "title": "Kort, kraftfull titel (max 8 ord)",
      "subtitle": "Stödjande kontext (valfri)",
      "content": "Huvudinnehåll",
      "bullet_points": ["Punkt 1 med aktiv verb", "Punkt 2 med parallell struktur"],
      "key_takeaway": "Vad publiken ska minnas från denna slide",
      "speaker_notes": "Detaljerade anteckningar för presentatören (100-150 ord)",
      "layout": "title-content",
      "suggested_image_query": "specifik, beskrivande sökfråga för stockfoto",
      "visual_type": "photo",
      "color_accent": "#3B82F6",
      "transition_hint": "Koppla till nästa slide"
    }}
  ]
}}

KRITISKA REGLER:
1. Variera layouts - aldrig samma layout två gånger i rad
2. Varje slide = ETT huvudbudskap
3. Bullet points börjar med aktiva verb
4. Bildförslag: SPECIFIKA, undvik klyschor
5. Key takeaway på varje slide
6. Speaker notes ska ge presentatören allt de behöver säga
"""
    else:
        system_prompt = f"""You are a world-leading presentation designer with expertise in visual communication and storytelling.

{design_principles}

{layout_guidance}

{verbosity_guidance}

{narrative_structure}

TONE: {tone_guidance}

{image_guidance}

## INSTRUCTIONS
Create exactly {request.num_slides} professional slides.

RESPOND ONLY with valid JSON in this exact format:
{{
  "presentation_title": "Title that captures the essence",
  "narrative_structure": "opening-body-conclusion",
  "slides": [
    {{
      "slide_number": 1,
      "title": "Short, powerful title (max 8 words)",
      "subtitle": "Supporting context (optional)",
      "content": "Main content",
      "bullet_points": ["Point 1 with active verb", "Point 2 with parallel structure"],
      "key_takeaway": "What the audience should remember from this slide",
      "speaker_notes": "Detailed notes for the presenter (100-150 words)",
      "layout": "title-content",
      "suggested_image_query": "specific, descriptive search query for stock photo",
      "visual_type": "photo",
      "color_accent": "#3B82F6",
      "transition_hint": "Connection to next slide"
    }}
  ]
}}

CRITICAL RULES:
1. Vary layouts - never same layout twice in a row
2. Each slide = ONE main message
3. Bullet points start with active verbs
4. Image suggestions: SPECIFIC, avoid clichés
5. Key takeaway on every slide
6. Speaker notes should give presenter everything they need to say
"""

    # Build user prompt with context
    audience_context = f"\nMÅLGRUPP: {request.audience_type}" if request.audience_type else ""
    industry_context = f"\nBRANSCH: {request.industry}" if request.industry else ""
    
    user_prompt = f"""Skapa en professionell presentation baserad på följande:

KURS: "{request.course_title}"
MODUL: "{request.module_title}"{audience_context}{industry_context}

MANUSINNEHÅLL:
{request.script_content[:6000]}

Generera {request.num_slides} slides med varierande layouts och starka visuella förslag.""" if request.language == "sv" else f"""Create a professional presentation based on the following:

COURSE: "{request.course_title}"
MODULE: "{request.module_title}"{audience_context}{industry_context}

SCRIPT CONTENT:
{request.script_content[:6000]}

Generate {request.num_slides} slides with varied layouts and strong visual suggestions."""

    # Call AI
    content = await call_ai(
        system_prompt, 
        user_prompt, 
        session_id=f"slides-enhanced-{request.module_title[:20]}"
    )
    data = extract_json_from_response(content)
    
    # Convert to response model with enhanced processing
    slides = []
    prev_layout = None
    
    for i, slide_data in enumerate(data.get("slides", [])):
        # Handle content field
        content = slide_data.get("content") or ""
        if isinstance(content, list):
            content = "\n".join(str(item) for item in content)
        elif isinstance(content, dict):
            content_parts = []
            for key, value in content.items():
                if isinstance(value, list):
                    value = "\n".join(str(item) for item in value)
                content_parts.append(f"{key}: {value}")
            content = "\n".join(content_parts)
        
        # Handle speaker_notes field
        speaker_notes = slide_data.get("speaker_notes") or ""
        if isinstance(speaker_notes, list):
            speaker_notes = "\n".join(str(item) for item in speaker_notes)
        elif isinstance(speaker_notes, dict):
            speaker_notes = "\n".join(f"{k}: {v}" for k, v in speaker_notes.items())
        
        # Handle bullet_points
        bullet_points = slide_data.get("bullet_points")
        if bullet_points and isinstance(bullet_points, list):
            bullet_points = [str(bp) for bp in bullet_points if bp]
        else:
            bullet_points = None
            
        # Ensure layout variety
        layout = slide_data.get("layout") or "title-content"
        if layout == prev_layout and i > 0:
            # Force variety
            alternative_layouts = ["title-content", "bullet-points", "two-column", "image-focus", "data-visualization", "quote"]
            alternative_layouts = [l for l in alternative_layouts if l != layout]
            if alternative_layouts:
                layout = alternative_layouts[i % len(alternative_layouts)]
        prev_layout = layout
        
        slides.append(SlideContent(
            slide_number=slide_data.get("slide_number", i + 1),
            title=slide_data.get("title") or "Untitled",
            subtitle=slide_data.get("subtitle"),
            content=str(content),
            bullet_points=bullet_points,
            key_takeaway=slide_data.get("key_takeaway"),
            speaker_notes=str(speaker_notes),
            layout=layout,
            suggested_image_query=slide_data.get("suggested_image_query") or "",
            suggested_icon=slide_data.get("suggested_icon"),
            visual_type=slide_data.get("visual_type"),
            color_accent=slide_data.get("color_accent"),
            transition_hint=slide_data.get("transition_hint"),
            image_url=slide_data.get("image_url"),
            image_source=slide_data.get("image_source"),
            image_attribution=slide_data.get("image_attribution")
        ))
    
    return SlideGenerationResponse(
        presentation_title=data.get("presentation_title", request.module_title),
        slides=slides,
        slide_count=len(slides),
        source="internal-ai-enhanced",
        narrative_structure=data.get("narrative_structure"),
        color_theme=data.get("color_theme")
    )

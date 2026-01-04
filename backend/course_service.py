"""
Course Generation Service
Handles title, outline, and script generation using AI
"""
import os
import httpx
import json
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


# ============================================================================
# Request/Response Models
# ============================================================================

class TitleGenerationRequest(BaseModel):
    title: str
    language: str = "sv"


class TitleSuggestion(BaseModel):
    id: str
    title: str
    explanation: str


class TitleGenerationResponse(BaseModel):
    suggestions: List[TitleSuggestion]


class OutlineGenerationRequest(BaseModel):
    title: str
    num_modules: int = 5
    language: str = "sv"
    additional_context: Optional[str] = None


class ModuleItem(BaseModel):
    id: str
    title: str
    description: str
    estimated_duration: int  # in minutes
    key_topics: List[str]


class OutlineGenerationResponse(BaseModel):
    modules: List[ModuleItem]
    total_duration: int


class ScriptGenerationRequest(BaseModel):
    module_title: str
    module_description: str
    course_title: str
    language: str = "sv"
    target_duration: int = 10  # minutes
    tone: str = "professional"
    additional_context: Optional[str] = None


class ScriptSection(BaseModel):
    id: str
    title: str
    content: str
    slide_markers: List[str]


class ScriptGenerationResponse(BaseModel):
    module_id: str
    module_title: str
    sections: List[ScriptSection]
    total_words: int
    estimated_duration: int
    citations: List[str]


# ============================================================================
# AI Service Functions
# ============================================================================

async def call_lovable_ai(
    system_prompt: str,
    user_prompt: str,
    model: str = "google/gemini-2.5-flash",
    max_tokens: int = 4000
) -> str:
    """Call Lovable AI Gateway"""
    LOVABLE_API_KEY = os.getenv("LOVABLE_API_KEY")
    if not LOVABLE_API_KEY:
        raise ValueError("LOVABLE_API_KEY not configured")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {LOVABLE_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": max_tokens
            }
        )
        
        if not response.is_success:
            error_text = response.text
            if response.status_code == 429:
                raise Exception("Rate limit exceeded. Please try again later.")
            elif response.status_code == 402:
                raise Exception("AI credits exhausted. Please add credits to continue.")
            raise Exception(f"AI Gateway error: {response.status_code} - {error_text}")
        
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        
        if not content:
            raise Exception("No content in AI response")
        
        return content


def extract_json_from_response(content: str) -> Dict[str, Any]:
    """Extract JSON from AI response (handles markdown code blocks)"""
    # Try to extract from markdown code block
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
    if json_match:
        json_str = json_match.group(1).strip()
    else:
        json_str = content.strip()
    
    # Parse JSON
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        # Try to find JSON object in the string
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            return json.loads(json_match.group(0))
        raise Exception(f"Failed to parse JSON from AI response: {str(e)}")


# ============================================================================
# Title Generation
# ============================================================================

async def generate_titles(request: TitleGenerationRequest) -> TitleGenerationResponse:
    """Generate course title suggestions"""
    
    if not request.title or not request.title.strip():
        raise ValueError("Course title is required")
    
    system_prompt = (
        "Du är en expert på att skapa engagerande kurstitlar för vårdutbildning. "
        "Generera exakt 5 alternativa kurstitlar baserade på användarens input. "
        "Varje titel ska vara professionell, tydlig och attraktiv för vårdpersonal. "
        "Svara ENDAST med giltig JSON i detta format:\n"
        "{\n"
        '  "suggestions": [\n'
        '    {"id": "1", "title": "Titel här", "explanation": "Kort förklaring varför denna titel fungerar bra"},\n'
        '    {"id": "2", "title": "Titel här", "explanation": "Kort förklaring"},\n'
        '    {"id": "3", "title": "Titel här", "explanation": "Kort förklaring"},\n'
        '    {"id": "4", "title": "Titel här", "explanation": "Kort förklaring"},\n'
        '    {"id": "5", "title": "Titel här", "explanation": "Kort förklaring"}\n'
        "  ]\n"
        "}"
    ) if request.language == "sv" else (
        "You are an expert at creating engaging course titles for healthcare education. "
        "Generate exactly 5 alternative course titles based on the user's input. "
        "Each title should be professional, clear, and appealing to healthcare professionals. "
        "Respond ONLY with valid JSON in this format:\n"
        "{\n"
        '  "suggestions": [\n'
        '    {"id": "1", "title": "Title here", "explanation": "Brief explanation of why this title works well"},\n'
        '    {"id": "2", "title": "Title here", "explanation": "Brief explanation"},\n'
        '    {"id": "3", "title": "Title here", "explanation": "Brief explanation"},\n'
        '    {"id": "4", "title": "Title here", "explanation": "Brief explanation"},\n'
        '    {"id": "5", "title": "Title here", "explanation": "Brief explanation"}\n'
        "  ]\n"
        "}"
    )
    
    user_prompt = f'Original course title/topic: "{request.title}"'
    
    content = await call_lovable_ai(system_prompt, user_prompt)
    data = extract_json_from_response(content)
    
    return TitleGenerationResponse(**data)


# ============================================================================
# Outline Generation
# ============================================================================

async def generate_outline(request: OutlineGenerationRequest) -> OutlineGenerationResponse:
    """Generate course outline"""
    
    if not request.title or not request.title.strip():
        raise ValueError("Course title is required")
    
    context_text = f"\n\nAdditional context: {request.additional_context}" if request.additional_context else ""
    
    system_prompt = (
        "Du är en expert på att strukturera vårdutbildningar. "
        f"Skapa en kursöversikt med exakt {request.num_modules} moduler. "
        "Varje modul ska ha:\n"
        "- Ett beskrivande titel\n"
        "- En detaljerad beskrivning\n"
        "- Uppskattat antal minuter\n"
        "- 3-5 nyckelämnen som ska täckas\n\n"
        "Svara ENDAST med giltig JSON i detta format:\n"
        "{\n"
        '  "modules": [\n'
        '    {\n'
        '      "id": "module-1",\n'
        '      "title": "Modul titel",\n'
        '      "description": "Detaljerad beskrivning av modulen",\n'
        '      "estimated_duration": 15,\n'
        '      "key_topics": ["Ämne 1", "Ämne 2", "Ämne 3"]\n'
        '    }\n'
        "  ],\n"
        '  "total_duration": 75\n'
        "}"
    ) if request.language == "sv" else (
        "You are an expert at structuring healthcare education. "
        f"Create a course outline with exactly {request.num_modules} modules. "
        "Each module should have:\n"
        "- A descriptive title\n"
        "- A detailed description\n"
        "- Estimated duration in minutes\n"
        "- 3-5 key topics to be covered\n\n"
        "Respond ONLY with valid JSON in this format:\n"
        "{\n"
        '  "modules": [\n'
        '    {\n'
        '      "id": "module-1",\n'
        '      "title": "Module title",\n'
        '      "description": "Detailed description of the module",\n'
        '      "estimated_duration": 15,\n'
        '      "key_topics": ["Topic 1", "Topic 2", "Topic 3"]\n'
        '    }\n'
        "  ],\n"
        '  "total_duration": 75\n'
        "}"
    )
    
    user_prompt = f'Course title: "{request.title}"{context_text}'
    
    content = await call_lovable_ai(system_prompt, user_prompt, max_tokens=6000)
    data = extract_json_from_response(content)
    
    return OutlineGenerationResponse(**data)


# ============================================================================
# Script Generation
# ============================================================================

async def generate_script(request: ScriptGenerationRequest) -> ScriptGenerationResponse:
    """Generate module script"""
    
    if not request.module_title or not request.module_title.strip():
        raise ValueError("Module title is required")
    
    context_text = f"\n\nAdditional context: {request.additional_context}" if request.additional_context else ""
    
    system_prompt = (
        "Du är en expert på att skriva pedagogiska manus för vårdutbildningar. "
        f"Skapa ett detaljerat manus för en modul som ska ta cirka {request.target_duration} minuter. "
        "Manuset ska vara:\n"
        "- Professionellt och engagerande\n"
        f"- I {request.tone} ton\n"
        "- Strukturerat i logiska sektioner (3-5 sektioner)\n"
        "- Med tydliga övergångar mellan sektioner\n"
        "- Inkludera slide markers (naturliga brytpunkter för slides)\n\n"
        "Svara ENDAST med giltig JSON i detta format:\n"
        "{\n"
        '  "module_id": "module-1",\n'
        '  "module_title": "Modulens titel",\n'
        '  "sections": [\n'
        '    {\n'
        '      "id": "section-1",\n'
        '      "title": "Sektion titel",\n'
        '      "content": "Fullständigt manus för denna sektion...",\n'
        '      "slide_markers": ["Key Point 1", "Key Point 2"]\n'
        '    }\n'
        "  ],\n"
        '  "total_words": 1500,\n'
        '  "estimated_duration": 10,\n'
        '  "citations": ["Källa 1", "Källa 2"]\n'
        "}"
    ) if request.language == "sv" else (
        "You are an expert at writing educational scripts for healthcare education. "
        f"Create a detailed script for a module that should take approximately {request.target_duration} minutes. "
        "The script should be:\n"
        "- Professional and engaging\n"
        f"- In {request.tone} tone\n"
        "- Structured in logical sections (3-5 sections)\n"
        "- With clear transitions between sections\n"
        "- Include slide markers (natural breakpoints for slides)\n\n"
        "Respond ONLY with valid JSON in this format:\n"
        "{\n"
        '  "module_id": "module-1",\n'
        '  "module_title": "Module title",\n'
        '  "sections": [\n'
        '    {\n'
        '      "id": "section-1",\n'
        '      "title": "Section title",\n'
        '      "content": "Complete script for this section...",\n'
        '      "slide_markers": ["Key Point 1", "Key Point 2"]\n'
        '    }\n'
        "  ],\n"
        '  "total_words": 1500,\n'
        '  "estimated_duration": 10,\n'
        '  "citations": ["Source 1", "Source 2"]\n'
        "}"
    )
    
    user_prompt = (
        f'Module title: "{request.module_title}"\n'
        f'Module description: {request.module_description}\n'
        f'Course: "{request.course_title}"{context_text}'
    )
    
    content = await call_lovable_ai(system_prompt, user_prompt, max_tokens=8000)
    data = extract_json_from_response(content)
    
    return ScriptGenerationResponse(**data)

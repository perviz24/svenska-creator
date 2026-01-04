"""
AI Utilities Service - AI-powered content analysis and recommendations
Uses Gemini via Emergent LLM Key
"""
import os
import json
import re
from typing import Optional, List
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ============================================================================
# Models
# ============================================================================

class AIReviewRequest(BaseModel):
    content: str
    action: str  # 'improve', 'simplify', 'expand', 'fix_grammar', 'add_examples'
    context: Optional[str] = None
    language: str = "sv"

class AIReviewResponse(BaseModel):
    improved_content: str
    changes_made: List[str]
    suggestions: List[str]

class TranslateRequest(BaseModel):
    content: str
    target_language: str
    source_language: str = "auto"

class TranslateResponse(BaseModel):
    translated_content: str
    detected_language: Optional[str] = None

class AnalyzeStructureRequest(BaseModel):
    title: str
    description: Optional[str] = None
    target_audience: Optional[str] = None

class RecommendModelRequest(BaseModel):
    course_type: str
    content_complexity: str
    target_quality: str

# ============================================================================
# AI Review and Edit
# ============================================================================

async def ai_review_edit(request: AIReviewRequest) -> AIReviewResponse:
    """AI-powered content review and editing"""
    if not EMERGENT_KEY:
        raise ValueError("Emergent LLM key not configured")
    
    action_prompts = {
        "improve": "Improve this content for clarity, engagement, and professionalism",
        "simplify": "Simplify this content to be more accessible and easier to understand",
        "expand": "Expand this content with more details, examples, and explanations",
        "fix_grammar": "Fix grammar, spelling, and punctuation errors",
        "add_examples": "Add relevant practical examples to illustrate the concepts"
    }
    
    action_instruction = action_prompts.get(request.action, action_prompts["improve"])
    
    system_prompt = f"""You are an expert content editor for educational materials.
Language: {request.language}
Task: {action_instruction}

Respond in JSON format:
{{
    "improved_content": "the edited content",
    "changes_made": ["list of specific changes"],
    "suggestions": ["additional improvement suggestions"]
}}"""

    messages = [
        LlmMessage(role="system", content=system_prompt),
        LlmMessage(role="user", content=f"Content to edit:\n{request.content}\n\n{f'Context: {request.context}' if request.context else ''}")
    ]
    
    response = await chat(
        api_key=EMERGENT_KEY,
        messages=messages,
        model="gemini-2.5-flash"
    )
    
    # Parse JSON response
    try:
        json_match = re.search(r'\{[\s\S]*\}', response.content)
        if json_match:
            data = json.loads(json_match.group())
            return AIReviewResponse(**data)
    except:
        pass
    
    # Fallback if JSON parsing fails
    return AIReviewResponse(
        improved_content=response.content,
        changes_made=["Content improved"],
        suggestions=[]
    )

# ============================================================================
# Translation
# ============================================================================

async def translate_content(request: TranslateRequest) -> TranslateResponse:
    """Translate content to target language"""
    if not EMERGENT_KEY:
        raise ValueError("Emergent LLM key not configured")
    
    system_prompt = f"""You are a professional translator. Translate the following content to {request.target_language}.
Maintain the original formatting, tone, and meaning.
Only output the translated text, nothing else."""

    messages = [
        LlmMessage(role="system", content=system_prompt),
        LlmMessage(role="user", content=request.content)
    ]
    
    response = await chat(
        api_key=EMERGENT_KEY,
        messages=messages,
        model="gemini-2.5-flash"
    )
    
    return TranslateResponse(
        translated_content=response.content,
        detected_language=request.source_language if request.source_language != "auto" else None
    )

# ============================================================================
# Course Structure Analysis
# ============================================================================

async def analyze_course_structure(request: AnalyzeStructureRequest) -> dict:
    """Analyze and recommend course structure"""
    if not EMERGENT_KEY:
        raise ValueError("Emergent LLM key not configured")
    
    system_prompt = """You are an instructional design expert. Analyze the course topic and recommend an optimal structure.

Respond in JSON format:
{
    "recommended_modules": 5,
    "recommended_duration": 60,
    "complexity": "intermediate",
    "target_audience": "professionals",
    "key_topics": ["topic1", "topic2"],
    "learning_objectives": ["objective1", "objective2"],
    "suggestions": ["suggestion1"]
}"""

    messages = [
        LlmMessage(role="system", content=system_prompt),
        LlmMessage(role="user", content=f"Course title: {request.title}\nDescription: {request.description or 'N/A'}\nTarget audience: {request.target_audience or 'General'}")
    ]
    
    response = await chat(
        api_key=EMERGENT_KEY,
        messages=messages,
        model="gemini-2.5-flash"
    )
    
    try:
        json_match = re.search(r'\{[\s\S]*\}', response.content)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    
    return {
        "recommended_modules": 5,
        "recommended_duration": 60,
        "complexity": "intermediate",
        "suggestions": ["Could not analyze structure"]
    }

# ============================================================================
# Model Recommendation
# ============================================================================

async def recommend_model(request: RecommendModelRequest) -> dict:
    """Recommend AI model based on requirements"""
    # Simple rule-based recommendation (no API call needed)
    recommendations = {
        "high": {
            "model": "presenton",
            "reason": "Best quality for professional presentations"
        },
        "medium": {
            "model": "internal",
            "reason": "Good balance of quality and speed"
        },
        "low": {
            "model": "internal",
            "reason": "Fast generation for drafts"
        }
    }
    
    rec = recommendations.get(request.target_quality, recommendations["medium"])
    return {
        "recommended_model": rec["model"],
        "reason": rec["reason"],
        "alternatives": ["presenton", "internal"]
    }

# ============================================================================
# Manuscript Analysis
# ============================================================================

async def analyze_manuscript(content: str, language: str = "sv") -> dict:
    """Analyze uploaded manuscript content"""
    if not EMERGENT_KEY:
        raise ValueError("Emergent LLM key not configured")
    
    system_prompt = f"""Analyze this manuscript/document and extract key information for course creation.
Language: {language}

Respond in JSON:
{{
    "title": "suggested course title",
    "summary": "brief summary",
    "key_topics": ["topic1", "topic2"],
    "suggested_modules": ["module1", "module2"],
    "estimated_duration": 60,
    "complexity": "beginner/intermediate/advanced",
    "target_audience": "description"
}}"""

    messages = [
        LlmMessage(role="system", content=system_prompt),
        LlmMessage(role="user", content=content[:10000])  # Limit content length
    ]
    
    response = await chat(
        api_key=EMERGENT_KEY,
        messages=messages,
        model="gemini-2.5-flash"
    )
    
    try:
        json_match = re.search(r'\{[\s\S]*\}', response.content)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    
    return {
        "title": "Untitled Course",
        "summary": "Could not analyze manuscript",
        "key_topics": [],
        "suggested_modules": []
    }

# ============================================================================
# Research Mode Recommendation
# ============================================================================

async def recommend_research_mode(topic: str, context: str = "") -> dict:
    """Recommend research approach for a topic"""
    return {
        "recommended_mode": "ai_research",
        "depth": "standard",
        "sources": ["web", "ai"],
        "reason": "AI research provides comprehensive coverage for educational content"
    }

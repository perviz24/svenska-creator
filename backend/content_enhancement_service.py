"""
Content Enhancement Service
Handles exercises, quizzes, and AI-powered content improvements
"""
import os
from dotenv import load_dotenv
import json
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()


# ============================================================================
# Exercise Generation
# ============================================================================

class ExerciseGenerationRequest(BaseModel):
    module_title: str
    module_content: str
    course_title: str
    num_exercises: int = 3
    difficulty: str = "medium"
    language: str = "sv"


class Exercise(BaseModel):
    id: str
    type: str  # "multiple_choice", "short_answer", "case_study", "practical"
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    points: int = 10


class ExerciseGenerationResponse(BaseModel):
    exercises: List[Exercise]
    total_points: int


async def generate_exercises(request: ExerciseGenerationRequest) -> ExerciseGenerationResponse:
    """Generate exercises for a module"""
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    
    system_prompt = (
        "Du är en expert på att skapa pedagogiska övningar för vårdutbildningar. "
        f"Skapa exakt {request.num_exercises} övningar baserade på modulinnehållet. "
        f"Svårighetsgrad: {request.difficulty}. "
        "Svara ENDAST med giltig JSON i detta format:\n"
        "{\n"
        '  "exercises": [\n'
        '    {\n'
        '      "id": "ex-1",\n'
        '      "type": "multiple_choice",\n'
        '      "question": "Fråga här",\n'
        '      "options": ["Alt 1", "Alt 2", "Alt 3", "Alt 4"],\n'
        '      "correct_answer": "Alt 1",\n'
        '      "explanation": "Förklaring till rätt svar",\n'
        '      "points": 10\n'
        '    }\n'
        "  ],\n"
        '  "total_points": 30\n'
        "}"
    ) if request.language == "sv" else (
        "You are an expert at creating educational exercises for healthcare education. "
        f"Create exactly {request.num_exercises} exercises based on the module content. "
        f"Difficulty level: {request.difficulty}. "
        "Respond ONLY with valid JSON in this format..."
    )
    
    user_prompt = (
        f'Module: "{request.module_title}"\n'
        f'Course: "{request.course_title}"\n\n'
        f'Content:\n{request.module_content[:3000]}'
    )
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"exercise-gen-{request.module_title[:20]}",
        system_message=system_prompt
    ).with_model("gemini", "gemini-2.5-flash")
    
    response = await chat.send_message(UserMessage(text=user_prompt))
    
    # Parse JSON
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    if json_match:
        json_str = json_match.group(1).strip()
    else:
        json_str = response.strip()
    
    data = json.loads(json_str)
    return ExerciseGenerationResponse(**data)


# ============================================================================
# Quiz Generation
# ============================================================================

class QuizGenerationRequest(BaseModel):
    module_title: str
    module_content: str
    course_title: str
    num_questions: int = 5
    include_multiple_choice: bool = True
    include_true_false: bool = True
    language: str = "sv"


class QuizQuestion(BaseModel):
    id: str
    type: str  # "multiple_choice", "true_false"
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    points: int = 10
    difficulty: str = "medium"


class QuizGenerationResponse(BaseModel):
    quiz_title: str
    questions: List[QuizQuestion]
    total_points: int
    passing_score: int


async def generate_quiz(request: QuizGenerationRequest) -> QuizGenerationResponse:
    """Generate quiz for a module"""
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    
    system_prompt = (
        "Du är en expert på att skapa pedagogiska kunskapstester för vårdutbildningar. "
        f"Skapa exakt {request.num_questions} quizfrågor baserade på modulinnehållet. "
        "Variera svårighetsgrad och frågetyper. "
        "Svara ENDAST med giltig JSON i detta format:\n"
        "{\n"
        '  "quiz_title": "Quiz titel",\n'
        '  "questions": [\n'
        '    {\n'
        '      "id": "q-1",\n'
        '      "type": "multiple_choice",\n'
        '      "question": "Fråga här",\n'
        '      "options": ["Alt 1", "Alt 2", "Alt 3", "Alt 4"],\n'
        '      "correct_answer": "Alt 1",\n'
        '      "explanation": "Förklaring",\n'
        '      "points": 10,\n'
        '      "difficulty": "medium"\n'
        '    }\n'
        "  ],\n"
        '  "total_points": 50,\n'
        '  "passing_score": 35\n'
        "}"
    ) if request.language == "sv" else (
        "You are an expert at creating educational quizzes for healthcare education..."
    )
    
    user_prompt = (
        f'Module: "{request.module_title}"\n'
        f'Course: "{request.course_title}"\n\n'
        f'Content:\n{request.module_content[:3000]}'
    )
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"quiz-gen-{request.module_title[:20]}",
        system_message=system_prompt
    ).with_model("gemini", "gemini-2.5-flash")
    
    response = await chat.send_message(UserMessage(text=user_prompt))
    
    # Parse JSON
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    if json_match:
        json_str = json_match.group(1).strip()
    else:
        json_str = response.strip()
    
    data = json.loads(json_str)
    return QuizGenerationResponse(**data)


# ============================================================================
# Slide Enhancement
# ============================================================================

class SlideEnhancementRequest(BaseModel):
    slide_title: str
    slide_content: str
    enhancement_type: str  # "improve_clarity", "add_examples", "simplify", "add_data"
    language: str = "sv"


class SlideEnhancementResponse(BaseModel):
    enhanced_content: str
    suggestions: List[str]
    improved_title: Optional[str] = None


async def enhance_slide(request: SlideEnhancementRequest) -> SlideEnhancementResponse:
    """Enhance a single slide"""
    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")
    if not EMERGENT_LLM_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    
    enhancement_instructions = {
        "improve_clarity": "Gör innehållet tydligare och mer lättförståeligt",
        "add_examples": "Lägg till konkreta exempel och illustrationer",
        "simplify": "Förenkla språket och gör det mer tillgängligt",
        "add_data": "Lägg till relevanta statistik och data"
    }
    
    instruction = enhancement_instructions.get(request.enhancement_type, "Förbättra innehållet")
    
    system_prompt = (
        f"Du är en expert på att förbättra presentationsinnehåll. {instruction}. "
        "Svara ENDAST med giltig JSON:\n"
        "{\n"
        '  "enhanced_content": "Förbättrat innehåll här",\n'
        '  "suggestions": ["Förslag 1", "Förslag 2"],\n'
        '  "improved_title": "Förbättrad titel (optional)"\n'
        "}"
    )
    
    user_prompt = f'Titel: "{request.slide_title}"\nInnehåll: {request.slide_content}'
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"enhance-{request.enhancement_type}",
        system_message=system_prompt
    ).with_model("gemini", "gemini-2.5-flash")
    
    response = await chat.send_message(UserMessage(text=user_prompt))
    
    # Parse JSON
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
    if json_match:
        json_str = json_match.group(1).strip()
    else:
        json_str = response.strip()
    
    data = json.loads(json_str)
    return SlideEnhancementResponse(**data)

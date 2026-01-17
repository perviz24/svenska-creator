from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from presenton_service import (
    PresentonRequest, 
    generate_presenton_presentation, 
    check_presenton_status
)
from course_service import (
    TitleGenerationRequest,
    TitleGenerationResponse,
    OutlineGenerationRequest,
    OutlineGenerationResponse,
    ScriptGenerationRequest,
    ScriptGenerationResponse,
    generate_titles,
    generate_outline,
    generate_script
)
from slides_service import (
    SlideGenerationRequest,
    SlideGenerationResponse,
    generate_slides
)
from content_enhancement_service import (
    ExerciseGenerationRequest,
    ExerciseGenerationResponse,
    QuizGenerationRequest,
    QuizGenerationResponse,
    SlideEnhancementRequest,
    SlideEnhancementResponse,
    generate_exercises,
    generate_quiz,
    enhance_slide
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# Presenton API Endpoints
@api_router.post("/presenton/generate")
async def presenton_generate(request: PresentonRequest):
    """Generate presentation using Presenton API with enhanced instructions"""
    try:
        result = await generate_presenton_presentation(request)
        return result
    except Exception as e:
        logger.error(f"Presenton generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/presenton/status/{task_id}")
async def presenton_status(task_id: str):
    """Check status of Presenton generation task"""
    try:
        result = await check_presenton_status(task_id)
        return result
    except Exception as e:
        logger.error(f"Presenton status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Course Generation Endpoints
@api_router.post("/course/generate-titles", response_model=TitleGenerationResponse)
async def api_generate_titles(request: TitleGenerationRequest):
    """Generate course title suggestions"""
    try:
        result = await generate_titles(request)
        return result
    except Exception as e:
        logger.error(f"Title generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/course/generate-outline", response_model=OutlineGenerationResponse)
async def api_generate_outline(request: OutlineGenerationRequest):
    """Generate course outline"""
    try:
        result = await generate_outline(request)
        return result
    except Exception as e:
        logger.error(f"Outline generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/course/generate-script", response_model=ScriptGenerationResponse)
async def api_generate_script(request: ScriptGenerationRequest):
    """Generate module script"""
    try:
        result = await generate_script(request)
        return result
    except Exception as e:
        logger.error(f"Script generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/slides/generate", response_model=SlideGenerationResponse)
async def api_generate_slides(request: SlideGenerationRequest):
    """Generate presentation slides using Internal AI"""
    try:
        result = await generate_slides(request)
        return result
    except Exception as e:
        logger.error(f"Slide generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/exercises/generate", response_model=ExerciseGenerationResponse)
async def api_generate_exercises(request: ExerciseGenerationRequest):
    """Generate exercises for a module"""
    try:
        result = await generate_exercises(request)
        return result
    except Exception as e:
        logger.error(f"Exercise generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/quiz/generate", response_model=QuizGenerationResponse)
async def api_generate_quiz(request: QuizGenerationRequest):
    """Generate quiz for a module"""
    try:
        result = await generate_quiz(request)
        return result
    except Exception as e:
        logger.error(f"Quiz generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/slides/enhance", response_model=SlideEnhancementResponse)
async def api_enhance_slide(request: SlideEnhancementRequest):
    """Enhance a single slide"""
    try:
        result = await enhance_slide(request)
        return result
    except Exception as e:
        logger.error(f"Slide enhancement error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Media Service Routes - Stock Photos and Videos
# ============================================================================

from media_service import (
    search_unsplash_photos, search_pexels_photos, search_pexels_videos,
    search_pixabay_videos, PhotoSearchResponse, VideoSearchResponse
)

@api_router.post("/media/photos/search")
async def search_photos(query: str, provider: str = "unsplash", per_page: int = 20):
    """Search for stock photos"""
    try:
        if provider == "unsplash":
            photos = await search_unsplash_photos(query, per_page)
        elif provider == "pexels":
            photos = await search_pexels_photos(query, per_page)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        return {"photos": [p.model_dump() for p in photos], "total": len(photos)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Photo search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/media/videos/search")
async def search_videos(query: str, provider: str = "pexels", per_page: int = 20):
    """Search for stock videos"""
    try:
        if provider == "pexels":
            videos = await search_pexels_videos(query, per_page)
        elif provider == "pixabay":
            videos = await search_pixabay_videos(query, per_page)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        return {"videos": [v.model_dump() for v in videos], "total": len(videos), "provider": provider}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Video search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Video Service Routes - HeyGen and Bunny.net
# ============================================================================

from video_service import (
    list_heygen_avatars, generate_heygen_video, check_heygen_video_status,
    list_bunny_videos, upload_to_bunny, VideoGenerationRequest
)

@api_router.get("/video/heygen/avatars")
async def get_heygen_avatars(api_key: Optional[str] = None):
    """List available HeyGen avatars"""
    try:
        avatars = await list_heygen_avatars(api_key)
        return {"avatars": [a.model_dump() for a in avatars]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"HeyGen avatars error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/video/heygen/generate")
async def create_heygen_video(request: VideoGenerationRequest):
    """Generate a video using HeyGen AI avatar"""
    try:
        result = await generate_heygen_video(request)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"HeyGen video generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/video/heygen/status/{video_id}")
async def get_heygen_video_status(video_id: str, api_key: Optional[str] = None):
    """Check the status of a HeyGen video generation"""
    try:
        result = await check_heygen_video_status(video_id, api_key)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"HeyGen status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/video/bunny/list")
async def get_bunny_videos(api_key: Optional[str] = None, library_id: Optional[str] = None):
    """List videos from Bunny.net library"""
    try:
        videos = await list_bunny_videos(api_key, library_id)
        return {"videos": [v.model_dump() for v in videos]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Bunny.net list error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Voice Service Routes - ElevenLabs TTS
# ============================================================================

from voice_service import (
    list_elevenlabs_voices, generate_voice, estimate_audio_duration,
    VoiceGenerationRequest
)
from fastapi.responses import Response, HTMLResponse

@api_router.get("/voice/elevenlabs/voices")
async def get_elevenlabs_voices(api_key: Optional[str] = None):
    """List available ElevenLabs voices"""
    try:
        voices = await list_elevenlabs_voices(api_key)
        return {"voices": [v.model_dump() for v in voices]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"ElevenLabs voices error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/voice/elevenlabs/generate")
async def create_voice(request: VoiceGenerationRequest):
    """Generate speech from text using ElevenLabs"""
    try:
        audio_data = await generate_voice(request)
        return Response(content=audio_data, media_type="audio/mpeg")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"ElevenLabs voice generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/voice/estimate-duration")
async def estimate_duration(text: str):
    """Estimate audio duration based on text"""
    result = await estimate_audio_duration(text)
    return result


# ============================================================================
# Research Service Routes - Web Scraping and Research
# ============================================================================

from research_service import scrape_urls, research_topic

class ScrapeRequest(BaseModel):
    urls: List[str]

class ResearchRequest(BaseModel):
    topic: str
    context: Optional[str] = None
    language: str = "sv"
    depth: str = "standard"

@api_router.post("/research/scrape")
async def scrape_websites(request: ScrapeRequest):
    """Scrape content from URLs"""
    try:
        result = await scrape_urls(request.urls)
        return result.model_dump()
    except Exception as e:
        logger.error(f"Scraping error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/research/topic")
async def research(request: ResearchRequest):
    """Research a topic using AI"""
    try:
        result = await research_topic(
            topic=request.topic,
            context=request.context,
            language=request.language,
            depth=request.depth
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Research error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AI Utilities Routes - Review, Translate, Analyze
# ============================================================================

from ai_utils_service import (
    ai_review_edit, translate_content, analyze_course_structure,
    recommend_model, analyze_manuscript, recommend_research_mode,
    AIReviewRequest, TranslateRequest, AnalyzeStructureRequest, RecommendModelRequest
)

@api_router.post("/ai/review")
async def review_content(request: AIReviewRequest):
    """AI-powered content review and editing"""
    try:
        result = await ai_review_edit(request)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"AI review error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/translate")
async def translate(request: TranslateRequest):
    """Translate content to target language"""
    try:
        result = await translate_content(request)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/analyze-structure")
async def analyze_structure(request: AnalyzeStructureRequest):
    """Analyze and recommend course structure"""
    try:
        result = await analyze_course_structure(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Structure analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/recommend-model")
async def get_model_recommendation(request: RecommendModelRequest):
    """Recommend AI model based on requirements"""
    try:
        result = await recommend_model(request)
        return result
    except Exception as e:
        logger.error(f"Model recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/analyze-manuscript")
async def analyze_uploaded_manuscript(content: str, language: str = "sv"):
    """Analyze uploaded manuscript content"""
    try:
        result = await analyze_manuscript(content, language)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Manuscript analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/recommend-research-mode")
async def get_research_recommendation(topic: str, context: str = ""):
    """Recommend research approach for a topic"""
    try:
        result = await recommend_research_mode(topic, context)
        return result
    except Exception as e:
        logger.error(f"Research recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Document Service Routes - Parse Documents
# ============================================================================

from document_service import parse_document, parse_text_content, ParseDocumentRequest

@api_router.post("/document/parse")
async def parse_uploaded_document(request: ParseDocumentRequest):
    """Parse uploaded document"""
    try:
        result = await parse_document(request)
        return result.model_dump()
    except Exception as e:
        logger.error(f"Document parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/document/parse-text")
async def parse_text(content: str):
    """Parse plain text content"""
    try:
        result = await parse_text_content(content)
        return result.model_dump()
    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Export Service Routes - PPTX, Word, HTML
# ============================================================================

from export_service import (
    export_slides_pptx, export_word, export_slides_html,
    ExportSlidesRequest, ExportWordRequest
)
from fastapi.responses import StreamingResponse

@api_router.post("/export/slides")
async def export_presentation(request: ExportSlidesRequest):
    """Export slides to PPTX or HTML"""
    try:
        if request.format == "pptx":
            content = await export_slides_pptx(request)
            return StreamingResponse(
                io.BytesIO(content),
                media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
                headers={"Content-Disposition": f'attachment; filename="{request.title}.pptx"'}
            )
        elif request.format == "html":
            html = await export_slides_html(request)
            return StreamingResponse(
                io.BytesIO(html.encode()),
                media_type="text/html",
                headers={"Content-Disposition": f'attachment; filename="{request.title}.html"'}
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/export/word")
async def export_word_document(request: ExportWordRequest):
    """Export to Word document"""
    try:
        content = await export_word(request)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{request.title}.docx"'}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Word export error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Canva Integration
# ============================================================================

from canva_service import canva_service, SlideData

# In-memory storage for OAuth state (in production, use database or session store)
oauth_states: Dict[str, Dict[str, Any]] = {}

@api_router.get("/canva/authorize")
async def canva_authorize():
    """
    Initiate Canva OAuth flow
    Returns authorization URL with state and code_verifier for frontend
    """
    try:
        auth_url, state, code_verifier = canva_service.get_authorization_url()

        # Store state and verifier (in production, use secure session storage)
        oauth_states[state] = {
            "code_verifier": code_verifier,
            "created_at": datetime.utcnow()
        }

        return {
            "auth_url": auth_url,
            "state": state,
            "code_verifier": code_verifier
        }
    except Exception as e:
        logger.error(f"Canva authorization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/canva/callback", response_class=HTMLResponse)
async def canva_callback(
    state: str,
    code: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None
):
    """
    Handle OAuth callback from Canva
    Exchange authorization code for access tokens or handle errors
    Returns HTML that stores tokens in sessionStorage and closes popup
    """
    try:
        # Check for error response from Canva
        if error:
            error_msg = f"Canva OAuth error: {error}"
            if error_description:
                error_msg += f" - {error_description}"
            logger.error(error_msg)

            # Return HTML with error handling
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Canva Authorization Error</title>
                <style>
                    body {{ font-family: system-ui; padding: 40px; text-align: center; }}
                    .error {{ color: #dc2626; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <h2>Authorization Failed</h2>
                <p class="error">{error}: {error_description or 'Unknown error'}</p>
                <p>This window will close automatically...</p>
                <script>
                    setTimeout(() => window.close(), 3000);
                </script>
            </body>
            </html>
            """)

        # Check if code is present
        if not code:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Canva Authorization Error</title>
                <style>
                    body { font-family: system-ui; padding: 40px; text-align: center; }
                    .error { color: #dc2626; margin: 20px 0; }
                </style>
            </head>
            <body>
                <h2>Authorization Failed</h2>
                <p class="error">No authorization code received from Canva</p>
                <p>This window will close automatically...</p>
                <script>
                    setTimeout(() => window.close(), 3000);
                </script>
            </body>
            </html>
            """)

        # Verify state
        if state not in oauth_states:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Canva Authorization Error</title>
                <style>
                    body { font-family: system-ui; padding: 40px; text-align: center; }
                    .error { color: #dc2626; margin: 20px 0; }
                </style>
            </head>
            <body>
                <h2>Authorization Failed</h2>
                <p class="error">Invalid or expired state parameter</p>
                <p>This window will close automatically...</p>
                <script>
                    setTimeout(() => window.close(), 3000);
                </script>
            </body>
            </html>
            """)

        oauth_data = oauth_states.pop(state)
        code_verifier = oauth_data["code_verifier"]

        # Exchange code for tokens
        tokens = await canva_service.exchange_code_for_tokens(code, code_verifier)

        # Return HTML that stores tokens and closes window
        # Use Pydantic's .json() method which handles datetime serialization
        tokens_json = tokens.json()

        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Canva Authorization Success</title>
            <style>
                body {{ font-family: system-ui; padding: 40px; text-align: center; }}
                .success {{ color: #16a34a; margin: 20px 0; }}
                .loader {{
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #16a34a;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }}
                @keyframes spin {{
                    0% {{ transform: rotate(0deg); }}
                    100% {{ transform: rotate(360deg); }}
                }}
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <h2 class="success">✓ Connected to Canva!</h2>
            <p>This window will close automatically...</p>
            <script>
                // Store tokens in sessionStorage so parent window can access them
                const tokensData = {tokens_json};
                sessionStorage.setItem('canva_tokens', JSON.stringify(tokensData));

                // Close window after a brief delay
                setTimeout(() => {{
                    window.close();
                }}, 1000);
            </script>
        </body>
        </html>
        """)

    except Exception as e:
        logger.error(f"Canva callback error: {str(e)}")
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Canva Authorization Error</title>
            <style>
                body {{ font-family: system-ui; padding: 40px; text-align: center; }}
                .error {{ color: #dc2626; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h2>Authorization Failed</h2>
            <p class="error">{str(e)}</p>
            <p>This window will close automatically...</p>
            <script>
                setTimeout(() => window.close(), 3000);
            </script>
        </body>
        </html>
        """)


@api_router.post("/canva/refresh")
async def canva_refresh_token(refresh_token: str):
    """Refresh expired Canva access token"""
    try:
        tokens = await canva_service.refresh_access_token(refresh_token)
        return {"tokens": tokens.dict()}
    except Exception as e:
        logger.error(f"Canva token refresh error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/canva/disconnect")
async def canva_disconnect():
    """Disconnect from Canva (clear tokens)"""
    # TODO: Remove tokens from database
    return {"success": True}


@api_router.get("/canva/status")
async def canva_status():
    """Check if user is connected to Canva"""
    # TODO: Check if valid tokens exist in database
    return {"connected": False}  # Placeholder


@api_router.get("/canva/brand-templates")
async def get_canva_brand_templates(
    access_token: str = Header(..., alias="Authorization"),
    limit: int = 20
):
    """Fetch user's Canva brand templates"""
    try:
        # Remove 'Bearer ' prefix if present
        token = access_token.replace("Bearer ", "")

        templates = await canva_service.get_brand_templates(token, limit)
        return {"templates": [t.dict() for t in templates]}
    except Exception as e:
        logger.error(f"Fetch Canva templates error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/canva/designs")
async def create_canva_design(
    request: Dict[str, Any],
    access_token: str = Header(..., alias="Authorization")
):
    """Create a new Canva design"""
    try:
        token = access_token.replace("Bearer ", "")

        design = await canva_service.create_design(
            access_token=token,
            title=request["title"],
            design_type=request.get("design_type", "Presentation"),
            template_id=request.get("template_id")
        )

        return {"design": design.dict()}
    except Exception as e:
        logger.error(f"Create Canva design error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/canva/autofill")
async def autofill_canva_template(
    request: Dict[str, Any],
    access_token: str = Header(..., alias="Authorization")
):
    """Autofill a Canva template with slide data"""
    try:
        token = access_token.replace("Bearer ", "")

        # Convert slides data to SlideData models
        slides = [SlideData(**slide) for slide in request["slides"]]

        design = await canva_service.autofill_template(
            access_token=token,
            template_id=request["template_id"],
            title=request["title"],
            slides=slides
        )

        return {"design": design.dict()}
    except Exception as e:
        logger.error(f"Autofill Canva template error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/canva/export")
async def export_canva_design(
    request: Dict[str, Any],
    access_token: str = Header(..., alias="Authorization")
):
    """Export a Canva design"""
    try:
        token = access_token.replace("Bearer ", "")

        job_id = await canva_service.export_design(
            access_token=token,
            design_id=request["design_id"],
            format_type=request.get("format", "pptx")
        )

        return {"job_id": job_id}
    except Exception as e:
        logger.error(f"Export Canva design error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/canva/export/{job_id}")
async def get_canva_export_status(
    job_id: str,
    access_token: str = Header(..., alias="Authorization")
):
    """Check Canva export job status"""
    try:
        token = access_token.replace("Bearer ", "")

        job = await canva_service.get_export_status(token, job_id)
        return {"job": job}
    except Exception as e:
        logger.error(f"Get Canva export status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# System Diagnostics
# ============================================================================

@api_router.get("/system/diagnostics")
async def system_diagnostics():
    """Get system diagnostics"""
    import platform
    return {
        "status": "healthy",
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "services": {
            "database": "connected",
            "ai": "configured" if os.environ.get('EMERGENT_LLM_KEY') else "not configured",
            "presenton": "configured" if os.environ.get('PRESENTON_API_KEY') else "not configured",
            "heygen": "configured" if os.environ.get('HEYGEN_API_KEY') else "not configured",
            "elevenlabs": "configured" if os.environ.get('ELEVENLABS_API_KEY') else "not configured",
            "pexels": "configured" if os.environ.get('PEXELS_API_KEY') else "not configured",
        }
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

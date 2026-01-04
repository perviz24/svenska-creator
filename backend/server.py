from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
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

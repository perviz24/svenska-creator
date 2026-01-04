"""
Video Service - HeyGen AI Avatar Videos and Bunny.net Video Hosting
"""
import os
import httpx
from typing import Optional, List
from pydantic import BaseModel

# ============================================================================
# Models
# ============================================================================

class Avatar(BaseModel):
    id: str
    name: str
    thumbnail_url: str
    gender: str

class VideoGenerationRequest(BaseModel):
    script: str
    avatar_id: str
    voice_id: Optional[str] = None
    title: Optional[str] = "Course Video"
    api_key: Optional[str] = None

class VideoGenerationResponse(BaseModel):
    video_id: str
    status: str
    message: str

class VideoStatusResponse(BaseModel):
    video_id: str
    status: str
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    error: Optional[str] = None

class BunnyVideo(BaseModel):
    id: str
    title: str
    thumbnail_url: str
    video_url: str
    duration: float
    status: str

# ============================================================================
# HeyGen - AI Avatar Videos
# ============================================================================

async def list_heygen_avatars(api_key: Optional[str] = None) -> List[Avatar]:
    """List available HeyGen avatars"""
    heygen_key = api_key or os.environ.get('HEYGEN_API_KEY', '')
    if not heygen_key:
        raise ValueError("HeyGen API key not configured. Please add your API key.")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.heygen.com/v2/avatars",
            headers={
                "X-Api-Key": heygen_key,
                "Content-Type": "application/json"
            }
        )
        response.raise_for_status()
        data = response.json()
    
    avatars = []
    for avatar in data.get("data", {}).get("avatars", []):
        avatars.append(Avatar(
            id=avatar.get("avatar_id", ""),
            name=avatar.get("avatar_name", "Unknown"),
            thumbnail_url=avatar.get("preview_image_url", avatar.get("thumbnail_url", "")),
            gender=avatar.get("gender", "unknown")
        ))
    
    return avatars

async def generate_heygen_video(request: VideoGenerationRequest) -> VideoGenerationResponse:
    """Generate a video using HeyGen AI avatar"""
    heygen_key = request.api_key or os.environ.get('HEYGEN_API_KEY', '')
    if not heygen_key:
        raise ValueError("HeyGen API key not configured. Please add your API key.")
    
    if not request.script or not request.avatar_id:
        raise ValueError("Script and avatar_id are required")
    
    # Default English voice if none provided
    default_voice_id = "1bd001e7e50f421d891986aad5158bc8"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.heygen.com/v2/video/generate",
            headers={
                "X-Api-Key": heygen_key,
                "Content-Type": "application/json"
            },
            json={
                "video_inputs": [
                    {
                        "character": {
                            "type": "avatar",
                            "avatar_id": request.avatar_id,
                            "avatar_style": "normal"
                        },
                        "voice": {
                            "type": "text",
                            "input_text": request.script,
                            "voice_id": request.voice_id or default_voice_id
                        },
                        "background": {
                            "type": "color",
                            "value": "#1e3a5f"
                        }
                    }
                ],
                "title": request.title,
                "dimension": {
                    "width": 1280,
                    "height": 720
                }
            }
        )
        response.raise_for_status()
        data = response.json()
    
    return VideoGenerationResponse(
        video_id=data.get("data", {}).get("video_id", ""),
        status="processing",
        message="Video generation started. Check status with the video ID."
    )

async def check_heygen_video_status(video_id: str, api_key: Optional[str] = None) -> VideoStatusResponse:
    """Check the status of a HeyGen video generation"""
    heygen_key = api_key or os.environ.get('HEYGEN_API_KEY', '')
    if not heygen_key:
        raise ValueError("HeyGen API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.heygen.com/v1/video_status.get?video_id={video_id}",
            headers={
                "X-Api-Key": heygen_key,
                "Content-Type": "application/json"
            }
        )
        response.raise_for_status()
        data = response.json()
    
    video_data = data.get("data", {})
    return VideoStatusResponse(
        video_id=video_id,
        status=video_data.get("status", "unknown"),
        video_url=video_data.get("video_url"),
        thumbnail_url=video_data.get("thumbnail_url"),
        duration=video_data.get("duration"),
        error=video_data.get("error")
    )

# ============================================================================
# Bunny.net - Video Hosting
# ============================================================================

async def list_bunny_videos(api_key: Optional[str] = None, library_id: Optional[str] = None) -> List[BunnyVideo]:
    """List videos from Bunny.net video library"""
    bunny_key = api_key or os.environ.get('BUNNY_API_KEY', '')
    bunny_library = library_id or os.environ.get('BUNNY_LIBRARY_ID', '')
    bunny_cdn = os.environ.get('BUNNY_CDN_HOSTNAME', '')
    
    if not bunny_key or not bunny_library:
        raise ValueError("Bunny.net API key and Library ID not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://video.bunnycdn.com/library/{bunny_library}/videos",
            headers={
                "AccessKey": bunny_key,
                "Content-Type": "application/json"
            }
        )
        response.raise_for_status()
        data = response.json()
    
    videos = []
    for video in data.get("items", []):
        video_guid = video.get("guid", "")
        cdn_base = bunny_cdn or f"{bunny_library}.b-cdn.net"
        
        videos.append(BunnyVideo(
            id=video_guid,
            title=video.get("title", "Untitled"),
            thumbnail_url=f"https://{cdn_base}/{video_guid}/thumbnail.jpg",
            video_url=f"https://{cdn_base}/{video_guid}/play.mp4",
            duration=video.get("length", 0),
            status=video.get("status", 0)
        ))
    
    return videos

async def upload_to_bunny(
    file_content: bytes,
    filename: str,
    api_key: Optional[str] = None,
    library_id: Optional[str] = None
) -> dict:
    """Upload a video to Bunny.net"""
    bunny_key = api_key or os.environ.get('BUNNY_API_KEY', '')
    bunny_library = library_id or os.environ.get('BUNNY_LIBRARY_ID', '')
    
    if not bunny_key or not bunny_library:
        raise ValueError("Bunny.net API key and Library ID not configured")
    
    # First, create the video entry
    async with httpx.AsyncClient() as client:
        # Create video
        create_response = await client.post(
            f"https://video.bunnycdn.com/library/{bunny_library}/videos",
            headers={
                "AccessKey": bunny_key,
                "Content-Type": "application/json"
            },
            json={"title": filename}
        )
        create_response.raise_for_status()
        video_data = create_response.json()
        video_guid = video_data.get("guid")
        
        # Upload the actual video
        upload_response = await client.put(
            f"https://video.bunnycdn.com/library/{bunny_library}/videos/{video_guid}",
            headers={
                "AccessKey": bunny_key,
                "Content-Type": "application/octet-stream"
            },
            content=file_content
        )
        upload_response.raise_for_status()
    
    return {
        "video_id": video_guid,
        "status": "uploaded",
        "message": "Video uploaded successfully. Processing will begin shortly."
    }

"""
Media Service - Stock Photos and Videos
Handles Pexels, Unsplash, and Pixabay integrations
"""
import os
import httpx
from typing import Optional, List
from pydantic import BaseModel

# ============================================================================
# Models
# ============================================================================

class StockPhoto(BaseModel):
    id: str
    url: str
    thumbnail_url: str
    width: int
    height: int
    photographer: str
    photographer_url: str
    source: str

class StockVideo(BaseModel):
    id: str
    url: str
    preview_url: str
    thumbnail_url: str
    duration: int
    width: int
    height: int
    user: str
    user_url: str
    source: str
    tags: List[str] = []

class PhotoSearchResponse(BaseModel):
    photos: List[StockPhoto]
    total: int

class VideoSearchResponse(BaseModel):
    videos: List[StockVideo]
    total: int
    provider: str

# ============================================================================
# Unsplash - Stock Photos
# ============================================================================

UNSPLASH_ACCESS_KEY = os.environ.get('UNSPLASH_ACCESS_KEY', '')

async def search_unsplash_photos(query: str, per_page: int = 20) -> List[StockPhoto]:
    """Search Unsplash for stock photos"""
    if not UNSPLASH_ACCESS_KEY:
        raise ValueError("Unsplash API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.unsplash.com/search/photos",
            params={
                "query": query,
                "per_page": per_page,
                "orientation": "landscape"
            },
            headers={
                "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
            }
        )
        response.raise_for_status()
        data = response.json()
    
    photos = []
    for photo in data.get("results", []):
        photos.append(StockPhoto(
            id=f"unsplash-{photo['id']}",
            url=photo["urls"]["regular"],
            thumbnail_url=photo["urls"]["thumb"],
            width=photo["width"],
            height=photo["height"],
            photographer=photo["user"]["name"],
            photographer_url=photo["user"]["links"]["html"],
            source="unsplash"
        ))
    
    return photos

# ============================================================================
# Pexels - Stock Photos and Videos
# ============================================================================

async def search_pexels_photos(query: str, per_page: int = 20, api_key: Optional[str] = None) -> List[StockPhoto]:
    """Search Pexels for stock photos"""
    pexels_key = api_key or os.environ.get('PEXELS_API_KEY', '')
    if not pexels_key:
        raise ValueError("Pexels API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.pexels.com/v1/search",
            params={
                "query": query,
                "per_page": per_page,
                "orientation": "landscape"
            },
            headers={
                "Authorization": pexels_key
            }
        )
        response.raise_for_status()
        data = response.json()
    
    photos = []
    for photo in data.get("photos", []):
        photos.append(StockPhoto(
            id=f"pexels-{photo['id']}",
            url=photo["src"]["large"],
            thumbnail_url=photo["src"]["medium"],
            width=photo["width"],
            height=photo["height"],
            photographer=photo["photographer"],
            photographer_url=photo["photographer_url"],
            source="pexels"
        ))
    
    return photos

async def search_pexels_videos(query: str, per_page: int = 20, api_key: Optional[str] = None) -> List[StockVideo]:
    """Search Pexels for stock videos"""
    pexels_key = api_key or os.environ.get('PEXELS_API_KEY', '')
    if not pexels_key:
        raise ValueError("Pexels API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.pexels.com/videos/search",
            params={
                "query": query,
                "per_page": per_page,
                "orientation": "landscape"
            },
            headers={
                "Authorization": pexels_key
            }
        )
        response.raise_for_status()
        data = response.json()
    
    videos = []
    for video in data.get("videos", []):
        video_files = video.get("video_files", [])
        hd_file = next((f for f in video_files if f.get("quality") in ["hd", "sd"]), video_files[0] if video_files else {})
        preview_file = next((f for f in video_files if f.get("quality") == "sd"), hd_file)
        
        videos.append(StockVideo(
            id=f"pexels-{video['id']}",
            url=hd_file.get("link", ""),
            preview_url=preview_file.get("link", ""),
            thumbnail_url=video.get("image", ""),
            duration=video.get("duration", 0),
            width=hd_file.get("width", 1920),
            height=hd_file.get("height", 1080),
            user=video.get("user", {}).get("name", "Unknown"),
            user_url=video.get("user", {}).get("url", "https://pexels.com"),
            source="pexels",
            tags=[]
        ))
    
    return videos

# ============================================================================
# Pixabay - Stock Videos (user key required)
# ============================================================================

async def search_pixabay_videos(query: str, per_page: int = 20, api_key: Optional[str] = None) -> List[StockVideo]:
    """Search Pixabay for stock videos"""
    pixabay_key = api_key or os.environ.get('PIXABAY_API_KEY', '')
    if not pixabay_key:
        raise ValueError("Pixabay API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://pixabay.com/api/videos/",
            params={
                "key": pixabay_key,
                "q": query,
                "per_page": per_page
            }
        )
        response.raise_for_status()
        data = response.json()
    
    videos = []
    for video in data.get("hits", []):
        video_data = video.get("videos", {})
        large = video_data.get("large", {})
        medium = video_data.get("medium", {})
        
        videos.append(StockVideo(
            id=f"pixabay-{video['id']}",
            url=large.get("url", medium.get("url", "")),
            preview_url=video_data.get("tiny", {}).get("url", ""),
            thumbnail_url=f"https://i.vimeocdn.com/video/{video.get('picture_id')}_640x360.jpg",
            duration=video.get("duration", 0),
            width=large.get("width", 1920),
            height=large.get("height", 1080),
            user=video.get("user", "Unknown"),
            user_url=f"https://pixabay.com/users/{video.get('user_id')}/",
            source="pixabay",
            tags=video.get("tags", "").split(",") if video.get("tags") else []
        ))
    
    return videos

"""
Voice Service - ElevenLabs Text-to-Speech
"""
import os
import httpx
from typing import Optional, List
from pydantic import BaseModel

# ============================================================================
# Models
# ============================================================================

class Voice(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None
    preview_url: Optional[str] = None
    labels: dict = {}

class VoiceGenerationRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    api_key: Optional[str] = None
    stability: float = 0.65
    similarity_boost: float = 0.80
    style: float = 0.25
    speed: float = 0.95

class VoiceListResponse(BaseModel):
    voices: List[Voice]

# ============================================================================
# ElevenLabs - Text-to-Speech
# ============================================================================

async def list_elevenlabs_voices(api_key: Optional[str] = None) -> List[Voice]:
    """List available ElevenLabs voices"""
    eleven_key = api_key or os.environ.get('ELEVENLABS_API_KEY', '')
    if not eleven_key:
        raise ValueError("ElevenLabs API key not configured. Please add your API key.")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={
                "xi-api-key": eleven_key
            }
        )
        response.raise_for_status()
        data = response.json()
    
    voices = []
    for voice in data.get("voices", []):
        voices.append(Voice(
            id=voice.get("voice_id", ""),
            name=voice.get("name", "Unknown"),
            category=voice.get("category", "generated"),
            description=voice.get("description"),
            preview_url=voice.get("preview_url"),
            labels=voice.get("labels", {})
        ))
    
    return voices

async def generate_voice(request: VoiceGenerationRequest) -> bytes:
    """Generate speech from text using ElevenLabs"""
    eleven_key = request.api_key or os.environ.get('ELEVENLABS_API_KEY', '')
    if not eleven_key:
        raise ValueError("ElevenLabs API key not configured. Please add your API key.")
    
    if not request.text:
        raise ValueError("Text is required")
    
    # Validate voice ID - ElevenLabs voice IDs are 20+ alphanumeric chars
    # Azure/Microsoft voice IDs look like "sv-SE-MattiasNeural" - these are NOT valid
    import re
    is_valid_voice_id = request.voice_id and re.match(r'^[a-zA-Z0-9]{20,}$', request.voice_id)
    effective_voice_id = request.voice_id if is_valid_voice_id else "JBFqnCBsd6RMkjVDRZzb"  # Default voice
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{effective_voice_id}?output_format=mp3_44100_128",
            headers={
                "xi-api-key": eleven_key,
                "Content-Type": "application/json"
            },
            json={
                "text": request.text,
                "model_id": "eleven_multilingual_v2",  # Best for Swedish pronunciation
                "voice_settings": {
                    "stability": request.stability,
                    "similarity_boost": request.similarity_boost,
                    "style": request.style,
                    "use_speaker_boost": True,
                    "speed": request.speed
                }
            }
        )
        
        if not response.is_success:
            error_text = response.text
            try:
                error_data = response.json()
                if error_data.get("detail", {}).get("status") == "quota_exceeded":
                    raise ValueError("ElevenLabs quota exceeded. Please check your account.")
                raise ValueError(error_data.get("detail", {}).get("message", f"ElevenLabs API error: {response.status_code}"))
            except ValueError:
                raise
            except:
                raise ValueError(f"ElevenLabs API error: {response.status_code}")
        
        return response.content

async def estimate_audio_duration(text: str, words_per_minute: int = 150) -> dict:
    """Estimate audio duration based on text length"""
    words = len(text.split())
    duration_minutes = words / words_per_minute
    duration_seconds = duration_minutes * 60
    
    return {
        "word_count": words,
        "estimated_duration_seconds": round(duration_seconds, 1),
        "estimated_duration_minutes": round(duration_minutes, 2)
    }

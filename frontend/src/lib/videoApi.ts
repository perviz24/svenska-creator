/**
 * Video API Client - HeyGen AI Avatars and Bunny.net Hosting
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface Avatar {
  id: string;
  name: string;
  thumbnail_url: string;
  gender: string;
}

export interface VideoGenerationRequest {
  script: string;
  avatar_id: string;
  voice_id?: string;
  title?: string;
}

export interface VideoGenerationResponse {
  video_id: string;
  status: string;
  message: string;
}

export interface VideoStatusResponse {
  video_id: string;
  status: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: string;
}

export interface BunnyVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  duration: number;
  status: string;
}

// ============================================================================
// HeyGen - AI Avatar Videos
// ============================================================================

export async function listHeyGenAvatars(): Promise<Avatar[]> {
  const response = await fetch(`${BACKEND_URL}/api/video/heygen/avatars`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.avatars || [];
}

export async function generateHeyGenVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/video/heygen/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function checkHeyGenVideoStatus(videoId: string): Promise<VideoStatusResponse> {
  const response = await fetch(`${BACKEND_URL}/api/video/heygen/status/${videoId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Bunny.net - Video Hosting
// ============================================================================

export async function listBunnyVideos(): Promise<BunnyVideo[]> {
  const response = await fetch(`${BACKEND_URL}/api/video/bunny/list`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.videos || [];
}

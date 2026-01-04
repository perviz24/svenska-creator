/**
 * Media API Client - Stock Photos and Videos
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface StockPhoto {
  id: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  source: string;
}

export interface StockVideo {
  id: string;
  url: string;
  preview_url: string;
  thumbnail_url: string;
  duration: number;
  width: number;
  height: number;
  user: string;
  user_url: string;
  source: string;
  tags: string[];
}

export interface PhotoSearchResponse {
  photos: StockPhoto[];
  total: number;
}

export interface VideoSearchResponse {
  videos: StockVideo[];
  total: number;
  provider: string;
}

// ============================================================================
// Stock Photos
// ============================================================================

export async function searchPhotos(
  query: string,
  provider: string = 'pexels',
  perPage: number = 20
): Promise<PhotoSearchResponse> {
  const response = await fetch(
    `${BACKEND_URL}/api/media/photos/search?query=${encodeURIComponent(query)}&provider=${provider}&per_page=${perPage}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Stock Videos
// ============================================================================

export async function searchVideos(
  query: string,
  provider: string = 'pexels',
  perPage: number = 20
): Promise<VideoSearchResponse> {
  const response = await fetch(
    `${BACKEND_URL}/api/media/videos/search?query=${encodeURIComponent(query)}&provider=${provider}&per_page=${perPage}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

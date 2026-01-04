/**
 * Voice API Client - ElevenLabs Text-to-Speech
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface Voice {
  id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  labels: Record<string, string>;
}

export interface VoiceGenerationRequest {
  text: string;
  voice_id?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
}

export interface DurationEstimate {
  word_count: number;
  estimated_duration_seconds: number;
  estimated_duration_minutes: number;
}

// ============================================================================
// ElevenLabs - Text-to-Speech
// ============================================================================

export async function listElevenLabsVoices(): Promise<Voice[]> {
  const response = await fetch(`${BACKEND_URL}/api/voice/elevenlabs/voices`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.voices || [];
}

export async function generateVoice(request: VoiceGenerationRequest): Promise<Blob> {
  const response = await fetch(`${BACKEND_URL}/api/voice/elevenlabs/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

export async function estimateAudioDuration(text: string): Promise<DurationEstimate> {
  const response = await fetch(
    `${BACKEND_URL}/api/voice/estimate-duration?text=${encodeURIComponent(text)}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

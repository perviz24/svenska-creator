/**
 * Course Generation API Client
 * Unified client for all course generation endpoints
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Title Generation
// ============================================================================

export interface TitleGenerationRequest {
  title: string;
  language?: string;
}

export interface TitleSuggestion {
  id: string;
  title: string;
  explanation: string;
}

export interface TitleGenerationResponse {
  suggestions: TitleSuggestion[];
}

export async function generateTitles(request: TitleGenerationRequest): Promise<TitleGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/course/generate-titles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ============================================================================
// Outline Generation
// ============================================================================

export interface OutlineGenerationRequest {
  title: string;
  num_modules?: number;
  language?: string;
  additional_context?: string;
}

export interface ModuleItem {
  id: string;
  title: string;
  description: string;
  estimated_duration: number;
  key_topics: string[];
}

export interface OutlineGenerationResponse {
  modules: ModuleItem[];
  total_duration: number;
}

export async function generateOutline(request: OutlineGenerationRequest): Promise<OutlineGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/course/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ============================================================================
// Script Generation
// ============================================================================

export interface ScriptGenerationRequest {
  module_title: string;
  module_description: string;
  course_title: string;
  language?: string;
  target_duration?: number;
  tone?: string;
  additional_context?: string;
}

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  slide_markers: string[];
}

export interface ScriptGenerationResponse {
  module_id: string;
  module_title: string;
  sections: ScriptSection[];
  total_words: number;
  estimated_duration: number;
  citations: string[];
}

export async function generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/course/generate-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ============================================================================
// Slide Generation (Internal AI)
// ============================================================================

export interface SlideGenerationRequest {
  script_content: string;
  module_title: string;
  course_title: string;
  num_slides?: number;
  language?: string;
  tone?: 'professional' | 'casual' | 'educational' | 'inspirational';
  verbosity?: 'concise' | 'standard' | 'text-heavy';
  include_title_slide?: boolean;
  include_table_of_contents?: boolean;
  industry?: string;
  audience_type?: string;
  presentation_goal?: 'inform' | 'persuade' | 'inspire' | 'teach';
}

export interface SlideContent {
  slide_number: number;
  title: string;
  subtitle?: string;
  content: string;
  bullet_points?: string[];
  key_takeaway?: string;
  speaker_notes: string;
  layout: string;
  suggested_image_query: string;
  suggested_icon?: string;
  visual_type?: 'photo' | 'illustration' | 'icon' | 'chart' | 'diagram';
  color_accent?: string;
  transition_hint?: string;
  image_url?: string;
  image_source?: string;
  image_attribution?: string;
}

export interface SlideGenerationResponse {
  presentation_title: string;
  slides: SlideContent[];
  slide_count: number;
  source: string;
  narrative_structure?: string;
  color_theme?: string;
}

export async function generateSlides(request: SlideGenerationRequest): Promise<SlideGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/slides/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

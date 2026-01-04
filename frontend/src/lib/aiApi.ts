/**
 * AI Utilities API Client - Review, Translate, Analyze
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// AI Review & Edit
// ============================================================================

export interface AIReviewRequest {
  content: string;
  action: 'improve' | 'simplify' | 'expand' | 'fix_grammar' | 'add_examples';
  context?: string;
  language?: string;
}

export interface AIReviewResponse {
  improved_content: string;
  changes_made: string[];
  suggestions: string[];
}

export async function aiReviewEdit(request: AIReviewRequest): Promise<AIReviewResponse> {
  const response = await fetch(`${BACKEND_URL}/api/ai/review`, {
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

// ============================================================================
// Translation
// ============================================================================

export interface TranslateRequest {
  content: string;
  target_language: string;
  source_language?: string;
}

export interface TranslateResponse {
  translated_content: string;
  detected_language?: string;
}

export async function translateContent(request: TranslateRequest): Promise<TranslateResponse> {
  const response = await fetch(`${BACKEND_URL}/api/ai/translate`, {
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

// ============================================================================
// Course Structure Analysis
// ============================================================================

export interface AnalyzeStructureRequest {
  title: string;
  description?: string;
  target_audience?: string;
}

export async function analyzeCourseStructure(request: AnalyzeStructureRequest): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/ai/analyze-structure`, {
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

// ============================================================================
// Model Recommendation
// ============================================================================

export interface RecommendModelRequest {
  course_type: string;
  content_complexity: string;
  target_quality: string;
}

export async function recommendModel(request: RecommendModelRequest): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/ai/recommend-model`, {
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

// ============================================================================
// Manuscript Analysis
// ============================================================================

export async function analyzeManuscript(content: string, language: string = 'sv'): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/api/ai/analyze-manuscript?content=${encodeURIComponent(content)}&language=${language}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Research Mode Recommendation
// ============================================================================

export async function recommendResearchMode(topic: string, context: string = ''): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/api/ai/recommend-research-mode?topic=${encodeURIComponent(topic)}&context=${encodeURIComponent(context)}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// System Diagnostics
// ============================================================================

export async function getSystemDiagnostics(): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/system/diagnostics`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Research API Client - Web Scraping and AI Research
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface ScrapeResult {
  url: string;
  success: boolean;
  title?: string;
  content?: string;
  word_count: number;
  error?: string;
}

export interface ScrapeResponse {
  success: boolean;
  results: ScrapeResult[];
  combined_content: string;
}

export interface ResearchRequest {
  topic: string;
  context?: string;
  language?: string;
  depth?: 'quick' | 'standard' | 'deep';
}

export interface ResearchResponse {
  topic: string;
  content: string;
  language: string;
  depth: string;
}

// ============================================================================
// Web Scraping
// ============================================================================

export async function scrapeUrls(urls: string[]): Promise<ScrapeResponse> {
  const response = await fetch(`${BACKEND_URL}/api/research/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// AI Research
// ============================================================================

export async function researchTopic(request: ResearchRequest): Promise<ResearchResponse> {
  const response = await fetch(`${BACKEND_URL}/api/research/topic`, {
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

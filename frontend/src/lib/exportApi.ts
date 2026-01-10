/**
 * Export API Client - Generate PPTX, Word, HTML exports
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface ExportSlide {
  title: string;
  content?: string;
  bullet_points?: string[];
  speaker_notes?: string;
  layout?: string;
  image_url?: string;
}

export interface ExportSlidesRequest {
  slides: ExportSlide[];
  title: string;
  format: 'pptx' | 'html';
  template?: string;
}

export interface ExportWordSection {
  title: string;
  content?: string;
  subsections?: { title: string; content?: string }[];
}

export interface ExportWordRequest {
  title: string;
  sections: ExportWordSection[];
  include_toc?: boolean;
}

// ============================================================================
// Export Slides (PPTX/HTML)
// ============================================================================

export async function exportSlides(request: ExportSlidesRequest): Promise<Blob> {
  const response = await fetch(`${BACKEND_URL}/api/export/slides`, {
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

// ============================================================================
// Export Word Document
// ============================================================================

export async function exportWord(request: ExportWordRequest): Promise<Blob> {
  const response = await fetch(`${BACKEND_URL}/api/export/word`, {
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

// ============================================================================
// Helper: Download Blob
// ============================================================================

export function downloadBlob(blob: Blob, filename: string) {
  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    // Clean up after a delay to ensure download started
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 100);
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download file. Please try again.');
  }
}

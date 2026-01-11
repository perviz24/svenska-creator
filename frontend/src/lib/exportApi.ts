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
  console.log(`Exporting ${request.slides.length} slides to ${request.format}...`);

  const response = await fetch(`${BACKEND_URL}/api/export/slides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Export failed:', response.status, errorText);

    // Try to parse as JSON for detailed error
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.detail || `HTTP ${response.status}`);
    } catch {
      throw new Error(`Export failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }
  }

  const blob = await response.blob();
  console.log(`Received blob: ${blob.size} bytes, type: ${blob.type}`);

  // Validate blob
  if (blob.size === 0) {
    throw new Error('Server returned empty file');
  }

  return blob;
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
    // Validate blob has content
    if (!blob || blob.size === 0) {
      console.error('Empty blob received for download');
      throw new Error('File is empty. Please try generating again.');
    }

    console.log(`Downloading ${filename} (${blob.size} bytes, type: ${blob.type})`);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;

    // Append to body and trigger click
    document.body.appendChild(a);

    // Use requestAnimationFrame to ensure DOM update before click
    requestAnimationFrame(() => {
      a.click();

      // Clean up after longer delay to ensure download initiated
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 500);
    });
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to download file. Please try again.');
  }
}

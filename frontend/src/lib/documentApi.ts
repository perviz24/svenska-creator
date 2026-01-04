/**
 * Document API Client - Parse and process documents
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface ParseDocumentRequest {
  content: string;  // Base64 encoded
  filename: string;
  file_type: string;
}

export interface ParseDocumentResponse {
  success: boolean;
  content: string;
  title?: string;
  word_count: number;
  error?: string;
}

// ============================================================================
// Document Parsing
// ============================================================================

export async function parseDocument(request: ParseDocumentRequest): Promise<ParseDocumentResponse> {
  const response = await fetch(`${BACKEND_URL}/api/document/parse`, {
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

export async function parseTextContent(content: string): Promise<ParseDocumentResponse> {
  const response = await fetch(
    `${BACKEND_URL}/api/document/parse-text?content=${encodeURIComponent(content)}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Helper: Convert File to Base64
// ============================================================================

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// ============================================================================
// Helper: Get File Type from Filename
// ============================================================================

export function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    'pdf': 'pdf',
    'docx': 'docx',
    'doc': 'docx',
    'txt': 'txt',
    'md': 'md',
    'markdown': 'md',
  };
  return typeMap[ext] || 'txt';
}

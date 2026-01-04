/**
 * Presenton API client using FastAPI backend
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

export interface PresentonGenerateRequest {
  topic: string;
  num_slides: number;
  language?: string;
  style?: string;
  tone?: string;
  verbosity?: 'concise' | 'standard' | 'text-heavy';
  image_type?: 'stock' | 'ai-generated';
  web_search?: boolean;
  script_content?: string;
  additional_context?: string;
  module_title?: string;
  course_title?: string;
  audience_type?: string;
  purpose?: string;
  industry?: string;
  include_table_of_contents?: boolean;
  include_title_slide?: boolean;
  export_format?: 'pptx' | 'pdf';
}

export interface PresentonGenerateResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  task_id?: string;
  message?: string;
  error?: string;
}

export interface PresentonStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  presentation_id?: string;
  download_url?: string;
  edit_url?: string;
  credits_consumed?: number;
  message?: string;
}

/**
 * Generate presentation using Presenton via FastAPI backend
 */
export async function generatePresentonPresentation(
  request: PresentonGenerateRequest
): Promise<PresentonGenerateResponse> {
  const response = await fetch(`${BACKEND_URL}/api/presenton/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Check status of Presenton generation task
 */
export async function checkPresentonStatus(taskId: string): Promise<PresentonStatusResponse> {
  const response = await fetch(`${BACKEND_URL}/api/presenton/status/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

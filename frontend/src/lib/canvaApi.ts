/**
 * Canva Connect API Integration
 *
 * Client-side API for integrating with Canva's Connect APIs via our backend
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface CanvaTemplate {
  id: string;
  name: string;
  thumbnail_url: string | null;
  brand_id: string | null;
}

export interface CanvaDesign {
  id: string;
  edit_url: string;
  view_url: string;
  title?: string;
}

export interface SlideData {
  title: string;
  body?: string;
  bullet_points?: string[];
  image_url?: string;
  background_color?: string;
}

export interface CanvaTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: string;
}

export interface ExportJob {
  job_id: string;
  status: 'in_progress' | 'success' | 'failed';
  url?: string;
}

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * Initiate Canva OAuth flow
 * Opens Canva authorization page in new window
 *
 * @returns Promise that resolves when OAuth completes
 */
export async function connectCanva(): Promise<CanvaTokens> {
  try {
    // Get authorization URL from backend
    const response = await fetch(`${BACKEND_URL}/api/canva/authorize`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get auth URL: ${response.status}`);
    }

    const data = await response.json();
    const { auth_url, state, code_verifier } = data;

    // Store state and verifier for verification later
    sessionStorage.setItem('canva_oauth_state', state);
    sessionStorage.setItem('canva_code_verifier', code_verifier);

    // Open OAuth window
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      auth_url,
      'Canva Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    // Wait for OAuth callback via postMessage
    return new Promise((resolve, reject) => {
      let messageReceived = false;

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        // Check if message is from our OAuth callback
        if (event.data && event.data.type === 'canva_oauth_success') {
          messageReceived = true;
          window.removeEventListener('message', handleMessage);
          clearInterval(checkInterval);

          // Store tokens in sessionStorage
          const tokens = event.data.tokens;
          sessionStorage.setItem('canva_tokens', JSON.stringify(tokens));

          // Close popup if still open
          if (!authWindow.closed) {
            authWindow.close();
          }

          resolve(tokens);
        }
      };

      window.addEventListener('message', handleMessage);

      // Also check if window was closed (as fallback/cancellation detection)
      const checkInterval = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkInterval);
          window.removeEventListener('message', handleMessage);

          if (!messageReceived) {
            // Check localStorage fallback
            const fallbackTokens = localStorage.getItem('canva_tokens_temp');
            if (fallbackTokens) {
              localStorage.removeItem('canva_tokens_temp');
              const tokens = JSON.parse(fallbackTokens);
              sessionStorage.setItem('canva_tokens', JSON.stringify(tokens));
              resolve(tokens);
            } else {
              reject(new Error('Authorization cancelled'));
            }
          }
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        window.removeEventListener('message', handleMessage);
        if (!authWindow.closed) {
          authWindow.close();
        }
        if (!messageReceived) {
          reject(new Error('Authorization timeout'));
        }
      }, 300000);
    });
  } catch (error) {
    console.error('Canva OAuth error:', error);
    throw error;
  }
}

/**
 * Disconnect from Canva (revoke tokens)
 */
export async function disconnectCanva(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/canva/disconnect`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Disconnect failed: ${response.status}`);
    }

    // Clear any stored tokens
    sessionStorage.removeItem('canva_tokens');
    sessionStorage.removeItem('canva_oauth_state');
    sessionStorage.removeItem('canva_code_verifier');
  } catch (error) {
    console.error('Canva disconnect error:', error);
    throw error;
  }
}

/**
 * Check if user is connected to Canva
 * Checks for valid tokens in sessionStorage
 */
export async function isCanvaConnected(): Promise<boolean> {
  try {
    const tokensStr = sessionStorage.getItem('canva_tokens');
    if (!tokensStr) {
      return false;
    }

    const tokens = JSON.parse(tokensStr);

    // Check if tokens exist and have required fields
    if (!tokens.access_token || !tokens.expires_at) {
      return false;
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();

    if (now >= expiresAt) {
      // Token expired, clear it
      sessionStorage.removeItem('canva_tokens');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Check Canva connection error:', error);
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Canva access token from sessionStorage
 * @returns Access token or null if not found/expired
 */
function getAccessToken(): string | null {
  try {
    const tokensStr = sessionStorage.getItem('canva_tokens');
    if (!tokensStr) {
      return null;
    }

    const tokens = JSON.parse(tokensStr);

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();

    if (now >= expiresAt) {
      sessionStorage.removeItem('canva_tokens');
      return null;
    }

    return tokens.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// ============================================================================
// Brand Templates
// ============================================================================

/**
 * Fetch user's brand templates from Canva
 *
 * @param limit Maximum number of templates to fetch (default: 20)
 * @returns Array of brand templates
 */
export async function getBrandTemplates(limit: number = 20): Promise<CanvaTemplate[]> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not connected to Canva. Please connect first.');
    }

    const response = await fetch(
      `${BACKEND_URL}/api/canva/brand-templates?limit=${limit}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch templates: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error('Fetch brand templates error:', error);
    throw error;
  }
}

// ============================================================================
// Design Creation
// ============================================================================

/**
 * Create a new Canva design
 *
 * @param title Design title
 * @param templateId Optional template ID to start from
 * @returns Design info with edit URL
 */
export async function createCanvaDesign(
  title: string,
  templateId?: string
): Promise<CanvaDesign> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not connected to Canva. Please connect first.');
    }

    const response = await fetch(`${BACKEND_URL}/api/canva/designs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        design_type: 'Presentation',
        template_id: templateId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create design: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.design;
  } catch (error) {
    console.error('Create Canva design error:', error);
    throw error;
  }
}

/**
 * Create a Canva design by autofilling a template with slide data
 * This is the key function for our use case!
 *
 * @param templateId Brand template ID to autofill
 * @param title Presentation title
 * @param slides Array of slide data
 * @returns Design info with edit URL
 */
export async function autofillCanvaTemplate(
  templateId: string,
  title: string,
  slides: SlideData[]
): Promise<CanvaDesign> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not connected to Canva. Please connect first.');
    }

    console.log(`Autofilling Canva template ${templateId} with ${slides.length} slides...`);

    const response = await fetch(`${BACKEND_URL}/api/canva/autofill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        template_id: templateId,
        title,
        slides,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Autofill failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Autofill successful:', data.design.edit_url);

    return data.design;
  } catch (error) {
    console.error('Autofill Canva template error:', error);
    throw error;
  }
}

// ============================================================================
// Export
// ============================================================================

/**
 * Export a Canva design to PPTX/PDF
 * Note: Export is asynchronous, returns job ID for polling
 *
 * @param designId Canva design ID
 * @param format Export format ('pptx' or 'pdf')
 * @returns Export job ID
 */
export async function exportCanvaDesign(
  designId: string,
  format: 'pptx' | 'pdf' = 'pptx'
): Promise<string> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not connected to Canva. Please connect first.');
    }

    const response = await fetch(`${BACKEND_URL}/api/canva/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        design_id: designId,
        format,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.job_id;
  } catch (error) {
    console.error('Export Canva design error:', error);
    throw error;
  }
}

/**
 * Check the status of an export job
 *
 * @param jobId Export job ID
 * @returns Job status and download URL when ready
 */
export async function getExportStatus(jobId: string): Promise<ExportJob> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Not connected to Canva. Please connect first.');
    }

    const response = await fetch(`${BACKEND_URL}/api/canva/export/${jobId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get export status failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.job;
  } catch (error) {
    console.error('Get export status error:', error);
    throw error;
  }
}

/**
 * Poll export job until complete, then download
 *
 * @param jobId Export job ID
 * @param onProgress Optional callback for progress updates
 * @returns Download URL when export complete
 */
export async function pollExportAndDownload(
  jobId: string,
  onProgress?: (status: string) => void
): Promise<string> {
  const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const job = await getExportStatus(jobId);

    if (onProgress) {
      onProgress(job.status);
    }

    if (job.status === 'success' && job.url) {
      return job.url;
    }

    if (job.status === 'failed') {
      throw new Error('Export failed');
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Export timeout - took too long');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform Svenska Creator slides to Canva slide data format
 *
 * @param slides Array of slides from Svenska Creator
 * @returns Array of slide data for Canva
 */
export function transformSlidesToCanvaFormat(slides: any[]): SlideData[] {
  return slides.map(slide => {
    const canvaSlide: SlideData = {
      title: slide.title || 'Untitled Slide',
    };

    // Parse content into bullet points if it contains line breaks
    if (slide.content) {
      const lines = slide.content.split('\n').filter((line: string) => line.trim());
      if (lines.length > 1) {
        // Multiple lines = bullet points
        canvaSlide.bullet_points = lines.map((line: string) =>
          line.replace(/^[•\-\*]\s*/, '').trim()
        );
      } else {
        // Single line = body text
        canvaSlide.body = slide.content;
      }
    }

    if (slide.imageUrl) {
      canvaSlide.image_url = slide.imageUrl;
    }

    if (slide.backgroundColor) {
      canvaSlide.background_color = slide.backgroundColor;
    }

    return canvaSlide;
  });
}

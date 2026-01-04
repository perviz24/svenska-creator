import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text extraction from common formats
async function extractTextFromFile(fileData: ArrayBuffer, fileName: string, mimeType: string): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  
  // Plain text files
  if (mimeType.includes('text/') || 
      fileName.endsWith('.txt') || 
      fileName.endsWith('.md') || 
      fileName.endsWith('.csv')) {
    return decoder.decode(fileData);
  }

  // For binary formats, we'll use a simplified extraction
  // In production, you'd want to use specialized libraries
  
  if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
    // Basic PDF text extraction (simplified - extracts visible text patterns)
    const text = decoder.decode(fileData);
    // Extract text between parentheses (PDF text objects) and clean up
    const matches = text.match(/\(([^)]+)\)/g) || [];
    const extracted = matches
      .map(m => m.slice(1, -1))
      .filter(t => t.length > 2 && /[a-zA-ZåäöÅÄÖ]/.test(t))
      .join(' ');
    
    if (extracted.length > 100) {
      return extracted;
    }
    
    // Fallback: look for readable text patterns
    const readable = text.match(/[A-Za-zåäöÅÄÖ][A-Za-zåäöÅÄÖ0-9\s.,!?-]{20,}/g) || [];
    return readable.join(' ').slice(0, 50000);
  }

  // DOCX files (simplified extraction from XML content)
  if (mimeType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
    const text = decoder.decode(fileData);
    // Extract text from XML tags
    const textContent = text.replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Filter for readable content
    const readable = textContent.match(/[A-Za-zåäöÅÄÖ][A-Za-zåäöÅÄÖ0-9\s.,!?-]{10,}/g) || [];
    return readable.join(' ').slice(0, 50000);
  }

  // For other formats, try to extract any readable text
  try {
    const text = decoder.decode(fileData);
    const readable = text.match(/[A-Za-zåäöÅÄÖ][A-Za-zåäöÅÄÖ0-9\s.,!?-]{20,}/g) || [];
    return readable.join(' ').slice(0, 50000);
  } catch {
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Parsing document: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    const arrayBuffer = await file.arrayBuffer();
    const extractedText = await extractTextFromFile(arrayBuffer, file.name, file.type);

    if (!extractedText || extractedText.length < 10) {
      // Try using Lovable AI to describe the document if extraction fails
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        console.log('Text extraction limited, returning what we found');
      }
      
      return new Response(JSON.stringify({
        success: true,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedText: extractedText || 'Kunde inte extrahera text från dokumentet. Vänligen kopiera och klistra in innehållet manuellt.',
        wordCount: extractedText ? extractedText.split(/\s+/).length : 0,
        warning: 'Limited text extraction for this file format',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wordCount = extractedText.split(/\s+/).length;
    console.log(`Extracted ${wordCount} words from ${file.name}`);

    return new Response(JSON.stringify({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedText,
      wordCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-document:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

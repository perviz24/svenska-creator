import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, apiKey } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Use user-provided API key or fall back to environment variable
    const ELEVENLABS_API_KEY = apiKey || Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured. Please add your API key in Settings.');
    }

    // ElevenLabs voice IDs are alphanumeric strings like "JBFqnCBsd6RMkjVDRZzb"
    // Azure/Microsoft voice IDs look like "sv-SE-MattiasNeural" - these are NOT valid for ElevenLabs
    const isValidElevenLabsVoiceId = voiceId && /^[a-zA-Z0-9]{20,}$/.test(voiceId);
    const effectiveVoiceId = isValidElevenLabsVoiceId ? voiceId : 'JBFqnCBsd6RMkjVDRZzb';
    
    console.log(`Generating voice for ${text.length} characters with voice ${effectiveVoiceId} (original: ${voiceId || 'none'})`);

    // Parse voice settings from request or use optimized defaults for Swedish medical content
    const { stability = 0.65, similarityBoost = 0.80, style = 0.25, speed = 0.95 } = await req.json().catch(() => ({}));
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${effectiveVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2', // Best for Swedish pronunciation
          voice_settings: {
            stability: stability, // Higher for medical terminology consistency
            similarity_boost: similarityBoost, // Strong voice clarity
            style: style, // Lower for professional tone
            use_speaker_boost: true, // Enhanced clarity
            speed: speed, // Slightly slower for medical terms
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      
      // Parse the error to provide a better message
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail?.status === 'quota_exceeded') {
          throw new Error(`ElevenLabs-kvoten överskriden. Du har ${errorData.detail.message?.match(/(\d+) credits remaining/)?.[1] || '0'} krediter kvar.`);
        }
        throw new Error(errorData.detail?.message || `ElevenLabs API error: ${response.status}`);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('ElevenLabs')) {
          throw parseError;
        }
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Generated audio: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating voice:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

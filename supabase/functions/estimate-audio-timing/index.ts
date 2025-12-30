import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlideAudioEstimate {
  slideNumber: number;
  slideTitle: string;
  text: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  speakerNotes?: string;
}

interface AudioTimingResponse {
  slides: SlideAudioEstimate[];
  totalDurationSeconds: number;
  totalWords: number;
  averageWordsPerMinute: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      slides, 
      speakerNotes, 
      wordsPerMinute = 130, // Default speaking rate for Swedish medical content
      language = 'sv'
    } = await req.json();

    if (!slides || !Array.isArray(slides)) {
      throw new Error('Slides array is required');
    }

    console.log(`Estimating audio timing for ${slides.length} slides at ${wordsPerMinute} WPM`);

    // Adjust WPM based on language and content type
    // Swedish medical content typically requires slower pace for clarity
    const adjustedWPM = language === 'sv' 
      ? wordsPerMinute * 0.92 // Swedish typically slower due to longer words
      : wordsPerMinute;

    const slideEstimates: SlideAudioEstimate[] = slides.map((slide: any, index: number) => {
      // Get the text content - either from speakerNotes or content
      const noteText = speakerNotes?.[index] || slide.speakerNotes || '';
      const contentText = slide.content || '';
      
      // Use speaker notes if available, otherwise fall back to content
      const textToSpeak = noteText || contentText;
      
      // Count words (handle Swedish compound words)
      const wordCount = textToSpeak
        .replace(/\[BILD:.*?\]/gi, '') // Remove slide markers
        .replace(/\[SLIDE:.*?\]/gi, '')
        .split(/\s+/)
        .filter((word: string) => word.length > 0)
        .length;

      // Calculate duration with adjustments
      // Add 1.5 seconds buffer per slide for transitions
      const baseDuration = (wordCount / adjustedWPM) * 60;
      const transitionBuffer = 1.5;
      
      // Add extra time for slides with medical terminology (estimated by title keywords)
      const hasMedicalTerms = /diagnos|behandling|medicin|symptom|patient|klinisk|terapi|läkemedel/i.test(slide.title || '');
      const medicalBuffer = hasMedicalTerms ? wordCount * 0.05 : 0; // 5% extra for medical terms
      
      const estimatedDurationSeconds = Math.ceil(baseDuration + transitionBuffer + medicalBuffer);

      return {
        slideNumber: slide.slideNumber || index + 1,
        slideTitle: slide.title || `Slide ${index + 1}`,
        text: textToSpeak.substring(0, 100) + (textToSpeak.length > 100 ? '...' : ''),
        wordCount,
        estimatedDurationSeconds,
        speakerNotes: noteText.substring(0, 200) + (noteText.length > 200 ? '...' : ''),
      };
    });

    const totalWords = slideEstimates.reduce((sum, s) => sum + s.wordCount, 0);
    const totalDurationSeconds = slideEstimates.reduce((sum, s) => sum + s.estimatedDurationSeconds, 0);
    const averageWordsPerMinute = totalDurationSeconds > 0 
      ? Math.round((totalWords / totalDurationSeconds) * 60) 
      : wordsPerMinute;

    const response: AudioTimingResponse = {
      slides: slideEstimates,
      totalDurationSeconds,
      totalWords,
      averageWordsPerMinute,
    };

    console.log(`Total duration estimate: ${Math.round(totalDurationSeconds / 60)} minutes, ${totalWords} words`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error estimating audio timing:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

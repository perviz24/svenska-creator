import { useState, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface VoiceState {
  isGenerating: boolean;
  isPlaying: boolean;
  audioUrl: string | null;
  error: string | null;
}

export function useVoiceSynthesis() {
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceState>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingId = useRef<string | null>(null);

  const getState = useCallback((id: string): VoiceState => {
    return voiceStates[id] || { isGenerating: false, isPlaying: false, audioUrl: null, error: null };
  }, [voiceStates]);

  const generateVoice = useCallback(async (id: string, text: string, voiceId?: string) => {
    setVoiceStates(prev => ({
      ...prev,
      [id]: { isGenerating: true, isPlaying: false, audioUrl: null, error: null }
    }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate voice');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setVoiceStates(prev => ({
        ...prev,
        [id]: { isGenerating: false, isPlaying: false, audioUrl, error: null }
      }));

      toast({
        title: 'Röst genererad',
        description: 'Klicka på play för att lyssna.',
      });

      return audioUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setVoiceStates(prev => ({
        ...prev,
        [id]: { isGenerating: false, isPlaying: false, audioUrl: null, error: errorMessage }
      }));
      toast({
        title: 'Fel vid röstgenerering',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  const playAudio = useCallback((id: string) => {
    const state = voiceStates[id];
    if (!state?.audioUrl) return;

    // Stop current playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (currentPlayingId.current) {
        setVoiceStates(prev => ({
          ...prev,
          [currentPlayingId.current!]: { ...prev[currentPlayingId.current!], isPlaying: false }
        }));
      }
    }

    const audio = new Audio(state.audioUrl);
    audioRef.current = audio;
    currentPlayingId.current = id;

    audio.onplay = () => {
      setVoiceStates(prev => ({
        ...prev,
        [id]: { ...prev[id], isPlaying: true }
      }));
    };

    audio.onended = () => {
      setVoiceStates(prev => ({
        ...prev,
        [id]: { ...prev[id], isPlaying: false }
      }));
      currentPlayingId.current = null;
    };

    audio.onerror = () => {
      setVoiceStates(prev => ({
        ...prev,
        [id]: { ...prev[id], isPlaying: false, error: 'Error playing audio' }
      }));
      currentPlayingId.current = null;
    };

    audio.play();
  }, [voiceStates]);

  const stopAudio = useCallback((id: string) => {
    if (audioRef.current && currentPlayingId.current === id) {
      audioRef.current.pause();
      audioRef.current = null;
      currentPlayingId.current = null;
      setVoiceStates(prev => ({
        ...prev,
        [id]: { ...prev[id], isPlaying: false }
      }));
    }
  }, []);

  return {
    getState,
    generateVoice,
    playAudio,
    stopAudio,
  };
}

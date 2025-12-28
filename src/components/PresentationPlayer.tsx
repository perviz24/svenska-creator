import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Slide } from '@/types/course';
import { cn } from '@/lib/utils';

interface PresentationPlayerProps {
  slides: Slide[];
  moduleTitle: string;
  courseTitle: string;
  audioUrl?: string;
  slideTiming?: number[]; // timestamps in seconds for each slide
  onClose?: () => void;
}

export function PresentationPlayer({
  slides,
  moduleTitle,
  courseTitle,
  audioUrl,
  slideTiming,
  onClose,
}: PresentationPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = slides[currentSlideIndex];

  // Calculate automatic slide timing if not provided
  const getAutoSlideTiming = useCallback(() => {
    if (slideTiming && slideTiming.length === slides.length) {
      return slideTiming;
    }
    // Default: divide duration equally among slides
    const segmentDuration = duration / slides.length;
    return slides.map((_, index) => index * segmentDuration);
  }, [slideTiming, duration, slides]);

  // Sync slide with audio time
  useEffect(() => {
    if (!isPlaying || !audioUrl) return;

    const timing = getAutoSlideTiming();
    const currentSlideFromTime = timing.findIndex((time, index) => {
      const nextTime = timing[index + 1] ?? duration;
      return currentTime >= time && currentTime < nextTime;
    });

    if (currentSlideFromTime !== -1 && currentSlideFromTime !== currentSlideIndex) {
      setCurrentSlideIndex(currentSlideFromTime);
    }
  }, [currentTime, isPlaying, getAutoSlideTiming, currentSlideIndex, duration, audioUrl]);

  // Auto-advance slides without audio
  useEffect(() => {
    if (!isPlaying || audioUrl) return;

    slideTimerRef.current = setInterval(() => {
      setCurrentSlideIndex(prev => {
        if (prev >= slides.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 5000); // 5 seconds per slide without audio

    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, [isPlaying, audioUrl, slides.length]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl]);

  // Play/Pause control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Volume control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
    if (audioRef.current && audioUrl) {
      const timing = getAutoSlideTiming();
      audioRef.current.currentTime = timing[index] || 0;
    }
  };

  const prevSlide = () => goToSlide(Math.max(0, currentSlideIndex - 1));
  const nextSlide = () => goToSlide(Math.min(slides.length - 1, currentSlideIndex + 1));

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-background rounded-lg overflow-hidden border",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-none"
      )}
    >
      {/* Audio Element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div>
          <h3 className="font-medium text-sm">{moduleTitle}</h3>
          <p className="text-xs text-muted-foreground">{courseTitle}</p>
        </div>
        <Badge variant="secondary">
          {currentSlideIndex + 1} / {slides.length}
        </Badge>
      </div>

      {/* Slide Display */}
      <div className="relative flex-1 bg-gradient-to-br from-primary/20 to-primary/5 min-h-[300px]">
        {currentSlide && (
          <div 
            className="absolute inset-4 rounded-lg border overflow-hidden shadow-lg"
            style={{ 
              backgroundColor: currentSlide.backgroundColor || 'hsl(var(--card))'
            }}
          >
            {currentSlide.imageUrl && (
              <img 
                src={currentSlide.imageUrl} 
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
            )}
            <div className="relative z-10 p-8 h-full flex flex-col">
              <Badge variant="outline" className="self-start mb-4 text-xs">
                {currentSlide.layout}
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{currentSlide.title}</h2>
              <div className="flex-1 text-base md:text-lg text-muted-foreground whitespace-pre-wrap overflow-auto">
                {currentSlide.content}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-muted/50 border-t space-y-3">
        {/* Progress Bar */}
        {audioUrl && duration > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-12">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevSlide} disabled={currentSlideIndex === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {audioUrl && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => setVolume(v[0])}
                  className="w-24"
                />
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Slide Thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex-shrink-0 w-16 h-10 rounded border-2 overflow-hidden transition-all",
                currentSlideIndex === index 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              )}
              style={{ backgroundColor: slide.backgroundColor || 'hsl(var(--muted))' }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

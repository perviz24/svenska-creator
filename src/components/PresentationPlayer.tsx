import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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

// Helper to clean markdown from content
const cleanMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[\s]*[-•]\s*/gm, '')
    .replace(/^[\s]*\d+\.\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
};

// Get Lucide icon component by name
const getIcon = (iconName?: string) => {
  if (!iconName) return null;
  const normalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-/g, '');
  const IconComponent = (LucideIcons as any)[normalizedName];
  return IconComponent || null;
};

// Layout-specific background gradients
const getLayoutBackground = (layout: Slide['layout'], backgroundColor?: string) => {
  if (backgroundColor && backgroundColor !== '#ffffff' && backgroundColor !== '#FFFFFF') {
    return backgroundColor;
  }
  
  switch (layout) {
    case 'title':
      return 'linear-gradient(135deg, hsl(220 70% 25%) 0%, hsl(260 60% 20%) 100%)';
    case 'key-point':
      return 'linear-gradient(135deg, hsl(210 80% 30%) 0%, hsl(230 70% 25%) 100%)';
    case 'stats':
      return 'linear-gradient(135deg, hsl(200 80% 25%) 0%, hsl(220 70% 20%) 100%)';
    case 'quote':
      return 'linear-gradient(135deg, hsl(280 60% 25%) 0%, hsl(300 50% 20%) 100%)';
    case 'comparison':
      return 'linear-gradient(135deg, hsl(190 70% 25%) 0%, hsl(210 60% 20%) 100%)';
    default:
      return 'linear-gradient(135deg, hsl(220 70% 30%) 0%, hsl(240 60% 22%) 100%)';
  }
};

// Get layout label in Swedish
const getLayoutLabel = (layout: Slide['layout']) => {
  const labels: Record<string, string> = {
    'title': 'Titel',
    'title-content': 'Innehåll',
    'two-column': 'Två kolumner',
    'image-focus': 'Bildfokus',
    'quote': 'Citat',
    'bullet-points': 'Punktlista',
    'key-point': 'Huvudpoäng',
    'comparison': 'Jämförelse',
    'timeline': 'Tidslinje',
    'stats': 'Statistik',
  };
  return labels[layout] || layout;
};

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
    }, 5000);

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

  // --- SlidePreviewCard-style rendering ---
  const renderSlideContent = (slide: Slide) => {
    const IconComponent = getIcon(slide.iconSuggestion);
    const bulletPoints = slide.bulletPoints || [];
    const cleanedTitle = cleanMarkdown(slide.title);
    const cleanedSubtitle = slide.subtitle ? cleanMarkdown(slide.subtitle) : null;
    const cleanedContent = cleanMarkdown(slide.content);
    const cleanedKeyTakeaway = slide.keyTakeaway ? cleanMarkdown(slide.keyTakeaway) : null;
    
    const effectiveBulletPoints = bulletPoints.length > 0 
      ? bulletPoints.map(cleanMarkdown).filter(Boolean)
      : cleanedContent.split('\n').filter(line => line.trim()).slice(0, 5);

    return (
      <div 
        className="absolute inset-4 rounded-xl border-2 border-border/50 overflow-hidden shadow-lg aspect-video"
        style={{ 
          background: slide.imageUrl 
            ? undefined
            : getLayoutBackground(slide.layout, slide.backgroundColor)
        }}
      >
        {/* Background Image */}
        {slide.imageUrl && (
          <img 
            src={slide.imageUrl} 
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Gradient Overlay */}
        <div className={cn(
          "absolute inset-0",
          slide.imageUrl 
            ? "bg-gradient-to-t from-black/85 via-black/50 to-black/30"
            : "bg-gradient-to-br from-white/5 to-transparent"
        )} />

        {/* Layout-specific content */}
        <div className="relative z-10 p-6 md:p-8 h-full flex flex-col">
          {/* Title Slide Layout */}
          {slide.layout === 'title' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              {IconComponent && (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                  <IconComponent className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              )}
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg leading-tight">
                {cleanedTitle}
              </h2>
              {cleanedSubtitle && (
                <p className="text-lg md:text-xl text-white/80 max-w-2xl">
                  {cleanedSubtitle}
                </p>
              )}
            </div>
          )}

          {/* Key Point Layout */}
          {slide.layout === 'key-point' && (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <Badge variant="secondary" className="self-start text-sm bg-white/20 text-white backdrop-blur-sm border-0">
                {getLayoutLabel(slide.layout)}
              </Badge>
              <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                {cleanedTitle}
              </h3>
              {cleanedKeyTakeaway && (
                <div className="p-4 md:p-6 bg-white/15 backdrop-blur-sm rounded-lg border border-white/25">
                  <p className="text-lg md:text-xl text-white font-semibold leading-relaxed">
                    {cleanedKeyTakeaway}
                  </p>
                </div>
              )}
              {effectiveBulletPoints.length > 0 && (
                <ul className="space-y-2 mt-2">
                  {effectiveBulletPoints.slice(0, 4).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-white/90">
                      <span className="w-2 h-2 rounded-full bg-white/60 mt-2.5 flex-shrink-0" />
                      <span className="text-base md:text-lg leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Stats Layout */}
          {slide.layout === 'stats' && (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <Badge variant="secondary" className="self-start text-sm bg-white/20 text-white backdrop-blur-sm border-0">
                Statistik
              </Badge>
              <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">
                {cleanedTitle}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4 mt-2">
                {effectiveBulletPoints.slice(0, 4).map((point, idx) => (
                  <div key={idx} className="bg-white/15 backdrop-blur-sm rounded-lg p-4 text-center border border-white/20">
                    <p className="text-white/95 text-sm md:text-base font-medium">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quote Layout */}
          {slide.layout === 'quote' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 px-4">
              <div className="text-5xl md:text-6xl text-white/30 font-serif">"</div>
              <blockquote className="text-lg md:text-xl text-white italic font-medium leading-relaxed max-w-2xl">
                {cleanedKeyTakeaway || effectiveBulletPoints[0] || cleanedContent}
              </blockquote>
              <div className="text-5xl md:text-6xl text-white/30 font-serif">"</div>
              {(cleanedSubtitle || cleanedTitle) && (
                <p className="text-white/70 text-sm md:text-base mt-2">— {cleanedSubtitle || cleanedTitle}</p>
              )}
            </div>
          )}

          {/* Comparison Layout */}
          {slide.layout === 'comparison' && (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg text-center">
                {cleanedTitle}
              </h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4 mt-2">
                {effectiveBulletPoints.slice(0, 4).map((point, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-3 md:p-4 rounded-lg border",
                      idx % 2 === 0 
                        ? "bg-emerald-500/20 border-emerald-500/30" 
                        : "bg-blue-500/20 border-blue-500/30"
                    )}
                  >
                    <p className="text-white/90 text-sm md:text-base">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bullet Points Layout */}
          {slide.layout === 'bullet-points' && (
            <div className="flex-1 flex flex-col justify-end space-y-3">
              <Badge variant="secondary" className="self-start mb-2 text-sm bg-white/20 text-white backdrop-blur-sm border-0">
                {getLayoutLabel(slide.layout)}
              </Badge>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-lg">
                {cleanedTitle}
              </h3>
              {cleanedSubtitle && (
                <p className="text-white/70 text-sm mb-2">{cleanedSubtitle}</p>
              )}
              <ul className="space-y-2">
                {effectiveBulletPoints.slice(0, 5).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-white/90">
                    <span className="w-2 h-2 rounded-full bg-white/60 mt-2.5 flex-shrink-0" />
                    <span className="text-sm md:text-base leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Default / Title-Content / Image-Focus Layout */}
          {!['title', 'key-point', 'stats', 'quote', 'bullet-points', 'comparison'].includes(slide.layout) && (
            <div className="flex-1 flex flex-col justify-end space-y-3">
              <Badge variant="secondary" className="self-start mb-2 text-sm bg-white/20 text-white backdrop-blur-sm border-0">
                {getLayoutLabel(slide.layout)}
              </Badge>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-lg line-clamp-2">
                {cleanedTitle}
              </h3>
              {cleanedSubtitle && (
                <p className="text-white/70 text-sm mb-2">{cleanedSubtitle}</p>
              )}
              {effectiveBulletPoints.length > 0 ? (
                <ul className="space-y-2">
                  {effectiveBulletPoints.slice(0, 5).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-white/90">
                      <span className="w-2 h-2 rounded-full bg-white/60 mt-2.5 flex-shrink-0" />
                      <span className="text-sm md:text-base leading-relaxed line-clamp-2">{point}</span>
                    </li>
                  ))}
                </ul>
              ) : cleanedKeyTakeaway && (
                <p className="text-base text-white/90 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                  {cleanedKeyTakeaway}
                </p>
              )}
            </div>
          )}

          {/* Key Takeaway Footer */}
          {cleanedKeyTakeaway && !['key-point', 'quote', 'title'].includes(slide.layout) && (
            <div className="mt-auto pt-3 border-t border-white/20">
              <p className="text-sm text-white/80 italic line-clamp-2">
                💡 {cleanedKeyTakeaway}
              </p>
            </div>
          )}

          {/* Image Attribution */}
          {slide.imageAttribution && (
            <p className="absolute bottom-2 right-3 text-xs text-white/50">
              📷 {slide.imageAttribution}
            </p>
          )}
        </div>
      </div>
    );
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
        {currentSlide && renderSlideContent(currentSlide)}

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
              style={{ 
                background: slide.imageUrl 
                  ? `linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${slide.imageUrl}) center/cover`
                  : getLayoutBackground(slide.layout, slide.backgroundColor)
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs font-medium text-white drop-shadow-md">{index + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

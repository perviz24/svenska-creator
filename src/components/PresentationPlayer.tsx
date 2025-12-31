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
  slideTiming?: number[];
  onClose?: () => void;
}

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

const getIcon = (iconName?: string) => {
  if (!iconName) return null;
  const normalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-/g, '');
  const IconComponent = (LucideIcons as any)[normalizedName];
  return IconComponent || null;
};

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

const getImageStyles = (position: Slide['imagePosition'], hasImage: boolean) => {
  if (!hasImage) return { containerClass: '', imageClass: '', contentClass: '' };
  
  switch (position) {
    case 'background':
      return {
        containerClass: '',
        imageClass: 'absolute inset-0 w-full h-full object-cover',
        contentClass: '',
      };
    case 'left':
      return {
        containerClass: 'flex flex-row',
        imageClass: 'w-1/3 h-full object-cover rounded-lg',
        contentClass: 'flex-1 pl-6',
      };
    case 'right':
      return {
        containerClass: 'flex flex-row-reverse',
        imageClass: 'w-1/3 h-full object-cover rounded-lg',
        contentClass: 'flex-1 pr-6',
      };
    case 'top':
      return {
        containerClass: 'flex flex-col',
        imageClass: 'w-full h-1/3 object-cover rounded-lg mb-4',
        contentClass: 'flex-1',
      };
    case 'corner':
      return {
        containerClass: '',
        imageClass: 'absolute top-4 right-4 w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg shadow-lg border-2 border-white/20',
        contentClass: 'pr-28 md:pr-36',
      };
    case 'inline':
      return {
        containerClass: '',
        imageClass: 'w-28 h-28 md:w-36 md:h-36 object-cover rounded-lg float-right ml-4 mb-3 shadow-lg',
        contentClass: '',
      };
    default:
      return {
        containerClass: '',
        imageClass: 'absolute inset-0 w-full h-full object-cover',
        contentClass: '',
      };
  }
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

  const getAutoSlideTiming = useCallback(() => {
    if (slideTiming && slideTiming.length === slides.length) {
      return slideTiming;
    }
    const segmentDuration = duration / slides.length;
    return slides.map((_, index) => index * segmentDuration);
  }, [slideTiming, duration, slides]);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

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

    const imagePosition = slide.imagePosition || 'background';
    const hasImage = !!slide.imageUrl;
    const isBackgroundImage = imagePosition === 'background' || slide.layout === 'title' || slide.layout === 'image-focus';
    const imageStyles = getImageStyles(isBackgroundImage ? 'background' : imagePosition, hasImage);

    return (
      <div 
        className="absolute inset-4 rounded-xl border-2 border-border/50 overflow-hidden shadow-lg"
        style={{ 
          background: (hasImage && isBackgroundImage)
            ? undefined
            : getLayoutBackground(slide.layout, slide.backgroundColor)
        }}
      >
        {/* Background Image */}
        {hasImage && isBackgroundImage && (
          <img 
            src={slide.imageUrl} 
            alt=""
            className={imageStyles.imageClass}
          />
        )}
        
        {/* Gradient Overlay */}
        {hasImage && isBackgroundImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
        )}
        
        {(!hasImage || !isBackgroundImage) && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        )}

        {/* Main content wrapper */}
        <div className={cn("relative z-10 p-6 md:p-8 h-full flex flex-col", imageStyles.containerClass)}>
          
          {/* Positioned Image (non-background) */}
          {hasImage && !isBackgroundImage && imagePosition !== 'corner' && imagePosition !== 'inline' && (
            <img 
              src={slide.imageUrl} 
              alt=""
              className={imageStyles.imageClass}
            />
          )}
          
          {/* Corner Image */}
          {hasImage && imagePosition === 'corner' && (
            <img 
              src={slide.imageUrl} 
              alt=""
              className={imageStyles.imageClass}
            />
          )}

          {/* Content area */}
          <div className={cn("flex-1 flex flex-col", imageStyles.contentClass)}>
            
            {/* Inline Image */}
            {hasImage && imagePosition === 'inline' && (
              <img 
                src={slide.imageUrl} 
                alt=""
                className={imageStyles.imageClass}
              />
            )}

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

            {/* Default Layout */}
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
          </div>

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
      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      {/* Slide Display Area */}
      <div className="relative flex-1 bg-muted/50 min-h-[300px] md:min-h-[400px]">
        {currentSlide && renderSlideContent(currentSlide)}
        
        {/* Slide Counter */}
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          {currentSlideIndex + 1} / {slides.length}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevSlide} disabled={currentSlideIndex === 0}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar (only if audio) */}
          {audioUrl && duration > 0 && (
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
            </div>
          )}

          {/* Volume Controls */}
          {audioUrl && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={(v) => setVolume(v[0])}
                className="w-20"
              />
            </div>
          )}

          {/* Fullscreen Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            <Maximize className="w-4 h-4" />
          </Button>
        </div>

        {/* Slide Thumbnails */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "flex-shrink-0 w-16 h-10 rounded border-2 overflow-hidden transition-all",
                index === currentSlideIndex 
                  ? "border-primary ring-2 ring-primary/50" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <div 
                className="w-full h-full flex items-center justify-center text-[8px] text-white font-medium"
                style={{ background: getLayoutBackground(slide.layout, slide.backgroundColor) }}
              >
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
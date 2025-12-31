import * as React from 'react';
import { Slide } from '@/types/course';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import { DemoWatermark } from '@/components/DemoWatermark';

interface SlidePreviewCardProps {
  slide: Slide;
  showWatermark?: boolean;
  className?: string;
}

// Helper to clean markdown from content - ROBUST version
const cleanMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    // Remove bold formatting: **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic formatting: *text* or _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove any remaining asterisks
    .replace(/\*/g, '')
    // Remove headers: # ## ### etc
    .replace(/^#{1,6}\s*/gm, '')
    // Remove bullet prefixes (we add our own later)
    .replace(/^[\s]*[-•]\s*/gm, '')
    // Remove numbered list prefixes
    .replace(/^[\s]*\d+\.\s*/gm, '')
    // Remove code backticks
    .replace(/`([^`]+)`/g, '$1')
    .replace(/`/g, '')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Clean up any double spaces
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

export const SlidePreviewCard = React.forwardRef<HTMLDivElement, SlidePreviewCardProps>(
  ({ slide, showWatermark, className }, ref) => {
  const IconComponent = getIcon(slide.iconSuggestion);
  const bulletPoints = slide.bulletPoints || [];
  const cleanedTitle = cleanMarkdown(slide.title);
  const cleanedSubtitle = slide.subtitle ? cleanMarkdown(slide.subtitle) : null;
  const cleanedContent = cleanMarkdown(slide.content);
  const cleanedKeyTakeaway = slide.keyTakeaway ? cleanMarkdown(slide.keyTakeaway) : null;
  
  // Extract bullet points from content if not provided
  const effectiveBulletPoints = bulletPoints.length > 0 
    ? bulletPoints.map(cleanMarkdown).filter(Boolean)
    : cleanedContent.split('\n').filter(line => line.trim()).slice(0, 5);

  return (
    <div 
      ref={ref}
      className={cn(
        "aspect-video rounded-xl border-2 border-border/50 overflow-hidden relative shadow-lg",
        className
      )}
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
      <div className="relative z-10 p-4 md:p-6 h-full flex flex-col">
        {/* Title Slide Layout */}
        {slide.layout === 'title' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            {IconComponent && (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
            )}
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-lg leading-tight">
              {cleanedTitle}
            </h2>
            {cleanedSubtitle && (
              <p className="text-base md:text-lg text-white/80 max-w-md">
                {cleanedSubtitle}
              </p>
            )}
          </div>
        )}

        {/* Key Point Layout */}
        {slide.layout === 'key-point' && (
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <Badge variant="secondary" className="self-start text-xs bg-white/20 text-white backdrop-blur-sm border-0">
              {getLayoutLabel(slide.layout)}
            </Badge>
            <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">
              {cleanedTitle}
            </h3>
            {cleanedKeyTakeaway && (
              <div className="p-3 md:p-4 bg-white/15 backdrop-blur-sm rounded-lg border border-white/25">
                <p className="text-base md:text-lg text-white font-semibold leading-relaxed">
                  {cleanedKeyTakeaway}
                </p>
              </div>
            )}
            {effectiveBulletPoints.length > 0 && (
              <ul className="space-y-1.5 mt-2">
                {effectiveBulletPoints.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-2 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Stats Layout */}
        {slide.layout === 'stats' && (
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <Badge variant="secondary" className="self-start text-xs bg-white/20 text-white backdrop-blur-sm border-0">
              Statistik
            </Badge>
            <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">
              {cleanedTitle}
            </h3>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mt-2">
              {effectiveBulletPoints.slice(0, 4).map((point, idx) => (
                <div key={idx} className="bg-white/15 backdrop-blur-sm rounded-lg p-2 md:p-3 text-center border border-white/20">
                  <p className="text-white/95 text-xs md:text-sm font-medium">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote Layout */}
        {slide.layout === 'quote' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 px-2">
            <div className="text-4xl md:text-5xl text-white/30 font-serif">"</div>
            <blockquote className="text-base md:text-lg text-white italic font-medium leading-relaxed max-w-lg">
              {cleanedKeyTakeaway || effectiveBulletPoints[0] || cleanedContent}
            </blockquote>
            <div className="text-4xl md:text-5xl text-white/30 font-serif">"</div>
            {(cleanedSubtitle || cleanedTitle) && (
              <p className="text-white/70 text-xs md:text-sm mt-1">— {cleanedSubtitle || cleanedTitle}</p>
            )}
          </div>
        )}

        {/* Comparison Layout */}
        {slide.layout === 'comparison' && (
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg text-center">
              {cleanedTitle}
            </h3>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mt-2">
              {effectiveBulletPoints.slice(0, 4).map((point, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-2 md:p-3 rounded-lg border",
                    idx % 2 === 0 
                      ? "bg-emerald-500/20 border-emerald-500/30" 
                      : "bg-blue-500/20 border-blue-500/30"
                  )}
                >
                  <p className="text-white/90 text-xs md:text-sm">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bullet Points Layout */}
        {slide.layout === 'bullet-points' && (
          <div className="flex-1 flex flex-col justify-end space-y-2">
            <Badge variant="secondary" className="self-start mb-1 text-xs bg-white/20 text-white backdrop-blur-sm border-0">
              {getLayoutLabel(slide.layout)}
            </Badge>
            <h3 className="text-lg md:text-xl font-bold mb-2 text-white drop-shadow-lg">
              {cleanedTitle}
            </h3>
            {cleanedSubtitle && (
              <p className="text-white/70 text-xs mb-1">{cleanedSubtitle}</p>
            )}
            <ul className="space-y-1.5">
              {effectiveBulletPoints.slice(0, 5).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-2 flex-shrink-0" />
                  <span className="text-xs md:text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Default / Title-Content / Image-Focus Layout */}
        {!['title', 'key-point', 'stats', 'quote', 'bullet-points', 'comparison'].includes(slide.layout) && (
          <div className="flex-1 flex flex-col justify-end space-y-2">
            <Badge variant="secondary" className="self-start mb-1 text-xs bg-white/20 text-white backdrop-blur-sm border-0">
              {getLayoutLabel(slide.layout)}
            </Badge>
            <h3 className="text-lg md:text-xl font-bold mb-2 text-white drop-shadow-lg line-clamp-2">
              {cleanedTitle}
            </h3>
            {cleanedSubtitle && (
              <p className="text-white/70 text-xs mb-1">{cleanedSubtitle}</p>
            )}
            {effectiveBulletPoints.length > 0 ? (
              <ul className="space-y-1.5">
                {effectiveBulletPoints.slice(0, 4).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-2 flex-shrink-0" />
                    <span className="text-xs md:text-sm leading-relaxed line-clamp-2">{point}</span>
                  </li>
                ))}
              </ul>
            ) : cleanedKeyTakeaway && (
              <p className="text-sm text-white/90 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                {cleanedKeyTakeaway}
              </p>
            )}
          </div>
        )}

        {/* Key Takeaway Footer (for non-key-point/quote layouts with takeaway) */}
        {cleanedKeyTakeaway && !['key-point', 'quote', 'title'].includes(slide.layout) && (
          <div className="mt-auto pt-2 border-t border-white/20">
            <p className="text-xs text-white/80 italic line-clamp-2">
              💡 {cleanedKeyTakeaway}
            </p>
          </div>
        )}

        {/* Image Attribution */}
        {slide.imageAttribution && (
          <p className="absolute bottom-1.5 right-2 text-[10px] text-white/50">
            📷 {slide.imageAttribution}
          </p>
        )}
      </div>

      {/* Demo Watermark */}
      {showWatermark && <DemoWatermark />}
    </div>
  );
});

SlidePreviewCard.displayName = 'SlidePreviewCard';

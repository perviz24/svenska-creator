import { PresentationSettings, PresentationStyle, ImageRichness, ProfessionalityLevel } from '@/types/course';
import { Image, BarChart3, Sparkles, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LiveSlidePreviewProps {
  settings?: PresentationSettings;
  topic?: string;
}

interface ThemeColors {
  background: string;
  cardBg: string;
  headerBg: string;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
  bulletColor: string;
}

const getThemeColors = (style: PresentationStyle, primaryColor: string, accentColor: string): ThemeColors => {
  switch (style) {
    case 'modern':
      return {
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        cardBg: '#ffffff',
        headerBg: primaryColor,
        titleColor: '#1e3a5f',
        bodyColor: '#475569',
        accentColor: primaryColor,
        bulletColor: primaryColor,
      };
    case 'classic':
      return {
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
        cardBg: '#ffffff',
        headerBg: '#be185d',
        titleColor: '#831843',
        bodyColor: '#64748b',
        accentColor: '#ec4899',
        bulletColor: '#be185d',
      };
    case 'minimal':
      return {
        background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
        cardBg: '#ffffff',
        headerBg: '#0d9488',
        titleColor: '#134e4a',
        bodyColor: '#64748b',
        accentColor: '#14b8a6',
        bulletColor: '#0d9488',
      };
    case 'creative':
      return {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        cardBg: '#ffffff',
        headerBg: '#d97706',
        titleColor: '#92400e',
        bodyColor: '#78350f',
        accentColor: '#f59e0b',
        bulletColor: '#ea580c',
      };
    case 'corporate':
      return {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        cardBg: '#334155',
        headerBg: '#3b82f6',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        accentColor: '#60a5fa',
        bulletColor: '#3b82f6',
      };
    default:
      return {
        background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}25 100%)`,
        cardBg: '#ffffff',
        headerBg: primaryColor,
        titleColor: '#1e293b',
        bodyColor: '#64748b',
        accentColor: accentColor,
        bulletColor: primaryColor,
      };
  }
};

const getStyleClasses = (style: PresentationStyle) => {
  switch (style) {
    case 'modern':
      return { container: 'rounded-xl', title: 'font-bold', body: 'font-light', card: 'rounded-lg' };
    case 'classic':
      return { container: 'rounded-sm', title: 'font-serif font-semibold', body: 'font-serif', card: 'rounded-sm border' };
    case 'minimal':
      return { container: 'rounded-lg', title: 'font-medium tracking-wide', body: 'font-light', card: 'rounded-md' };
    case 'creative':
      return { container: 'rounded-2xl', title: 'font-black', body: 'font-medium', card: 'rounded-xl' };
    case 'corporate':
      return { container: 'rounded-none', title: 'font-semibold uppercase tracking-wider', body: 'font-normal', card: 'rounded-none border-l-2' };
    default:
      return { container: 'rounded-lg', title: 'font-semibold', body: 'font-normal', card: 'rounded-md' };
  }
};

const getSampleContent = (professionality: ProfessionalityLevel, topic?: string) => {
  const topicTitle = topic || 'Din presentation';
  
  const slides = [
    {
      title: professionality === 'very-formal' ? 'VÄLKOMMEN' : professionality === 'very-casual' ? `Hej! 👋 ${topicTitle}` : `Välkommen till ${topicTitle}`,
      bullets: professionality === 'very-formal' 
        ? ['Strategisk översikt', 'Mål och syfte', 'Förväntade resultat']
        : professionality === 'very-casual'
        ? ['Vad vi ska prata om idag', 'Varför det är viktigt', 'Vad du får med dig']
        : ['Introduktion till ämnet', 'Huvudpunkter vi går igenom', 'Mål med presentationen'],
    },
    {
      title: professionality === 'very-formal' ? 'BAKGRUND & KONTEXT' : 'Bakgrund',
      bullets: professionality === 'very-formal'
        ? ['Nulägesanalys', 'Marknadsutveckling', 'Strategiska utmaningar']
        : ['Historisk utveckling', 'Nuvarande situation', 'Varför förändring behövs'],
    },
    {
      title: professionality === 'very-formal' ? 'NYCKELINSIKTER' : 'Huvudpunkter',
      bullets: professionality === 'very-formal'
        ? ['Datadriven analys', 'KPI-uppföljning', 'Benchmarking mot bransch']
        : ['Viktiga lärdomar', 'Praktiska tips', 'Konkreta exempel'],
    },
  ];
  
  return slides;
};

export function LiveSlidePreview({ settings, topic }: LiveSlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const style = settings?.style || 'modern';
  const primaryColor = settings?.primaryColor || '#6366f1';
  const accentColor = settings?.accentColor || '#f59e0b';
  const imageRichness = settings?.imageRichness || 'moderate';
  const professionality = settings?.professionalityLevel || 'professional';
  const includeAnimations = settings?.includeAnimations ?? true;
  const includeCharts = settings?.includeCharts ?? false;
  
  const colors = getThemeColors(style, primaryColor, accentColor);
  const styleClasses = getStyleClasses(style);
  const slides = getSampleContent(professionality, topic);
  
  // Auto-cycle slides for demo effect
  useEffect(() => {
    if (!includeAnimations) return;
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsAnimating(false);
      }, 150);
    }, 4000);
    return () => clearInterval(interval);
  }, [includeAnimations, slides.length]);
  
  const goToSlide = (direction: 'prev' | 'next') => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide((prev) => 
        direction === 'next' 
          ? (prev + 1) % slides.length 
          : (prev - 1 + slides.length) % slides.length
      );
      setIsAnimating(false);
    }, 150);
  };
  
  const currentContent = slides[currentSlide];
  const showImage = imageRichness !== 'minimal';
  const showChart = includeCharts && currentSlide === 2;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live förhandsvisning</p>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => goToSlide('prev')}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {currentSlide + 1}/{slides.length}
          </span>
          <button 
            onClick={() => goToSlide('next')}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      
      {/* Slide Container */}
      <div 
        className={cn(
          'relative aspect-video overflow-hidden shadow-xl transition-all duration-500',
          styleClasses.container,
          includeAnimations && 'hover:shadow-2xl hover:scale-[1.01]'
        )}
        style={{ background: colors.background }}
      >
        {/* Header bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: colors.headerBg }}
        />
        
        {/* Slide content */}
        <div 
          className={cn(
            'p-4 pt-5 h-full flex flex-col transition-all duration-300',
            isAnimating && 'opacity-0 translate-x-4'
          )}
        >
          {/* Title */}
          <h3 
            className={cn('text-sm leading-tight mb-2', styleClasses.title)}
            style={{ color: colors.titleColor }}
          >
            {currentContent.title}
          </h3>
          
          {/* Content area */}
          <div className="flex-1 flex gap-3">
            {/* Bullet points */}
            <div className={cn('flex-1', showImage && 'max-w-[55%]')}>
              <ul className="space-y-1.5">
                {currentContent.bullets.map((bullet, idx) => (
                  <li 
                    key={idx} 
                    className={cn('flex items-start gap-2 text-[10px] leading-tight', styleClasses.body)}
                    style={{ 
                      color: colors.bodyColor,
                      animationDelay: includeAnimations ? `${idx * 100}ms` : undefined,
                    }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                      style={{ background: colors.bulletColor }}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Visual content area */}
            {showImage && (
              <div 
                className={cn('w-[40%] flex items-center justify-center', styleClasses.card)}
                style={{ 
                  background: style === 'corporate' ? colors.cardBg : `${colors.accentColor}15`,
                  borderColor: colors.accentColor,
                }}
              >
                {showChart ? (
                  <div className="flex flex-col items-center gap-1">
                    <BarChart3 className="w-6 h-6" style={{ color: colors.accentColor }} />
                    <span className="text-[8px]" style={{ color: colors.bodyColor }}>Diagram</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Image className="w-6 h-6" style={{ color: colors.accentColor }} />
                    <span className="text-[8px]" style={{ color: colors.bodyColor }}>AI-genererad bild</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t" style={{ borderColor: `${colors.accentColor}30` }}>
            <span className="text-[8px]" style={{ color: colors.bodyColor }}>
              {topic || 'Presentation'}
            </span>
            <div className="flex items-center gap-2">
              {includeAnimations && (
                <div className="flex items-center gap-0.5">
                  <Play className="w-2 h-2" style={{ color: colors.accentColor }} />
                  <span className="text-[7px]" style={{ color: colors.bodyColor }}>Animerad</span>
                </div>
              )}
              <span className="text-[8px] font-medium" style={{ color: colors.accentColor }}>
                {currentSlide + 1}/{settings?.slideCount || 10}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Theme indicator */}
      <div className="flex items-center justify-center gap-2">
        <div 
          className="h-1 w-8 rounded-full"
          style={{ background: colors.headerBg }}
        />
        <span className="text-[9px] text-muted-foreground">
          {style === 'modern' ? 'Modern Blå' : 
           style === 'classic' ? 'Klassisk Rosa' :
           style === 'minimal' ? 'Minimal Teal' :
           style === 'creative' ? 'Kreativ Gul' :
           style === 'corporate' ? 'Företag Mörk' : 'Anpassad'}
        </span>
        <div 
          className="h-1 w-8 rounded-full"
          style={{ background: colors.accentColor }}
        />
      </div>
    </div>
  );
}

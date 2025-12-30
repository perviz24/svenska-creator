import { PresentationSettings, PresentationStyle, ImageRichness, ProfessionalityLevel } from '@/types/course';
import { Image, BarChart3, Sparkles } from 'lucide-react';

interface PresentationPreviewCardProps {
  settings?: PresentationSettings;
}

const getStyleClasses = (style: PresentationStyle): { container: string; title: string; body: string } => {
  switch (style) {
    case 'modern':
      return { container: 'rounded-xl', title: 'font-bold', body: 'font-light' };
    case 'classic':
      return { container: 'rounded-sm border-2', title: 'font-serif font-semibold', body: 'font-serif' };
    case 'minimal':
      return { container: 'rounded-lg', title: 'font-medium tracking-wide', body: 'font-light text-sm' };
    case 'creative':
      return { container: 'rounded-2xl rotate-1', title: 'font-black italic', body: 'font-medium' };
    case 'corporate':
      return { container: 'rounded-none border-l-4', title: 'font-semibold uppercase tracking-wider text-xs', body: 'font-normal' };
    default:
      return { container: 'rounded-lg', title: 'font-semibold', body: 'font-normal' };
  }
};

const getImagePlaceholders = (richness: ImageRichness): number => {
  switch (richness) {
    case 'minimal': return 0;
    case 'moderate': return 1;
    case 'rich': return 2;
    case 'visual-heavy': return 3;
    default: return 1;
  }
};

const getToneText = (professionality: ProfessionalityLevel): { title: string; subtitle: string } => {
  switch (professionality) {
    case 'very-casual':
      return { title: 'Hej allihopa! 👋', subtitle: 'Kolla in det här...' };
    case 'casual':
      return { title: 'Välkommen!', subtitle: 'Idag tittar vi på...' };
    case 'balanced':
      return { title: 'Introduktion', subtitle: 'Dagens agenda och mål' };
    case 'professional':
      return { title: 'Verksamhetsöversikt', subtitle: 'Strategisk sammanfattning Q4' };
    case 'very-formal':
      return { title: 'EXECUTIVE SUMMARY', subtitle: 'Kvartalsrapport & Prognos' };
    default:
      return { title: 'Presentation', subtitle: 'Innehållsöversikt' };
  }
};

export function PresentationPreviewCard({ settings }: PresentationPreviewCardProps) {
  const style = settings?.style || 'modern';
  const primaryColor = settings?.primaryColor || '#6366f1';
  const accentColor = settings?.accentColor || '#f59e0b';
  const imageRichness = settings?.imageRichness || 'moderate';
  const professionality = settings?.professionalityLevel || 'professional';
  const includeAnimations = settings?.includeAnimations ?? true;
  const includeCharts = settings?.includeCharts ?? false;

  const styleClasses = getStyleClasses(style);
  const imagePlaceholders = getImagePlaceholders(imageRichness);
  const toneText = getToneText(professionality);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">Förhandsvisning</p>
      
      {/* Mini slide preview */}
      <div 
        className={`relative aspect-video overflow-hidden shadow-lg transition-all duration-300 ${styleClasses.container} ${includeAnimations ? 'hover:scale-[1.02]' : ''}`}
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 50%, ${primaryColor}bb 100%)`,
          borderColor: primaryColor,
        }}
      >
        {/* Header bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: primaryColor }}
        />
        
        {/* Content area */}
        <div className="p-3 pt-4 h-full flex flex-col">
          {/* Title */}
          <h3 
            className={`text-sm leading-tight mb-1 ${styleClasses.title}`}
            style={{ color: '#ffffff' }}
          >
            {toneText.title}
          </h3>
          <p className={`text-[10px] mb-2 ${styleClasses.body}`} style={{ color: 'rgba(255,255,255,0.8)' }}>
            {toneText.subtitle}
          </p>
          
          {/* Content blocks */}
          <div className="flex-1 flex gap-2">
            {/* Text content */}
            <div className={`flex-1 space-y-1 ${imagePlaceholders >= 2 ? 'max-w-[40%]' : imagePlaceholders === 1 ? 'max-w-[55%]' : ''}`}>
              <div className="h-1 rounded-full bg-white/40 w-full" />
              <div className="h-1 rounded-full bg-white/30 w-4/5" />
              <div className="h-1 rounded-full bg-white/25 w-3/5" />
              {professionality !== 'very-casual' && (
                <>
                  <div className="h-1 rounded-full bg-white/30 w-full mt-2" />
                  <div className="h-1 rounded-full bg-white/25 w-2/3" />
                </>
              )}
            </div>
            
            {/* Image placeholders */}
            {imagePlaceholders > 0 && (
              <div className={`flex gap-1 ${imagePlaceholders >= 2 ? 'flex-1' : 'w-[40%]'}`}>
                <div 
                  className="flex-1 rounded-md flex items-center justify-center"
                  style={{ background: `${accentColor}30` }}
                >
                  <Image className="w-4 h-4" style={{ color: accentColor }} />
                </div>
                {imagePlaceholders >= 2 && (
                  <div 
                    className="flex-1 rounded-md flex items-center justify-center"
                    style={{ background: `${primaryColor}20` }}
                  >
                    {includeCharts ? (
                      <BarChart3 className="w-4 h-4" style={{ color: primaryColor }} />
                    ) : (
                      <Image className="w-4 h-4" style={{ color: primaryColor }} />
                    )}
                  </div>
                )}
                {imagePlaceholders >= 3 && (
                  <div 
                    className="flex-1 rounded-md flex items-center justify-center"
                    style={{ background: `${accentColor}25` }}
                  >
                    <Image className="w-3 h-3" style={{ color: accentColor }} />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer indicator */}
          {includeAnimations && (
            <div className="absolute bottom-1.5 right-2 flex items-center gap-0.5">
              <Sparkles className="w-2 h-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
              <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Animerad</span>
            </div>
          )}
        </div>
        
        {/* Slide number */}
        <div 
          className="absolute bottom-1.5 left-2 text-[8px] font-medium"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          1 / {settings?.slideCount || 10}
        </div>
      </div>
      
      {/* Style indicator badges */}
      <div className="flex flex-wrap gap-1 justify-center">
        <span 
          className="text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ background: `${primaryColor}20`, color: primaryColor }}
        >
          {style.charAt(0).toUpperCase() + style.slice(1)}
        </span>
        <span 
          className="text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ background: `${accentColor}20`, color: accentColor }}
        >
          {imageRichness === 'visual-heavy' ? 'Visuellt' : imageRichness === 'rich' ? 'Rik' : imageRichness === 'moderate' ? 'Balanserad' : 'Minimal'}
        </span>
      </div>
    </div>
  );
}
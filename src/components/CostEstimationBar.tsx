import { useMemo, useState } from 'react';
import { CourseOutline, CourseSettings, ModuleScript, Slide, VideoSettings } from '@/types/course';
import { Calculator, ChevronDown, ChevronUp, Cpu, Volume2, Image, Video, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface CostEstimationBarProps {
  settings: CourseSettings;
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  slides: Record<string, Slide[]>;
  videoSettings: VideoSettings;
}

// Pricing constants in SEK (Swedish Krona)
// Exchange rates: 1 USD ≈ 10.5 SEK, 1 EUR ≈ 11.5 SEK
const PRICING = {
  // AI Model costs per 1000 tokens (input + output average)
  ai: {
    fast: 0.05, // SEK per 1000 tokens (flash models)
    quality: 0.50, // SEK per 1000 tokens (pro/gpt-5 models)
  },
  // Voice generation costs per minute
  voice: {
    elevenlabs: 1.50, // SEK per minute
    standard: 0.50, // SEK per minute (basic TTS)
  },
  // Slide generation costs
  slide: {
    basic: 0.25, // SEK per slide (text only)
    withImage: 1.00, // SEK per slide with stock image
    withAiImage: 2.50, // SEK per slide with AI-generated image
  },
  // Video generation costs per minute
  video: {
    avatar: 25.00, // SEK per minute (HeyGen avatar)
    presentation: 5.00, // SEK per minute (presentation style)
  },
  // Exchange rates
  exchangeRates: {
    usd: 0.095, // 1 SEK = 0.095 USD
    eur: 0.087, // 1 SEK = 0.087 EUR
  }
};

type Currency = 'sek' | 'usd' | 'eur';

export const CostEstimationBar = ({
  settings,
  outline,
  scripts,
  slides,
  videoSettings,
}: CostEstimationBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currency, setCurrency] = useState<Currency>('sek');

  const costs = useMemo(() => {
    const moduleCount = outline?.modules?.length || 1;
    
    // Estimate tokens based on content
    const estimatedTitleTokens = 500; // Title generation
    const estimatedOutlineTokens = 2000 * moduleCount; // Outline generation
    const estimatedScriptTokensPerModule = 5000; // Script generation per module
    const estimatedSlideTokensPerModule = 1500; // Slide generation per module
    const estimatedQuizTokensPerModule = 1000; // Quiz generation
    const estimatedExerciseTokensPerModule = 1500; // Exercise generation
    
    const totalTokens = 
      estimatedTitleTokens +
      estimatedOutlineTokens +
      (estimatedScriptTokensPerModule * moduleCount) +
      (estimatedSlideTokensPerModule * moduleCount) +
      (estimatedQuizTokensPerModule * moduleCount) +
      (estimatedExerciseTokensPerModule * moduleCount);
    
    // AI costs
    const tokenCostPer1000 = settings.aiQualityMode === 'quality' 
      ? PRICING.ai.quality 
      : PRICING.ai.fast;
    const aiCost = (totalTokens / 1000) * tokenCostPer1000;
    
    // Voice costs - estimate duration from scripts
    const totalScriptWords = scripts.reduce((sum, script) => sum + (script.totalWords || 0), 0);
    const estimatedMinutes = totalScriptWords > 0 
      ? totalScriptWords / 150 // Average 150 words per minute
      : moduleCount * 5; // Default 5 min per module if no scripts
    const voiceCostPerMinute = settings.voiceId?.includes('eleven') 
      ? PRICING.voice.elevenlabs 
      : PRICING.voice.standard;
    const voiceCost = estimatedMinutes * voiceCostPerMinute;
    
    // Slide costs
    const totalSlides = Object.values(slides).reduce((sum, moduleSlides) => sum + moduleSlides.length, 0) 
      || (moduleCount * (settings.structureLimits?.slidesPerModule || 8));
    const slidesWithImages = Math.floor(totalSlides * 0.6); // Assume 60% have images
    const slidesWithAiImages = Math.floor(totalSlides * 0.2); // Assume 20% have AI images
    const basicSlides = totalSlides - slidesWithImages - slidesWithAiImages;
    const slideCost = 
      (basicSlides * PRICING.slide.basic) +
      (slidesWithImages * PRICING.slide.withImage) +
      (slidesWithAiImages * PRICING.slide.withAiImage);
    
    // Video costs
    const videoDurationMinutes = estimatedMinutes;
    const videoCostPerMinute = videoSettings.videoStyle === 'avatar' 
      ? PRICING.video.avatar 
      : PRICING.video.presentation;
    const videoCost = videoDurationMinutes * videoCostPerMinute;
    
    const totalCost = aiCost + voiceCost + slideCost + videoCost;
    
    return {
      ai: aiCost,
      voice: voiceCost,
      slides: slideCost,
      video: videoCost,
      total: totalCost,
      details: {
        moduleCount,
        totalTokens,
        estimatedMinutes: Math.round(estimatedMinutes),
        totalSlides,
      }
    };
  }, [settings, outline, scripts, slides, videoSettings]);

  const formatCurrency = (amount: number, curr: Currency = currency): string => {
    switch (curr) {
      case 'usd':
        return `$${(amount * PRICING.exchangeRates.usd).toFixed(2)}`;
      case 'eur':
        return `€${(amount * PRICING.exchangeRates.eur).toFixed(2)}`;
      default:
        return `${amount.toFixed(2)} kr`;
    }
  };

  const getCurrencySymbol = (curr: Currency): string => {
    switch (curr) {
      case 'usd': return 'USD';
      case 'eur': return 'EUR';
      default: return 'SEK';
    }
  };

  return (
    <div className="mb-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-lg overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground">Beräknad kostnad</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({costs.details.moduleCount} moduler, ~{costs.details.estimatedMinutes} min)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {/* Currency toggle badges */}
                <div className="flex gap-1">
                  {(['sek', 'usd', 'eur'] as Currency[]).map((curr) => (
                    <Badge
                      key={curr}
                      variant={currency === curr ? 'default' : 'outline'}
                      className={`cursor-pointer text-xs px-2 py-0.5 ${
                        currency === curr 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrency(curr);
                      }}
                    >
                      {getCurrencySymbol(curr)}
                    </Badge>
                  ))}
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(costs.total)}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-primary/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* AI Generation Cost */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-muted-foreground">AI-generering</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(costs.ai)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {settings.aiQualityMode === 'quality' ? 'Pro-modeller' : 'Snabbmodeller'}
                </div>
              </div>
              
              {/* Voice Cost */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-muted-foreground">Röstgenerering</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(costs.voice)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ~{costs.details.estimatedMinutes} min ljud
                </div>
              </div>
              
              {/* Slides Cost */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground">Slides & bilder</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(costs.slides)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {costs.details.totalSlides} slides
                </div>
              </div>
              
              {/* Video Cost */}
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground">Videogenerering</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatCurrency(costs.video)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {videoSettings.videoStyle === 'avatar' ? 'AI Avatar' : 'Presentation'}
                </div>
              </div>
            </div>
            
            {/* Footer note */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                * Uppskattade kostnader baserade på aktuella inställningar. Faktisk kostnad kan variera.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>
                  {formatCurrency(costs.total, 'sek')} ≈ {formatCurrency(costs.total, 'usd')} ≈ {formatCurrency(costs.total, 'eur')}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Layers, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Target,
  BarChart3
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type ComprehensiveLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseLengthPreset = 'short' | 'standard' | 'comprehensive';

export interface CourseStructureLimits {
  maxModules: number;
  slidesPerModule: number;
  courseLengthPreset: CourseLengthPreset;
  comprehensiveLevel: ComprehensiveLevel;
}

export interface AIStructurePreview {
  estimatedModules: number;
  estimatedSubmodulesPerModule: number;
  estimatedSlidesPerModule: number;
  estimatedTotalSlides: number;
  estimatedDurationMinutes: number;
  confidence: number;
  reasoning?: string;
}

interface CourseStructureSettingsProps {
  limits: CourseStructureLimits;
  aiPreview?: AIStructurePreview;
  isLoadingPreview?: boolean;
  onLimitsChange: (limits: CourseStructureLimits) => void;
  onRequestAIPreview?: () => void;
}

const COURSE_LENGTH_PRESETS: Record<CourseLengthPreset, { label: string; duration: number; description: string }> = {
  short: { label: 'Kort', duration: 30, description: '~30 min, 3-5 moduler' },
  standard: { label: 'Standard', duration: 60, description: '~60 min, 6-10 moduler' },
  comprehensive: { label: 'Omfattande', duration: 120, description: '120+ min, 10-20 moduler' },
};

const COMPREHENSIVE_LEVELS: Record<ComprehensiveLevel, { label: string; description: string; icon: React.ElementType }> = {
  beginner: { label: 'Nybörjare', description: 'Grundläggande introduktion', icon: Target },
  intermediate: { label: 'Medel', description: 'Balanserat djup och bredd', icon: BarChart3 },
  advanced: { label: 'Avancerad', description: 'Djupgående och detaljerad', icon: Lightbulb },
};

export function CourseStructureSettings({
  limits,
  aiPreview,
  isLoadingPreview,
  onLimitsChange,
  onRequestAIPreview,
}: CourseStructureSettingsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handlePresetChange = (preset: CourseLengthPreset) => {
    const presetDurations: Record<CourseLengthPreset, { modules: number; slides: number }> = {
      short: { modules: 5, slides: 12 },
      standard: { modules: 10, slides: 18 },
      comprehensive: { modules: 20, slides: 25 },
    };
    
    onLimitsChange({
      ...limits,
      courseLengthPreset: preset,
      maxModules: presetDurations[preset].modules,
      slidesPerModule: presetDurations[preset].slides,
    });
  };

  const handleLevelChange = (level: ComprehensiveLevel) => {
    onLimitsChange({ ...limits, comprehensiveLevel: level });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Kursstruktur
        </CardTitle>
        <CardDescription>
          Välj omfattning och detaljnivå för din kurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comprehensiveness Level */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Kunskapsnivå</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(COMPREHENSIVE_LEVELS) as [ComprehensiveLevel, typeof COMPREHENSIVE_LEVELS[ComprehensiveLevel]][]).map(([level, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={level}
                  onClick={() => handleLevelChange(level)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    limits.comprehensiveLevel === level
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    limits.comprehensiveLevel === level ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{config.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Course Length Preset */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Kurslängd</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(COURSE_LENGTH_PRESETS) as [CourseLengthPreset, typeof COURSE_LENGTH_PRESETS[CourseLengthPreset]][]).map(([preset, config]) => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  limits.courseLengthPreset === preset
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Clock className={cn(
                  "w-4 h-4",
                  limits.courseLengthPreset === preset ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">{config.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Preview */}
        {aiPreview && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI-förhandsvisning</span>
              <Badge variant="secondary" className="text-xs">
                {Math.round(aiPreview.confidence * 100)}% säkerhet
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span>{aiPreview.estimatedModules} moduler</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span>~{aiPreview.estimatedSubmodulesPerModule} delämnen/modul</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span>~{aiPreview.estimatedTotalSlides} slides totalt</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>~{aiPreview.estimatedDurationMinutes} min</span>
              </div>
            </div>
            {aiPreview.reasoning && (
              <p className="text-xs text-muted-foreground mt-2">{aiPreview.reasoning}</p>
            )}
          </div>
        )}

        {onRequestAIPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestAIPreview}
            disabled={isLoadingPreview}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isLoadingPreview ? 'Analyserar...' : 'Få AI-rekommendation'}
          </Button>
        )}

        {/* Advanced Settings */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Avancerade inställningar</span>
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Max Modules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Max antal moduler
                </Label>
                <Badge variant="outline">{limits.maxModules}</Badge>
              </div>
              <Slider
                value={[limits.maxModules]}
                onValueChange={([v]) => onLimitsChange({ ...limits, maxModules: v })}
                min={3}
                max={25}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Fler moduler ger mer detaljerad uppdelning
              </p>
            </div>

            {/* Slides Per Module */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  Slides per modul
                </Label>
                <Badge variant="outline">{limits.slidesPerModule}</Badge>
              </div>
              <Slider
                value={[limits.slidesPerModule]}
                onValueChange={([v]) => onLimitsChange({ ...limits, slidesPerModule: v })}
                min={5}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                15-25 slides rekommenderas för bra tempo
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

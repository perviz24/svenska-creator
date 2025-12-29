import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GraduationCap, Presentation, Clock, Layers, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { ProjectMode, PresentationSettings, CourseStructureLimits, AIStructurePreview } from '@/types/course';
import { cn } from '@/lib/utils';
import { CourseStructureSettings } from './CourseStructureSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModeSelectionStepProps {
  projectMode: ProjectMode;
  presentationSettings?: PresentationSettings;
  structureLimits?: CourseStructureLimits;
  courseTitle?: string;
  onModeChange: (mode: ProjectMode) => void;
  onPresentationSettingsChange: (settings: PresentationSettings) => void;
  onStructureLimitsChange: (limits: CourseStructureLimits) => void;
  onContinue: () => void;
}

export function ModeSelectionStep({
  projectMode,
  presentationSettings,
  structureLimits,
  courseTitle,
  onModeChange,
  onPresentationSettingsChange,
  onStructureLimitsChange,
  onContinue,
}: ModeSelectionStepProps) {
  const [slideCount, setSlideCount] = useState(presentationSettings?.slideCount || 10);
  const [duration, setDuration] = useState(presentationSettings?.presentationDuration || 15);
  const [aiPreview, setAiPreview] = useState<AIStructurePreview | undefined>();
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Default structure limits
  const defaultLimits: CourseStructureLimits = {
    maxModules: 10,
    slidesPerModule: 15,
    courseLengthPreset: 'standard',
    comprehensiveLevel: 'intermediate',
  };

  const currentLimits = structureLimits || defaultLimits;

  const handleModeChange = (mode: ProjectMode) => {
    onModeChange(mode);
    if (mode === 'presentation') {
      onPresentationSettingsChange({
        slideCount,
        presentationDuration: duration,
        topic: '',
      });
    }
  };

  const handleSlideCountChange = (value: number[]) => {
    setSlideCount(value[0]);
    if (projectMode === 'presentation') {
      onPresentationSettingsChange({
        ...presentationSettings,
        slideCount: value[0],
        presentationDuration: duration,
        topic: presentationSettings?.topic || '',
      });
    }
  };

  const handleDurationChange = (value: number[]) => {
    setDuration(value[0]);
    if (projectMode === 'presentation') {
      onPresentationSettingsChange({
        ...presentationSettings,
        slideCount,
        presentationDuration: value[0],
        topic: presentationSettings?.topic || '',
      });
    }
  };

  const handleRequestAIPreview = async () => {
    if (!courseTitle && projectMode === 'course') {
      toast.info('Ange en kurstitel först för AI-rekommendation');
      return;
    }

    setIsLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-course-structure', {
        body: {
          title: courseTitle || '',
          comprehensiveLevel: currentLimits.comprehensiveLevel,
          courseLengthPreset: currentLimits.courseLengthPreset,
          language: 'sv',
        },
      });

      if (error) throw error;
      if (data?.preview) {
        setAiPreview(data.preview);
        // Auto-apply AI recommendations
        onStructureLimitsChange({
          ...currentLimits,
          maxModules: data.preview.estimatedModules,
          slidesPerModule: data.preview.estimatedSlidesPerModule,
        });
        toast.success('AI-rekommendation mottagen');
      }
    } catch (err) {
      console.error('Error getting AI preview:', err);
      toast.error('Kunde inte hämta AI-rekommendation');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Vad vill du skapa?</h1>
        <p className="text-muted-foreground">
          Välj mellan att skapa en komplett kurs eller en enkel presentation
        </p>
      </div>

      <RadioGroup
        value={projectMode}
        onValueChange={(value) => handleModeChange(value as ProjectMode)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Course Option */}
        <Label htmlFor="mode-course" className="cursor-pointer">
          <Card className={cn(
            "relative transition-all hover:shadow-lg border-2",
            projectMode === 'course' 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-xl",
                  projectMode === 'course' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">Komplett kurs</CardTitle>
                </div>
                <RadioGroupItem value="course" id="mode-course" className="ml-auto" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Skapa en fullständig kurs med moduler, manus, slides, övningar, quiz och video.
                Perfekt för e-learning och utbildningar.
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Moduler</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Manus</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Slides</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Övningar</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Quiz</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Video</span>
              </div>
            </CardContent>
          </Card>
        </Label>

        {/* Presentation Option */}
        <Label htmlFor="mode-presentation" className="cursor-pointer">
          <Card className={cn(
            "relative transition-all hover:shadow-lg border-2",
            projectMode === 'presentation' 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-xl",
                  projectMode === 'presentation' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Presentation className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Presentation
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Snabbt
                    </span>
                  </CardTitle>
                </div>
                <RadioGroupItem value="presentation" id="mode-presentation" className="ml-auto" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Generera snabbt professionella slides från ett ämne. Perfekt för möten, 
                föredrag och presentationer.
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Slides</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Talanteckningar</span>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">Bilder</span>
              </div>
            </CardContent>
          </Card>
        </Label>
      </RadioGroup>

      {/* Presentation Settings */}
      {projectMode === 'presentation' && (
        <Card className="animate-in slide-in-from-top-2 duration-300">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Presentationsinställningar
            </CardTitle>
            <CardDescription>
              Anpassa din presentation efter dina behov
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Slide Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  Antal slides
                </Label>
                <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
                  {slideCount} slides
                </span>
              </div>
              <Slider
                value={[slideCount]}
                onValueChange={handleSlideCountChange}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                5-10 för korta presentationer, 15-20 för standard, 25-30 för djupgående
              </p>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Uppskattad längd
                </Label>
                <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
                  {duration} min
                </span>
              </div>
              <Slider
                value={[duration]}
                onValueChange={handleDurationChange}
                min={5}
                max={60}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                AI:n anpassar innehållsdjupet baserat på önskad presentationslängd
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Structure Settings */}
      {projectMode === 'course' && (
        <CourseStructureSettings
          limits={currentLimits}
          aiPreview={aiPreview}
          isLoadingPreview={isLoadingPreview}
          onLimitsChange={onStructureLimitsChange}
          onRequestAIPreview={handleRequestAIPreview}
        />
      )}

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button 
          size="lg" 
          onClick={onContinue}
          className="px-8"
        >
          Fortsätt
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

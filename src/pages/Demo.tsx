import { useState } from 'react';
import { Header } from '@/components/Header';
import { ProgressStepper } from '@/components/ProgressStepper';
import { ModeSelectionStep } from '@/components/ModeSelectionStep';
import { TitleStep } from '@/components/TitleStep';
import { SlideStep } from '@/components/SlideStep';
import { ExportStep } from '@/components/ExportStep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { 
  ProjectMode, 
  PresentationSettings, 
  CourseStructureLimits, 
  DemoModeSettings,
  WorkflowState,
  WorkflowStep,
  CourseSettings,
  VideoSettings,
  TitleSuggestion,
  CourseOutline,
  ModuleScript,
  Slide
} from '@/types/course';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const defaultDemoSettings: DemoModeSettings = {
  enabled: true,
  maxSlides: 5,
  maxModules: 2,
  maxAudioDurationSeconds: 60,
  maxVideoDurationSeconds: 30,
  watermarkEnabled: true,
};

const initialSettings: CourseSettings = {
  voiceId: 'sv-SE-MattiasNeural',
  voiceName: 'Mattias (Svenska, Maskulin)',
  targetDuration: 15,
  style: 'professional',
  includeQuizzes: true,
  enableResearch: true,
  language: 'sv',
  aiQualityMode: 'quality',
  projectMode: 'course',
  demoMode: defaultDemoSettings,
};

const initialVideoSettings: VideoSettings = {
  videoStyle: 'presentation',
};

const initialState: WorkflowState = {
  currentStep: 'mode',
  completedSteps: [],
  title: '',
  selectedTitleId: null,
  titleSuggestions: [],
  outline: null,
  scripts: [],
  slides: {},
  exercises: {},
  quizzes: {},
  summaries: {},
  moduleAudio: {},
  videoSettings: initialVideoSettings,
  settings: initialSettings,
  isProcessing: false,
  error: null,
};

const Demo = () => {
  const [state, setState] = useState<WorkflowState>(initialState);

  const setTitle = (title: string) => {
    setState(prev => ({ ...prev, title }));
  };

  const generateTitleSuggestions = async () => {
    if (!state.title.trim()) {
      toast.error('Ange en kurstitel först');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: { 
          title: state.title,
          language: state.settings.language,
          demoMode: true
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const suggestions: TitleSuggestion[] = (data.suggestions || []).slice(0, 3); // Limit for demo
      
      setState(prev => ({
        ...prev,
        titleSuggestions: suggestions,
        isProcessing: false,
      }));

      toast.success('Titelförslag genererade! (Demo)');
    } catch (error) {
      console.error('Error generating titles:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera titelförslag';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  };

  const selectTitle = (id: string) => {
    setState(prev => {
      const suggestion = prev.titleSuggestions.find(s => s.id === id);
      return {
        ...prev,
        selectedTitleId: id,
        title: suggestion?.title || prev.title,
      };
    });
  };

  const goToStep = (step: WorkflowStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    setState(prev => {
      // Demo uses simplified presentation workflow
      const demoSteps: WorkflowStep[] = ['mode', 'title', 'slides', 'upload'];
      const currentIndex = demoSteps.indexOf(prev.currentStep);
      
      if (currentIndex < demoSteps.length - 1) {
        const newStep = demoSteps[currentIndex + 1];
        return {
          ...prev,
          currentStep: newStep,
          completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        };
      }
      return prev;
    });
  };

  const updateSettings = (settings: Partial<CourseSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { 
        ...prev.settings, 
        ...settings,
        // Always keep demo mode enabled in demo page
        demoMode: {
          ...defaultDemoSettings,
          ...settings.demoMode,
          enabled: true,
        }
      },
    }));
  };

  const generateSlides = async (moduleId: string, script: ModuleScript) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-slides', {
        body: { 
          script,
          courseTitle: state.title,
          maxSlides: state.settings.demoMode?.maxSlides || 5,
          demoMode: true
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Limit slides to demo max
      const maxSlides = state.settings.demoMode?.maxSlides || 5;
      const slides: Slide[] = (data.slides || []).slice(0, maxSlides);
      
      setState(prev => ({
        ...prev,
        slides: {
          ...prev.slides,
          [moduleId]: slides,
        },
        isProcessing: false,
      }));

      toast.success(`${slides.length} demo-slides genererade!`);
    } catch (error) {
      console.error('Error generating slides:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera slides';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  };

  const updateSlide = (moduleId: string, slideIndex: number, updates: Partial<Slide>) => {
    setState(prev => {
      const moduleSlides = prev.slides[moduleId] || [];
      const updatedSlides = [...moduleSlides];
      if (updatedSlides[slideIndex]) {
        updatedSlides[slideIndex] = { ...updatedSlides[slideIndex], ...updates };
      }
      return {
        ...prev,
        slides: {
          ...prev.slides,
          [moduleId]: updatedSlides,
        },
      };
    });
  };

  const handleModeChange = (mode: ProjectMode) => {
    updateSettings({ projectMode: mode });
  };

  const handlePresentationSettingsChange = (settings: PresentationSettings) => {
    updateSettings({ presentationSettings: settings });
  };

  const handleStructureLimitsChange = (limits: CourseStructureLimits) => {
    updateSettings({ structureLimits: limits });
  };

  const handleDemoModeChange = (demoMode: DemoModeSettings) => {
    updateSettings({ demoMode: { ...demoMode, enabled: true } }); // Always keep enabled in demo
  };

  const handleContentUploaded = (content: string) => {
    toast.info('Innehåll importerat (Demo-läge)');
  };

  const startNewDemo = () => {
    setState(initialState);
    toast.success('Ny demo startad!');
  };

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 'mode':
        return (
          <ModeSelectionStep
            projectMode={state.settings.projectMode}
            presentationSettings={state.settings.presentationSettings}
            structureLimits={state.settings.structureLimits}
            courseTitle={state.title}
            demoMode={state.settings.demoMode}
            onModeChange={handleModeChange}
            onPresentationSettingsChange={handlePresentationSettingsChange}
            onStructureLimitsChange={handleStructureLimitsChange}
            onDemoModeChange={handleDemoModeChange}
            onContinue={nextStep}
          />
        );
      case 'title':
        return (
          <TitleStep
            initialTitle={state.title}
            suggestions={state.titleSuggestions}
            selectedId={state.selectedTitleId}
            isLoading={state.isProcessing}
            onTitleChange={setTitle}
            onGenerateSuggestions={generateTitleSuggestions}
            onSelectSuggestion={selectTitle}
            onContinue={nextStep}
            onContentUploaded={handleContentUploaded}
            onSkip={nextStep}
            projectMode={state.settings.projectMode}
          />
        );
      case 'slides':
        return (
          <SlideStep
            outline={state.outline}
            scripts={state.scripts}
            slides={state.slides}
            isLoading={state.isProcessing}
            courseTitle={state.title}
            demoMode={state.settings.demoMode}
            onGenerateSlides={generateSlides}
            onUpdateSlide={updateSlide}
            onContinue={nextStep}
            onContentUploaded={handleContentUploaded}
            onSkip={nextStep}
          />
        );
      case 'upload':
        return (
          <ExportStep
            outline={state.outline}
            moduleAudio={state.moduleAudio}
            courseTitle={state.title}
          />
        );
      default:
        return null;
    }
  };

  // Demo uses simplified presentation workflow
  const demoSteps: WorkflowStep[] = ['mode', 'title', 'slides', 'upload'];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0-6v6" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                Demo Mode
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  Testversion
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Testa systemet utan att logga in
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/auth" 
              className="text-sm text-primary hover:underline"
            >
              Logga in för full funktionalitet →
            </a>
            <button
              onClick={startNewDemo}
              className="px-3 py-1.5 text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              Starta om demo
            </button>
          </div>
        </div>
      </header>
      
      <main className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Progress Stepper */}
          <div className="mb-8">
            <ProgressStepper
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              projectMode="presentation" // Demo uses simplified workflow
              demoMode={state.settings.demoMode}
              onStepClick={goToStep}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {renderCurrentStep()}
            </div>

            {/* Settings Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <SettingsPanel 
                  settings={state.settings} 
                  onSettingsChange={updateSettings}
                  projectMode={state.settings.projectMode}
                  onPresentationSettingsChange={handlePresentationSettingsChange}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Demo;

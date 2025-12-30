import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProgressStepper } from '@/components/ProgressStepper';
import { ModeSelectionStep } from '@/components/ModeSelectionStep';
import { TitleStep } from '@/components/TitleStep';
import { OutlineStep } from '@/components/OutlineStep';
import { ScriptStep } from '@/components/ScriptStep';
import { SlideStep } from '@/components/SlideStep';
import { ExerciseStep } from '@/components/ExerciseStep';
import { QuizStep } from '@/components/QuizStep';
import { VoiceControlPanel } from '@/components/VoiceControlPanel';
import { VideoStep } from '@/components/VideoStep';
import { ExportStep } from '@/components/ExportStep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Button } from '@/components/ui/button';
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
  Slide,
  ModuleExercises,
  ModuleQuiz
} from '@/types/course';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VoiceSettings } from '@/components/VoiceControlPanel';

const defaultDemoSettings: DemoModeSettings = {
  enabled: true,
  maxSlides: 5,
  maxModules: 1,
  maxAudioDurationSeconds: 60,
  maxVideoDurationSeconds: 30,
  watermarkEnabled: true,
};

const initialSettings: CourseSettings = {
  voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  voiceName: 'George (Auktoritativ, lugn)',
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

const initialPresentonState: import('@/types/course').PresentonState = {
  taskId: null,
  status: 'idle',
  progress: 0,
  downloadUrl: null,
  editUrl: null,
  generationHistory: [],
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
  presenton: initialPresentonState,
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
    setState(prev => ({
      ...prev,
      // Mark the step we're leaving as completed so progress isn't lost when jumping around
      completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
      currentStep: step,
    }));
  };

  // Demo step configuration - uses all course steps with limited content
  const getDemoStepFlow = (mode: ProjectMode): WorkflowStep[] => {
    return mode === 'presentation' 
      ? ['mode', 'title', 'slides', 'upload']
      : ['mode', 'title', 'outline', 'script', 'slides', 'exercises', 'quiz', 'voice', 'video', 'upload'];
  };

  const nextStep = () => {
    setState(prev => {
      const steps = getDemoStepFlow(prev.settings.projectMode);
      const currentIndex = steps.indexOf(prev.currentStep);
      
      if (currentIndex < steps.length - 1) {
        const newStep = steps[currentIndex + 1];
        return {
          ...prev,
          currentStep: newStep,
          completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        };
      }
      return prev;
    });
  };

  // Generate outline for demo (short version)
  const generateOutline = async () => {
    if (!state.title.trim()) {
      toast.error('Välj en titel först');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-outline', {
        body: { 
          title: state.title,
          targetDuration: 5, // Very short for demo
          style: state.settings.style,
          language: state.settings.language,
          maxModules: 1,
          demoMode: true,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const outline: CourseOutline = data.outline;
      
      setState(prev => ({
        ...prev,
        outline,
        isProcessing: false,
      }));

      toast.success('Demo-kursöversikt genererad! (2 korta moduler)');
    } catch (error) {
      console.error('Error generating outline:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera kursöversikt';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  };

  const updateOutline = (outline: CourseOutline) => {
    setState(prev => ({ ...prev, outline }));
  };

  // Generate script for demo (short version)
  const generateScript = async (moduleIndex: number) => {
    if (!state.outline) {
      toast.error('Ingen kursöversikt tillgänglig');
      return;
    }

    const module = state.outline.modules[moduleIndex];
    if (!module) {
      toast.error('Modulen kunde inte hittas');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { 
          module: { ...module, duration: 2 }, // Very short for demo
          courseTitle: state.title,
          style: state.settings.style,
          language: state.settings.language,
          enableResearch: false, // Skip research for speed
          demoMode: true,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const script: ModuleScript = data.script;
      
      setState(prev => ({
        ...prev,
        scripts: [...prev.scripts, script],
        isProcessing: false,
      }));

      toast.success(`Demo-manus för "${module.title}" genererat! (~260 ord)`);
    } catch (error) {
      console.error('Error generating script:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera manus';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  };

  const uploadScript = (moduleId: string, script: ModuleScript) => {
    setState(prev => {
      const existingIndex = prev.scripts.findIndex(s => s.moduleId === moduleId);
      let newScripts: ModuleScript[];
      
      if (existingIndex >= 0) {
        newScripts = [...prev.scripts];
        newScripts[existingIndex] = script;
      } else {
        newScripts = [...prev.scripts, script];
      }
      
      return { ...prev, scripts: newScripts };
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

  const setModuleSlides = (moduleId: string, slides: Slide[]) => {
    setState(prev => ({
      ...prev,
      slides: {
        ...prev.slides,
        [moduleId]: slides,
      },
    }));
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

  const addExercises = (moduleId: string, exercises: ModuleExercises) => {
    setState(prev => ({
      ...prev,
      exercises: {
        ...prev.exercises,
        [moduleId]: exercises,
      },
    }));
  };

  const addQuiz = (moduleId: string, quiz: ModuleQuiz) => {
    setState(prev => ({
      ...prev,
      quizzes: {
        ...prev.quizzes,
        [moduleId]: quiz,
      },
    }));
  };

  const updateVideoSettings = (updates: Partial<VideoSettings>) => {
    setState(prev => ({
      ...prev,
      videoSettings: {
        ...prev.videoSettings,
        ...updates,
      },
    }));
  };

  const generateModuleAudio = async (moduleId: string, script: ModuleScript) => {
    // Demo mode - just simulate audio generation
    toast.info('Ljudgenerering är begränsad i demoläge');
    setState(prev => ({
      ...prev,
      moduleAudio: {
        ...prev.moduleAudio,
        [moduleId]: {
          moduleId,
          audioUrl: '',
          duration: script.estimatedDuration * 60,
          slideTiming: [],
        },
      },
    }));
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
      case 'outline':
        return (
          <OutlineStep
            outline={state.outline}
            isLoading={state.isProcessing}
            courseTitle={state.title}
            onGenerateOutline={generateOutline}
            onRegenerateOutline={generateOutline}
            onUpdateOutline={updateOutline}
            onContinue={nextStep}
          />
        );
      case 'script':
        return (
          <ScriptStep
            outline={state.outline}
            scripts={state.scripts}
            isLoading={state.isProcessing}
            currentModuleIndex={state.scripts.length}
            courseTitle={state.title}
            language={state.settings.language}
            onGenerateScript={generateScript}
            onContinue={nextStep}
            onUploadScript={uploadScript}
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
            projectMode={state.settings.projectMode}
            onGenerateSlides={generateSlides}
            onUpdateSlide={updateSlide}
            onSetModuleSlides={setModuleSlides}
            onContinue={nextStep}
            onContentUploaded={handleContentUploaded}
            onSkip={nextStep}
          />
        );
      case 'exercises':
        return (
          <ExerciseStep
            outline={state.outline}
            scripts={state.scripts}
            exercises={state.exercises}
            isLoading={state.isProcessing}
            courseTitle={state.title}
            language={state.settings.language}
            onExercisesGenerated={addExercises}
            onContinue={nextStep}
          />
        );
      case 'quiz':
        return (
          <QuizStep
            outline={state.outline}
            scripts={state.scripts}
            quizzes={state.quizzes}
            isLoading={state.isProcessing}
            language={state.settings.language}
            onQuizGenerated={addQuiz}
            onContinue={nextStep}
            onContentUploaded={handleContentUploaded}
            onSkip={nextStep}
          />
        );
      case 'voice':
        return (
          <div className="space-y-6">
            <VoiceControlPanel
              settings={{
                voiceId: state.settings.voiceId,
                voiceName: state.settings.voiceName,
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0,
                speed: 1,
                useCustomVoice: false,
              }}
              onSettingsChange={(newSettings) => {
                if (newSettings.voiceId) {
                  updateSettings({ voiceId: newSettings.voiceId });
                }
                if (newSettings.voiceName) {
                  updateSettings({ voiceName: newSettings.voiceName });
                }
              }}
              language={state.settings.language}
            />
            <div className="flex justify-end">
              <Button onClick={nextStep} size="lg">
                Fortsätt till video
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
      case 'video':
        return (
          <VideoStep
            outline={state.outline}
            scripts={state.scripts}
            slides={state.slides}
            moduleAudio={state.moduleAudio}
            videoSettings={state.videoSettings}
            courseTitle={state.title}
            voiceId={state.settings.voiceId}
            isLoading={state.isProcessing}
            onGenerateAudio={generateModuleAudio}
            onUpdateVideoSettings={updateVideoSettings}
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
            scripts={state.scripts}
            slides={state.slides}
            demoMode={state.settings.demoMode}
            projectMode={state.settings.projectMode}
          />
        );
      default:
        return null;
    }
  };

  // getDemoSteps is now replaced by getDemoStepFlow defined above

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
            <Link 
              to="/auth" 
              className="text-sm text-primary hover:underline"
            >
              Logga in för full funktionalitet →
            </Link>
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
              projectMode={state.settings.projectMode}
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

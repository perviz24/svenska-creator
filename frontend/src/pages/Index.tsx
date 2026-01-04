import { Header } from '@/components/Header';
import { ProgressStepper } from '@/components/ProgressStepper';
import { ModeSelectionStep } from '@/components/ModeSelectionStep';
import { TitleStep } from '@/components/TitleStep';
import { OutlineStep } from '@/components/OutlineStep';
import { ScriptStep } from '@/components/ScriptStep';
import { SlideStep } from '@/components/SlideStep';
import { ExerciseStep } from '@/components/ExerciseStep';
import { QuizStep } from '@/components/QuizStep';
import { VideoStep } from '@/components/VideoStep';
import { ExportStep } from '@/components/ExportStep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { CostEstimationBar } from '@/components/CostEstimationBar';
import { useCourseWorkflow } from '@/hooks/useCourseWorkflow';
import { ProjectMode, PresentationSettings, CourseStructureLimits, DemoModeSettings } from '@/types/course';
import { Globe, Volume2, Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Index = () => {
  const {
    state,
    setTitle,
    generateTitleSuggestions,
    selectTitle,
    goToStep,
    nextStep,
    generateOutline,
    updateOutline,
    generateScript,
    uploadScript,
    generateSlides,
    updateSlide,
    setModuleSlides,
    updateSettings,
    generateModuleAudio,
    updateVideoSettings,
    addQuiz,
    addExercises,
    startNewCourse,
    handleContentUploaded,
    savePresentonState,
  } = useCourseWorkflow();

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
    updateSettings({ demoMode });
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
            demoMode={state.settings.demoMode}
            onGenerateOutline={generateOutline}
            onRegenerateOutline={generateOutline}
            onUpdateOutline={updateOutline}
            onContinue={nextStep}
            onUploadOutline={updateOutline}
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
            demoMode={state.settings.demoMode}
            onGenerateScript={generateScript}
            onUploadScript={uploadScript}
            onContinue={nextStep}
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
            presentonState={state.presenton}
            onGenerateSlides={generateSlides}
            onUpdateSlide={updateSlide}
            onSetModuleSlides={setModuleSlides}
            onContinue={nextStep}
            onContentUploaded={handleContentUploaded}
            onSkip={nextStep}
            onSavePresentonState={savePresentonState}
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
            demoMode={state.settings.demoMode}
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

  return (
    <div className="min-h-screen bg-background">
      <Header onNewCourse={startNewCourse} />
      
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

          {/* Cost Estimation Bar - Show on all steps except mode */}
          {state.currentStep !== 'mode' && (
            <CostEstimationBar
              settings={state.settings}
              outline={state.outline}
              scripts={state.scripts}
              slides={state.slides}
              videoSettings={state.videoSettings}
            />
          )}

          {/* Compact Settings Summary Bar - Show on all steps except mode and presentation slides */}
          {state.currentStep !== 'mode' && !(state.settings.projectMode === 'presentation' && state.currentStep === 'slides') && (
            <div className="mb-6 bg-muted/50 border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                {state.settings.projectMode === 'presentation' ? (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium capitalize">
                        {state.settings.presentationSettings?.style || 'modern'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Volume2 className="h-4 w-4" />
                      <span className="font-medium capitalize">
                        {state.settings.presentationSettings?.tone || 'professional'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">
                        {state.settings.presentationSettings?.slideCount || 10} slides
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">{state.settings.language === 'sv' ? 'Svenska' : 'English'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Volume2 className="h-4 w-4" />
                      <span className="font-medium">{state.settings.voiceName || 'Standard'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium">{state.settings.aiQualityMode === 'quality' ? 'Hög kvalitet' : 'Snabb'}</span>
                    </div>
                  </>
                )}
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Settings className="h-4 w-4 mr-2" />
                    Ändra inställningar
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SettingsPanel 
                    settings={state.settings} 
                    onSettingsChange={updateSettings}
                    projectMode={state.settings.projectMode}
                    onPresentationSettingsChange={handlePresentationSettingsChange}
                  />
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Main Content Grid */}
          <div className={`grid grid-cols-1 gap-8 ${state.currentStep === 'mode' ? 'lg:grid-cols-3' : ''}`}>
            {/* Main Content Area */}
            <div className={state.currentStep === 'mode' ? 'lg:col-span-2' : ''}>
                  {renderCurrentStep()}
                </div>

                {/* Settings Panel - Only show on mode step */}
                {state.currentStep === 'mode' && (
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
                )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

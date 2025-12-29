import { Header } from '@/components/Header';
import { ProgressStepper } from '@/components/ProgressStepper';
import { TitleStep } from '@/components/TitleStep';
import { OutlineStep } from '@/components/OutlineStep';
import { ScriptStep } from '@/components/ScriptStep';
import { SlideStep } from '@/components/SlideStep';
import { QuizStep } from '@/components/QuizStep';
import { VideoStep } from '@/components/VideoStep';
import { ExportStep } from '@/components/ExportStep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useCourseWorkflow } from '@/hooks/useCourseWorkflow';

const Index = () => {
  const {
    state,
    setTitle,
    generateTitleSuggestions,
    selectTitle,
    goToStep,
    nextStep,
    generateOutline,
    generateScript,
    uploadScript,
    generateSlides,
    updateSlide,
    updateSettings,
    generateModuleAudio,
    updateVideoSettings,
    addQuiz,
    startNewCourse,
  } = useCourseWorkflow();

  const renderCurrentStep = () => {
    switch (state.currentStep) {
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
          />
        );
      case 'outline':
        return (
          <OutlineStep
            outline={state.outline}
            isLoading={state.isProcessing}
            onGenerateOutline={generateOutline}
            onRegenerateOutline={generateOutline}
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
            onGenerateSlides={generateSlides}
            onUpdateSlide={updateSlide}
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
            onGenerateAudio={generateModuleAudio}
            onUpdateVideoSettings={updateVideoSettings}
            onContinue={nextStep}
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
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

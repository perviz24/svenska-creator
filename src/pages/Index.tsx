import { Header } from '@/components/Header';
import { ProgressStepper } from '@/components/ProgressStepper';
import { TitleStep } from '@/components/TitleStep';
import { OutlineStep } from '@/components/OutlineStep';
import { ScriptStep } from '@/components/ScriptStep';
import { ProcessingStep } from '@/components/ProcessingStep';
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
    updateSettings,
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
            onGenerateScript={generateScript}
            onContinue={nextStep}
          />
        );
      case 'slides':
      case 'voice':
      case 'video':
      case 'upload':
        return <ProcessingStep currentStep={state.currentStep} />;
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

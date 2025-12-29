import { Check, FileText, Layers, Mic, Video, Upload, Sparkles, HelpCircle, BookOpen, LayoutGrid, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStep, ProjectMode, DemoModeSettings } from '@/types/course';

interface Step {
  id: WorkflowStep;
  label: string;
  icon: React.ReactNode;
}

const allSteps: Step[] = [
  { id: 'mode', label: 'Läge', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'title', label: 'Titel', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'outline', label: 'Översikt', icon: <FileText className="w-4 h-4" /> },
  { id: 'script', label: 'Manus', icon: <FileText className="w-4 h-4" /> },
  { id: 'slides', label: 'Slides', icon: <Layers className="w-4 h-4" /> },
  { id: 'exercises', label: 'Övningar', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'voice', label: 'Röst', icon: <Mic className="w-4 h-4" /> },
  { id: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { id: 'upload', label: 'Export', icon: <Upload className="w-4 h-4" /> },
];

const courseStepIds: WorkflowStep[] = ['mode', 'title', 'outline', 'script', 'slides', 'exercises', 'quiz', 'voice', 'video', 'upload'];
const presentationStepIds: WorkflowStep[] = ['mode', 'title', 'slides', 'upload'];

// Demo mode uses simplified steps (no exercises, quiz, voice, video)
const demoCourseStepIds: WorkflowStep[] = ['mode', 'title', 'outline', 'script', 'slides', 'upload'];
const demoPresentationStepIds: WorkflowStep[] = ['mode', 'title', 'slides', 'upload'];

interface ProgressStepperProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  projectMode?: ProjectMode;
  demoMode?: DemoModeSettings;
  onStepClick?: (step: WorkflowStep) => void;
}

export function ProgressStepper({ currentStep, completedSteps, projectMode = 'course', demoMode, onStepClick }: ProgressStepperProps) {
  // Filter steps based on project mode and demo mode
  const getStepIds = () => {
    if (demoMode?.enabled) {
      return projectMode === 'presentation' ? demoPresentationStepIds : demoCourseStepIds;
    }
    return projectMode === 'presentation' ? presentationStepIds : courseStepIds;
  };
  
  const stepIds = getStepIds();
  const steps = allSteps.filter(step => stepIds.includes(step.id));
  
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
      {/* Demo Mode Banner */}
      {demoMode?.enabled && (
        <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <FlaskConical className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Demoläge aktivt - Begränsad output med vattenstämpel
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
        
        {/* Progress line filled */}
        <div 
          className="absolute left-0 top-5 h-0.5 bg-accent transition-all duration-500"
          style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPending = !isCompleted && !isCurrent;
          // Allow clicking any step - free navigation
          const canClick = true;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10"
            >
              <button
                onClick={() => onStepClick?.(step.id)}
                className={cn(
                  "step-indicator cursor-pointer hover:scale-110 transition-transform",
                  isCompleted && "completed",
                  isCurrent && "active",
                  isPending && "pending opacity-60 hover:opacity-100"
                )}
                title={`Gå till ${step.label}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </button>
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors",
                  isCurrent && "text-primary",
                  isCompleted && "text-accent",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

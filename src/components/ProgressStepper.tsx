import { Check, FileText, Layers, Mic, Video, Upload, Sparkles, HelpCircle, BookOpen, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStep, ProjectMode } from '@/types/course';

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

interface ProgressStepperProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  projectMode?: ProjectMode;
  onStepClick?: (step: WorkflowStep) => void;
}

export function ProgressStepper({ currentStep, completedSteps, projectMode = 'course', onStepClick }: ProgressStepperProps) {
  // Filter steps based on project mode
  const stepIds = projectMode === 'presentation' ? presentationStepIds : courseStepIds;
  const steps = allSteps.filter(step => stepIds.includes(step.id));
  
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
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

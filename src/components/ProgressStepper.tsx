import { Check, FileText, Layers, Mic, Video, Upload, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStep } from '@/types/course';

interface Step {
  id: WorkflowStep;
  label: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  { id: 'title', label: 'Kurstitel', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'outline', label: 'Kursöversikt', icon: <FileText className="w-4 h-4" /> },
  { id: 'script', label: 'Manus', icon: <FileText className="w-4 h-4" /> },
  { id: 'slides', label: 'Slides', icon: <Layers className="w-4 h-4" /> },
  { id: 'voice', label: 'Röst', icon: <Mic className="w-4 h-4" /> },
  { id: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { id: 'upload', label: 'Ladda upp', icon: <Upload className="w-4 h-4" /> },
];

interface ProgressStepperProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
}

export function ProgressStepper({ currentStep, completedSteps, onStepClick }: ProgressStepperProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
        
        {/* Progress line filled */}
        <div 
          className="absolute left-0 top-5 h-0.5 bg-accent transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10"
            >
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={isPending && !isCompleted}
                className={cn(
                  "step-indicator",
                  isCompleted && "completed",
                  isCurrent && "active",
                  isPending && "pending",
                  (isCompleted || isCurrent) && "cursor-pointer"
                )}
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

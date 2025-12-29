import { Loader2, FileText, Layers, Mic, Video, Upload, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WorkflowStep } from '@/types/course';
import { cn } from '@/lib/utils';

interface ProcessingTask {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed';
  progress?: number;
}

interface ProcessingStepProps {
  currentStep: WorkflowStep;
}

const getTasksForStep = (step: WorkflowStep): ProcessingTask[] => {
  switch (step) {
    case 'script':
      return [
        { id: 'research', label: 'Researchar ämnet via Perplexity...', icon: <FileText className="w-5 h-5" />, status: 'processing', progress: 65 },
        { id: 'script', label: 'Genererar svenskt manus', icon: <FileText className="w-5 h-5" />, status: 'pending' },
        { id: 'markers', label: 'Lägger till slide-markeringar', icon: <FileText className="w-5 h-5" />, status: 'pending' },
      ];
    case 'slides':
      return [
        { id: 'design', label: 'Designar slides i Canva...', icon: <Layers className="w-5 h-5" />, status: 'processing', progress: 40 },
        { id: 'images', label: 'Genererar illustrationer', icon: <Layers className="w-5 h-5" />, status: 'pending' },
        { id: 'text', label: 'Lägger till manus-text', icon: <Layers className="w-5 h-5" />, status: 'pending' },
      ];
    case 'voice':
      return [
        { id: 'synthesis', label: 'Genererar svensk röst...', icon: <Mic className="w-5 h-5" />, status: 'processing', progress: 55 },
        { id: 'timing', label: 'Synkroniserar timing', icon: <Mic className="w-5 h-5" />, status: 'pending' },
      ];
    case 'video':
      return [
        { id: 'combine', label: 'Kombinerar slides och ljud...', icon: <Video className="w-5 h-5" />, status: 'processing', progress: 30 },
        { id: 'render', label: 'Renderar MP4', icon: <Video className="w-5 h-5" />, status: 'pending' },
        { id: 'optimize', label: 'Optimerar för streaming', icon: <Video className="w-5 h-5" />, status: 'pending' },
      ];
    case 'upload':
      return [
        { id: 's3', label: 'Laddar upp till S3...', icon: <Upload className="w-5 h-5" />, status: 'processing', progress: 70 },
        { id: 'learndash', label: 'Skapar LearnDash-kurs', icon: <Upload className="w-5 h-5" />, status: 'pending' },
        { id: 'modules', label: 'Lägger till moduler', icon: <Upload className="w-5 h-5" />, status: 'pending' },
      ];
    default:
      return [];
  }
};

const stepTitles: Record<WorkflowStep, string> = {
  title: 'Kurstitel',
  outline: 'Kursöversikt',
  script: 'Genererar manus',
  slides: 'Skapar slides',
  exercises: 'Genererar övningar',
  quiz: 'Genererar quiz',
  voice: 'Genererar röst',
  video: 'Monterar video',
  upload: 'Laddar upp',
};

export function ProcessingStep({ currentStep }: ProcessingStepProps) {
  const tasks = getTasksForStep(currentStep);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">
          {stepTitles[currentStep]}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          AI arbetar på din kurs. Detta kan ta några minuter.
        </p>
      </div>

      <Card className="border-border/50 shadow-lg max-w-xl mx-auto">
        <CardContent className="p-6 space-y-4">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                task.status === 'processing' && "bg-secondary/50",
                task.status === 'completed' && "bg-success/10",
                task.status === 'pending' && "opacity-50"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  task.status === 'processing' && "bg-primary/10 text-primary",
                  task.status === 'completed' && "bg-success/20 text-success",
                  task.status === 'pending' && "bg-muted text-muted-foreground"
                )}
              >
                {task.status === 'processing' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  task.icon
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-medium",
                    task.status === 'pending' && "text-muted-foreground"
                  )}>
                    {task.label}
                  </span>
                  {task.status === 'processing' && task.progress && (
                    <span className="text-sm text-primary font-semibold">
                      {task.progress}%
                    </span>
                  )}
                </div>
                {task.status === 'processing' && task.progress && (
                  <Progress value={task.progress} className="h-1.5" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

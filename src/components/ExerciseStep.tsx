import { useState } from 'react';
import { BookOpen, RefreshCw, ArrowRight, Loader2, ChevronDown, ChevronUp, Clock, Users, User, FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ModuleScript, CourseOutline, ModuleExercises, Exercise } from '@/types/course';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExerciseStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  exercises: Record<string, ModuleExercises>;
  isLoading: boolean;
  courseTitle: string;
  language?: 'sv' | 'en';
  onExercisesGenerated: (moduleId: string, exercises: ModuleExercises) => void;
  onContinue: () => void;
}

export function ExerciseStep({
  outline,
  scripts,
  exercises,
  isLoading,
  courseTitle,
  language = 'sv',
  onExercisesGenerated,
  onContinue,
}: ExerciseStepProps) {
  const [generatingModule, setGeneratingModule] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [exerciseTemplate, setExerciseTemplate] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);

  if (!outline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ingen kursöversikt tillgänglig.</p>
      </div>
    );
  }

  const allExercisesGenerated = Object.keys(exercises).length === scripts.length;

  const generateExercises = async (script: ModuleScript) => {
    setGeneratingModule(script.moduleId);

    try {
      const scriptText = script.sections.map(s => s.content).join('\n\n');

      const { data, error } = await supabase.functions.invoke('generate-exercises', {
        body: {
          script: scriptText,
          moduleTitle: script.moduleTitle,
          courseTitle,
          exerciseTemplate: exerciseTemplate || undefined,
          exerciseCount: 3,
          language,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const moduleExercises: ModuleExercises = {
        moduleId: script.moduleId,
        moduleTitle: script.moduleTitle,
        exercises: data.exercises,
      };

      onExercisesGenerated(script.moduleId, moduleExercises);
      toast.success(`Övningar för "${script.moduleTitle}" genererade!`);
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast.error('Kunde inte generera övningar');
    } finally {
      setGeneratingModule(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="w-4 h-4" />;
      case 'individual': return <User className="w-4 h-4" />;
      case 'reflection': return <FileText className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      individual: 'Individuell',
      group: 'Gruppövning',
      reflection: 'Reflektion',
      practical: 'Praktisk',
      'case-study': 'Fallstudie',
    };
    return labels[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-success/10 text-success border-success/30';
      case 'intermediate': return 'bg-warning/10 text-warning border-warning/30';
      case 'advanced': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Kursövningar</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generera praktiska övningar för varje modul som hjälper deltagarna att tillämpa sina kunskaper.
        </p>
      </div>

      {/* Template Input */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Övningsmall (valfri)
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTemplateInput(!showTemplateInput)}
            >
              {showTemplateInput ? 'Dölj' : 'Visa'}
            </Button>
          </div>
        </CardHeader>
        {showTemplateInput && (
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Klistra in en exempelövning som mall för att styra format och stil
              </Label>
              <Textarea
                placeholder="Klistra in din övningsmall här..."
                value={exerciseTemplate}
                onChange={(e) => setExerciseTemplate(e.target.value)}
                className="min-h-[100px] text-sm"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Module Exercises */}
      <div className="space-y-4">
        {scripts.map((script) => {
          const moduleExercises = exercises[script.moduleId];
          const isGenerating = generatingModule === script.moduleId;
          const isExpanded = expandedModule === script.moduleId;

          return (
            <Card
              key={script.moduleId}
              className={cn(
                "border-border/50 transition-all duration-300",
                moduleExercises && "border-success/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-accent" />
                    {script.moduleTitle}
                  </CardTitle>
                  {moduleExercises ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      {moduleExercises.exercises.length} övningar
                    </Badge>
                  ) : isGenerating ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Genererar...
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Ej genererad
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {moduleExercises ? (
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedModule(isExpanded ? null : script.moduleId)}>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 flex-wrap">
                        {moduleExercises.exercises.map((ex) => (
                          <Badge key={ex.id} variant="outline" className="gap-1">
                            {getTypeIcon(ex.type)}
                            {getTypeLabel(ex.type)}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateExercises(script)}
                          disabled={isGenerating}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerera
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isExpanded ? 'Dölj' : 'Visa'}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-4">
                      {moduleExercises.exercises.map((exercise, idx) => (
                        <div key={exercise.id} className="p-4 bg-secondary/30 rounded-lg space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-medium">{idx + 1}. {exercise.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{exercise.description}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Badge variant="outline" className="gap-1">
                                <Clock className="w-3 h-3" />
                                {exercise.estimatedTime} min
                              </Badge>
                              <Badge variant="outline" className={getDifficultyColor(exercise.difficulty)}>
                                {exercise.difficulty === 'beginner' ? 'Nybörjare' : exercise.difficulty === 'intermediate' ? 'Medel' : 'Avancerad'}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">Instruktioner:</p>
                            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                              {exercise.instructions.map((inst, i) => (
                                <li key={i}>{inst}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground">Lärandemål:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {exercise.learningObjectives.map((obj, i) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          </div>

                          {exercise.materials && exercise.materials.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-foreground">Material:</p>
                              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {exercise.materials.map((mat, i) => (
                                  <li key={i}>{mat}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Generera praktiska övningar baserat på modulens innehåll
                    </p>
                    <Button
                      size="sm"
                      onClick={() => generateExercises(script)}
                      disabled={isGenerating || isLoading}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Genererar...
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4" />
                          Generera övningar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        {!allExercisesGenerated && Object.keys(exercises).length > 0 && (
          <Button
            onClick={() => {
              const nextScript = scripts.find(s => !exercises[s.moduleId]);
              if (nextScript) generateExercises(nextScript);
            }}
            disabled={isLoading || generatingModule !== null}
            className="gap-2"
          >
            {generatingModule ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                Generera nästa
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
        <Button onClick={onContinue} variant={allExercisesGenerated ? 'default' : 'outline'} className="gap-2">
          {allExercisesGenerated ? 'Fortsätt till quiz' : 'Hoppa över övningar'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { HelpCircle, RefreshCw, ArrowRight, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Trash2, Upload, SkipForward } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ModuleScript, CourseOutline, ModuleQuiz, QuizQuestion } from '@/types/course';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentUploader } from '@/components/ContentUploader';

interface QuizStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  quizzes: Record<string, ModuleQuiz>;
  isLoading: boolean;
  language?: 'sv' | 'en';
  onQuizGenerated: (moduleId: string, quiz: ModuleQuiz) => void;
  onContinue: () => void;
  onContentUploaded?: (content: string) => void;
  onSkip?: () => void;
}

export function QuizStep({
  outline,
  scripts,
  quizzes,
  isLoading,
  language = 'sv',
  onQuizGenerated,
  onContinue,
  onContentUploaded,
  onSkip,
}: QuizStepProps) {
  const [generatingModule, setGeneratingModule] = useState<string | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  if (!outline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ingen kursöversikt tillgänglig.</p>
      </div>
    );
  }

  const allQuizzesGenerated = Object.keys(quizzes).length === scripts.length;

  const generateQuiz = async (script: ModuleScript) => {
    setGeneratingModule(script.moduleId);

    try {
      const scriptText = script.sections.map(s => s.content).join('\n\n');

      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          script: scriptText,
          moduleTitle: script.moduleTitle,
          questionCount: 5,
          language,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const quiz: ModuleQuiz = {
        moduleId: script.moduleId,
        moduleTitle: script.moduleTitle,
        questions: data.questions,
      };

      onQuizGenerated(script.moduleId, quiz);
      toast.success(`Quiz för "${script.moduleTitle}" genererat!`);
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Kunde inte generera quiz');
    } finally {
      setGeneratingModule(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success border-success/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'hard': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const checkAnswer = (questionId: string, quiz: ModuleQuiz) => {
    setShowResults(prev => ({ ...prev, [questionId]: true }));
  };

  const getScore = (quiz: ModuleQuiz) => {
    let correct = 0;
    quiz.questions.forEach(q => {
      if (showResults[q.id] && testAnswers[q.id] === q.correctOptionId) {
        correct++;
      }
    });
    return correct;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Quiz & Kunskapstest</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generera automatiska quiz-frågor från kursinnehållet för att testa deltagarnas förståelse.
        </p>
      </div>

      {/* Upload Own Content */}
      <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Ladda upp egna quiz-frågor
            </span>
            {isUploadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <ContentUploader
            onContentUploaded={(content) => onContentUploaded?.(content)}
            label="Importera quiz-frågor"
            description="Ladda upp frågor i textformat eller klistra in manuellt."
            placeholder="Ange frågor med svarsalternativ här..."
            compact
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Module Quizzes */}
      <div className="space-y-4">
        {scripts.map((script) => {
          const quiz = quizzes[script.moduleId];
          const isGenerating = generatingModule === script.moduleId;
          const isExpanded = expandedQuiz === script.moduleId;

          return (
            <Card
              key={script.moduleId}
              className={cn(
                "border-border/50 transition-all duration-300",
                quiz && "border-success/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="w-5 h-5 text-accent" />
                    {script.moduleTitle}
                  </CardTitle>
                  {quiz ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      {quiz.questions.length} frågor
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
                {quiz ? (
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedQuiz(isExpanded ? null : script.moduleId)}>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {quiz.questions.map((q) => (
                          <Badge key={q.id} variant="outline" className={getDifficultyColor(q.difficulty)}>
                            {q.difficulty === 'easy' ? 'Lätt' : q.difficulty === 'medium' ? 'Medel' : 'Svår'}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateQuiz(script)}
                          disabled={isGenerating}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerera
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isExpanded ? 'Dölj' : 'Visa'} frågor
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-6">
                      {quiz.questions.map((question, qIdx) => (
                        <div key={question.id} className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-medium">
                              {qIdx + 1}. {question.question}
                            </p>
                            <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                          </div>

                          <RadioGroup
                            value={testAnswers[question.id]}
                            onValueChange={(value) => setTestAnswers(prev => ({ ...prev, [question.id]: value }))}
                            className="space-y-2"
                          >
                            {question.options.map((option) => {
                              const isCorrect = option.id === question.correctOptionId;
                              const isSelected = testAnswers[question.id] === option.id;
                              const showResult = showResults[question.id];

                              return (
                                <div
                                  key={option.id}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                    showResult && isCorrect && "border-success bg-success/10",
                                    showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                                    !showResult && "border-border hover:border-primary/50"
                                  )}
                                >
                                  <RadioGroupItem value={option.id} id={option.id} disabled={showResult} />
                                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                                    {option.text}
                                  </Label>
                                  {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-success" />}
                                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                                </div>
                              );
                            })}
                          </RadioGroup>

                          {!showResults[question.id] ? (
                            <Button
                              size="sm"
                              onClick={() => checkAnswer(question.id, quiz)}
                              disabled={!testAnswers[question.id]}
                            >
                              Kontrollera svar
                            </Button>
                          ) : (
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Förklaring:</span> {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {Object.keys(showResults).filter(k => quiz.questions.some(q => q.id === k)).length === quiz.questions.length && (
                        <div className="p-4 bg-accent/10 rounded-lg text-center">
                          <p className="text-lg font-medium">
                            Resultat: {getScore(quiz)} / {quiz.questions.length} rätt
                          </p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Generera quiz-frågor baserat på modulens innehåll
                    </p>
                    <Button
                      size="sm"
                      onClick={() => generateQuiz(script)}
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
                          <HelpCircle className="w-4 h-4" />
                          Generera quiz
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
      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onSkip || onContinue}
          className="text-muted-foreground gap-2"
        >
          <SkipForward className="w-4 h-4" />
          Hoppa över
        </Button>
        <div className="flex gap-3">
          {!allQuizzesGenerated && Object.keys(quizzes).length > 0 && (
            <Button
              onClick={() => {
                const nextScript = scripts.find(s => !quizzes[s.moduleId]);
                if (nextScript) generateQuiz(nextScript);
              }}
              disabled={isLoading || generatingModule !== null}
              variant="outline"
              className="gap-2"
            >
              {generatingModule ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  Generera nästa quiz
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
          <Button onClick={onContinue} className="gap-2">
            Fortsätt till röst
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

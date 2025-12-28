import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, Target, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CourseOutline, Module } from '@/types/course';
import { cn } from '@/lib/utils';

interface OutlineStepProps {
  outline: CourseOutline | null;
  isLoading: boolean;
  onGenerateOutline: () => void;
  onRegenerateOutline: () => void;
  onContinue: () => void;
}

function ModuleCard({ module, index }: { module: Module; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card 
      className={cn(
        "border-border/50 transition-all duration-300 hover:shadow-md",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                  {module.number}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {module.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {module.duration} min
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {module.subTopics.length} delmoment
                    </Badge>
                  </div>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-muted-foreground">
              {module.description}
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Target className="w-4 h-4 text-accent" />
                Lärandemål
              </div>
              <ul className="space-y-2 pl-6">
                {module.learningObjectives.map((obj) => (
                  <li
                    key={obj.id}
                    className="text-sm text-muted-foreground list-disc"
                  >
                    {obj.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">
                Delmoment
              </div>
              <div className="grid gap-2">
                {module.subTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm">{topic.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {topic.duration} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function OutlineStep({
  outline,
  isLoading,
  onGenerateOutline,
  onRegenerateOutline,
  onContinue,
}: OutlineStepProps) {
  if (!outline && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-foreground">
            Generera kursöversikt
          </h2>
          <p className="text-muted-foreground max-w-md">
            AI kommer att skapa en detaljerad kursöversikt baserad på din valda titel
          </p>
        </div>
        <Button
          onClick={onGenerateOutline}
          variant="gradient"
          size="xl"
        >
          Generera kursöversikt
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Genererar kursöversikt...</h3>
          <p className="text-muted-foreground">
            AI analyserar ditt ämne och skapar en detaljerad struktur
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {outline!.title}
          </h2>
          <p className="text-muted-foreground mt-1">
            {outline!.description}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {Math.round(outline!.totalDuration / 60)} timmar totalt
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {outline!.modules.length} moduler
            </Badge>
          </div>
        </div>
        <Button
          onClick={onRegenerateOutline}
          variant="outline"
          size="lg"
        >
          <RefreshCw className="w-4 h-4" />
          Generera om
        </Button>
      </div>

      <div className="space-y-4">
        {outline!.modules.map((module, index) => (
          <ModuleCard key={module.id} module={module} index={index} />
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={onContinue}
          variant="gradient"
          size="xl"
          className="min-w-[200px]"
        >
          Godkänn och fortsätt
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

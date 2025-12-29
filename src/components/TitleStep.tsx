import { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TitleSuggestion } from '@/types/course';
import { cn } from '@/lib/utils';
import { ContentUploader } from '@/components/ContentUploader';

interface TitleStepProps {
  initialTitle: string;
  suggestions: TitleSuggestion[];
  selectedId: string | null;
  isLoading: boolean;
  onTitleChange: (title: string) => void;
  onGenerateSuggestions: () => void;
  onSelectSuggestion: (id: string) => void;
  onContinue: () => void;
  onContentUploaded?: (content: string) => void;
}

export function TitleStep({
  initialTitle,
  suggestions,
  selectedId,
  isLoading,
  onTitleChange,
  onGenerateSuggestions,
  onSelectSuggestion,
  onContinue,
  onContentUploaded,
}: TitleStepProps) {
  const [inputValue, setInputValue] = useState(initialTitle);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    onTitleChange(value);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">
          Skapa din kurs
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Ange en kurstitel så genererar AI alternativa förslag med förklaringar
        </p>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-sm font-medium">
              Kurstitel
            </Label>
            <div className="flex gap-3">
              <Input
                id="title"
                placeholder="T.ex. Grundläggande patientvård inom hemtjänst"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="flex-1 h-12 text-base"
              />
              <Button
                onClick={onGenerateSuggestions}
                disabled={!inputValue.trim() || isLoading}
                variant="gradient"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generera förslag
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Own Content */}
          <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Ladda upp eget kursunderlag
                </span>
                {isUploadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ContentUploader
                onContentUploaded={(content) => onContentUploaded?.(content)}
                label="Importera kursunderlag"
                description="Ladda upp dokument, ange URL:er eller klistra in text som grund för kursen."
                placeholder="Klistra in kursinnehåll eller beskrivning här..."
              />
            </CollapsibleContent>
          </Collapsible>

          {suggestions.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <Label className="text-sm font-medium">
                Välj en titel
              </Label>
              <RadioGroup
                value={selectedId || ''}
                onValueChange={onSelectSuggestion}
                className="space-y-3"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "relative flex items-start space-x-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                      selectedId === suggestion.id
                        ? "border-accent bg-secondary/50"
                        : "border-border hover:border-accent/50 hover:bg-muted/50"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <RadioGroupItem
                      value={suggestion.id}
                      id={suggestion.id}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={suggestion.id}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <p className="font-semibold text-foreground">
                        {suggestion.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.explanation}
                      </p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <div className="flex justify-center animate-slide-up">
          <Button
            onClick={onContinue}
            variant="gradient"
            size="xl"
            className="min-w-[200px]"
          >
            Fortsätt till kursöversikt
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

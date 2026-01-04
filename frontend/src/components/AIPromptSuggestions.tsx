import { useState } from 'react';
import { Sparkles, Wand2, ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface AIPromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  description: string;
  category: 'expand' | 'simplify' | 'formal' | 'creative' | 'structure';
}

interface AIPromptSuggestionsProps {
  context: 'outline' | 'script' | 'slide';
  onApplyPrompt: (prompt: string) => void;
  isProcessing?: boolean;
  language?: 'sv' | 'en';
}

const OUTLINE_PROMPTS: AIPromptSuggestion[] = [
  { id: 'expand-modules', label: 'Expandera moduler', prompt: 'Lägg till fler delmoment och fördjupa varje modul med praktiska exempel och övningar', description: 'Utöka kursen med mer innehåll', category: 'expand' },
  { id: 'add-objectives', label: 'Förstärk lärandemål', prompt: 'Gör lärandemålen mer specifika och mätbara enligt Blooms taxonomi', description: 'Tydligare mål', category: 'structure' },
  { id: 'simplify', label: 'Förenkla struktur', prompt: 'Förenkla kursstrukturen och slå ihop liknande moduler för kortare total längd', description: 'Kortare kurs', category: 'simplify' },
  { id: 'practical', label: 'Mer praktiskt fokus', prompt: 'Lägg till fler praktiska övningar, fallstudier och hands-on aktiviteter', description: 'Mer aktivt lärande', category: 'creative' },
  { id: 'academic', label: 'Akademisk ton', prompt: 'Använd mer akademiskt språk och referera till forskningsbas och teorier', description: 'Mer formellt', category: 'formal' },
];

const SCRIPT_PROMPTS: AIPromptSuggestion[] = [
  { id: 'conversational', label: 'Mer konversationell', prompt: 'Gör texten mer lättillgänglig och använd ett vänligt, engagerande språk', description: 'Lättare att lyssna på', category: 'creative' },
  { id: 'add-examples', label: 'Lägg till exempel', prompt: 'Inkludera fler praktiska exempel och verkliga scenarios för att illustrera koncepten', description: 'Bättre förståelse', category: 'expand' },
  { id: 'shorten', label: 'Korta ner', prompt: 'Korta ner texten genom att ta bort upprepningar och fokusera på kärnbudskapet', description: 'Mer koncist', category: 'simplify' },
  { id: 'add-transitions', label: 'Förbättra övergångar', prompt: 'Lägg till bättre övergångar mellan avsnitt för ett smidigare flöde', description: 'Bättre flyt', category: 'structure' },
  { id: 'emphasize-key', label: 'Betona nyckelord', prompt: 'Markera och upprepa viktiga nyckelbegrepp för bättre retention', description: 'Tydligare budskap', category: 'structure' },
];

const SLIDE_PROMPTS: AIPromptSuggestion[] = [
  { id: 'visual-impact', label: 'Mer visuellt', prompt: 'Föreslå starkare visuella element och bildval för maximal påverkan', description: 'Starkare intryck', category: 'creative' },
  { id: 'less-text', label: 'Mindre text', prompt: 'Minska textmängden på varje slide och fokusera på nyckelord och punkter', description: 'Lättare att läsa', category: 'simplify' },
  { id: 'storytelling', label: 'Storytelling', prompt: 'Strukturera slides som en berättelse med tydlig början, mitten och slut', description: 'Engagerande narrativ', category: 'creative' },
  { id: 'data-focus', label: 'Datafokus', prompt: 'Lägg till fler diagram, grafer och statistik för att stödja budskapet', description: 'Faktabaserat', category: 'formal' },
  { id: 'call-to-action', label: 'Handlingsuppmaning', prompt: 'Avsluta varje modul med tydliga call-to-action och nästa steg', description: 'Actiondrivet', category: 'structure' },
];

const categoryColors: Record<string, string> = {
  expand: 'bg-green-500/10 text-green-600 border-green-500/30',
  simplify: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  formal: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  creative: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  structure: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
};

export function AIPromptSuggestions({ 
  context, 
  onApplyPrompt, 
  isProcessing = false,
  language = 'sv',
}: AIPromptSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const prompts = context === 'outline' ? OUTLINE_PROMPTS 
    : context === 'script' ? SCRIPT_PROMPTS 
    : SLIDE_PROMPTS;

  const handleApply = (prompt: string, id?: string) => {
    if (id) setSelectedPromptId(id);
    onApplyPrompt(prompt);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between gap-2">
          <span className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            AI-promptförslag
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        {/* Preset Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {prompts.map((prompt) => (
            <Card 
              key={prompt.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2",
                selectedPromptId === prompt.id && isProcessing
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-primary/30"
              )}
              onClick={() => !isProcessing && handleApply(prompt.prompt, prompt.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{prompt.label}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[10px] px-1.5 py-0", categoryColors[prompt.category])}
                      >
                        {prompt.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{prompt.description}</p>
                  </div>
                  {selectedPromptId === prompt.id && isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Egen prompt</label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={language === 'sv' 
              ? "Beskriv hur du vill ändra eller förbättra innehållet..."
              : "Describe how you want to change or improve the content..."
            }
            className="min-h-[80px] text-sm"
          />
          <Button
            onClick={() => customPrompt.trim() && handleApply(customPrompt)}
            disabled={!customPrompt.trim() || isProcessing}
            size="sm"
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Tillämpa prompt
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

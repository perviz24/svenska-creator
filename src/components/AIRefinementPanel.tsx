import { useState } from 'react';
import { Sparkles, Loader2, Wand2, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIRefinementPanelProps {
  content: string;
  contentType: 'outline' | 'script' | 'slides' | 'narration';
  context?: string;
  language?: 'sv' | 'en';
  onRefinedContent: (content: string) => void;
  onSkipRefinement: () => void;
}

const REFINEMENT_ACTIONS = [
  {
    id: 'improve',
    label: 'Förbättra kvalitet',
    description: 'Förbättra språk, struktur och tydlighet',
    icon: Sparkles,
  },
  {
    id: 'expand',
    label: 'Expandera',
    description: 'Lägg till mer detaljer och djup',
    icon: Wand2,
  },
  {
    id: 'simplify',
    label: 'Förenkla',
    description: 'Gör innehållet mer lättförståeligt',
    icon: RefreshCw,
  },
];

export function AIRefinementPanel({
  content,
  contentType,
  context,
  language = 'sv',
  onRefinedContent,
  onSkipRefinement,
}: AIRefinementPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [refinedContent, setRefinedContent] = useState<string | null>(null);

  const contentTypeLabels: Record<string, string> = {
    outline: 'kursöversikt',
    script: 'manus',
    slides: 'slide-innehåll',
    narration: 'röstmanus',
  };

  const handleRefine = async (action: string) => {
    setIsProcessing(true);
    setSelectedAction(action);

    try {
      const { data, error } = await supabase.functions.invoke('ai-review-edit', {
        body: {
          content,
          action,
          customInstruction: action === 'custom' ? customInstruction : undefined,
          contentType,
          context,
          language,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('För många förfrågningar. Vänta en stund.');
        } else if (data.error.includes('Payment')) {
          toast.error('Krediter krävs för AI-förfining.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setRefinedContent(data.result);
      toast.success('Innehåll förfinat!');
    } catch (error) {
      console.error('Error refining content:', error);
      toast.error('Kunde inte förfina innehållet');
    } finally {
      setIsProcessing(false);
      setSelectedAction(null);
    }
  };

  const handleAcceptRefinement = () => {
    if (refinedContent) {
      onRefinedContent(refinedContent);
      toast.success('Förfinat innehåll sparat!');
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI-förfining</CardTitle>
              <CardDescription>
                Förbättra din uppladdade {contentTypeLabels[contentType]} med AI innan du fortsätter
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            Uppladdad
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!refinedContent ? (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REFINEMENT_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => handleRefine(action.id)}
                  disabled={isProcessing}
                >
                  {isProcessing && selectedAction === action.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <action.icon className="h-5 w-5 text-primary" />
                  )}
                  <span className="font-medium text-sm">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </Button>
              ))}
            </div>

            {/* Custom Instruction */}
            <div className="space-y-2">
              <Textarea
                placeholder="Eller skriv en egen instruktion för AI... t.ex. 'Gör texten mer engagerande' eller 'Lägg till fler exempel'"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRefine('custom')}
                disabled={isProcessing || !customInstruction.trim()}
                className="gap-2"
              >
                {isProcessing && selectedAction === 'custom' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Använd egen instruktion
              </Button>
            </div>

            {/* Skip Option */}
            <div className="flex justify-end pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={onSkipRefinement}
                className="gap-2 text-muted-foreground"
              >
                Hoppa över förfining
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          /* Show refined content preview */
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg border max-h-[300px] overflow-auto">
              <p className="text-sm whitespace-pre-wrap">{refinedContent}</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAcceptRefinement}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Använd förfinat innehåll
              </Button>
              <Button
                variant="outline"
                onClick={() => setRefinedContent(null)}
              >
                Förfina igen
              </Button>
              <Button
                variant="ghost"
                onClick={onSkipRefinement}
                className="ml-auto text-muted-foreground"
              >
                Använd original
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

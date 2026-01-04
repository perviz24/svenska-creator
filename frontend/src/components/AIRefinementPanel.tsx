import { useState, forwardRef } from 'react';
import { Sparkles, Loader2, Wand2, Check, ArrowRight, RefreshCw, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

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

const AVAILABLE_LANGUAGES = [
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export const AIRefinementPanel = forwardRef<HTMLDivElement, AIRefinementPanelProps>(({
  content,
  contentType,
  context,
  language = 'sv',
  onRefinedContent,
  onSkipRefinement,
}, ref) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [refinedContent, setRefinedContent] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

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
      // Use FastAPI backend instead of Supabase
      const response = await fetch(`${BACKEND_URL}/api/ai/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          action: action === 'custom' ? 'improve' : action,
          context: action === 'custom' ? customInstruction : context,
          language: language || 'sv',
        }),
      });

      if (!response.ok) throw new Error('Refinement failed');
      const data = await response.json();

      if (data.improved_content) {
        setRefinedContent(data.improved_content);
        toast.success('Innehåll förfinat!');
      }
    } catch (error) {
      console.error('Error refining content:', error);
      toast.error('Kunde inte förfina innehållet');
    } finally {
      setIsProcessing(false);
      setSelectedAction(null);
    }
  };

  const handleTranslate = async () => {
    if (!targetLanguage) {
      toast.error('Välj ett språk att översätta till');
      return;
    }

    setIsTranslating(true);

    try {
      const targetLangName = AVAILABLE_LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
      
      // Use FastAPI backend instead of Supabase
      const response = await fetch(`${BACKEND_URL}/api/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          source_language: language === 'sv' ? 'Swedish' : 'English',
          target_language: targetLangName,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();

      if (data.translated_content) {
        setRefinedContent(data.translated_content);
        toast.success(`Översatt till ${targetLangName}!`);
      }
    } catch (error) {
      console.error('Error translating:', error);
      toast.error('Kunde inte översätta innehållet');
    } finally {
      setIsTranslating(false);
    }
  };
          throw new Error(data.error);
        }
        return;
      }

      setRefinedContent(data.translatedContent);
      toast.success(`Översatt till ${targetLangName}!`);
    } catch (error) {
      console.error('Error translating content:', error);
      toast.error('Kunde inte översätta innehållet');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAcceptRefinement = () => {
    if (refinedContent) {
      onRefinedContent(refinedContent);
      toast.success('Förfinat innehåll sparat!');
    }
  };

  return (
    <Card ref={ref} className="border-primary/30 bg-primary/5">
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
                  disabled={isProcessing || isTranslating}
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

            {/* Translation Section */}
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center gap-2 text-sm font-medium">
                <Languages className="h-4 w-4 text-primary" />
                Översätt till annat språk
              </div>
              <div className="flex gap-2">
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Välj målspråk..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {AVAILABLE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating || isProcessing || !targetLanguage}
                  className="gap-2"
                >
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  Översätt
                </Button>
              </div>
            </div>

            {/* Custom Instruction */}
            <div className="space-y-2">
              <Separator />
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
                disabled={isProcessing || isTranslating || !customInstruction.trim()}
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
});

AIRefinementPanel.displayName = 'AIRefinementPanel';

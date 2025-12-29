import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useResearchHub } from '@/hooks/useResearchHub';
import { RESEARCH_MODES, ResearchMode } from '@/types/research';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Globe, 
  Loader2, 
  ChevronDown, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Download,
  BookOpen,
  Link2,
  Plus,
  X,
  Sparkles,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface ResearchHubProps {
  onResearchComplete?: (content: string, citations: string[]) => void;
  context?: string;
  language?: 'sv' | 'en';
  courseTitle?: string;
  courseOutline?: string;
}

interface AIRecommendation {
  mode: ResearchMode;
  modeName: string;
  modelUsed: string;
  confidence: number;
  reasoning: string;
  alternativeMode?: ResearchMode;
  alternativeReasoning?: string;
}

export function ResearchHub({ onResearchComplete, context, language = 'sv', courseTitle, courseOutline }: ResearchHubProps) {
  const [topic, setTopic] = useState('');
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('general');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [manualCitationUrl, setManualCitationUrl] = useState('');
  const [manualCitationTitle, setManualCitationTitle] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  
  const {
    isResearching,
    isScraping,
    results,
    citations,
    research,
    scrapeUrl: performScrape,
    addCitation,
    removeCitation,
    clearCitations,
    exportCitations,
  } = useResearchHub();

  const handleAIRecommend = async () => {
    if (!courseTitle && !courseOutline) {
      toast.error('Ingen kurskontext tillgänglig. Skapa först en titel eller disposition.');
      return;
    }

    setIsRecommending(true);
    setAiRecommendation(null);

    try {
      const { data, error } = await supabase.functions.invoke('recommend-research-mode', {
        body: {
          courseTitle,
          courseOutline,
          language,
        },
      });

      if (error) throw error;

      if (data?.success && data?.recommendation) {
        const rec = data.recommendation as AIRecommendation;
        setAiRecommendation(rec);
        setSelectedMode(rec.mode);
        toast.success(`AI rekommenderar: ${rec.modeName}`);
      } else {
        throw new Error(data?.error || 'Could not get recommendation');
      }
    } catch (error) {
      console.error('AI recommendation error:', error);
      toast.error('Kunde inte få AI-rekommendation');
    } finally {
      setIsRecommending(false);
    }
  };

  const applyRecommendation = (mode: ResearchMode) => {
    setSelectedMode(mode);
    toast.success(`Forskningsläge ändrat till: ${RESEARCH_MODES.find(m => m.id === mode)?.name}`);
  };

  const handleResearch = async () => {
    const domains = domainFilter.trim() 
      ? domainFilter.split(',').map(d => d.trim()).filter(Boolean)
      : undefined;

    const result = await research(topic, selectedMode, {
      context,
      language,
      domainFilter: domains,
    });

    if (result && onResearchComplete) {
      onResearchComplete(result.content, result.citations);
    }
  };

  const handleScrape = async () => {
    await performScrape(scrapeUrl);
  };

  const handleAddManualCitation = () => {
    if (!manualCitationUrl.trim()) {
      toast.error('Ange en URL');
      return;
    }
    addCitation({
      url: manualCitationUrl,
      title: manualCitationTitle || undefined,
    });
    setManualCitationUrl('');
    setManualCitationTitle('');
  };

  const handleExportCitations = (format: 'text' | 'markdown' | 'bibtex') => {
    const output = exportCitations(format);
    if (output) {
      navigator.clipboard.writeText(output);
      toast.success('Källor kopierade till urklipp');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopierat till urklipp');
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Forskningshub
        </CardTitle>
        <CardDescription>
          Multi-source research med Perplexity AI (5 modeller) + Firecrawl scraping
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Sök
            </TabsTrigger>
            <TabsTrigger value="scrape" className="gap-2">
              <Globe className="h-4 w-4" />
              Skrapa
            </TabsTrigger>
            <TabsTrigger value="citations" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Källor ({citations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            {/* Research Mode Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Forskningsläge</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIRecommend}
                  disabled={isRecommending || (!courseTitle && !courseOutline)}
                  className="gap-2 border-primary/50 hover:bg-primary/10"
                >
                  {isRecommending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyserar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-primary" />
                      Välj åt mig
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {RESEARCH_MODES.map((mode) => (
                  <Button
                    key={mode.id}
                    variant={selectedMode === mode.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedMode(mode.id);
                      setAiRecommendation(null);
                    }}
                    className={`flex flex-col items-center gap-1 h-auto py-2 ${
                      aiRecommendation?.mode === mode.id ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                  >
                    <span className="text-lg">{mode.icon}</span>
                    <span className="text-xs">{mode.name}</span>
                    {aiRecommendation?.mode === mode.id && (
                      <CheckCircle2 className="h-3 w-3 text-primary absolute -top-1 -right-1" />
                    )}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {RESEARCH_MODES.find(m => m.id === selectedMode)?.description}
                <span className="ml-2 text-primary">
                  ({RESEARCH_MODES.find(m => m.id === selectedMode)?.model})
                </span>
              </p>
            </div>

            {/* AI Recommendation Display */}
            {aiRecommendation && (
              <Alert className="border-primary/30 bg-primary/5">
                <Lightbulb className="h-4 w-4 text-primary" />
                <AlertTitle className="flex items-center gap-2">
                  AI-rekommendation: {aiRecommendation.modeName}
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(aiRecommendation.confidence * 100)}% säkerhet
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm">{aiRecommendation.reasoning}</p>
                  {aiRecommendation.alternativeMode && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">
                        <strong>Alternativ:</strong> {RESEARCH_MODES.find(m => m.id === aiRecommendation.alternativeMode)?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{aiRecommendation.alternativeReasoning}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyRecommendation(aiRecommendation.alternativeMode!)}
                        className="mt-1 text-xs h-7"
                      >
                        Använd alternativet istället
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Forskningsfråga</label>
              <Textarea
                placeholder="Ange ämne eller fråga att forska på..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
            </div>

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Avancerade alternativ
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Domänfilter (kommaseparerat)</label>
                  <Input
                    placeholder="t.ex. wikipedia.org, pubmed.gov"
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Begränsa sökning till specifika domäner. Prefix med - för att exkludera.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button 
              onClick={handleResearch} 
              disabled={isResearching || !topic.trim()}
              className="w-full"
            >
              {isResearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forskar...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Starta forskning
                </>
              )}
            </Button>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="font-medium">Senaste resultat</h4>
                <ScrollArea className="h-64">
                  {results.slice().reverse().map((result, i) => (
                    <Card key={i} className="mb-3 border-muted">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {RESEARCH_MODES.find(m => m.id === result.mode)?.icon}{' '}
                            {RESEARCH_MODES.find(m => m.id === result.mode)?.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(result.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription className="font-medium">
                          {result.topic}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {result.content.slice(0, 300)}...
                        </p>
                        <p className="text-xs text-primary mt-2">
                          {result.citations.length} källor • {result.model}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scrape" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL att skrapa</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/artikel"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                />
                <Button 
                  onClick={handleScrape} 
                  disabled={isScraping || !scrapeUrl.trim()}
                >
                  {isScraping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Använder Firecrawl för att extrahera innehåll från webbsidor
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Lägg till källa manuellt</h4>
              <div className="space-y-2">
                <Input
                  placeholder="URL"
                  value={manualCitationUrl}
                  onChange={(e) => setManualCitationUrl(e.target.value)}
                />
                <Input
                  placeholder="Titel (valfritt)"
                  value={manualCitationTitle}
                  onChange={(e) => setManualCitationTitle(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  onClick={handleAddManualCitation}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Lägg till källa
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="citations" className="space-y-4 mt-4">
            {citations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Inga källor samlade ännu</p>
                <p className="text-sm">Genomför forskning eller lägg till källor manuellt</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{citations.length} källor</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExportCitations('markdown')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exportera
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={clearCitations}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {citations.map((citation) => (
                      <div 
                        key={citation.id}
                        className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {citation.title || new URL(citation.url).hostname}
                            </span>
                          </div>
                          <a 
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            {citation.url.slice(0, 50)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {citation.stepName && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {citation.stepName}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCitation(citation.id)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleExportCitations('text')}
                  >
                    Text
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleExportCitations('markdown')}
                  >
                    Markdown
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleExportCitations('bibtex')}
                  >
                    BibTeX
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

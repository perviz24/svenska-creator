import { useState, useRef } from 'react';
import { FileText, ExternalLink, RefreshCw, ArrowRight, BookOpen, Clock, Quote, Volume2, Loader2, Play, Square, Upload, FileUp, Sparkles, Wand2, Edit3, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ModuleScript, CourseOutline, ScriptSection } from '@/types/course';
import { cn } from '@/lib/utils';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Varm, professionell' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Auktoritativ, lugn' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Vänlig, energisk' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Berättande, mjuk' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Tydlig, pedagogisk' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Djup, resonerande' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Ung, dynamisk' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Modern, klar' },
];

interface ScriptStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  isLoading: boolean;
  currentModuleIndex: number;
  courseTitle: string;
  language?: 'sv' | 'en';
  onGenerateScript: (moduleIndex: number) => void;
  onContinue: () => void;
  onUploadScript?: (moduleId: string, script: ModuleScript) => void;
}

export function ScriptStep({
  outline,
  scripts,
  isLoading,
  currentModuleIndex,
  courseTitle,
  language = 'sv',
  onGenerateScript,
  onContinue,
  onUploadScript,
}: ScriptStepProps) {
  const { getState, generateVoice, playAudio, stopAudio } = useVoiceSynthesis();
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [uploadMode, setUploadMode] = useState<'generate' | 'upload'>('generate');
  const [manualText, setManualText] = useState<Record<string, string>>({});
  const [selectedModuleForUpload, setSelectedModuleForUpload] = useState<string | null>(null);
  const [analyzingModule, setAnalyzingModule] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editedSections, setEditedSections] = useState<Record<string, ScriptSection[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!outline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ingen kursöversikt tillgänglig.</p>
      </div>
    );
  }

  const allScriptsGenerated = scripts.length === outline.modules.length;

  const handleGenerateVoice = async (script: ModuleScript) => {
    const fullText = script.sections.map(s => s.content).join('\n\n');
    await generateVoice(script.moduleId, fullText, selectedVoice);
  };

  const handlePlayPause = (script: ModuleScript) => {
    const state = getState(script.moduleId);
    if (state.isPlaying) {
      stopAudio(script.moduleId);
    } else {
      playAudio(script.moduleId);
    }
  };

  const parseTextToScript = (text: string, moduleId: string, moduleTitle: string): ModuleScript => {
    // Split text into sections by double newlines or headers
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    const sections: ScriptSection[] = paragraphs.map((content, idx) => ({
      id: `section-${idx}`,
      title: `Avsnitt ${idx + 1}`,
      content: content.trim(),
      slideMarkers: [],
    }));

    const wordCount = text.split(/\s+/).filter(w => w).length;
    const estimatedDuration = Math.ceil(wordCount / 150); // ~150 words per minute

    return {
      moduleId,
      moduleTitle,
      totalWords: wordCount,
      estimatedDuration,
      citations: [],
      sections,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, moduleId: string, moduleTitle: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const script = parseTextToScript(text, moduleId, moduleTitle);
      
      if (onUploadScript) {
        onUploadScript(moduleId, script);
        toast.success('Manus importerat!');
      }
    } catch (error) {
      toast.error('Kunde inte läsa filen');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualTextSubmit = (moduleId: string, moduleTitle: string) => {
    const text = manualText[moduleId];
    if (!text?.trim()) {
      toast.error('Ange text för manuset');
      return;
    }

    const script = parseTextToScript(text, moduleId, moduleTitle);
    
    if (onUploadScript) {
      onUploadScript(moduleId, script);
      setManualText(prev => ({ ...prev, [moduleId]: '' }));
      toast.success('Manus sparat!');
    }
  };

  const analyzeWithAI = async (script: ModuleScript, action: 'analyze' | 'expand' | 'convert') => {
    setAnalyzingModule(script.moduleId);
    
    try {
      const manuscriptText = script.sections.map(s => s.content).join('\n\n');
      
      const { data, error } = await supabase.functions.invoke('analyze-manuscript', {
        body: {
          manuscript: manuscriptText,
          moduleTitle: script.moduleTitle,
          courseTitle,
          action,
          language,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('För många förfrågningar. Försök igen senare.');
        } else if (data.error.includes('Payment')) {
          toast.error('Krediter krävs. Lägg till krediter för att fortsätta.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      // Update the script with AI-analyzed content
      const updatedScript: ModuleScript = {
        ...script,
        sections: data.sections,
        totalWords: data.totalWords,
        estimatedDuration: data.estimatedDuration,
      };

      if (onUploadScript) {
        onUploadScript(script.moduleId, updatedScript);
        toast.success(
          action === 'expand' ? 'Manus expanderat!' :
          action === 'convert' ? 'Manus konverterat till presentationsformat!' :
          'Manus analyserat och förbättrat!'
        );
        if (data.summary) {
          toast.info(data.summary, { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error analyzing manuscript:', error);
      toast.error('Kunde inte analysera manuset');
    } finally {
      setAnalyzingModule(null);
    }
  };

  const startEditing = (script: ModuleScript) => {
    setEditingModule(script.moduleId);
    setEditedSections(prev => ({
      ...prev,
      [script.moduleId]: [...script.sections]
    }));
  };

  const saveEdits = (script: ModuleScript) => {
    const sections = editedSections[script.moduleId];
    if (!sections) return;

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(w => w).length, 0);
    const updatedScript: ModuleScript = {
      ...script,
      sections,
      totalWords,
      estimatedDuration: Math.ceil(totalWords / 150),
    };

    if (onUploadScript) {
      onUploadScript(script.moduleId, updatedScript);
      toast.success('Ändringar sparade!');
    }
    
    setEditingModule(null);
  };

  const updateSectionContent = (moduleId: string, sectionIndex: number, content: string) => {
    setEditedSections(prev => {
      const sections = [...(prev[moduleId] || [])];
      if (sections[sectionIndex]) {
        sections[sectionIndex] = { ...sections[sectionIndex], content };
      }
      return { ...prev, [moduleId]: sections };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Manus</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generera manus med AI eller ladda upp eget kursinnehåll.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'generate' | 'upload')} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              AI-generera
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Ladda upp
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Voice Selection */}
      <div className="flex items-center justify-center gap-3">
        <label className="text-sm text-muted-foreground">Röst för uppläsning:</label>
        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Välj röst" />
          </SelectTrigger>
          <SelectContent>
            {ELEVENLABS_VOICES.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                <span className="font-medium">{voice.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">– {voice.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".txt,.md,.doc,.docx"
        onChange={(e) => {
          if (selectedModuleForUpload) {
            const module = outline?.modules.find(m => m.id === selectedModuleForUpload);
            if (module) {
              handleFileUpload(e, module.id, module.title);
            }
          }
        }}
      />

      {/* Module Scripts */}
      <div className="space-y-4">
        {outline.modules.map((module, index) => {
          const script = scripts.find(s => s.moduleId === module.id);
          const isCurrentModule = index === currentModuleIndex;
          const canGenerate = index <= scripts.length;

          return (
            <Card
              key={module.id}
              className={cn(
                "border-border/50 transition-all duration-300",
                isCurrentModule && isLoading && "ring-2 ring-primary/50",
                script && "border-success/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-accent" />
                    Modul {module.number}: {module.title}
                  </CardTitle>
                  {script ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      Genererad
                    </Badge>
                  ) : isCurrentModule && isLoading ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      Genererar...
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Väntar
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {script ? (
                  <>
                    {/* Script Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {script.totalWords || script.sections.reduce((acc, s) => acc + s.content.split(' ').length, 0)} ord
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        ~{script.estimatedDuration} min
                      </span>
                      {script.citations.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Quote className="w-4 h-4" />
                          {script.citations.length} källor
                        </span>
                      )}
                    </div>

                    {/* AI Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzeWithAI(script, 'analyze')}
                        disabled={analyzingModule === script.moduleId}
                        className="gap-2"
                      >
                        {analyzingModule === script.moduleId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Förbättra med AI
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzeWithAI(script, 'expand')}
                        disabled={analyzingModule === script.moduleId}
                        className="gap-2"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        Expandera
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzeWithAI(script, 'convert')}
                        disabled={analyzingModule === script.moduleId}
                        className="gap-2"
                      >
                        <Wand2 className="w-4 h-4" />
                        Konvertera till slides
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editingModule === script.moduleId ? saveEdits(script) : startEditing(script)}
                        className="gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        {editingModule === script.moduleId ? 'Spara' : 'Redigera'}
                      </Button>
                      {editingModule === script.moduleId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingModule(null)}
                        >
                          Avbryt
                        </Button>
                      )}
                    </div>

                    {/* Voice Synthesis */}
                    {(() => {
                      const voiceState = getState(script.moduleId);
                      return (
                        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                          {voiceState.audioUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlayPause(script)}
                              className="gap-2"
                            >
                              {voiceState.isPlaying ? (
                                <>
                                  <Square className="w-4 h-4" />
                                  Stoppa
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Spela upp
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateVoice(script)}
                              disabled={voiceState.isGenerating}
                              className="gap-2"
                            >
                              {voiceState.isGenerating ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Genererar röst...
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-4 h-4" />
                                  Generera röst
                                </>
                              )}
                            </Button>
                          )}
                          {voiceState.error && (
                            <span className="text-xs text-destructive">{voiceState.error}</span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Script Sections */}
                    <Accordion type="single" collapsible className="w-full">
                      {(editingModule === script.moduleId ? editedSections[script.moduleId] : script.sections)?.map((section, sIdx) => (
                        <AccordionItem key={section.id} value={section.id}>
                          <AccordionTrigger className="text-sm hover:no-underline">
                            {section.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            {editingModule === script.moduleId ? (
                              <Textarea
                                value={section.content}
                                onChange={(e) => updateSectionContent(script.moduleId, sIdx, e.target.value)}
                                className="min-h-[150px] text-sm"
                              />
                            ) : (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                  {section.content}
                                </p>
                                {section.slideMarkers.length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    <p className="text-xs font-medium text-foreground">Bilder:</p>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground">
                                      {section.slideMarkers.map((marker, mIdx) => (
                                        <li key={mIdx}>{marker}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>

                    {/* Citations */}
                    {script.citations.length > 0 && (
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                          <Quote className="w-3 h-3" />
                          Källor från Perplexity
                        </p>
                        <ul className="space-y-1">
                          {script.citations.map((citation, cIdx) => (
                            <li key={cIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary font-medium">[{cIdx + 1}]</span>
                              <a
                                href={citation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors flex items-center gap-1 break-all"
                              >
                                {citation}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : uploadMode === 'generate' ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                    {canGenerate && !isLoading && (
                      <Button
                        size="sm"
                        onClick={() => onGenerateScript(index)}
                        disabled={isLoading}
                      >
                        Generera manus
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                    
                    {/* Upload options */}
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedModuleForUpload(module.id);
                            fileInputRef.current?.click();
                          }}
                          className="gap-2"
                        >
                          <FileUp className="w-4 h-4" />
                          Ladda upp fil
                        </Button>
                        <span className="text-xs text-muted-foreground self-center">
                          (.txt, .md)
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Eller klistra in text:</Label>
                        <Textarea
                          placeholder="Klistra in ditt manus här..."
                          value={manualText[module.id] || ''}
                          onChange={(e) => setManualText(prev => ({ ...prev, [module.id]: e.target.value }))}
                          className="min-h-[120px] text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleManualTextSubmit(module.id, module.title)}
                          disabled={!manualText[module.id]?.trim()}
                        >
                          Spara manus
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        {!allScriptsGenerated && scripts.length > 0 && (
          <Button
            onClick={() => onGenerateScript(scripts.length)}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                Generera nästa modul
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
        {allScriptsGenerated && (
          <Button onClick={onContinue} className="gap-2">
            Fortsätt till slides
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

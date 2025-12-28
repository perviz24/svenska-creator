import { useState } from 'react';
import { FileText, ExternalLink, RefreshCw, ArrowRight, BookOpen, Clock, Quote, Volume2, Loader2, Play, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModuleScript, CourseOutline } from '@/types/course';
import { cn } from '@/lib/utils';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';

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
  onGenerateScript: (moduleIndex: number) => void;
  onContinue: () => void;
}

export function ScriptStep({
  outline,
  scripts,
  isLoading,
  currentModuleIndex,
  onGenerateScript,
  onContinue,
}: ScriptStepProps) {
  const { getState, generateVoice, playAudio, stopAudio } = useVoiceSynthesis();
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0].id);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Manus</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generera manus för varje modul. AI-forskning från Perplexity berikar innehållet.
        </p>
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
                      {script.sections.map((section, sIdx) => (
                        <AccordionItem key={section.id} value={section.id}>
                          <AccordionTrigger className="text-sm hover:no-underline">
                            {section.title}
                          </AccordionTrigger>
                          <AccordionContent>
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
                ) : (
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

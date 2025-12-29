import { useState, useRef } from 'react';
import { Video, Play, Sparkles, Loader2, ChevronRight, User, Settings, ExternalLink, Upload, SkipForward, Headphones } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slide, ModuleScript, CourseOutline, ModuleAudio, VideoSettings } from '@/types/course';
import { PresentationPlayer } from '@/components/PresentationPlayer';
import { AudioReviewPanel, VideoReviewPanel } from '@/components/AudioVideoReviewPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentUploader } from '@/components/ContentUploader';
import { AIRefinementPanel } from '@/components/AIRefinementPanel';

interface VideoStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  slides: Record<string, Slide[]>;
  moduleAudio: Record<string, ModuleAudio>;
  videoSettings: VideoSettings;
  courseTitle: string;
  voiceId: string;
  isLoading: boolean;
  onGenerateAudio: (moduleId: string, script: ModuleScript) => Promise<void>;
  onUpdateVideoSettings: (settings: Partial<VideoSettings>) => void;
  onContinue: () => void;
  onContentUploaded?: (content: string) => void;
  onSkip?: () => void;
}

interface HeyGenAvatar {
  id: string;
  name: string;
  thumbnailUrl: string;
  gender: string;
}

export function VideoStep({
  outline,
  scripts,
  slides,
  moduleAudio,
  videoSettings,
  courseTitle,
  voiceId,
  isLoading,
  onGenerateAudio,
  onUpdateVideoSettings,
  onContinue,
  onContentUploaded,
  onSkip,
}: VideoStepProps) {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [isGeneratingHeyGenVideo, setIsGeneratingHeyGenVideo] = useState(false);

  const [uploadMode, setUploadMode] = useState<'generate' | 'upload'>('generate');
  const [showNarrationRefinement, setShowNarrationRefinement] = useState(false);
  const [uploadedNarrationContent, setUploadedNarrationContent] = useState('');
  
  // Review state - track generated audio URLs and video IDs per module
  const [generatedAudioUrls, setGeneratedAudioUrls] = useState<Record<string, string>>({});
  const [generatedVideoIds, setGeneratedVideoIds] = useState<Record<string, string>>({});
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [isGeneratingTestAudio, setIsGeneratingTestAudio] = useState(false);

  const canGenerateFromSlides = !!outline && scripts.length > 0 && Object.keys(slides).length > 0;

  const currentScript = canGenerateFromSlides ? scripts[selectedModuleIndex] : undefined;
  const currentModuleSlides = currentScript ? slides[currentScript.moduleId] || [] : [];
  const currentAudio = currentScript ? moduleAudio[currentScript.moduleId] : undefined;

  const handleGenerateAudio = async () => {
    if (!currentScript) return;

    setIsGeneratingAudio(true);
    try {
      // Combine all speaker notes into one script
      const fullScript = currentModuleSlides
        .map(slide => slide.speakerNotes || slide.content)
        .filter(Boolean)
        .join('\n\n');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: fullScript,
            voiceId: voiceId || 'JBFqnCBsd6RMkjVDRZzb',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Voice generation failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Store the audio URL for review
      setGeneratedAudioUrls(prev => ({
        ...prev,
        [currentScript.moduleId]: audioUrl,
      }));
      setShowReviewPanel(true);

      // Store the audio URL (in real app, upload to storage)
      await onGenerateAudio(currentScript.moduleId, currentScript);
      
      toast.success('Röstberättelse genererad! Se förhandsgranskning nedan.');
    } catch (error) {
      console.error('Audio generation error:', error);
      toast.error('Kunde inte generera röstberättelse');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Test audio generation with only first slide (shorter text for testing)
  const handleGenerateTestAudio = async () => {
    if (!currentScript || currentModuleSlides.length === 0) return;

    setIsGeneratingTestAudio(true);
    try {
      // Use only the first slide's speaker notes for a quick test
      const testScript = currentModuleSlides[0]?.speakerNotes || currentModuleSlides[0]?.content || 'Test audio';
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: testScript.substring(0, 500), // Max 500 chars for test
            voiceId: voiceId || 'JBFqnCBsd6RMkjVDRZzb',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Ensure error is always a string, not an object
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : (errorData.error?.message || errorData.error?.detail || `Voice generation failed: ${response.status}`);
        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Store the audio URL for review
      setGeneratedAudioUrls(prev => ({
        ...prev,
        [`${currentScript.moduleId}-test`]: audioUrl,
      }));
      setShowReviewPanel(true);
      
      toast.success('Testljud genererat! Se förhandsgranskning nedan.');
    } catch (error) {
      console.error('Test audio generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Kunde inte generera testljud');
    } finally {
      setIsGeneratingTestAudio(false);
    }
  };

  const handleLoadAvatars = async () => {
    setIsLoadingAvatars(true);
    try {
      const { data, error } = await supabase.functions.invoke('heygen-video', {
        body: { action: 'list-avatars' },
      });

      if (error) throw error;
      setAvatars(data.avatars || []);
      
      if (data.avatars?.length === 0) {
        toast.info('Inga avatarer hittades. Kontrollera din HeyGen API-nyckel.');
      }
    } catch (error) {
      console.error('Error loading avatars:', error);
      toast.error('Kunde inte ladda avatarer. Kontrollera att HEYGEN_API_KEY är konfigurerad.');
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  const handleGenerateHeyGenVideo = async () => {
    if (!currentScript || !videoSettings.avatarId) {
      toast.error('Välj en avatar först');
      return;
    }

    setIsGeneratingHeyGenVideo(true);
    try {
      const fullScript = currentModuleSlides
        .map(slide => slide.speakerNotes || slide.content)
        .filter(Boolean)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('heygen-video', {
        body: {
          action: 'generate-video',
          script: fullScript,
          avatarId: videoSettings.avatarId,
          title: `${courseTitle} - ${currentScript.moduleTitle}`,
        },
      });

      if (error) throw error;

      // Store the video ID for tracking
      if (data.videoId && currentScript) {
        setGeneratedVideoIds(prev => ({
          ...prev,
          [currentScript.moduleId]: data.videoId,
        }));
        setShowReviewPanel(true);
      }

      toast.success('Videogenerering startad! Se status nedan.');
    } catch (error) {
      console.error('HeyGen video error:', error);
      toast.error('Kunde inte starta videogenerering');
    } finally {
      setIsGeneratingHeyGenVideo(false);
    }
  };

  const allModulesHaveAudio = scripts.every(script => 
    moduleAudio[script.moduleId]?.audioUrl
  );


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Video className="h-4 w-4" />
          Steg 5: Video & Röst
        </div>
        <h2 className="text-2xl font-bold">Skapa presentationsvideo</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generera AI-röstberättelse och spela upp som video, eller skapa avatar-video med HeyGen.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'generate' | 'upload')} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI-generera
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Ladda upp
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Upload Mode Content */}
      {uploadMode === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            {showNarrationRefinement && uploadedNarrationContent ? (
              <AIRefinementPanel
                content={uploadedNarrationContent}
                contentType="narration"
                context={courseTitle}
                onRefinedContent={(refined) => {
                  onContentUploaded?.(refined);
                  setShowNarrationRefinement(false);
                  setUploadedNarrationContent('');
                  toast.success('Förfinat manus importerat!');
                }}
                onSkipRefinement={() => {
                  onContentUploaded?.(uploadedNarrationContent);
                  setShowNarrationRefinement(false);
                  setUploadedNarrationContent('');
                  toast.success('Manus importerat!');
                }}
              />
            ) : (
              <ContentUploader
                onContentUploaded={(content) => {
                  setUploadedNarrationContent(content);
                  setShowNarrationRefinement(true);
                  toast.success('Manus uppladdad! Du kan nu förfina med AI.');
                }}
                label="Importera manus för röstberättelse"
                description="Ladda upp textfiler eller klistra in manus som ska läsas upp."
                placeholder="Klistra in manus för röstsyntes här..."
                compact
              />
            )}
          </CardContent>
        </Card>
      )}

      {uploadMode === 'generate' && (
        !canGenerateFromSlides ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Generera video</h3>
              <p className="text-muted-foreground">
                Du måste först generera slides för att kunna skapa video.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Module Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
        {scripts.map((script, index) => (
          <Button
            key={script.moduleId}
            variant={selectedModuleIndex === index ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedModuleIndex(index)}
            className="whitespace-nowrap"
          >
            Modul {index + 1}
            {moduleAudio[script.moduleId]?.audioUrl && (
              <Badge variant="secondary" className="ml-2">
                Ljud ✓
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Video Options */}
      <Tabs 
        value={videoSettings.videoStyle} 
        onValueChange={(v) => onUpdateVideoSettings({ videoStyle: v as 'presentation' | 'avatar' })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presentation" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Presentationsspelare
          </TabsTrigger>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            HeyGen Avatar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presentation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="h-5 w-5" />
                Presentationsspelare med AI-röst
              </CardTitle>
              <CardDescription>
                Synkroniserade slides med ElevenLabs röstberättelse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voice Selection */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Röst: ElevenLabs (konfigurerad i inställningar)
                  </p>
                </div>
              </div>

              {/* Generate Audio Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button 
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio || isGeneratingTestAudio || !currentModuleSlides.length}
                >
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Genererar röst...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generera röstberättelse
                    </>
                  )}
                </Button>

                <Button 
                  variant="secondary"
                  onClick={handleGenerateTestAudio}
                  disabled={isGeneratingAudio || isGeneratingTestAudio || !currentModuleSlides.length}
                >
                  {isGeneratingTestAudio ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testar...
                    </>
                  ) : (
                    <>
                      <Headphones className="mr-2 h-4 w-4" />
                      Testa röst (kort)
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setIsPlayerOpen(true)}
                  disabled={!currentModuleSlides.length}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Förhandsgranska
                </Button>
              </div>

              {/* Preview Info */}
              {currentModuleSlides.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{currentScript?.moduleTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {currentModuleSlides.length} slides • 
                        {currentAudio?.audioUrl ? ' Ljud genererat ✓' : ' Inget ljud ännu'}
                      </p>
                    </div>
                    {currentAudio?.duration && (
                      <Badge variant="secondary">
                        {Math.floor(currentAudio.duration / 60)}:{(currentAudio.duration % 60).toString().padStart(2, '0')}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avatar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                HeyGen AI Avatar Video
              </CardTitle>
              <CardDescription>
                Skapa professionell video med AI-avatar som presenterar ditt innehåll
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Load Avatars */}
              {avatars.length === 0 ? (
                <div className="text-center py-6">
                  <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Ladda tillgängliga AI-avatarer från HeyGen
                  </p>
                  <Button onClick={handleLoadAvatars} disabled={isLoadingAvatars}>
                    {isLoadingAvatars ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Laddar avatarer...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        Ladda avatarer
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Avatar Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Välj avatar</label>
                    <Select
                      value={videoSettings.avatarId}
                      onValueChange={(v) => {
                        const avatar = avatars.find(a => a.id === v);
                        onUpdateVideoSettings({ 
                          avatarId: v,
                          avatarName: avatar?.name,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Välj en avatar..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {avatars.map((avatar) => (
                          <SelectItem key={avatar.id} value={avatar.id}>
                            <div className="flex items-center gap-2">
                              {avatar.thumbnailUrl && (
                                <img 
                                  src={avatar.thumbnailUrl} 
                                  alt={avatar.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <span>{avatar.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {avatar.gender}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Avatar Preview */}
                  {videoSettings.avatarId && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        {avatars.find(a => a.id === videoSettings.avatarId)?.thumbnailUrl && (
                          <img 
                            src={avatars.find(a => a.id === videoSettings.avatarId)?.thumbnailUrl}
                            alt={videoSettings.avatarName}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{videoSettings.avatarName}</p>
                          <p className="text-sm text-muted-foreground">
                            Avatar vald för videogenerering
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate Video Button */}
                  <Button 
                    onClick={handleGenerateHeyGenVideo}
                    disabled={isGeneratingHeyGenVideo || !videoSettings.avatarId}
                    className="w-full"
                  >
                    {isGeneratingHeyGenVideo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Startar videogenerering...
                      </>
                    ) : (
                      <>
                        <Video className="mr-2 h-4 w-4" />
                        Generera HeyGen-video
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Video genereras hos HeyGen och kan ta några minuter.{' '}
                    <a 
                      href="https://app.heygen.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Öppna HeyGen Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </>
        )
      )}

      {/* Review Panel - Shows generated audio and video for review */}
      {showReviewPanel && currentScript && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Headphones className="h-5 w-5" />
                  Granska genererat innehåll
                </CardTitle>
                <CardDescription>
                  Lyssna på röstinspelningen och kontrollera videostatus innan export
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowReviewPanel(false)}
              >
                Dölj
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audio Review */}
            <AudioReviewPanel
              audioUrl={generatedAudioUrls[currentScript.moduleId] || currentAudio?.audioUrl || null}
              moduleTitle={currentScript.moduleTitle}
              onRegenerate={handleGenerateAudio}
              isGenerating={isGeneratingAudio}
            />

            {/* Video Review (only show if using HeyGen) */}
            {videoSettings.videoStyle === 'avatar' && (
              <VideoReviewPanel
                videoId={generatedVideoIds[currentScript.moduleId] || null}
                moduleTitle={currentScript.moduleTitle}
                onRegenerate={handleGenerateHeyGenVideo}
                isGenerating={isGeneratingHeyGenVideo}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Toggle Review Button */}
      {(Object.keys(generatedAudioUrls).length > 0 || Object.keys(generatedVideoIds).length > 0) && !showReviewPanel && (
        <Button
          variant="outline"
          onClick={() => setShowReviewPanel(true)}
          className="w-full"
        >
          <Headphones className="mr-2 h-4 w-4" />
          Visa genererat innehåll för granskning
        </Button>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          onClick={onSkip || onContinue}
          className="text-muted-foreground"
        >
          <SkipForward className="mr-2 h-4 w-4" />
          Hoppa över
        </Button>
        <Button onClick={onContinue} size="lg">
          Fortsätt till export
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Presentation Player Dialog */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Presentation Player</DialogTitle>
          </DialogHeader>
          {currentModuleSlides.length > 0 ? (
            <PresentationPlayer
              slides={currentModuleSlides}
              moduleTitle={currentScript?.moduleTitle || ''}
              courseTitle={courseTitle}
              audioUrl={currentAudio?.audioUrl}
              slideTiming={currentAudio?.slideTiming}
              onClose={() => setIsPlayerOpen(false)}
            />
          ) : (
            <div className="p-8 text-center">
              <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga slides tillgängliga</h3>
              <p className="text-muted-foreground mb-4">
                Du måste först generera slides för att kunna förhandsgranska presentationen.
              </p>
              <Button variant="outline" onClick={() => setIsPlayerOpen(false)}>
                Stäng
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

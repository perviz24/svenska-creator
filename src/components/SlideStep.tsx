import { useState } from 'react';
import { Presentation, Image, Sparkles, ChevronLeft, ChevronRight, Loader2, Search, RefreshCw, Wand2, Download, FileText, FileImage, Upload, ChevronDown, ChevronUp, Palette, SkipForward, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slide, ModuleScript, StockPhoto, CourseOutline } from '@/types/course';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentUploader } from '@/components/ContentUploader';
import { CanvaTemplates } from '@/components/CanvaTemplates';

interface SlideStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  slides: Record<string, Slide[]>;
  isLoading: boolean;
  courseTitle: string;
  onGenerateSlides: (moduleId: string, script: ModuleScript) => Promise<void>;
  onUpdateSlide: (moduleId: string, slideIndex: number, updates: Partial<Slide>) => void;
  onContinue: () => void;
  onContentUploaded?: (content: string) => void;
  onSkip?: () => void;
}

export function SlideStep({
  outline,
  scripts,
  slides,
  isLoading,
  courseTitle,
  onGenerateSlides,
  onUpdateSlide,
  onContinue,
  onContentUploaded,
  onSkip,
}: SlideStepProps) {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isSearchingPhotos, setIsSearchingPhotos] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceType, setEnhanceType] = useState<'design' | 'content' | 'full'>('full');
  const [isCanvaOpen, setIsCanvaOpen] = useState(false);

  if (!outline || scripts.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 text-center">
          <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Generera slides</h3>
          <p className="text-muted-foreground">
            Du måste först generera manus för att kunna skapa slides.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentScript = scripts[selectedModuleIndex];
  const currentModuleSlides = currentScript ? slides[currentScript.moduleId] || [] : [];
  const currentSlide = currentModuleSlides[selectedSlideIndex];

  const handleGenerateSlides = async () => {
    if (currentScript) {
      await onGenerateSlides(currentScript.moduleId, currentScript);
      setSelectedSlideIndex(0);
    }
  };

  const handleSearchPhotos = async (query?: string) => {
    const searchQuery = query || currentSlide?.suggestedImageQuery || currentSlide?.title;
    if (!searchQuery) return;

    setIsSearchingPhotos(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-stock-photos', {
        body: {
          query: searchQuery,
          providers: ['unsplash', 'pexels'],
          perPage: 12,
        },
      });

      if (error) throw error;
      setStockPhotos(data.photos || []);
    } catch (error) {
      console.error('Error searching photos:', error);
      toast.error('Kunde inte söka bilder');
    } finally {
      setIsSearchingPhotos(false);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!currentSlide) return;

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-slide-image', {
        body: {
          prompt: currentSlide.suggestedImageQuery || currentSlide.title,
          style: 'professional',
        },
      });

      if (error) throw error;

      onUpdateSlide(currentScript.moduleId, selectedSlideIndex, {
        imageUrl: data.imageUrl,
        imageSource: 'ai-generated',
        imageAttribution: 'AI-generated image',
      });

      toast.success('AI-bild genererad!');
    } catch (error) {
      console.error('Error generating AI image:', error);
      toast.error('Kunde inte generera AI-bild');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSelectPhoto = (photo: StockPhoto) => {
    onUpdateSlide(currentScript.moduleId, selectedSlideIndex, {
      imageUrl: photo.url,
      imageSource: photo.source as Slide['imageSource'],
      imageAttribution: photo.attribution,
    });
    toast.success('Bild vald!');
  };

  const handleEnhanceSlides = async () => {
    if (!currentScript || currentModuleSlides.length === 0) return;

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-slides', {
        body: {
          slides: currentModuleSlides.map(slide => ({
            title: slide.title,
            content: slide.content,
            layout: slide.layout,
            speakerNotes: slide.speakerNotes,
            backgroundColor: slide.backgroundColor,
          })),
          enhanceType,
          courseTitle,
          language: 'sv',
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Apply enhanced slides
      const enhancedSlides = data.enhancedSlides || [];
      enhancedSlides.forEach((enhanced: any, index: number) => {
        if (index < currentModuleSlides.length) {
          onUpdateSlide(currentScript.moduleId, index, {
            title: enhanced.title || currentModuleSlides[index].title,
            content: enhanced.content || currentModuleSlides[index].content,
            layout: enhanced.layout || currentModuleSlides[index].layout,
            speakerNotes: enhanced.speakerNotes || currentModuleSlides[index].speakerNotes,
            backgroundColor: enhanced.backgroundColor || currentModuleSlides[index].backgroundColor,
          });
        }
      });

      // Show design suggestions if available
      if (data.overallSuggestions?.designNotes) {
        toast.info(data.overallSuggestions.designNotes, { duration: 5000 });
      }

      toast.success(`${enhancedSlides.length} slides förbättrade med AI!`);
    } catch (error) {
      console.error('Error enhancing slides:', error);
      toast.error('Kunde inte förbättra slides');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleExport = async (format: 'pptx' | 'pdf') => {
    if (!currentScript || currentModuleSlides.length === 0) return;

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-slides', {
        body: {
          slides: currentModuleSlides.map(slide => ({
            title: slide.title,
            content: slide.content,
            speakerNotes: slide.speakerNotes,
            layout: slide.layout,
            imageUrl: slide.imageUrl,
            backgroundColor: slide.backgroundColor,
          })),
          courseTitle: courseTitle,
          moduleTitle: currentScript.moduleTitle,
          format,
        },
      });

      if (error) throw error;

      // Create a blob and download
      const blob = new Blob([data.content], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Presentation exporterad som ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Kunde inte exportera presentation');
    } finally {
      setIsExporting(false);
    }
  };

  const allModulesHaveSlides = scripts.every(script => 
    slides[script.moduleId] && slides[script.moduleId].length > 0
  );

  const getLayoutLabel = (layout: string) => {
    const labels: Record<string, string> = {
      'title': 'Titel',
      'title-content': 'Titel + Innehåll',
      'two-column': 'Två kolumner',
      'image-focus': 'Bildfokus',
      'quote': 'Citat',
      'bullet-points': 'Punktlista',
    };
    return labels[layout] || layout;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Presentation className="h-4 w-4" />
          Steg 4: Presentationsslides
        </div>
        <h2 className="text-2xl font-bold">Skapa slides från manus</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          AI genererar professionella slides med smarta bildförslag från stockfoto-bibliotek.
        </p>
      </div>

      {/* Upload Own Content */}
      <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Ladda upp eget slide-innehåll
            </span>
            {isUploadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <ContentUploader
            onContentUploaded={(content) => onContentUploaded?.(content)}
            label="Importera slide-innehåll"
            description="Ladda upp presentationer eller dokument som bas för slides."
            placeholder="Klistra in slide-text eller bullet points här..."
            compact
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Module Selector with Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          {scripts.map((script, index) => (
            <Button
              key={script.moduleId}
              variant={selectedModuleIndex === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedModuleIndex(index);
                setSelectedSlideIndex(0);
                setStockPhotos([]);
              }}
              className="whitespace-nowrap"
            >
              Modul {index + 1}
              {slides[script.moduleId]?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {slides[script.moduleId].length} slides
                </Badge>
              )}
            </Button>
          ))}
        </div>
        
        {/* AI Enhancement & Export */}
        <div className="flex gap-2">
          {currentModuleSlides.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isEnhancing}>
                  {isEnhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Palette className="h-4 w-4 mr-2" />
                  )}
                  AI-förbättra
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={() => { setEnhanceType('design'); handleEnhanceSlides(); }} className="cursor-pointer">
                  <Palette className="h-4 w-4 mr-2" />
                  Förbättra design
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEnhanceType('content'); handleEnhanceSlides(); }} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Förbättra innehåll
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEnhanceType('full'); handleEnhanceSlides(); }} className="cursor-pointer">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Full AI-analys
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Export Dropdown */}
          {currentModuleSlides.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Ladda ner
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={() => handleExport('pptx')} className="cursor-pointer">
                  <FileImage className="h-4 w-4 mr-2" />
                  PowerPoint (XML)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (HTML)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content */}
      {currentModuleSlides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Generera slides för {currentScript?.moduleTitle}</h3>
            <p className="text-muted-foreground mb-6">
              AI analyserar manuset och skapar professionella presentationsslides.
            </p>
            <Button onClick={handleGenerateSlides} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Genererar slides...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generera slides
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Slide Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Förhandsvisning</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSlideIndex(Math.max(0, selectedSlideIndex - 1))}
                    disabled={selectedSlideIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedSlideIndex + 1} / {currentModuleSlides.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSlideIndex(Math.min(currentModuleSlides.length - 1, selectedSlideIndex + 1))}
                    disabled={selectedSlideIndex === currentModuleSlides.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentSlide && (
                <div 
                  className="aspect-video rounded-lg border overflow-hidden relative"
                  style={{ 
                    backgroundColor: currentSlide.backgroundColor || 'hsl(var(--card))'
                  }}
                >
                  {currentSlide.imageUrl && (
                    <img 
                      src={currentSlide.imageUrl} 
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10 p-6 h-full flex flex-col">
                    <Badge variant="outline" className="self-start mb-2 text-xs">
                      {getLayoutLabel(currentSlide.layout)}
                    </Badge>
                    <h3 className="text-xl font-bold mb-3">{currentSlide.title}</h3>
                    <div className="flex-1 text-sm text-muted-foreground whitespace-pre-wrap overflow-auto">
                      {currentSlide.content}
                    </div>
                    {currentSlide.imageAttribution && (
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {currentSlide.imageAttribution}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Slide Thumbnails */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {currentModuleSlides.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlideIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden transition-all",
                      selectedSlideIndex === index 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: slide.backgroundColor || 'hsl(var(--muted))' }}
                  >
                    {slide.imageUrl && (
                      <img 
                        src={slide.imageUrl} 
                        alt=""
                        className="w-full h-full object-cover opacity-50"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="h-5 w-5" />
                Välj bild
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="stock" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="stock">Stockfoton</TabsTrigger>
                  <TabsTrigger value="ai">AI-genererad</TabsTrigger>
                  <TabsTrigger value="canva" className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Canva
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stock" className="space-y-4">
                  {/* Search Bar */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={currentSlide?.suggestedImageQuery || 'Sök bilder...'}
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchPhotos(customSearchQuery)}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleSearchPhotos(customSearchQuery || undefined)}
                      disabled={isSearchingPhotos}
                    >
                      {isSearchingPhotos ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                    {currentSlide?.suggestedImageQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomSearchQuery('');
                          handleSearchPhotos(currentSlide.suggestedImageQuery);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        AI-förslag
                      </Button>
                    )}
                  </div>

                  {/* Photo Grid */}
                  {stockPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {stockPhotos.map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() => handleSelectPhoto(photo)}
                          className="relative aspect-video rounded overflow-hidden border-2 border-transparent hover:border-primary transition-all group"
                        >
                          <img 
                            src={photo.thumbnailUrl} 
                            alt={photo.photographer}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {photo.source}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sök efter bilder eller klicka "AI-förslag"</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    Gratis bilder från Unsplash & Pexels. Konfigurera premium-leverantörer i inställningar.
                  </p>
                </TabsContent>

                <TabsContent value="ai" className="space-y-4">
                  <div className="text-center py-6">
                    <Wand2 className="h-10 w-10 mx-auto text-primary mb-3" />
                    <h4 className="font-medium mb-2">Generera unik bild med AI</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Skapa en anpassad bild baserad på slide-innehållet.
                    </p>
                    <Button 
                      onClick={handleGenerateAIImage}
                      disabled={isGeneratingImage}
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Genererar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generera AI-bild
                        </>
                      )}
                    </Button>
                  </div>

                  {currentSlide?.imageSource === 'ai-generated' && currentSlide.imageUrl && (
                    <div className="rounded-lg overflow-hidden border">
                      <img 
                        src={currentSlide.imageUrl}
                        alt="AI-genererad"
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="canva" className="space-y-4">
                  <CanvaTemplates
                    slides={currentModuleSlides}
                    onApplyTemplate={(templateId, styledSlides) => {
                      styledSlides.forEach((slide, index) => {
                        onUpdateSlide(currentScript.moduleId, index, {
                          backgroundColor: slide.backgroundColor,
                        });
                      });
                    }}
                    onExportToCanva={() => {
                      toast.info('Öppna den nedladdade filen i Canva för att redigera');
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onSkip || onContinue}
          className="text-muted-foreground"
        >
          <SkipForward className="mr-2 h-4 w-4" />
          Hoppa över detta steg
        </Button>
        <Button onClick={onContinue} size="lg">
          Fortsätt till övningar
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

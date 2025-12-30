import { useState, useEffect } from 'react';
import { Presentation, Image, Sparkles, ChevronLeft, ChevronRight, Loader2, Search, RefreshCw, Wand2, Download, FileText, FileImage, Upload, Palette, SkipForward, Layers, FileSpreadsheet, Zap, Settings2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slide, ModuleScript, StockPhoto, CourseOutline, DemoModeSettings, ProjectMode } from '@/types/course';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentUploader } from '@/components/ContentUploader';
import { CanvaTemplates } from '@/components/CanvaTemplates';
import { GoogleSlidesExport } from '@/components/GoogleSlidesExport';
import { AIRefinementPanel } from '@/components/AIRefinementPanel';
import { DemoWatermark } from '@/components/DemoWatermark';

type SlideGenerator = 'internal' | 'presenton';
type ExportTemplate = 'professional' | 'modern' | 'minimal' | 'creative';

interface SlideStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  slides: Record<string, Slide[]>;
  isLoading: boolean;
  courseTitle: string;
  demoMode?: DemoModeSettings;
  projectMode?: ProjectMode;
  onGenerateSlides: (moduleId: string, script: ModuleScript) => Promise<void>;
  onUpdateSlide: (moduleId: string, slideIndex: number, updates: Partial<Slide>) => void;
  onSetModuleSlides?: (moduleId: string, slides: Slide[]) => void;
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
  demoMode,
  projectMode = 'course',
  onGenerateSlides,
  onUpdateSlide,
  onSetModuleSlides,
  onContinue,
  onContentUploaded,
  onSkip,
}: SlideStepProps) {
  const isDemoMode = demoMode?.enabled || false;
  const showWatermark = isDemoMode && (demoMode?.watermarkEnabled !== false);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isSearchingPhotos, setIsSearchingPhotos] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceType, setEnhanceType] = useState<'design' | 'content' | 'full'>('full');
  const [isCanvaOpen, setIsCanvaOpen] = useState(false);

  const [uploadMode, setUploadMode] = useState<'generate' | 'upload'>('generate');
  const [showSlideRefinement, setShowSlideRefinement] = useState(false);
  const [uploadedSlideContent, setUploadedSlideContent] = useState('');
  
  // New state for Presenton integration
  const [slideGenerator, setSlideGenerator] = useState<SlideGenerator>('internal');
  const [exportTemplate, setExportTemplate] = useState<ExportTemplate>('professional');
  const [isGeneratingPresenton, setIsGeneratingPresenton] = useState(false);
  
  // Apply demo mode limits to slide count
  const maxSlidesAllowed = isDemoMode ? (demoMode?.maxSlides || 3) : 20;
  const [numSlides, setNumSlides] = useState(isDemoMode ? Math.min(10, maxSlidesAllowed) : 10);
  
  // Presenton async polling state
  const [presentonTaskId, setPresentonTaskId] = useState<string | null>(null);
  const [presentonProgress, setPresentonProgress] = useState(0);
  const [presentonStatus, setPresentonStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [presentonDownloadUrl, setPresentonDownloadUrl] = useState<string | null>(null);
  const [presentonEditUrl, setPresentonEditUrl] = useState<string | null>(null);
  
  // Regeneration / alternatives state
  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    timestamp: Date;
    downloadUrl?: string;
    editUrl?: string;
    slideCount?: number;
    style: string;
  }>>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Helper function to clean markdown from slide content
  const cleanMarkdown = (text: string): string => {
    if (!text) return '';
    return text
      // Remove bold/italic markers
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      // Remove heading markers
      .replace(/^#{1,6}\s*/gm, '')
      // Remove list markers (but keep the text)
      .replace(/^[\s]*[-•]\s*/gm, '• ')
      // Remove numbered list markers
      .replace(/^[\s]*\d+\.\s*/gm, '')
      // Remove underscores for emphasis
      .replace(/__/g, '')
      .replace(/_/g, '')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // In presentation mode, we don't need scripts - generate from title directly
  const isPresentation = projectMode === 'presentation';
  const canGenerateFromScripts = !!outline && scripts.length > 0;
  const canGenerate = isPresentation || canGenerateFromScripts;

  // For presentations, use a placeholder module ID based on title
  const presentationModuleId = `presentation-${courseTitle?.replace(/\s+/g, '-').toLowerCase() || 'slides'}`;
  
  const currentScript = canGenerateFromScripts ? scripts[selectedModuleIndex] : undefined;
  const currentModuleId = isPresentation ? presentationModuleId : currentScript?.moduleId;
  const currentModuleSlides = currentModuleId ? slides[currentModuleId] || [] : [];
  const currentSlide = currentModuleSlides[selectedSlideIndex];

  const handleGenerateSlides = async () => {
    if (slideGenerator === 'presenton') {
      await handleGeneratePresenton();
      return;
    }
    
    if (isPresentation) {
      // For presentations, create a minimal script-like object from the title
      const presentationScript: ModuleScript = {
        moduleId: presentationModuleId,
        moduleTitle: courseTitle || 'Presentation',
        totalWords: 0,
        estimatedDuration: 0,
        citations: [],
        sections: [{
          id: 'section-1',
          title: courseTitle || 'Presentation',
          content: courseTitle || 'Presentation content',
          slideMarkers: [],
        }],
      };
      await onGenerateSlides(presentationModuleId, presentationScript);
      setSelectedSlideIndex(0);
    } else if (currentScript) {
      await onGenerateSlides(currentScript.moduleId, currentScript);
      setSelectedSlideIndex(0);
    }
  };

  const handleGeneratePresenton = async (retryCount = 0) => {
    const maxRetries = 2;
    
    setIsGeneratingPresenton(true);
    setPresentonStatus('pending');
    setPresentonProgress(0);
    setPresentonDownloadUrl(null);
    setPresentonEditUrl(null);
    
    try {
      const scriptContent = currentScript?.sections?.map(s => `${s.title}\n${s.content}`).join('\n\n') || '';
      
      // Step 1: Start async generation
      const { data, error } = await supabase.functions.invoke('presenton-slides', {
        body: {
          action: 'generate',
          topic: isPresentation ? courseTitle : currentScript?.moduleTitle,
          numSlides: Math.min(numSlides, isDemoMode ? (demoMode?.maxSlides || 3) : 50),
          language: 'sv',
          style: exportTemplate,
          tone: exportTemplate, // Pass both for proper mapping
          scriptContent,
          moduleTitle: currentScript?.moduleTitle || courseTitle,
          courseTitle,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to call slide generation service');
      }

      // Check if it's an async response (Presenton) or sync response (Lovable AI fallback)
      if (data.status === 'pending' && data.taskId) {
        // Presenton async - start polling
        setPresentonTaskId(data.taskId);
        setPresentonProgress(10);
        toast.info('Presentation genereras via Presenton...');
        
        // Poll for completion
        await pollPresentonStatus(data.taskId);
      } else if (data.status === 'completed' && data.slides) {
        // Lovable AI sync response - apply slides directly
        handleSlidesReceived(data.slides, data.source);
        setPresentonStatus('completed');
        toast.success(`${data.slideCount || data.slides.length} slides genererade!`);
      } else if (data.error) {
        // Check if retryable
        if (data.retryable && retryCount < maxRetries) {
          console.log(`Retrying slide generation (attempt ${retryCount + 1}/${maxRetries})...`);
          toast.info('Försöker igen...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return handleGeneratePresenton(retryCount + 1);
        }
        throw new Error(data.error);
      } else {
        console.error('Unexpected response format:', data);
        throw new Error('Unexpected response from slide generation service');
      }
    } catch (error) {
      console.error('Presenton generation error:', error);
      setPresentonStatus('failed');
      
      // Check if we should retry
      if (retryCount < maxRetries) {
        console.log(`Retrying slide generation (attempt ${retryCount + 1}/${maxRetries})...`);
        toast.info('Ett fel uppstod. Försöker igen...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return handleGeneratePresenton(retryCount + 1);
      }
      
      // Final fallback to internal generator
      toast.error('Presenton misslyckades. Använder intern generator.');
      setSlideGenerator('internal');
      await fallbackToInternalGenerator();
    } finally {
      if (presentonStatus !== 'pending' && presentonStatus !== 'processing') {
        setIsGeneratingPresenton(false);
      }
    }
  };

  const pollPresentonStatus = async (taskId: string) => {
    const maxAttempts = 60; // 2 minutes max
    const pollInterval = 2000; // 2 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('presenton-slides', {
          body: {
            action: 'status',
            taskId,
          },
        });

        if (error) throw error;

        // Update progress based on attempt (simulate progress)
        const progress = Math.min(10 + (attempt * 1.5), 90);
        setPresentonProgress(progress);

        if (data.status === 'completed') {
          setPresentonStatus('completed');
          setPresentonProgress(100);
          setPresentonDownloadUrl(data.downloadUrl);
          setPresentonEditUrl(data.editUrl);
          setIsGeneratingPresenton(false);
          
          // Save to generation history for alternatives
          setGenerationHistory(prev => [...prev, {
            id: taskId,
            timestamp: new Date(),
            downloadUrl: data.downloadUrl,
            editUrl: data.editUrl,
            style: exportTemplate,
          }]);
          
          toast.success('Presentation genererad via Presenton!', {
            action: {
              label: 'Ladda ner PPTX',
              onClick: () => window.open(data.downloadUrl, '_blank'),
            },
          });
          
          // Presenton returns PPTX, not slide data - show download options
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Generation failed');
        }

        setPresentonStatus(data.status);

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Polling error:', error);
        setPresentonStatus('failed');
        setIsGeneratingPresenton(false);
        toast.error('Fel vid hämtning av presentation status');
        return;
      }
    }

    // Timeout
    setPresentonStatus('failed');
    setIsGeneratingPresenton(false);
    toast.error('Timeout - presentationen tog för lång tid att generera');
  };

  const handleSlidesReceived = (slidesData: any[], source: string) => {
    const moduleId = isPresentation ? presentationModuleId : currentScript?.moduleId;
    if (moduleId && onSetModuleSlides) {
      const newSlides: Slide[] = slidesData.map((slide: any, index: number) => ({
        moduleId,
        slideNumber: index + 1,
        title: slide.title,
        content: slide.content,
        speakerNotes: slide.speakerNotes,
        layout: slide.layout as Slide['layout'] || 'title-content',
        imageUrl: slide.imageUrl,
        imageSource: slide.imageSource as Slide['imageSource'],
        imageAttribution: slide.imageAttribution,
        suggestedImageQuery: slide.suggestedImageQuery,
      }));
      onSetModuleSlides(moduleId, newSlides);
    }
    
    toast.success(`${slidesData.length} slides genererade${source === 'presenton' ? ' via Presenton' : ''}!`);
    setSelectedSlideIndex(0);
  };

  const fallbackToInternalGenerator = async () => {
    if (isPresentation) {
      const presentationScript: ModuleScript = {
        moduleId: presentationModuleId,
        moduleTitle: courseTitle || 'Presentation',
        totalWords: 0,
        estimatedDuration: 0,
        citations: [],
        sections: [{
          id: 'section-1',
          title: courseTitle || 'Presentation',
          content: courseTitle || 'Presentation content',
          slideMarkers: [],
        }],
      };
      await onGenerateSlides(presentationModuleId, presentationScript);
    } else if (currentScript) {
      await onGenerateSlides(currentScript.moduleId, currentScript);
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

      if (currentModuleId) {
        onUpdateSlide(currentModuleId, selectedSlideIndex, {
          imageUrl: data.imageUrl,
          imageSource: 'ai-generated',
          imageAttribution: 'AI-generated image',
        });
      }

      toast.success('AI-bild genererad!');
    } catch (error) {
      console.error('Error generating AI image:', error);
      toast.error('Kunde inte generera AI-bild');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSelectPhoto = (photo: StockPhoto) => {
    if (!currentModuleId) return;
    onUpdateSlide(currentModuleId, selectedSlideIndex, {
      imageUrl: photo.url,
      imageSource: photo.source as Slide['imageSource'],
      imageAttribution: photo.attribution,
    });
    toast.success('Bild vald!');
  };

  const handleEnhanceSlides = async () => {
    if (!currentModuleId || currentModuleSlides.length === 0) return;

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
          onUpdateSlide(currentModuleId, index, {
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
    if (!currentModuleId || currentModuleSlides.length === 0) return;

    setIsExporting(true);
    try {
      const moduleTitle = isPresentation ? courseTitle : currentScript?.moduleTitle || 'Presentation';
      
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
          moduleTitle,
          format,
          demoMode: isDemoMode,
          template: exportTemplate,
        },
      });

      if (error) throw error;

      // Handle base64 PPTX or HTML content
      let blob: Blob;
      if (data.isBase64 && format === 'pptx') {
        // Decode base64 to binary
        const binaryString = atob(data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: data.contentType });
      } else {
        // HTML content for PDF
        blob = new Blob([data.content], { type: data.contentType });
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Presentation exporterad som ${format.toUpperCase()} med ${exportTemplate}-mall!`);
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


  // Determine step number based on project mode
  const stepNumber = projectMode === 'presentation' ? 3 : 5;
  const stepDescription = projectMode === 'presentation' 
    ? 'Skapa slides för din presentation'
    : 'Skapa slides från manus';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Presentation className="h-4 w-4" />
          Steg {stepNumber}: Presentationsslides
        </div>
        <h2 className="text-2xl font-bold">{stepDescription}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          AI genererar professionella slides med smarta bildförslag från stockfoto-bibliotek.
        </p>
      </div>

      {/* Mode Toggle + Generator Settings */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
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
        
        {uploadMode === 'generate' && (
          <div className="flex gap-2 items-center">
            <Select value={slideGenerator} onValueChange={(v) => setSlideGenerator(v as SlideGenerator)}>
              <SelectTrigger className="w-[140px]">
                <Zap className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Intern AI</SelectItem>
                <SelectItem value="presenton">Presenton</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={exportTemplate} onValueChange={(v) => setExportTemplate(v as ExportTemplate)}>
              <SelectTrigger className="w-[130px]">
                <Settings2 className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professionell</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="creative">Kreativ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Upload Mode Content */}
      {uploadMode === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            {showSlideRefinement && uploadedSlideContent ? (
              <AIRefinementPanel
                content={uploadedSlideContent}
                contentType="slides"
                context={courseTitle}
                onRefinedContent={(refined) => {
                  onContentUploaded?.(refined);
                  setShowSlideRefinement(false);
                  setUploadedSlideContent('');
                  toast.success('Förfinat slide-innehåll importerat!');
                }}
                onSkipRefinement={() => {
                  onContentUploaded?.(uploadedSlideContent);
                  setShowSlideRefinement(false);
                  setUploadedSlideContent('');
                  toast.success('Slide-innehåll importerat!');
                }}
              />
            ) : (
              <ContentUploader
                onContentUploaded={(content) => {
                  setUploadedSlideContent(content);
                  setShowSlideRefinement(true);
                  toast.success('Innehåll uppladdad! Du kan nu förfina med AI.');
                }}
                label="Importera slide-innehåll"
                description="Ladda upp presentationer eller dokument som bas för slides."
                placeholder="Klistra in slide-text eller bullet points här..."
                compact
              />
            )}
          </CardContent>
        </Card>
      )}

      {uploadMode === 'generate' && (
        <>

      {/* Module Selector with Export - only show for course mode with scripts */}
      <div className="flex items-center justify-between gap-4">
        {!isPresentation && scripts.length > 0 && (
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
        )}
        
        {/* Show slide count in presentation mode */}
        {isPresentation && currentModuleSlides.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {currentModuleSlides.length} slides
            </Badge>
          </div>
        )}
        
        {/* Spacer when no module buttons */}
        {(isPresentation || scripts.length === 0) && currentModuleSlides.length === 0 && (
          <div className="flex-1" />
        )}
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
                  PowerPoint (.pptx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF-dokument
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!canGenerate ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Generera slides</h3>
            <p className="text-muted-foreground">
              {isPresentation 
                ? 'Ange en titel först för att kunna generera slides.'
                : 'Du måste först generera manus för att kunna skapa slides.'}
            </p>
          </CardContent>
        </Card>
      ) : currentModuleSlides.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Presentation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isPresentation 
                ? `Generera slides för "${courseTitle}"`
                : `Generera slides för ${currentScript?.moduleTitle}`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isPresentation 
                ? 'AI skapar professionella presentationsslides baserat på ditt ämne.'
                : 'AI analyserar manuset och skapar professionella presentationsslides.'}
            </p>
            
            {/* Generator Selection */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Generator:</span>
                <Select value={slideGenerator} onValueChange={(v) => setSlideGenerator(v as SlideGenerator)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3" />
                        Intern AI
                      </div>
                    </SelectItem>
                    <SelectItem value="presenton">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        Presenton
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {slideGenerator === 'presenton' && (
                <>
                  {/* Template Style Previews */}
                  <div className="w-full mt-2 mb-4">
                    <span className="text-sm text-muted-foreground mb-3 block">Välj stil:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Professional */}
                      <button
                        onClick={() => setExportTemplate('professional')}
                        className={cn(
                          "group relative aspect-[4/3] rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-105",
                          exportTemplate === 'professional' 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 p-2">
                          <div className="h-1 w-8 bg-blue-500 rounded mb-1" />
                          <div className="h-0.5 w-12 bg-white/60 rounded mb-0.5" />
                          <div className="h-0.5 w-10 bg-white/40 rounded mb-0.5" />
                          <div className="h-0.5 w-8 bg-white/30 rounded" />
                          <div className="absolute bottom-1 right-1 w-6 h-4 bg-blue-500/30 rounded-sm" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm py-1 text-center">
                          <span className="text-xs font-medium">Professionell</span>
                        </div>
                        {exportTemplate === 'professional' && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-primary-foreground">✓</span>
                          </div>
                        )}
                      </button>

                      {/* Modern */}
                      <button
                        onClick={() => setExportTemplate('modern')}
                        className={cn(
                          "group relative aspect-[4/3] rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-105",
                          exportTemplate === 'modern' 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-800 p-2">
                          <div className="h-1 w-6 bg-white rounded-full mb-1" />
                          <div className="flex gap-1 mb-1">
                            <div className="h-3 w-3 bg-white/20 rounded" />
                            <div className="flex-1">
                              <div className="h-0.5 w-full bg-white/50 rounded mb-0.5" />
                              <div className="h-0.5 w-3/4 bg-white/30 rounded" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 h-2 bg-white/10 rounded-full" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm py-1 text-center">
                          <span className="text-xs font-medium">Modern</span>
                        </div>
                        {exportTemplate === 'modern' && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-primary-foreground">✓</span>
                          </div>
                        )}
                      </button>

                      {/* Minimal */}
                      <button
                        onClick={() => setExportTemplate('minimal')}
                        className={cn(
                          "group relative aspect-[4/3] rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-105",
                          exportTemplate === 'minimal' 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="absolute inset-0 bg-white p-3">
                          <div className="h-0.5 w-10 bg-gray-800 rounded mb-2" />
                          <div className="h-0.5 w-14 bg-gray-300 rounded mb-0.5" />
                          <div className="h-0.5 w-12 bg-gray-200 rounded mb-0.5" />
                          <div className="h-0.5 w-10 bg-gray-200 rounded" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm py-1 text-center">
                          <span className="text-xs font-medium">Minimal</span>
                        </div>
                        {exportTemplate === 'minimal' && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-primary-foreground">✓</span>
                          </div>
                        )}
                      </button>

                      {/* Creative */}
                      <button
                        onClick={() => setExportTemplate('creative')}
                        className={cn(
                          "group relative aspect-[4/3] rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-105",
                          exportTemplate === 'creative' 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 p-2">
                          <div className="absolute top-1 left-1 w-4 h-4 bg-yellow-300 rounded-full opacity-60" />
                          <div className="absolute top-3 right-2 w-2 h-2 bg-cyan-300 rounded-full opacity-80" />
                          <div className="mt-4 ml-1">
                            <div className="h-1 w-8 bg-white rounded-full mb-1" />
                            <div className="h-0.5 w-10 bg-white/60 rounded" />
                          </div>
                          <div className="absolute bottom-2 right-1 w-5 h-3 bg-white/20 rounded rotate-12" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm py-1 text-center">
                          <span className="text-xs font-medium">Kreativ</span>
                        </div>
                        {exportTemplate === 'creative' && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-primary-foreground">✓</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Antal slides:</span>
                    <Select value={numSlides.toString()} onValueChange={(v) => setNumSlides(parseInt(v))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleGenerateSlides} disabled={isLoading || isGeneratingPresenton}>
                {isLoading || isGeneratingPresenton ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {slideGenerator === 'presenton' ? 'Genererar...' : 'Genererar...'}
                  </>
                ) : (
                  <>
                    {slideGenerator === 'presenton' ? <Zap className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generera slides
                  </>
                )}
              </Button>
              
              {/* Regenerate / Alternatives button */}
              {generationHistory.length > 0 && slideGenerator === 'presenton' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" title="Alternativ & regenerera">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover z-50 w-64">
                    <DropdownMenuLabel>Genererade alternativ</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {generationHistory.slice(-5).reverse().map((item, idx) => (
                      <DropdownMenuItem 
                        key={item.id} 
                        className="flex flex-col items-start gap-1 cursor-pointer"
                        onClick={() => item.downloadUrl && window.open(item.downloadUrl, '_blank')}
                      >
                        <span className="font-medium text-sm">
                          {idx === 0 ? '✓ Senaste' : `Alternativ ${generationHistory.length - idx}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.style} • {item.timestamp.toLocaleTimeString('sv-SE')}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleGenerateSlides} 
                      disabled={isGeneratingPresenton}
                      className="cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generera nytt alternativ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* Presenton Progress Indicator */}
            {isGeneratingPresenton && slideGenerator === 'presenton' && (
              <div className="mt-6 w-full max-w-md mx-auto">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {presentonStatus === 'pending' && 'Startar generering...'}
                      {presentonStatus === 'processing' && 'Skapar presentation...'}
                      {presentonStatus === 'completed' && 'Klart!'}
                      {presentonStatus === 'failed' && 'Fel uppstod'}
                    </span>
                    <span className="font-medium">{Math.round(presentonProgress)}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${presentonProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Presenton genererar din presentation. Detta kan ta upp till 2 minuter.
                  </p>
                </div>
              </div>
            )}

            {/* Presenton Download/Edit Options */}
            {presentonStatus === 'completed' && (presentonDownloadUrl || presentonEditUrl) && (
              <div className="mt-6 w-full max-w-md mx-auto">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Presentation genererad via Presenton!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Din presentation är klar. Ladda ner som PPTX eller redigera i Presenton.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presentonDownloadUrl && (
                      <Button 
                        size="sm" 
                        onClick={() => window.open(presentonDownloadUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Ladda ner PPTX
                      </Button>
                    )}
                    {presentonEditUrl && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(presentonEditUrl, '_blank')}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Redigera i Presenton
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setPresentonStatus('idle');
                        setPresentonDownloadUrl(null);
                        setPresentonEditUrl(null);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generera igen
                    </Button>
                  </div>
                  
                  {/* Alternatives display */}
                  {generationHistory.length > 1 && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">
                        {generationHistory.length} alternativ genererade
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {generationHistory.slice(-5).map((item, idx) => (
                          <Button
                            key={item.id}
                            size="sm"
                            variant={item.downloadUrl === presentonDownloadUrl ? "default" : "outline"}
                            className="text-xs h-7"
                            onClick={() => item.downloadUrl && window.open(item.downloadUrl, '_blank')}
                          >
                            {idx === generationHistory.length - 1 ? 'Senaste' : `Alt ${idx + 1}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {slideGenerator === 'presenton' && presentonStatus === 'idle' && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Presenton använder avancerad AI för att skapa professionella slides.
              </p>
            )}
          </CardContent>
        </Card>
        </>
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
                  className="aspect-video rounded-xl border-2 border-border/50 overflow-hidden relative shadow-lg"
                  style={{ 
                    backgroundColor: currentSlide.backgroundColor || 'hsl(var(--card))',
                    background: currentSlide.imageUrl 
                      ? `linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.7))` 
                      : currentSlide.backgroundColor || 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--muted)))'
                  }}
                >
                  {currentSlide.imageUrl && (
                    <img 
                      src={currentSlide.imageUrl} 
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                  
                  <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                    <Badge variant="secondary" className="self-start mb-3 text-xs bg-white/20 text-white backdrop-blur-sm border-0">
                      {getLayoutLabel(currentSlide.layout)}
                    </Badge>
                    <h3 className="text-xl md:text-2xl font-bold mb-3 text-white drop-shadow-lg line-clamp-2">
                      {cleanMarkdown(currentSlide.title)}
                    </h3>
                    <div className="text-sm md:text-base text-white/90 whitespace-pre-wrap overflow-hidden line-clamp-4 drop-shadow leading-relaxed">
                      {cleanMarkdown(currentSlide.content)}
                    </div>
                    {currentSlide.imageAttribution && (
                      <p className="text-xs text-white/60 mt-3 truncate">
                        📷 {currentSlide.imageAttribution}
                      </p>
                    )}
                  </div>
                  
                  {/* Demo Watermark */}
                  {showWatermark && <DemoWatermark />}
                </div>
              )}

              {/* Slide Thumbnails */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {currentModuleSlides.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlideIndex(index)}
                    className={cn(
                      "relative flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden transition-all",
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
                    <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                      <span className="text-xs font-bold text-foreground">{index + 1}</span>
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
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="stock">Stockfoton</TabsTrigger>
                  <TabsTrigger value="ai">AI-genererad</TabsTrigger>
                  <TabsTrigger value="canva" className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Canva
                  </TabsTrigger>
                  <TabsTrigger value="google" className="flex items-center gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    Google
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
                      if (!currentModuleId) return;
                      styledSlides.forEach((slide, index) => {
                        onUpdateSlide(currentModuleId, index, {
                          backgroundColor: slide.backgroundColor,
                        });
                      });
                    }}
                    onExportToCanva={() => {
                      toast.info('Öppna den nedladdade filen i Canva för att redigera');
                    }}
                  />
                </TabsContent>

                <TabsContent value="google" className="space-y-4">
                  <GoogleSlidesExport
                    slides={currentModuleSlides}
                    courseTitle={courseTitle}
                    moduleTitle={currentScript?.moduleTitle || ''}
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
          {projectMode === 'presentation' || demoMode?.enabled 
            ? 'Fortsätt till export' 
            : 'Fortsätt till övningar'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

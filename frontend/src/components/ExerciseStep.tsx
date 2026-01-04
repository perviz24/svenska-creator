import { useState, useRef } from 'react';
import { BookOpen, RefreshCw, ArrowRight, Loader2, ChevronDown, ChevronUp, Clock, FileText, Upload, CheckSquare, Edit, Download, GraduationCap, Search, Globe, Database, Link, File, X, Check, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ModuleScript, CourseOutline, ModuleExercises, Exercise, ExercisePart, ExerciseSection } from '@/types/course';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIReviewEditor } from '@/components/AIReviewEditor';
import { ContentUploader } from '@/components/ContentUploader';
import { generateExercises as generateExercisesAPI } from '@/lib/contentApi';

interface ExerciseStepProps {
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  exercises: Record<string, ModuleExercises>;
  isLoading: boolean;
  courseTitle: string;
  language?: 'sv' | 'en';
  onExercisesGenerated: (moduleId: string, exercises: ModuleExercises) => void;
  onContinue: () => void;
}

type ExerciseType = 'mixed' | 'checklist' | 'reflection' | 'practical' | 'case-study';
type ResearchMode = 'general' | 'academic' | 'deep' | 'quick' | 'reasoning';

interface UploadedDocument {
  id: string;
  fileName: string;
  content: string;
  wordCount: number;
}

interface ScrapedUrl {
  url: string;
  title: string;
  content: string;
  success: boolean;
}

export function ExerciseStep({
  outline,
  scripts,
  exercises,
  isLoading,
  courseTitle,
  language = 'sv',
  onExercisesGenerated,
  onContinue,
}: ExerciseStepProps) {
  const [generatingModule, setGeneratingModule] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [exerciseTemplate, setExerciseTemplate] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [exerciseType, setExerciseType] = useState<ExerciseType>('mixed');
  
  // Research settings
  const [researchMode, setResearchMode] = useState<ResearchMode>('general');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [urlsToScrape, setUrlsToScrape] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<string>('');
  
  // File upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // URL scraping state
  const [scrapedUrls, setScrapedUrls] = useState<ScrapedUrl[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  
  // AI editing state
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'purpose' | null>(null);

  // Upload toggle (quick access)
  const [isUploadOpen, setIsUploadOpen] = useState(false);


  const allExercisesGenerated = Object.keys(exercises).length === scripts.length;

  const generateExercises = async (script: ModuleScript) => {
    setGeneratingModule(script.moduleId);

    try {
      const scriptText = script.sections.map(s => s.content).join('\n\n');

      // Include research results if available
      const enhancedScript = researchResults 
        ? `${scriptText}\n\n--- FORSKNINGSRESULTAT ---\n${researchResults}`
        : scriptText;

      // Call FastAPI backend instead of Supabase
      const data = await generateExercisesAPI({
        module_title: script.moduleTitle,
        module_content: enhancedScript,
        course_title: courseTitle,
        num_exercises: 3,
        difficulty: exerciseType === 'practical' ? 'hard' : 'medium',
        language,
      });

      // Map API response to internal exercise format
      const moduleExercises: ModuleExercises = {
        moduleId: script.moduleId,
        moduleTitle: script.moduleTitle,
        exercises: data.exercises.map(ex => ({
          id: ex.id,
          title: ex.question,
          type: ex.type as any,
          purpose: ex.explanation,
          estimatedTime: ex.points,
          parts: [{
            id: `${ex.id}-part-1`,
            title: ex.question,
            description: ex.explanation,
            type: 'text',
          }],
        })),
      };

      onExercisesGenerated(script.moduleId, moduleExercises);
      toast.success(`Övningar för "${script.moduleTitle}" genererade!`);
    } catch (error) {
      console.error('Error generating exercises:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera övningar';
      toast.error(message);
    } finally {
      setGeneratingModule(null);
    }
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const newDocuments: UploadedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(((i + 1) / files.length) * 100);

      try {
        // Read file content and parse locally or via FastAPI
        const content = await file.text();
        
        newDocuments.push({
          id: `doc-${Date.now()}-${i}`,
          fileName: file.name,
          content: content,
          wordCount: content.split(/\s+/).length,
        });
        toast.success(`"${file.name}" laddades upp`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Fel vid uppladdning av "${file.name}"`);
      }
    }

    setUploadedDocuments(prev => [...prev, ...newDocuments]);
    
    // Combine all document content into knowledge base
    const allContent = [...uploadedDocuments, ...newDocuments]
      .map(d => `--- ${d.fileName} ---\n${d.content}`)
      .join('\n\n');
    setKnowledgeBase(allContent);

    setIsUploading(false);
    setUploadProgress(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove uploaded document
  const removeDocument = (id: string) => {
    const updated = uploadedDocuments.filter(d => d.id !== id);
    setUploadedDocuments(updated);
    
    const allContent = updated
      .map(d => `--- ${d.fileName} ---\n${d.content}`)
      .join('\n\n');
    setKnowledgeBase(allContent);
  };

  // URL scraping handler
  const scrapeUrls = async () => {
    const urls = urlsToScrape.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) {
      toast.error('Ange minst en URL');
      return;
    }

    setIsScraping(true);
    try {
      // Use FastAPI backend instead of Supabase
      const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${BACKEND_URL}/api/research/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) throw new Error('Scraping failed');
      const data = await response.json();

      if (data.success) {
        const results = data.results.map((r: { url: string; title?: string; content?: string; success: boolean }) => ({
          url: r.url,
          title: r.title || r.url,
          content: r.content || '',
          success: r.success,
        }));
        
        setScrapedUrls(results);
        
        // Add scraped content to knowledge base
        if (data.combinedContent) {
          setKnowledgeBase(prev => 
            prev ? `${prev}\n\n--- SCRAPED URLS ---\n${data.combinedContent}` : data.combinedContent
          );
        }
        
        toast.success(`${data.successfulUrls}/${data.totalUrls} URLs scrapade`);
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('Kunde inte scrapa URLs');
    } finally {
      setIsScraping(false);
    }
  };

  const performResearch = async (topic: string) => {
    setIsResearching(true);
    try {
      // Combine uploaded documents with manual knowledge base
      const combinedKnowledge = knowledgeBase;

      // Use FastAPI backend instead of Supabase
      const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${BACKEND_URL}/api/research/topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          context: `${courseTitle}\n\n${combinedKnowledge || ''}`,
          language,
          depth: researchMode === 'deep' ? 'deep' : 'standard',
        }),
      });

      if (!response.ok) throw new Error('Research failed');
      const data = await response.json();

      if (data.content) {
        setResearchResults(data.content);
        toast.success('Forskning klar!');
      }
    } catch (error) {
      console.error('Research error:', error);
      toast.error('Kunde inte utföra forskning');
    } finally {
      setIsResearching(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'checklist': return <CheckSquare className="w-4 h-4" />;
      case 'reflection': return <FileText className="w-4 h-4" />;
      case 'self-assessment': return <GraduationCap className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checklist: 'Checklista',
      reflection: 'Reflektion',
      practical: 'Praktisk',
      'case-study': 'Fallstudie',
      'self-assessment': 'Självbedömning',
    };
    return labels[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-success/10 text-success border-success/30';
      case 'intermediate': return 'bg-warning/10 text-warning border-warning/30';
      case 'advanced': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderSection = (section: ExerciseSection) => {
    switch (section.sectionType) {
      case 'checkbox-list':
        return (
          <div className="space-y-1">
            {section.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-lg">□</span>
                <span>{item}</span>
              </div>
            ))}
            {section.includeOther && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-lg">□</span>
                <span>Annat: _______________________________</span>
              </div>
            )}
          </div>
        );
      case 'numbered-list':
        return (
          <div className="space-y-2">
            {section.items?.map((item, i) => (
              <div key={i} className="text-sm text-muted-foreground">
                {i + 1}. {item || '_______________________________'}
              </div>
            )) || [1, 2].map((n) => (
              <div key={n} className="text-sm text-muted-foreground">
                {n}. _______________________________
              </div>
            ))}
          </div>
        );
      case 'free-text':
        return (
          <div className="border border-dashed border-border/50 rounded p-4 bg-secondary/20">
            <p className="text-sm text-muted-foreground italic">
              {section.description || 'Skriv ditt svar här...'}
            </p>
          </div>
        );
      case 'ranking':
        return (
          <div className="space-y-2">
            {section.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{i + 1}.</span>
                <span>{item || '_______________________________'}</span>
              </div>
            )) || [1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{n}.</span>
                <span>_______________________________</span>
              </div>
            ))}
          </div>
        );
      case 'description':
      default:
        return section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null;
    }
  };

  const exportExercise = (exercise: Exercise) => {
    let content = `# ${exercise.title}\n\n`;
    content += `## Syfte\n${exercise.purpose}\n\n`;

    exercise.parts.forEach((part) => {
      content += `## Del ${part.partNumber}: ${part.partTitle}\n\n`;
      part.sections.forEach((section) => {
        content += `### ${section.sectionTitle}\n`;
        if (section.description) {
          content += `${section.description}\n\n`;
        }
        if (section.items) {
          section.items.forEach((item, i) => {
            if (section.sectionType === 'checkbox-list') {
              content += `- □ ${item}\n`;
            } else {
              content += `${i + 1}. ${item}\n`;
            }
          });
          if (section.includeOther) {
            content += `- □ Annat: _______________\n`;
          }
        }
        content += '\n';
      });
    });

    if (exercise.footer) {
      content += `---\n${exercise.footer}\n`;
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exercise.title.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Övning exporterad!');
  };

  const handleUpdateExercise = (moduleId: string, exerciseId: string, field: 'title' | 'purpose', newValue: string) => {
    const moduleExercises = exercises[moduleId];
    if (!moduleExercises) return;

    const updatedExercises = moduleExercises.exercises.map(ex =>
      ex.id === exerciseId ? { ...ex, [field]: newValue } : ex
    );
    
    onExercisesGenerated(moduleId, {
      ...moduleExercises,
      exercises: updatedExercises,
    });
    
    setEditingExerciseId(null);
    setEditingField(null);
    toast.success('Övning uppdaterad!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Kursövningar</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Generera professionella, interaktiva övningar för varje modul.
        </p>
      </div>

      {/* Upload own content (quick access) */}
      <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Ladda upp underlag för övningar
            </span>
            {isUploadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <ContentUploader
            onContentUploaded={(content) => {
              setKnowledgeBase((prev) => (prev ? `${prev}\n\n--- UPPLADDAT UNDERLAG ---\n${content}` : content));
              toast.success('Underlag importerat och kopplat till övningssteget!');
            }}
            label="Importera underlag"
            description="Ladda upp dokument, klistra in text eller ange URL:er som ska påverka övningsgenereringen."
            placeholder="Klistra in underlag för övningar här..."
            compact
          />
        </CollapsibleContent>
      </Collapsible>
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Övningsgenerator
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-2">
            <Search className="w-4 h-4" />
            Forskningsverktyg
          </TabsTrigger>
        </TabsList>

        <TabsContent value="research" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4" />
                Avancerad Forskning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Research Mode Selection */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { value: 'general', label: 'Allmän', icon: Globe },
                  { value: 'academic', label: 'Akademisk', icon: GraduationCap },
                  { value: 'deep', label: 'Djupanalys', icon: Search },
                  { value: 'quick', label: 'Snabb', icon: ArrowRight },
                  { value: 'reasoning', label: 'Resonemang', icon: FileText },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={researchMode === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResearchMode(value as ResearchMode)}
                    className="gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* File Upload for Knowledge Base */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Ladda upp dokument
                </Label>
                
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <File className="w-4 h-4" />
                    )}
                    Välj filer
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">
                    PDF, DOCX, TXT, MD, CSV (max 10MB)
                  </span>
                </div>

                {isUploading && (
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">Laddar upp...</p>
                  </div>
                )}

                {/* Uploaded Documents List */}
                {uploadedDocuments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Uppladdade dokument:</p>
                    <div className="flex flex-wrap gap-2">
                      {uploadedDocuments.map(doc => (
                        <Badge 
                          key={doc.id} 
                          variant="secondary" 
                          className="gap-1 pr-1"
                        >
                          <File className="w-3 h-3" />
                          {doc.fileName}
                          <span className="text-muted-foreground ml-1">({doc.wordCount} ord)</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                            onClick={() => removeDocument(doc.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Knowledge Base Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Kunskapsbas (manuell inmatning)
                </Label>
                <Textarea
                  placeholder="Klistra in innehåll från dokument, anteckningar eller tidigare forskning..."
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* URLs to Scrape */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  URLs att scrapa
                </Label>
                <Textarea
                  placeholder="https://example.com/article1&#10;https://example.com/article2"
                  value={urlsToScrape}
                  onChange={(e) => setUrlsToScrape(e.target.value)}
                  className="min-h-[60px] text-sm font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrapeUrls}
                  disabled={isScraping || !urlsToScrape.trim()}
                  className="gap-2"
                >
                  {isScraping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  Scrapa URLs
                </Button>

                {/* Scraped URLs Results */}
                {scrapedUrls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Scrapade sidor:</p>
                    <div className="space-y-1">
                      {scrapedUrls.map((scraped, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 text-xs p-2 rounded",
                            scraped.success ? "bg-success/10" : "bg-destructive/10"
                          )}
                        >
                          {scraped.success ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <X className="w-3 h-3 text-destructive" />
                          )}
                          <span className="truncate flex-1">{scraped.title || scraped.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Domain Filter */}
              <div className="space-y-2">
                <Label>Domänfilter (kommaseparerat)</Label>
                <Input
                  placeholder="wikipedia.org, nih.gov, nature.com"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Research Topic Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ange forskningsämne..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      performResearch((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Ange forskningsämne..."]') as HTMLInputElement;
                    if (input?.value) performResearch(input.value);
                  }}
                  disabled={isResearching}
                  className="gap-2"
                >
                  {isResearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Sök
                </Button>
              </div>

              {/* Research Results */}
              {researchResults && (
                <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Forskningsresultat</h4>
                    <Badge variant="outline" className="text-xs">
                      Inkluderas i övningar
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {researchResults.slice(0, 500)}...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generator" className="space-y-4 mt-4">
          {/* Exercise Settings */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Övningsinställningar
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Exercise Type */}
              <div className="space-y-2">
                <Label>Övningstyp</Label>
                <Select value={exerciseType} onValueChange={(v) => setExerciseType(v as ExerciseType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Blandade typer</SelectItem>
                    <SelectItem value="checklist">Checklistor & självbedömning</SelectItem>
                    <SelectItem value="reflection">Reflektionsövningar</SelectItem>
                    <SelectItem value="practical">Praktiska uppgifter</SelectItem>
                    <SelectItem value="case-study">Fallstudier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Övningsmall (valfri)
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTemplateInput(!showTemplateInput)}
                  >
                    {showTemplateInput ? 'Dölj' : 'Visa'}
                  </Button>
                </div>
                {showTemplateInput && (
                  <Textarea
                    placeholder="Klistra in en exempelövning som mall för att styra format och stil..."
                    value={exerciseTemplate}
                    onChange={(e) => setExerciseTemplate(e.target.value)}
                    className="min-h-[100px] text-sm"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Module Exercises */}
          <div className="space-y-4">
            {scripts.map((script) => {
              const moduleExercises = exercises[script.moduleId];
              const isGenerating = generatingModule === script.moduleId;
              const isExpanded = expandedModule === script.moduleId;

              return (
                <Card
                  key={script.moduleId}
                  className={cn(
                    "border-border/50 transition-all duration-300",
                    moduleExercises && "border-success/50"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="w-5 h-5 text-accent" />
                        {script.moduleTitle}
                      </CardTitle>
                      {moduleExercises ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                          {moduleExercises.exercises.length} övningar
                        </Badge>
                      ) : isGenerating ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          Genererar...
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Ej genererad
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {moduleExercises ? (
                      <Collapsible open={isExpanded} onOpenChange={() => setExpandedModule(isExpanded ? null : script.moduleId)}>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 flex-wrap">
                            {moduleExercises.exercises.map((ex) => (
                              <Badge key={ex.id} variant="outline" className="gap-1">
                                {getTypeIcon(ex.type)}
                                {getTypeLabel(ex.type)}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateExercises(script)}
                              disabled={isGenerating}
                              className="gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Regenerera
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button size="sm" variant="ghost" className="gap-2">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {isExpanded ? 'Dölj' : 'Visa'}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent className="mt-4 space-y-6">
                          {moduleExercises.exercises.map((exercise, idx) => (
                            <div key={exercise.id} className="p-4 bg-secondary/30 rounded-lg space-y-4 border border-border/30">
                              {/* Exercise Header */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  {editingExerciseId === exercise.id && editingField === 'title' ? (
                                    <AIReviewEditor
                                      content={exercise.title}
                                      contentType="description"
                                      context={`Övning för ${script.moduleTitle}`}
                                      onSave={(newValue) => handleUpdateExercise(script.moduleId, exercise.id, 'title', newValue)}
                                      onCancel={() => { setEditingExerciseId(null); setEditingField(null); }}
                                      showInline
                                      minHeight="40px"
                                    />
                                  ) : (
                                    <h4 
                                      className="font-semibold text-lg group cursor-pointer flex items-center gap-2"
                                      onClick={() => { setEditingExerciseId(exercise.id); setEditingField('title'); }}
                                    >
                                      {exercise.title}
                                      <Wand2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
                                    </h4>
                                  )}
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    <Badge variant="outline" className="gap-1">
                                      <Clock className="w-3 h-3" />
                                      {exercise.estimatedTime} min
                                    </Badge>
                                    <Badge variant="outline" className={getDifficultyColor(exercise.difficulty)}>
                                      {exercise.difficulty === 'beginner' ? 'Nybörjare' : exercise.difficulty === 'intermediate' ? 'Medel' : 'Avancerad'}
                                    </Badge>
                                    <Badge variant="outline" className="gap-1">
                                      {getTypeIcon(exercise.type)}
                                      {getTypeLabel(exercise.type)}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => exportExercise(exercise)}
                                  className="gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Exportera
                                </Button>
                              </div>

                              {/* Purpose */}
                              <div className="space-y-1">
                                <h5 className="font-medium text-sm">Syfte</h5>
                                {editingExerciseId === exercise.id && editingField === 'purpose' ? (
                                  <AIReviewEditor
                                    content={exercise.purpose}
                                    contentType="description"
                                    context={`Övning: ${exercise.title}`}
                                    onSave={(newValue) => handleUpdateExercise(script.moduleId, exercise.id, 'purpose', newValue)}
                                    onCancel={() => { setEditingExerciseId(null); setEditingField(null); }}
                                    showInline
                                  />
                                ) : (
                                  <p 
                                    className="text-sm text-muted-foreground group cursor-pointer flex items-center gap-2"
                                    onClick={() => { setEditingExerciseId(exercise.id); setEditingField('purpose'); }}
                                  >
                                    {exercise.purpose}
                                    <Wand2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </p>
                                )}
                              </div>

                              {/* Parts */}
                              {exercise.parts?.map((part) => (
                                <div key={part.partNumber} className="space-y-3 pt-3 border-t border-border/30">
                                  <h5 className="font-medium">Del {part.partNumber}: {part.partTitle}</h5>
                                  {part.sections.map((section, si) => (
                                    <div key={si} className="pl-4 space-y-2">
                                      <p className="text-sm font-medium text-foreground/80">{section.sectionTitle}</p>
                                      {renderSection(section)}
                                    </div>
                                  ))}
                                </div>
                              ))}

                              {/* Learning Objectives */}
                              <div className="space-y-2 pt-3 border-t border-border/30">
                                <p className="text-xs font-medium text-foreground">Lärandemål:</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {exercise.learningObjectives.map((obj, i) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Footer */}
                              {exercise.footer && (
                                <div className="pt-3 border-t border-border/30">
                                  <p className="text-xs text-muted-foreground italic">{exercise.footer}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Generera professionella övningar baserat på modulens innehåll
                        </p>
                        <Button
                          size="sm"
                          onClick={() => generateExercises(script)}
                          disabled={isGenerating || isLoading}
                          className="gap-2"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Genererar...
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4" />
                              Generera övningar
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        {!allExercisesGenerated && Object.keys(exercises).length > 0 && (
          <Button
            onClick={() => {
              const nextScript = scripts.find(s => !exercises[s.moduleId]);
              if (nextScript) generateExercises(nextScript);
            }}
            disabled={isLoading || generatingModule !== null}
            className="gap-2"
          >
            {generatingModule ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                Generera nästa
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
        <Button onClick={onContinue} variant={allExercisesGenerated ? 'default' : 'outline'} className="gap-2">
          {allExercisesGenerated ? 'Fortsätt till quiz' : 'Hoppa över övningar'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
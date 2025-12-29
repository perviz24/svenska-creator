import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Clock, Target, ArrowRight, Loader2, RefreshCw, Edit2, Check, X, Wand2, Search, Upload, FileUp, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseOutline, Module, LearningObjective, SubTopic } from '@/types/course';
import { AIReviewEditor } from '@/components/AIReviewEditor';
import { ResearchHub } from '@/components/ResearchHub';
import { ContentUploader } from '@/components/ContentUploader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OutlineStepProps {
  outline: CourseOutline | null;
  isLoading: boolean;
  courseTitle: string;
  onGenerateOutline: () => void;
  onRegenerateOutline: () => void;
  onUpdateOutline: (outline: CourseOutline) => void;
  onContinue: () => void;
  onUploadOutline?: (outline: CourseOutline) => void;
}

function ModuleCard({ 
  module, 
  index, 
  courseTitle,
  onUpdateModule 
}: { 
  module: Module; 
  index: number; 
  courseTitle: string;
  onUpdateModule: (updates: Partial<Module>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(module.title);
  const [editedDescription, setEditedDescription] = useState(module.description);

  const handleSaveTitle = () => {
    onUpdateModule({ title: editedTitle });
    setIsEditingTitle(false);
  };

  const handleSaveDescription = (newDescription: string) => {
    onUpdateModule({ description: newDescription });
    setIsEditingDescription(false);
  };

  const handleUpdateObjective = (objId: string, newText: string) => {
    const updated = module.learningObjectives.map(obj =>
      obj.id === objId ? { ...obj, text: newText } : obj
    );
    onUpdateModule({ learningObjectives: updated });
  };

  const handleUpdateSubTopic = (topicId: string, newTitle: string) => {
    const updated = module.subTopics.map(topic =>
      topic.id === topicId ? { ...topic, title: newTitle } : topic
    );
    onUpdateModule({ subTopics: updated });
  };

  return (
    <Card 
      className={cn(
        "border-border/50 transition-all duration-300 hover:shadow-md",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                  {module.number}
                </div>
                <div className="flex-1">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-lg font-semibold"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <CardTitle 
                      className="text-lg font-semibold group flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingTitle(true);
                      }}
                    >
                      {module.title}
                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
                    </CardTitle>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {module.duration} min
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {module.subTopics.length} delmoment
                    </Badge>
                  </div>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Editable Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Beskrivning</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="gap-1 text-xs"
                  onClick={() => setIsEditingDescription(!isEditingDescription)}
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingDescription ? 'Avbryt' : 'Redigera'}
                </Button>
              </div>
              {isEditingDescription ? (
                <AIReviewEditor
                  content={module.description}
                  contentType="description"
                  context={courseTitle}
                  onSave={handleSaveDescription}
                  onCancel={() => setIsEditingDescription(false)}
                  showInline
                />
              ) : (
                <p className="text-muted-foreground">
                  {module.description}
                </p>
              )}
            </div>

            {/* Editable Learning Objectives */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Target className="w-4 h-4 text-accent" />
                Lärandemål
              </div>
              <ul className="space-y-2 pl-6">
                {module.learningObjectives.map((obj) => (
                  <EditableListItem
                    key={obj.id}
                    value={obj.text}
                    onSave={(newText) => handleUpdateObjective(obj.id, newText)}
                    courseTitle={courseTitle}
                    contentType="outline"
                  />
                ))}
              </ul>
            </div>

            {/* Editable SubTopics */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">
                Delmoment
              </div>
              <div className="grid gap-2">
                {module.subTopics.map((topic) => (
                  <EditableSubTopic
                    key={topic.id}
                    topic={topic}
                    onSave={(newTitle) => handleUpdateSubTopic(topic.id, newTitle)}
                    courseTitle={courseTitle}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function EditableListItem({
  value,
  onSave,
  courseTitle,
  contentType,
}: {
  value: string;
  onSave: (newValue: string) => void;
  courseTitle: string;
  contentType: 'outline' | 'script';
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="list-disc">
        <AIReviewEditor
          content={value}
          contentType={contentType}
          context={courseTitle}
          onSave={(newValue) => {
            onSave(newValue);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
          showInline
          minHeight="60px"
        />
      </li>
    );
  }

  return (
    <li
      className="text-sm text-muted-foreground list-disc group cursor-pointer hover:text-foreground transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <span className="flex items-center gap-1">
        {value}
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </li>
  );
}

function EditableSubTopic({
  topic,
  onSave,
  courseTitle,
}: {
  topic: SubTopic;
  onSave: (newTitle: string) => void;
  courseTitle: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(topic.title);

  if (isEditing) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
        <Input
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave(editedTitle);
              setIsEditing(false);
            }
          }}
        />
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => { onSave(editedTitle); setIsEditing(false); }}>
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{topic.duration} min</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group cursor-pointer hover:bg-muted transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm flex items-center gap-1">
        {topic.title}
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
      </span>
      <span className="text-xs text-muted-foreground">
        {topic.duration} min
      </span>
    </div>
  );
}

export function OutlineStep({
  outline,
  isLoading,
  courseTitle,
  onGenerateOutline,
  onRegenerateOutline,
  onUpdateOutline,
  onContinue,
  onUploadOutline,
}: OutlineStepProps) {
  const [showResearch, setShowResearch] = useState(false);
  const [uploadMode, setUploadMode] = useState<'generate' | 'upload'>('generate');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [manualOutlineText, setManualOutlineText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseTextToOutline = (text: string): CourseOutline | null => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(text);
      if (parsed.outline) return parsed.outline;
      if (parsed.modules) return parsed as CourseOutline;
      return null;
    } catch {
      // Parse as plain text - create modules from sections
      const lines = text.split('\n').filter(l => l.trim());
      const modules: Module[] = [];
      let currentModule: Partial<Module> | null = null;
      let moduleNumber = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Detect module headers (lines starting with numbers or "Module")
        if (/^(\d+[\.\)]|Modul|Module)\s*/i.test(trimmed)) {
          if (currentModule && currentModule.title) {
            modules.push(currentModule as Module);
          }
          moduleNumber++;
          currentModule = {
            id: `module-${moduleNumber}`,
            number: moduleNumber,
            title: trimmed.replace(/^(\d+[\.\)]|Modul|Module)\s*/i, '').trim(),
            description: '',
            duration: 10,
            learningObjectives: [],
            subTopics: [],
          };
        } else if (currentModule && trimmed.startsWith('-')) {
          // Bullet points become learning objectives or subtopics
          const content = trimmed.substring(1).trim();
          if (currentModule.learningObjectives && currentModule.learningObjectives.length < 3) {
            currentModule.learningObjectives.push({
              id: `lo-${moduleNumber}-${currentModule.learningObjectives.length + 1}`,
              text: content,
            });
          } else {
            currentModule.subTopics = currentModule.subTopics || [];
            currentModule.subTopics.push({
              id: `st-${moduleNumber}-${currentModule.subTopics.length + 1}`,
              title: content,
              duration: 3,
            });
          }
        } else if (currentModule && !currentModule.description && trimmed.length > 10) {
          currentModule.description = trimmed;
        }
      }

      if (currentModule && currentModule.title) {
        modules.push(currentModule as Module);
      }

      if (modules.length === 0) {
        toast.error('Kunde inte tolka kursstrukturen. Försök med JSON-format.');
        return null;
      }

      return {
        title: courseTitle || 'Importerad kurs',
        description: 'Kursöversikt importerad från textfil',
        totalDuration: modules.reduce((acc, m) => acc + m.duration, 0),
        modules,
      };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const outline = parseTextToOutline(text);
      
      if (outline && onUploadOutline) {
        onUploadOutline(outline);
        toast.success('Kursöversikt importerad!');
      }
    } catch (error) {
      toast.error('Kunde inte läsa filen');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = () => {
    if (!manualOutlineText.trim()) {
      toast.error('Ange kursstruktur');
      return;
    }

    const outline = parseTextToOutline(manualOutlineText);
    if (outline && onUploadOutline) {
      onUploadOutline(outline);
      setManualOutlineText('');
      toast.success('Kursöversikt importerad!');
    }
  };

  if (!outline && !isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground">
              Kursöversikt
            </h2>
            <p className="text-muted-foreground max-w-md">
              Generera en kursöversikt med AI eller ladda upp din egen struktur
            </p>
          </div>

          {/* Mode Toggle */}
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'generate' | 'upload')} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="gap-2">
                <Wand2 className="w-4 h-4" />
                AI-generera
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Ladda upp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-6">
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={() => setShowResearch(!showResearch)}
                  variant="outline"
                  size="lg"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Forskningshub
                </Button>
                <Button
                  onClick={onGenerateOutline}
                  variant="gradient"
                  size="xl"
                >
                  Generera kursöversikt
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-6 space-y-4">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".txt,.md,.json"
                onChange={handleFileUpload}
              />

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="w-4 h-4" />
                      Välj fil (.txt, .md, .json)
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">eller klistra in</span>
                    </div>
                  </div>

                  <Textarea
                    value={manualOutlineText}
                    onChange={(e) => setManualOutlineText(e.target.value)}
                    placeholder={`Klistra in kursstruktur här...\n\nExempel:\n1. Introduktion till ämnet\n- Lärandemål 1\n- Lärandemål 2\n\n2. Grundläggande koncept\n- Viktiga begrepp\n- Praktiska exempel`}
                    className="min-h-[200px] font-mono text-sm"
                  />

                  <Button
                    onClick={handleManualSubmit}
                    className="w-full"
                    disabled={!manualOutlineText.trim()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importera kursöversikt
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Stöder JSON-format eller enkel text med numrerade moduler och punktlistor
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {showResearch && (
          <ResearchHub 
            context={courseTitle}
            courseTitle={courseTitle}
            onResearchComplete={(content, citations) => {
              console.log('Research complete:', { content, citations });
            }}
          />
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Genererar kursöversikt...</h3>
          <p className="text-muted-foreground">
            AI analyserar ditt ämne och skapar en detaljerad struktur
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {outline!.title}
          </h2>
          <p className="text-muted-foreground mt-1">
            {outline!.description}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="secondary" className="text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {Math.round(outline!.totalDuration / 60)} timmar totalt
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {outline!.modules.length} moduler
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowResearch(!showResearch)}
            variant="outline"
            size="lg"
          >
            <Search className="w-4 h-4" />
            Forskning
          </Button>
          <Button
            onClick={onRegenerateOutline}
            variant="outline"
            size="lg"
          >
            <RefreshCw className="w-4 h-4" />
            Generera om
          </Button>
        </div>
      </div>

      {showResearch && (
        <ResearchHub 
          context={`${courseTitle} - ${outline!.title}`}
          courseTitle={courseTitle}
          courseOutline={JSON.stringify(outline!.modules.map(m => ({ title: m.title, description: m.description })))}
          onResearchComplete={(content, citations) => {
            console.log('Research complete:', { content, citations });
          }}
        />
      )}

      <div className="space-y-4">
        {outline!.modules.map((module, index) => (
          <ModuleCard 
            key={module.id} 
            module={module} 
            index={index} 
            courseTitle={courseTitle}
            onUpdateModule={(updates) => {
              const updatedModules = outline!.modules.map(m =>
                m.id === module.id ? { ...m, ...updates } : m
              );
              onUpdateOutline({ ...outline!, modules: updatedModules });
            }}
          />
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={onContinue}
          variant="gradient"
          size="xl"
          className="min-w-[200px]"
        >
          Godkänn och fortsätt
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

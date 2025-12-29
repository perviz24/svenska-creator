import { useState } from 'react';
import { Settings, Mic, Clock, BookOpen, Languages, Search, ChevronDown, Users, Volume2, Palette, Image, Sparkles, Briefcase, Eye, Film, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CourseSettings, ProjectMode, PresentationSettings, PresentationStyle, PresentationTone, ImageRichness, ProfessionalityLevel, CustomTemplate } from '@/types/course';
import { SystemDiagnostics } from '@/components/SystemDiagnostics';
import { UserInvitePanel } from '@/components/UserInvitePanel';
import { VoiceControlPanel } from '@/components/VoiceControlPanel';
import { PresentationPreviewCard } from '@/components/PresentationPreviewCard';
import { CustomTemplateUpload } from '@/components/CustomTemplateUpload';

interface SettingsPanelProps {
  settings: CourseSettings;
  onSettingsChange: (settings: Partial<CourseSettings>) => void;
  projectMode: ProjectMode;
  onPresentationSettingsChange?: (settings: PresentationSettings) => void;
}

const voices = [
  { id: 'sv-SE-MattiasNeural', name: 'Mattias (Svenska, Maskulin)' },
  { id: 'sv-SE-SofieNeural', name: 'Sofie (Svenska, Feminin)' },
  { id: 'sv-SE-HilleniNeural', name: 'Hillevi (Svenska, Feminin)' },
];

const styles = [
  { value: 'professional', label: 'Professionell' },
  { value: 'conversational', label: 'Konversation' },
  { value: 'academic', label: 'Akademisk' },
];

const presentationStyles: { value: PresentationStyle; label: string }[] = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Klassisk' },
  { value: 'minimal', label: 'Minimalistisk' },
  { value: 'creative', label: 'Kreativ' },
  { value: 'corporate', label: 'Företag' },
  { value: 'custom', label: 'Egen mall' },
];

const presentationTones: { value: PresentationTone; label: string }[] = [
  { value: 'formal', label: 'Formell' },
  { value: 'professional', label: 'Professionell' },
  { value: 'friendly', label: 'Vänlig' },
  { value: 'casual', label: 'Avslappnad' },
  { value: 'inspirational', label: 'Inspirerande' },
];

const imageRichnessOptions: { value: ImageRichness; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Få bilder, fokus på text' },
  { value: 'moderate', label: 'Måttlig', description: 'Balanserat med text och bilder' },
  { value: 'rich', label: 'Rik', description: 'Många illustrationer' },
  { value: 'visual-heavy', label: 'Visuellt tungt', description: 'Bilder dominerar' },
];

const professionalityOptions: { value: ProfessionalityLevel; label: string }[] = [
  { value: 'very-casual', label: 'Mycket avslappnad' },
  { value: 'casual', label: 'Avslappnad' },
  { value: 'balanced', label: 'Balanserad' },
  { value: 'professional', label: 'Professionell' },
  { value: 'very-formal', label: 'Mycket formell' },
];

export function SettingsPanel({ settings, onSettingsChange, projectMode, onPresentationSettingsChange }: SettingsPanelProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeTab, setActiveTab] = useState(projectMode === 'course' ? 'general' : 'style');
  
  const presentationSettings = settings.presentationSettings;

  const updatePresentationSettings = (updates: Partial<PresentationSettings>) => {
    if (onPresentationSettingsChange && presentationSettings) {
      onPresentationSettingsChange({
        ...presentationSettings,
        ...updates,
      });
    }
  };

  // Presentation mode settings panel
  if (projectMode === 'presentation') {
    return (
      <div className="space-y-4">
        {/* Preview Card */}
        <Card className="border-border/50 shadow-lg overflow-hidden">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-accent" />
              Förhandsvisning
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <PresentationPreviewCard settings={presentationSettings} />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-accent" />
              Inställningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="style" className="text-xs px-1">
                  <Palette className="w-3 h-3 mr-0.5" />
                  Stil
                </TabsTrigger>
                <TabsTrigger value="visuals" className="text-xs px-1">
                  <Image className="w-3 h-3 mr-0.5" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="tone" className="text-xs px-1">
                  <Briefcase className="w-3 h-3 mr-0.5" />
                  Ton
                </TabsTrigger>
                <TabsTrigger value="template" className="text-xs px-1">
                  <Upload className="w-3 h-3 mr-0.5" />
                  Mall
                </TabsTrigger>
              </TabsList>

              <TabsContent value="style" className="space-y-6 mt-0">
                {/* Presentation Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    Presentationsstil
                  </Label>
                  <Select
                    value={presentationSettings?.style || 'modern'}
                    onValueChange={(value: PresentationStyle) => 
                      updatePresentationSettings({ style: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Välj stil" />
                    </SelectTrigger>
                    <SelectContent>
                      {presentationStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Primärfärg</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={presentationSettings?.primaryColor || '#6366f1'}
                      onChange={(e) => updatePresentationSettings({ primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={presentationSettings?.primaryColor || '#6366f1'}
                      onChange={(e) => updatePresentationSettings({ primaryColor: e.target.value })}
                      className="flex-1"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Accentfärg</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={presentationSettings?.accentColor || '#f59e0b'}
                      onChange={(e) => updatePresentationSettings({ accentColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={presentationSettings?.accentColor || '#f59e0b'}
                      onChange={(e) => updatePresentationSettings({ accentColor: e.target.value })}
                      className="flex-1"
                      placeholder="#f59e0b"
                    />
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Languages className="w-4 h-4 text-muted-foreground" />
                    Språk
                  </Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value: CourseSettings['language']) => 
                      onSettingsChange({ language: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Välj språk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sv">Svenska</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="visuals" className="space-y-6 mt-0">
                {/* Image Richness */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    Bildrikedom
                  </Label>
                  <Select
                    value={presentationSettings?.imageRichness || 'moderate'}
                    onValueChange={(value: ImageRichness) => 
                      updatePresentationSettings({ imageRichness: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Välj nivå" />
                    </SelectTrigger>
                    <SelectContent>
                      {imageRichnessOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Include Animations */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="animations" className="text-sm font-medium cursor-pointer">
                    Inkludera animationer
                  </Label>
                  <Switch
                    id="animations"
                    checked={presentationSettings?.includeAnimations ?? true}
                    onCheckedChange={(checked) => 
                      updatePresentationSettings({ includeAnimations: checked })
                    }
                  />
                </div>

                {/* Include Charts */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="charts" className="text-sm font-medium cursor-pointer">
                    Föreslå diagram/grafer
                  </Label>
                  <Switch
                    id="charts"
                    checked={presentationSettings?.includeCharts ?? false}
                    onCheckedChange={(checked) => 
                      updatePresentationSettings({ includeCharts: checked })
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="tone" className="space-y-6 mt-0">
                {/* Tone Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    Ton
                  </Label>
                  <Select
                    value={presentationSettings?.tone || 'professional'}
                    onValueChange={(value: PresentationTone) => 
                      updatePresentationSettings({ tone: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Välj ton" />
                    </SelectTrigger>
                    <SelectContent>
                      {presentationTones.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>
                          {tone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Professionality Level */}
                <div className="space-y-3">
                  <Label className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      Formalitetsnivå
                    </span>
                    <span className="text-accent font-semibold text-xs">
                      {professionalityOptions.find(o => o.value === (presentationSettings?.professionalityLevel || 'professional'))?.label}
                    </span>
                  </Label>
                  <Select
                    value={presentationSettings?.professionalityLevel || 'professional'}
                    onValueChange={(value: ProfessionalityLevel) => 
                      updatePresentationSettings({ professionalityLevel: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Välj nivå" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionalityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Påverkar språkval, struktur och innehållsdjup
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="template" className="space-y-4 mt-0">
                <CustomTemplateUpload
                  template={presentationSettings?.customTemplate}
                  onTemplateChange={(template) => {
                    updatePresentationSettings({ 
                      customTemplate: template,
                      style: template ? 'custom' : (presentationSettings?.style || 'modern'),
                      primaryColor: template?.primaryColor || presentationSettings?.primaryColor || '#6366f1',
                      accentColor: template?.accentColor || presentationSettings?.accentColor || '#f59e0b',
                    });
                  }}
                />
                
                {/* Stock Videos Option */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="stockvideos" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <Film className="w-4 h-4 text-muted-foreground" />
                      Inkludera stockvideor
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Sök och lägg till videor från Pexels
                    </span>
                  </div>
                  <Switch
                    id="stockvideos"
                    checked={presentationSettings?.includeStockVideos ?? false}
                    onCheckedChange={(checked) => 
                      updatePresentationSettings({ includeStockVideos: checked })
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* System Diagnostics */}
        <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>Systemdiagnostik</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <SystemDiagnostics />
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Course mode settings panel (original)
  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-accent" />
            Kursinställningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="general" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Allmänt
              </TabsTrigger>
              <TabsTrigger value="voice" className="text-xs">
                <Volume2 className="w-3 h-3 mr-1" />
                Röst
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-0">
              {/* Voice Selection (Quick) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  Berättarröst (snabbval)
                </Label>
                <Select
                  value={settings.voiceId}
                  onValueChange={(value) => {
                    const voice = voices.find(v => v.id === value);
                    onSettingsChange({ 
                      voiceId: value,
                      voiceName: voice?.name || ''
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj röst" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  För fler röster och inställningar, se Röst-fliken
                </p>
              </div>

              {/* Target Duration */}
              <div className="space-y-3">
                <Label className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Målad längd per modul
                  </span>
                  <span className="text-accent font-semibold">
                    {settings.targetDuration} min
                  </span>
                </Label>
                <Slider
                  value={[settings.targetDuration]}
                  onValueChange={([value]) => onSettingsChange({ targetDuration: value })}
                  min={5}
                  max={30}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 min</span>
                  <span>30 min</span>
                </div>
              </div>

              {/* Style Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Presentationsstil
                </Label>
                <Select
                  value={settings.style}
                  onValueChange={(value: CourseSettings['style']) => 
                    onSettingsChange({ style: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj stil" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  Språk
                </Label>
                <Select
                  value={settings.language}
                  onValueChange={(value: CourseSettings['language']) => 
                    onSettingsChange({ language: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Välj språk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sv">Svenska</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Include Quizzes */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="quizzes" className="text-sm font-medium cursor-pointer">
                  Inkludera quiz-frågor
                </Label>
                <Switch
                  id="quizzes"
                  checked={settings.includeQuizzes}
                  onCheckedChange={(checked) => 
                    onSettingsChange({ includeQuizzes: checked })
                  }
                />
              </div>

              {/* Enable Research */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="research" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    AI-forskning (Perplexity)
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Berika manus med aktuell forskning och källor
                  </span>
                </div>
                <Switch
                  id="research"
                  checked={settings.enableResearch}
                  onCheckedChange={(checked) => 
                    onSettingsChange({ enableResearch: checked })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="voice" className="mt-0">
              <VoiceControlPanel
                settings={{
                  voiceId: settings.voiceId,
                  voiceName: settings.voiceName,
                  stability: 0.5,
                  similarityBoost: 0.75,
                  style: 0.3,
                  speed: 1.0,
                  useCustomVoice: false,
                }}
                onSettingsChange={(voiceSettings) => {
                  if (voiceSettings.voiceId) {
                    onSettingsChange({ 
                      voiceId: voiceSettings.voiceId, 
                      voiceName: voiceSettings.voiceName || settings.voiceName 
                    });
                  }
                }}
                language={settings.language}
              />
            </TabsContent>

            <TabsContent value="team" className="mt-0">
              <UserInvitePanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Diagnostics */}
      <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span>Systemdiagnostik</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <SystemDiagnostics />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
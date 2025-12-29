import { useState } from 'react';
import { Settings, Mic, Clock, BookOpen, Languages, Search, ChevronDown, Users, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseSettings } from '@/types/course';
import { SystemDiagnostics } from '@/components/SystemDiagnostics';
import { UserInvitePanel } from '@/components/UserInvitePanel';
import { VoiceControlPanel } from '@/components/VoiceControlPanel';

interface SettingsPanelProps {
  settings: CourseSettings;
  onSettingsChange: (settings: Partial<CourseSettings>) => void;
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

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-accent" />
            Inställningar
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

import { Settings, Mic, Clock, BookOpen, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { CourseSettings } from '@/types/course';

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
  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-accent" />
          Kursinställningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Mic className="w-4 h-4 text-muted-foreground" />
            Berättarröst
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
      </CardContent>
    </Card>
  );
}

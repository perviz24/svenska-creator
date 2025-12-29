import { useState, useRef } from 'react';
import { Mic, Play, Square, Loader2, Volume2, Sparkles, Upload, User, Settings2, Sliders } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface VoiceSettings {
  voiceId: string;
  voiceName: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useCustomVoice: boolean;
  customVoiceId?: string;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  naturalness: number; // 1-5 how natural it sounds
  previewUrl?: string;
}

const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Djup, resonerande röst', gender: 'male', language: 'sv', naturalness: 5 },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Varm, professionell', gender: 'female', language: 'sv', naturalness: 5 },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Mjuk, förtroendeingivande', gender: 'female', language: 'sv', naturalness: 4 },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual, avslappnad', gender: 'male', language: 'en', naturalness: 4 },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Auktoritativ, lugn', gender: 'male', language: 'sv', naturalness: 5 },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Ung, dynamisk', gender: 'male', language: 'en', naturalness: 4 },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Neutral, tydlig', gender: 'neutral', language: 'en', naturalness: 4 },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Modern, klar', gender: 'male', language: 'en', naturalness: 5 },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Brittisk, varm', gender: 'female', language: 'en', naturalness: 5 },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Vänlig, energisk', gender: 'female', language: 'sv', naturalness: 5 },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Podcast-stil, engagerande', gender: 'male', language: 'en', naturalness: 5 },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Expresiv, levande', gender: 'female', language: 'en', naturalness: 4 },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', description: 'Amerikanisk, vänlig', gender: 'male', language: 'en', naturalness: 5 },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', description: 'Casual, samtalslik', gender: 'male', language: 'en', naturalness: 5 },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Berättarröst, djup', gender: 'male', language: 'en', naturalness: 5 },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Berättande, mjuk', gender: 'male', language: 'sv', naturalness: 5 },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Tydlig, pedagogisk', gender: 'female', language: 'sv', naturalness: 4 },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', description: 'Dokumentärstil', gender: 'male', language: 'en', naturalness: 5 },
];

interface VoiceControlPanelProps {
  settings: VoiceSettings;
  onSettingsChange: (settings: Partial<VoiceSettings>) => void;
  apiKey?: string;
  language?: 'sv' | 'en';
}

export function VoiceControlPanel({
  settings,
  onSettingsChange,
  apiKey,
  language = 'sv',
}: VoiceControlPanelProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === settings.voiceId);

  // Sort by naturalness (most natural first) and filter by language preference
  const sortedVoices = [...ELEVENLABS_VOICES].sort((a, b) => {
    // Prioritize matching language
    const aLangMatch = a.language === language ? 1 : 0;
    const bLangMatch = b.language === language ? 1 : 0;
    if (aLangMatch !== bLangMatch) return bLangMatch - aLangMatch;
    // Then by naturalness
    return b.naturalness - a.naturalness;
  });

  const recommendedVoice = sortedVoices[0];

  const handlePreviewVoice = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    setIsGeneratingPreview(true);
    setPlayingVoiceId(voiceId);

    try {
      const sampleText = language === 'sv' 
        ? 'Välkommen till denna kurs. Jag kommer att guida dig genom materialet på ett tydligt och engagerande sätt.'
        : 'Welcome to this course. I will guide you through the material in a clear and engaging way.';

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
            text: sampleText,
            voiceId,
            apiKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Kunde inte förhandsgranska rösten');
      setPlayingVoiceId(null);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const applyRecommendation = () => {
    onSettingsChange({
      voiceId: recommendedVoice.id,
      voiceName: recommendedVoice.name,
    });
    toast.success(`${recommendedVoice.name} vald - mest naturlig röst`);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mic className="w-5 h-5 text-accent" />
          Röstinställningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presets">Röster</TabsTrigger>
            <TabsTrigger value="settings">Inställningar</TabsTrigger>
            <TabsTrigger value="custom">Egen röst</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4 mt-4">
            {/* AI Recommendation */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Rekommenderad: {recommendedVoice.name}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Mest naturlig
                    </Badge>
                  </div>
                  {settings.voiceId !== recommendedVoice.id && (
                    <Button size="sm" variant="outline" onClick={applyRecommendation}>
                      Använd
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voice Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {sortedVoices.map((voice) => (
                <Card
                  key={voice.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md overflow-hidden",
                    settings.voiceId === voice.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                  onClick={() => {
                    onSettingsChange({ voiceId: voice.id, voiceName: voice.name });
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Play Button */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0 rounded-full bg-background hover:bg-primary hover:text-primary-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewVoice(voice.id);
                        }}
                      >
                        {playingVoiceId === voice.id ? (
                          isGeneratingPreview ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                      
                      {/* Voice Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm truncate">{voice.name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 px-1">
                            {voice.gender === 'male' ? '♂' : voice.gender === 'female' ? '♀' : '⚧'}
                          </Badge>
                          {voice.naturalness === 5 && (
                            <Badge className="bg-green-500/10 text-green-600 text-[10px] shrink-0 px-1">
                              ★
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{voice.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Stability */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>Stabilitet</span>
                <Badge variant="outline">{Math.round(settings.stability * 100)}%</Badge>
              </Label>
              <Slider
                value={[settings.stability * 100]}
                onValueChange={([v]) => onSettingsChange({ stability: v / 100 })}
                min={0}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mer varierad</span>
                <span>Mer konsistent</span>
              </div>
            </div>

            {/* Similarity Boost */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>Likhetsförstärkning</span>
                <Badge variant="outline">{Math.round(settings.similarityBoost * 100)}%</Badge>
              </Label>
              <Slider
                value={[settings.similarityBoost * 100]}
                onValueChange={([v]) => onSettingsChange({ similarityBoost: v / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Style */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>Stil/Expressivitet</span>
                <Badge variant="outline">{Math.round(settings.style * 100)}%</Badge>
              </Label>
              <Slider
                value={[settings.style * 100]}
                onValueChange={([v]) => onSettingsChange({ style: v / 100 })}
                min={0}
                max={100}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Neutral</span>
                <span>Expressiv</span>
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>Hastighet</span>
                <Badge variant="outline">{settings.speed.toFixed(1)}x</Badge>
              </Label>
              <Slider
                value={[settings.speed * 100]}
                onValueChange={([v]) => onSettingsChange({ speed: v / 100 })}
                min={70}
                max={120}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Långsammare</span>
                <span>Snabbare</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="text-center py-6 space-y-4">
              <User className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Klona din egen röst</h3>
                <p className="text-sm text-muted-foreground">
                  Använd ElevenLabs Voice Cloning för att skapa en personlig röst
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="customVoiceId">ElevenLabs Voice ID</Label>
                <Input
                  id="customVoiceId"
                  placeholder="Klistra in din Voice ID..."
                  value={settings.customVoiceId || ''}
                  onChange={(e) => onSettingsChange({ customVoiceId: e.target.value })}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!settings.customVoiceId}
                  onClick={() => {
                    if (settings.customVoiceId) {
                      onSettingsChange({
                        useCustomVoice: true,
                        voiceId: settings.customVoiceId,
                        voiceName: 'Custom Voice',
                      });
                      toast.success('Egen röst aktiverad');
                    }
                  }}
                >
                  Använd egen röst
                </Button>
              </div>
              <a
                href="https://elevenlabs.io/voice-lab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Öppna ElevenLabs Voice Lab →
              </a>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export const defaultVoiceSettings: VoiceSettings = {
  voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  voiceName: 'George',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.3,
  speed: 1.0,
  useCustomVoice: false,
};

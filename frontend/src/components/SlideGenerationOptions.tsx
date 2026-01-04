import { useState } from 'react';
import { Palette, Image, Sparkles, Upload, Building2, FileImage, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

export interface SlideGenerationSettings {
  style: 'professional' | 'creative' | 'minimal' | 'academic' | 'unstyled';
  creativityLevel: number; // 0-100
  preferStockPhotos: boolean; // true = stock, false = AI
  stockVsAIBalance: number; // 0-100, 0 = all stock, 100 = all AI
  companyLogo?: string;
  includeExerciseReferences: boolean;
  colorScheme: 'auto' | 'light' | 'dark' | 'brand';
  brandColor?: string;
}

interface SlideGenerationOptionsProps {
  settings: SlideGenerationSettings;
  onSettingsChange: (settings: Partial<SlideGenerationSettings>) => void;
  showAIRecommendation?: boolean;
  language?: 'sv' | 'en';
}

const styleOptions = [
  { value: 'professional', label: 'Professionell', description: 'Ren och affärsmässig design' },
  { value: 'creative', label: 'Kreativ', description: 'Djärv och visuellt engagerande' },
  { value: 'minimal', label: 'Minimalistisk', description: 'Enkel med fokus på innehåll' },
  { value: 'academic', label: 'Akademisk', description: 'Formell och strukturerad' },
  { value: 'unstyled', label: 'Ostylade (för designer)', description: 'Ingen styling - för Fiverr/Upwork designers' },
];

const colorSchemes = [
  { value: 'auto', label: 'Automatisk' },
  { value: 'light', label: 'Ljust tema' },
  { value: 'dark', label: 'Mörkt tema' },
  { value: 'brand', label: 'Varumärkesfärger' },
];

export function SlideGenerationOptions({
  settings,
  onSettingsChange,
  showAIRecommendation = true,
  language = 'sv',
}: SlideGenerationOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.companyLogo || null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logotypen får inte vara större än 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      onSettingsChange({ companyLogo: dataUrl });
      toast.success('Logotyp uppladdad');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    onSettingsChange({ companyLogo: undefined });
  };

  const getMediaBalanceLabel = (value: number) => {
    if (value < 25) return 'Mestadels stockbilder';
    if (value < 50) return 'Fler stockbilder';
    if (value < 75) return 'Balanserat';
    if (value < 100) return 'Fler AI-bilder';
    return 'Mestadels AI-genererade';
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between gap-2">
          <span className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Slide-inställningar
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-6">
        {/* Style Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Presentationsstil
          </Label>
          <Select
            value={settings.style}
            onValueChange={(v) => onSettingsChange({ style: v as SlideGenerationSettings['style'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {styleOptions.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{style.label}</span>
                    <span className="text-xs text-muted-foreground">{style.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settings.style === 'unstyled' && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Ostylade slides är perfekta för att skicka till en professionell designer på Fiverr eller Upwork.
            </p>
          )}
        </div>

        {/* Creativity Level */}
        <div className="space-y-3">
          <Label className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              Kreativitetsnivå
            </span>
            <Badge variant="outline">{settings.creativityLevel}%</Badge>
          </Label>
          <Slider
            value={[settings.creativityLevel]}
            onValueChange={([v]) => onSettingsChange({ creativityLevel: v })}
            min={0}
            max={100}
            step={10}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Konservativ</span>
            <span>Djärv</span>
          </div>
        </div>

        {/* Stock vs AI Balance */}
        <div className="space-y-3">
          <Label className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              Bildval: Stock vs AI
            </span>
            <Badge variant="outline">{getMediaBalanceLabel(settings.stockVsAIBalance)}</Badge>
          </Label>
          <Slider
            value={[settings.stockVsAIBalance]}
            onValueChange={([v]) => onSettingsChange({ stockVsAIBalance: v })}
            min={0}
            max={100}
            step={25}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileImage className="w-3 h-3" />
              Stockbilder
            </span>
            <span className="flex items-center gap-1">
              AI-genererat
              <Sparkles className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Company Logo */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Företagslogotyp
          </Label>
          {logoPreview ? (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <img
                src={logoPreview}
                alt="Logotyp"
                className="w-12 h-12 object-contain bg-background rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Logotyp uppladdad</p>
                <p className="text-xs text-muted-foreground">Visas i hörnet på varje slide</p>
              </div>
              <Button size="sm" variant="ghost" onClick={removeLogo}>
                Ta bort
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="flex-1"
              />
              <Upload className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Ladda upp din logotyp (PNG/SVG rekommenderas, max 2MB)
          </p>
        </div>

        {/* Color Scheme */}
        <div className="space-y-2">
          <Label>Färgschema</Label>
          <Select
            value={settings.colorScheme}
            onValueChange={(v) => onSettingsChange({ colorScheme: v as SlideGenerationSettings['colorScheme'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {colorSchemes.map((scheme) => (
                <SelectItem key={scheme.value} value={scheme.value}>
                  {scheme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settings.colorScheme === 'brand' && (
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="brandColor" className="text-xs">Varumärkesfärg:</Label>
              <Input
                id="brandColor"
                type="color"
                value={settings.brandColor || '#3b82f6'}
                onChange={(e) => onSettingsChange({ brandColor: e.target.value })}
                className="w-12 h-8 p-0 border-0"
              />
            </div>
          )}
        </div>

        {/* Include Exercise References */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="exerciseRefs" className="text-sm font-medium cursor-pointer">
              Referera till övningsmaterial
            </Label>
            <p className="text-xs text-muted-foreground">
              Lägg till hänvisningar till övningar i slutet av varje modul
            </p>
          </div>
          <Switch
            id="exerciseRefs"
            checked={settings.includeExerciseReferences}
            onCheckedChange={(checked) => onSettingsChange({ includeExerciseReferences: checked })}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const defaultSlideSettings: SlideGenerationSettings = {
  style: 'professional',
  creativityLevel: 50,
  preferStockPhotos: true,
  stockVsAIBalance: 30,
  includeExerciseReferences: true,
  colorScheme: 'auto',
};

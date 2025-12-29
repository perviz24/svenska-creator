import { useState, useRef } from 'react';
import { Upload, X, Palette, Type, Image as ImageIcon, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomTemplate } from '@/types/course';
import { toast } from 'sonner';

interface CustomTemplateUploadProps {
  template?: CustomTemplate;
  onTemplateChange: (template: CustomTemplate | undefined) => void;
}

export function CustomTemplateUpload({ template, onTemplateChange }: CustomTemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(template?.logoUrl);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [editingTemplate, setEditingTemplate] = useState<Partial<CustomTemplate>>({
    name: template?.name || 'Min mall',
    primaryColor: template?.primaryColor || '#1e3a5f',
    secondaryColor: template?.secondaryColor || '#2d5a87',
    accentColor: template?.accentColor || '#f59e0b',
    fontFamily: template?.fontFamily || 'Inter',
    headingFontFamily: template?.headingFontFamily || 'Inter',
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Endast bildfiler är tillåtna');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bilden får vara max 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoPreview(dataUrl);
      setEditingTemplate(prev => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = () => {
    const newTemplate: CustomTemplate = {
      id: template?.id || `template-${Date.now()}`,
      name: editingTemplate.name || 'Min mall',
      logoUrl: editingTemplate.logoUrl || logoPreview,
      primaryColor: editingTemplate.primaryColor || '#1e3a5f',
      secondaryColor: editingTemplate.secondaryColor || '#2d5a87',
      accentColor: editingTemplate.accentColor || '#f59e0b',
      fontFamily: editingTemplate.fontFamily,
      headingFontFamily: editingTemplate.headingFontFamily,
      createdAt: template?.createdAt || new Date().toISOString(),
    };
    onTemplateChange(newTemplate);
    toast.success('Mall sparad!');
  };

  const handleClearTemplate = () => {
    setLogoPreview(undefined);
    setEditingTemplate({
      name: 'Min mall',
      primaryColor: '#1e3a5f',
      secondaryColor: '#2d5a87',
      accentColor: '#f59e0b',
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
    });
    onTemplateChange(undefined);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="w-4 h-4 text-accent" />
          Egen mall / Företagsstil
        </CardTitle>
        <CardDescription className="text-xs">
          Ladda upp din logotyp och definiera färger för att behålla er grafiska profil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Logotyp</Label>
          <div className="flex items-center gap-3">
            <div 
              className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => logoInputRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                PNG, SVG eller JPG. Max 5MB.
              </p>
              {logoPreview && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs mt-1"
                  onClick={() => {
                    setLogoPreview(undefined);
                    setEditingTemplate(prev => ({ ...prev, logoUrl: undefined }));
                  }}
                >
                  <X className="w-3 h-3 mr-1" /> Ta bort
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Template Name */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Mallnamn</Label>
          <Input
            value={editingTemplate.name}
            onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
            placeholder="T.ex. Företagsnamn"
            className="h-8 text-sm"
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Primär</Label>
            <div className="flex gap-1">
              <Input
                type="color"
                value={editingTemplate.primaryColor}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-8 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={editingTemplate.primaryColor}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sekundär</Label>
            <div className="flex gap-1">
              <Input
                type="color"
                value={editingTemplate.secondaryColor}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="w-8 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={editingTemplate.secondaryColor}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Accent</Label>
            <div className="flex gap-1">
              <Input
                type="color"
                value={editingTemplate.accentColor}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                className="w-8 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={editingTemplate.accentColor}
                onChange={(e) => setEditingTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                className="h-8 text-xs flex-1"
              />
            </div>
          </div>
        </div>

        {/* Font Selection */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Type className="w-3 h-3" /> Rubrik-typsnitt
            </Label>
            <Input
              value={editingTemplate.headingFontFamily}
              onChange={(e) => setEditingTemplate(prev => ({ ...prev, headingFontFamily: e.target.value }))}
              placeholder="Inter"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Type className="w-3 h-3" /> Brödtext-typsnitt
            </Label>
            <Input
              value={editingTemplate.fontFamily}
              onChange={(e) => setEditingTemplate(prev => ({ ...prev, fontFamily: e.target.value }))}
              placeholder="Inter"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border/50 p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Förhandsvisning</p>
          <div 
            className="aspect-video rounded-md overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${editingTemplate.primaryColor}20 0%, ${editingTemplate.secondaryColor}10 100%)` }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: editingTemplate.primaryColor }}
            />
            <div className="p-2 h-full flex flex-col">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-4 w-auto object-contain self-start mb-1" />
              )}
              <h4 
                className="text-xs font-semibold"
                style={{ color: editingTemplate.primaryColor, fontFamily: editingTemplate.headingFontFamily }}
              >
                Exempelrubrik
              </h4>
              <p 
                className="text-[8px] text-muted-foreground"
                style={{ fontFamily: editingTemplate.fontFamily }}
              >
                Brödtext med valt typsnitt
              </p>
              <div className="flex gap-1 mt-auto">
                <div className="w-3 h-3 rounded-full" style={{ background: editingTemplate.primaryColor }} />
                <div className="w-3 h-3 rounded-full" style={{ background: editingTemplate.secondaryColor }} />
                <div className="w-3 h-3 rounded-full" style={{ background: editingTemplate.accentColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleSaveTemplate}
            className="flex-1 h-8 text-xs"
          >
            <Check className="w-3 h-3 mr-1" />
            Spara mall
          </Button>
          {template && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleClearTemplate}
              className="h-8 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Rensa
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
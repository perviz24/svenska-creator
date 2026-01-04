import { useState, useEffect } from 'react';
import { Palette, Loader2, Check, ExternalLink, Download, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Slide } from '@/types/course';

interface CanvaTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  colors: string[];
}

interface CanvaTemplatesProps {
  slides: Slide[];
  onApplyTemplate: (templateId: string, styledSlides: Slide[]) => void;
  onExportToCanva: () => void;
}

// Predefined templates (since Canva API integration requires OAuth)
const BUILT_IN_TEMPLATES: CanvaTemplate[] = [
  { id: 'professional', name: 'Professionell', category: 'business', thumbnail: '', colors: ['#1e3a5f', '#ffffff', '#f0f4f8'] },
  { id: 'modern', name: 'Modern', category: 'business', thumbnail: '', colors: ['#2d3748', '#ed8936', '#ffffff'] },
  { id: 'creative', name: 'Kreativ', category: 'creative', thumbnail: '', colors: ['#553c9a', '#ed64a6', '#ffffff'] },
  { id: 'minimal', name: 'Minimal', category: 'minimal', thumbnail: '', colors: ['#1a1a1a', '#ffffff', '#f7f7f7'] },
  { id: 'corporate', name: 'Företag', category: 'business', thumbnail: '', colors: ['#003366', '#0066cc', '#ffffff'] },
];

export function CanvaTemplates({ slides, onApplyTemplate, onExportToCanva }: CanvaTemplatesProps) {
  const [templates, setTemplates] = useState<CanvaTemplate[]>(BUILT_IN_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Templates are pre-loaded, no API call needed
    setTemplates(BUILT_IN_TEMPLATES);
  }, []);

  const loadTemplates = async () => {
    // Templates are built-in, show them immediately
    setTemplates(BUILT_IN_TEMPLATES);
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (slides.length === 0) {
      toast.error('Inga slides att applicera mall på');
      return;
    }

    setIsApplying(true);
    setSelectedTemplate(templateId);
    try {
      // Apply template styling locally
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const styledSlides = slides.map(s => ({
        ...s,
        backgroundColor: template.colors[0],
        textColor: template.colors[2],
      }));

      onApplyTemplate(templateId, styledSlides);
      toast.success(`Mall "${template.name}" applicerad!`);
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Kunde inte applicera mall');
    } finally {
      setIsApplying(false);
    }
  };

  const handleExportToCanva = async () => {
    if (slides.length === 0) {
      toast.error('Inga slides att exportera');
      return;
    }

    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('canva-integration', {
        body: {
          action: 'export-to-canva',
          slides: slides.map(s => ({
            title: s.title,
            content: s.content,
            layout: s.layout,
            speakerNotes: s.speakerNotes,
            imageUrl: s.imageUrl,
            backgroundColor: s.backgroundColor,
          })),
        },
      });

      if (error) throw error;

      if (data.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = 'presentation-canva-export.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Exporterad! Importera filen i Canva');
      }

      onExportToCanva();
    } catch (error) {
      console.error('Error exporting to Canva:', error);
      toast.error('Kunde inte exportera till Canva');
    } finally {
      setIsExporting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      education: 'Utbildning',
      business: 'Företag',
      creative: 'Kreativ',
      technology: 'Teknologi',
      lifestyle: 'Livsstil',
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Canva-mallar</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportToCanva}
          disabled={isExporting || slides.length === 0}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportera till Canva
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Alla</TabsTrigger>
          <TabsTrigger value="education">Utbildning</TabsTrigger>
          <TabsTrigger value="business">Företag</TabsTrigger>
          <TabsTrigger value="creative">Kreativ</TabsTrigger>
        </TabsList>

        {['all', 'education', 'business', 'creative'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates
                .filter(t => tab === 'all' || t.category === tab)
                .map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                      selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedTemplate === template.id && isApplying && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                      {selectedTemplate === template.id && !isApplying && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{template.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {template.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
        <Layers className="h-4 w-4" />
        <span>Klicka på en mall för att applicera på dina slides</span>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Palette, Loader2, Check, ExternalLink, Download, Layers, LogIn, LogOut, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Slide } from '@/types/course';
import {
  connectCanva,
  disconnectCanva,
  isCanvaConnected,
  getBrandTemplates,
  autofillCanvaTemplate,
  transformSlidesToCanvaFormat,
  type CanvaTemplate,
  type CanvaDesign,
} from '@/lib/canvaApi';

interface CanvaTemplatesProps {
  slides: Slide[];
  courseTitle?: string;
  onApplyTemplate?: (templateId: string, styledSlides: Slide[]) => void;
  onExportToCanva?: () => void;
}

// Fallback templates (shown when not connected to Canva)
const BUILT_IN_TEMPLATES: CanvaTemplate[] = [
  { id: 'professional', name: 'Professionell', thumbnail_url: null, brand_id: null },
  { id: 'modern', name: 'Modern', thumbnail_url: null, brand_id: null },
  { id: 'creative', name: 'Kreativ', thumbnail_url: null, brand_id: null },
  { id: 'minimal', name: 'Minimal', thumbnail_url: null, brand_id: null },
  { id: 'corporate', name: 'Företag', thumbnail_url: null, brand_id: null },
];

export function CanvaTemplates({
  slides,
  courseTitle = 'Presentation',
  onApplyTemplate,
  onExportToCanva
}: CanvaTemplatesProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Templates state
  const [templates, setTemplates] = useState<CanvaTemplate[]>(BUILT_IN_TEMPLATES);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Autofill/Export state
  const [isCreatingDesign, setIsCreatingDesign] = useState(false);
  const [lastCreatedDesign, setLastCreatedDesign] = useState<CanvaDesign | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Load templates when connected
  useEffect(() => {
    if (isConnected) {
      loadBrandTemplates();
    } else {
      setTemplates(BUILT_IN_TEMPLATES);
    }
  }, [isConnected]);

  const checkConnectionStatus = async () => {
    setIsCheckingConnection(true);
    try {
      const connected = await isCanvaConnected();
      setIsConnected(connected);
    } catch (error) {
      console.error('Failed to check Canva connection:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectCanva();
      setIsConnected(true);
      toast.success('Ansluten till Canva!');
      // Load templates after connecting
      loadBrandTemplates();
    } catch (error: any) {
      console.error('Canva connection failed:', error);
      const message = error?.message || 'Kunde inte ansluta till Canva';

      if (message.includes('Popup blocked')) {
        toast.error('Popup blockerad. Tillåt popups för denna sida och försök igen.');
      } else if (message.includes('cancelled')) {
        toast.info('Anslutning avbruten');
      } else {
        toast.error(`Anslutningsfel: ${message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectCanva();
      setIsConnected(false);
      setTemplates(BUILT_IN_TEMPLATES);
      setLastCreatedDesign(null);
      toast.success('Frånkopplad från Canva');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Kunde inte koppla från');
    }
  };

  const loadBrandTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const brandTemplates = await getBrandTemplates(20);

      if (brandTemplates.length > 0) {
        setTemplates(brandTemplates);
        toast.success(`Laddade ${brandTemplates.length} varumärkesmallar från Canva`);
      } else {
        // No brand templates, use built-in
        setTemplates(BUILT_IN_TEMPLATES);
        toast.info('Du har inga varumärkesmallar i Canva än. Skapa mallar i Canva först eller använd byggda mallar lokalt.');
      }
    } catch (error: any) {
      console.error('Failed to load brand templates:', error);
      toast.error('Kunde inte ladda mallar. Använd byggda mallar istället.');
      setTemplates(BUILT_IN_TEMPLATES);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleAutofillTemplate = async (templateId: string) => {
    if (!isConnected) {
      toast.error('Du måste ansluta till Canva först');
      return;
    }

    if (slides.length === 0) {
      toast.error('Inga slides att exportera till Canva');
      return;
    }

    setIsCreatingDesign(true);
    setSelectedTemplate(templateId);

    try {
      // Transform slides to Canva format
      const canvaSlides = transformSlidesToCanvaFormat(slides);

      // Autofill template with our slides
      const design = await autofillCanvaTemplate(
        templateId,
        courseTitle,
        canvaSlides
      );

      setLastCreatedDesign(design);
      setSelectedTemplate(templateId);

      toast.success(
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Design skapad i Canva!</span>
          <a
            href={design.edit_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline text-sm flex items-center gap-1"
          >
            Öppna i Canva <ExternalLink className="h-3 w-3" />
          </a>
        </div>,
        {
          duration: 10000,
        }
      );

      if (onExportToCanva) {
        onExportToCanva();
      }

      // Open design in new tab
      window.open(design.edit_url, '_blank');
    } catch (error: any) {
      console.error('Autofill failed:', error);
      const message = error?.message || 'Okänt fel';
      toast.error(`Kunde inte skapa design: ${message}`);
    } finally {
      setIsCreatingDesign(false);
    }
  };

  const handleApplyLocalTemplate = (templateId: string) => {
    // For built-in templates (when not connected), apply styling locally
    if (!onApplyTemplate) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Simple local styling (limited without Canva)
    const styledSlides = slides.map(s => ({
      ...s,
      // Could apply basic styling here if needed
    }));

    setSelectedTemplate(templateId);
    onApplyTemplate(templateId, styledSlides);
    toast.success(`Mall "${template.name}" vald`);
  };

  const handleTemplateClick = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);

    // Only autofill if connected AND template is a real Canva template (has brand_id)
    if (isConnected && template?.brand_id) {
      // Connected to Canva with real brand template: autofill and create design
      handleAutofillTemplate(templateId);
    } else {
      // Not connected OR built-in template: apply locally
      handleApplyLocalTemplate(templateId);
    }
  };

  if (isCheckingConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Kontrollerar Canva-anslutning...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Canva Integration</h3>
          {isConnected && (
            <Badge variant="default" className="bg-green-500 text-white">
              <Check className="h-3 w-3 mr-1" />
              Ansluten
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Koppla från
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Anslut till Canva
            </Button>
          )}
        </div>
      </div>

      {/* Connection info banner */}
      {!isConnected && (
        <div className="bg-muted p-4 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium mb-1">Anslut till Canva för full funktionalitet</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Anslut ditt Canva-konto för att få tillgång till dina varumärkesmallar och
                skapa professionella presentationer direkt i Canva med auto-ifyllning.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                <li>✓ Tillgång till dina Canva varumärkesmallar</li>
                <li>✓ Automatisk ifyllning av slides i mallar</li>
                <li>✓ Öppna och redigera direkt i Canva</li>
                <li>✓ Export till PPTX/PDF från Canva</li>
              </ul>
              <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Ansluter...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Anslut nu
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Templates grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            {isConnected ? 'Dina varumärkesmallar' : 'Byggda mallar'}
          </h4>
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadBrandTemplates}
              disabled={isLoadingTemplates}
            >
              {isLoadingTemplates ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Uppdatera mallar'
              )}
            </Button>
          )}
        </div>

        {isLoadingTemplates ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Laddar mallar...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                  selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                } ${isCreatingDesign && selectedTemplate === template.id ? 'opacity-50' : ''}`}
                onClick={() => !isCreatingDesign && handleTemplateClick(template.id)}
              >
                <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gradient-to-br from-muted to-muted-foreground/20">
                  {template.thumbnail_url ? (
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}

                  {isCreatingDesign && selectedTemplate === template.id && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                        <span className="text-xs text-muted-foreground">Skapar design...</span>
                      </div>
                    </div>
                  )}

                  {selectedTemplate === template.id && !isCreatingDesign && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{template.name}</span>
                    {template.brand_id && (
                      <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                        Canva
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {templates.length === 0 && !isLoadingTemplates && (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Inga mallar tillgängliga</p>
          </div>
        )}
      </div>

      {/* Last created design link */}
      {lastCreatedDesign && (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Design skapad i Canva!</p>
                <p className="text-xs text-muted-foreground">
                  {lastCreatedDesign.title || courseTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(lastCreatedDesign.view_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visa
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => window.open(lastCreatedDesign.edit_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Redigera
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2 border-t">
        <Layers className="h-4 w-4" />
        <span>
          {isConnected
            ? 'Klicka på en mall för att skapa presentation i Canva med auto-ifyllning'
            : 'Anslut till Canva för att använda dina egna mallar'
          }
        </span>
      </div>
    </div>
  );
}

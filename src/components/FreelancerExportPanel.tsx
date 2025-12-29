import { useState } from 'react';
import { Users, Download, FileText, ExternalLink, Copy, Loader2, Briefcase, Palette, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Slide } from '@/types/course';
import { toast } from 'sonner';

interface FreelancerExportPanelProps {
  slides: Slide[];
  courseTitle: string;
  moduleTitle?: string;
}

export function FreelancerExportPanel({
  slides,
  courseTitle,
  moduleTitle,
}: FreelancerExportPanelProps) {
  const [platform, setPlatform] = useState<'fiverr' | 'upwork' | 'generic'>('fiverr');
  const [designNotes, setDesignNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState('');
  const [brandColors, setBrandColors] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateBrief = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('freelancer-integration', {
        body: {
          action: 'generate-brief',
          slides,
          courseTitle,
          moduleTitle,
          designNotes,
          platform,
          stylePreferences: {
            colorScheme: colorScheme || undefined,
            brandColors: brandColors ? brandColors.split(',').map(c => c.trim()) : undefined,
          },
        },
      });

      if (error) throw error;
      
      setGeneratedBrief(data.brief);
      toast.success('Brief genererad!');
    } catch (error) {
      console.error('Error generating brief:', error);
      toast.error('Kunde inte generera brief');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPackage = async (format: 'text' | 'json' | 'csv' | 'markdown') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('freelancer-integration', {
        body: {
          action: 'export-for-designer',
          slides,
          courseTitle,
          moduleTitle,
          designNotes,
          platform,
          stylePreferences: {
            colorScheme: colorScheme || undefined,
            brandColors: brandColors ? brandColors.split(',').map(c => c.trim()) : undefined,
          },
        },
      });

      if (error) throw error;

      // Get the right format
      const contentMap: Record<string, { content: string; filename: string; mimeType: string }> = {
        text: { 
          content: data.exports.textContent, 
          filename: `${courseTitle}_slides.txt`,
          mimeType: 'text/plain',
        },
        json: { 
          content: data.exports.jsonContent, 
          filename: `${courseTitle}_slides.json`,
          mimeType: 'application/json',
        },
        csv: { 
          content: data.exports.csvContent, 
          filename: `${courseTitle}_slides.csv`,
          mimeType: 'text/csv',
        },
        markdown: { 
          content: data.exports.markdownContent, 
          filename: `${courseTitle}_slides.md`,
          mimeType: 'text/markdown',
        },
      };

      const { content, filename, mimeType } = contentMap[format];
      
      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exporterat som ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Kunde inte exportera');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBrief = () => {
    if (generatedBrief) {
      navigator.clipboard.writeText(generatedBrief);
      setCopied(true);
      toast.success('Kopierat till urklipp!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openPlatform = (platformUrl: string) => {
    window.open(platformUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-accent" />
          Skicka till frilansar
        </CardTitle>
        <CardDescription>
          Exportera slides för professionell design på Fiverr eller Upwork
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="brief" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brief">Skapa brief</TabsTrigger>
            <TabsTrigger value="export">Exportera filer</TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="space-y-4 mt-4">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Plattform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="fiverr">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">Fiverr</span>
                      <Badge variant="outline" className="text-[10px]">Populär</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="upwork">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">Upwork</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="generic">
                    <span className="font-medium">Generell brief</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Style Preferences */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="colorScheme">Färgschema</Label>
                <Input
                  id="colorScheme"
                  placeholder="t.ex. Blått och vitt, minimalistiskt"
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColors">Varumärkesfärger (hex)</Label>
                <Input
                  id="brandColors"
                  placeholder="t.ex. #1a73e8, #34a853"
                  value={brandColors}
                  onChange={(e) => setBrandColors(e.target.value)}
                />
              </div>
            </div>

            {/* Design Notes */}
            <div className="space-y-2">
              <Label htmlFor="designNotes">Extra instruktioner</Label>
              <Textarea
                id="designNotes"
                placeholder="Beskriv din önskade stil, specifika önskemål, eller referensbilder..."
                value={designNotes}
                onChange={(e) => setDesignNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <Button onClick={handleGenerateBrief} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generera brief ({slides.length} slides)
                </>
              )}
            </Button>

            {/* Generated Brief */}
            {generatedBrief && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Genererad brief</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopyBrief}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Textarea
                  value={generatedBrief}
                  readOnly
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Platform Links */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPlatform('https://www.fiverr.com/search/gigs?query=presentation%20design')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Öppna Fiverr
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPlatform('https://www.upwork.com/nx/search/jobs/?q=presentation%20design')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Öppna Upwork
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Exportera dina {slides.length} slides i olika format för att dela med en designer.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => handleExportPackage('text')}
                disabled={isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Textfil (.txt)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportPackage('json')}
                disabled={isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                JSON (.json)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportPackage('csv')}
                disabled={isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Kalkylark (.csv)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportPackage('markdown')}
                disabled={isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Markdown (.md)
              </Button>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Tips för designers
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Slides exporteras utan styling för flexibel design</li>
                <li>• JSON-format passar för bulk-import</li>
                <li>• CSV öppnas enkelt i Excel/Google Sheets</li>
                <li>• Markdown är läsbart och redigerbart</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

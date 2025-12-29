import { useState, useRef } from 'react';
import { Upload, FileUp, Link2, Loader2, X, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadedContent {
  id: string;
  name: string;
  type: 'file' | 'url' | 'text';
  content: string;
}

interface ContentUploaderProps {
  onContentUploaded: (content: string) => void;
  placeholder?: string;
  acceptedFormats?: string;
  label?: string;
  description?: string;
  compact?: boolean;
}

export function ContentUploader({
  onContentUploaded,
  placeholder = 'Klistra in text här...',
  acceptedFormats = '.txt,.md,.doc,.docx,.pdf',
  label = 'Ladda upp eget innehåll',
  description = 'Ladda upp filer, klistra in text eller ange URL:er för att importera eget innehåll.',
  compact = false,
}: ContentUploaderProps) {
  const [uploadedContents, setUploadedContents] = useState<UploadedContent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [manualText, setManualText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        let content = '';

        // Check file type
        if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          content = await file.text();
        } else if (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
          // Use parse-document edge function for binary files
          const formData = new FormData();
          formData.append('file', file);

          const { data, error } = await supabase.functions.invoke('parse-document', {
            body: formData,
          });

          if (error) throw error;
          content = data.text || '';
        } else {
          content = await file.text();
        }

        const newContent: UploadedContent = {
          id: crypto.randomUUID(),
          name: file.name,
          type: 'file',
          content,
        };

        setUploadedContents(prev => [...prev, newContent]);
        onContentUploaded(content);
        toast.success(`"${file.name}" importerad!`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Kunde inte läsa filen');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlScrape = async () => {
    if (!urlInput.trim()) {
      toast.error('Ange en URL');
      return;
    }

    setIsScraping(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { urls: [urlInput.trim()] },
      });

      if (error) throw error;

      const content = data.content || '';
      const newContent: UploadedContent = {
        id: crypto.randomUUID(),
        name: urlInput.trim(),
        type: 'url',
        content,
      };

      setUploadedContents(prev => [...prev, newContent]);
      onContentUploaded(content);
      setUrlInput('');
      toast.success('URL-innehåll importerat!');
    } catch (error) {
      console.error('Error scraping URL:', error);
      toast.error('Kunde inte hämta innehåll från URL');
    } finally {
      setIsScraping(false);
    }
  };

  const handleManualTextSubmit = () => {
    if (!manualText.trim()) {
      toast.error('Ange text att importera');
      return;
    }

    const newContent: UploadedContent = {
      id: crypto.randomUUID(),
      name: `Manuell text (${manualText.slice(0, 30)}...)`,
      type: 'text',
      content: manualText,
    };

    setUploadedContents(prev => [...prev, newContent]);
    onContentUploaded(manualText);
    setManualText('');
    toast.success('Text importerad!');
  };

  const removeContent = (id: string) => {
    setUploadedContents(prev => prev.filter(c => c.id !== id));
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={acceptedFormats}
            multiple
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Ladda upp fil
          </Button>
          <span className="text-xs text-muted-foreground">eller</span>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="URL att hämta..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlScrape()}
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUrlScrape}
              disabled={isScraping || !urlInput.trim()}
            >
              {isScraping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {uploadedContents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedContents.map((content) => (
              <Badge
                key={content.id}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {content.type === 'file' ? (
                  <FileText className="w-3 h-3" />
                ) : content.type === 'url' ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <FileUp className="w-3 h-3" />
                )}
                <span className="max-w-[150px] truncate">{content.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => removeContent(content.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Label className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" />
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file" className="text-xs gap-1">
              <FileUp className="w-3 h-3" />
              Fil
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs gap-1">
              <Link2 className="w-3 h-3" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs gap-1">
              <FileText className="w-3 h-3" />
              Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-3 space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={acceptedFormats}
              multiple
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Laddar upp...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Välj fil(er)
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Stöder: TXT, MD, PDF, DOCX
            </p>
          </TabsContent>

          <TabsContent value="url" className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/artikel"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlScrape()}
              />
              <Button
                type="button"
                onClick={handleUrlScrape}
                disabled={isScraping || !urlInput.trim()}
              >
                {isScraping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-3 space-y-3">
            <Textarea
              placeholder={placeholder}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={4}
            />
            <Button
              type="button"
              onClick={handleManualTextSubmit}
              disabled={!manualText.trim()}
              className="w-full"
            >
              Importera text
            </Button>
          </TabsContent>
        </Tabs>

        {uploadedContents.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Importerat innehåll:</Label>
            <div className="flex flex-wrap gap-2">
              {uploadedContents.map((content) => (
                <Badge
                  key={content.id}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {content.type === 'file' ? (
                    <FileText className="w-3 h-3" />
                  ) : content.type === 'url' ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <FileUp className="w-3 h-3" />
                  )}
                  <span className="max-w-[120px] truncate">{content.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20"
                    onClick={() => removeContent(content.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

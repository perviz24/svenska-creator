import { useState } from 'react';
import { FileSpreadsheet, Loader2, Download, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Slide } from '@/types/course';
import pptxgen from 'pptxgenjs';

interface GoogleSlidesExportProps {
  slides: Slide[];
  courseTitle: string;
  moduleTitle: string;
}

export function GoogleSlidesExport({ slides, courseTitle, moduleTitle }: GoogleSlidesExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportToGoogleSlides = async () => {
    if (slides.length === 0) {
      toast.error('Inga slides att exportera');
      return;
    }

    setIsExporting(true);
    try {
      // Generate a real PPTX locally (Google Slides can import PPTX)
      const pptx = new pptxgen();
      pptx.author = 'Course Generator';
      pptx.title = courseTitle || moduleTitle || 'Presentation';
      pptx.subject = 'Google Slides export';

      slides.forEach((s, index) => {
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };

        const title = s.title || `Slide ${index + 1}`;
        const content = s.content || '';

        // Title
        slide.addText(title, {
          x: 0.5,
          y: 0.4,
          w: 9,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: '000000',
          fontFace: 'Arial',
        });

        // Body
        if (content.trim()) {
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          const bulletItems = lines.map(line => ({
            text: line.replace(/^[•\-]\s*/, ''),
            options: { bullet: { type: 'bullet' as const }, breakLine: true },
          }));

          slide.addText(bulletItems, {
            x: 0.7,
            y: 1.4,
            w: 8.8,
            h: 4.2,
            fontSize: 18,
            color: '333333',
            fontFace: 'Arial',
            valign: 'top',
          });
        }

        // Speaker notes
        if (s.speakerNotes?.trim()) {
          slide.addNotes(s.speakerNotes);
        }
      });

      const safeTitle = (moduleTitle || courseTitle || 'google-slides')
        .replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      await pptx.writeFile({ fileName: `${safeTitle}-google-slides.pptx` });
      toast.success('Exporterad! Importera PPTX-filen i Google Slides');
    } catch (error) {
      console.error('Error exporting to Google Slides:', error);
      toast.error('Kunde inte exportera till Google Slides');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyAsMarkdown = () => {
    const markdown = slides
      .map((slide, index) => {
        let content = `## Slide ${index + 1}: ${slide.title}\n\n`;
        if (slide.content) {
          content += `${slide.content}\n\n`;
        }
        if (slide.speakerNotes) {
          content += `> **Speaker Notes:** ${slide.speakerNotes}\n\n`;
        }
        content += '---\n';
        return content;
      })
      .join('\n');

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success('Kopierat som Markdown!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Google Slides</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          PPTX-format
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <FileSpreadsheet className="h-10 w-10 mx-auto text-green-600 mb-3" />
          <h4 className="font-medium mb-2">Exportera till Google Slides</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Ladda ner som PPTX-fil och importera direkt i Google Slides för vidare redigering.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleExportToGoogleSlides}
              disabled={isExporting || slides.length === 0}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Exporterar...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Ladda ner för Google Slides
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyAsMarkdown}
              disabled={slides.length === 0}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Kopierat!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiera som text
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <span>1.</span> Ladda ner PPTX-filen
          </p>
          <p className="flex items-center gap-1">
            <span>2.</span> Gå till{' '}
            <a
              href="https://slides.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              slides.google.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="flex items-center gap-1">
            <span>3.</span> Välj "Arkiv" → "Importera slides" → Ladda upp filen
          </p>
        </div>
      </div>
    </div>
  );
}

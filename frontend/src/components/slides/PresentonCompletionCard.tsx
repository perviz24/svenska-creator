/**
 * Presenton Completion Card Component
 * Shows download/edit options after successful Presenton generation
 */
import { Sparkles, FileImage, Layers, Palette, Download, ExternalLink, RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PresentonGenerationEntry } from '@/types/course';

interface PresentonCompletionCardProps {
  downloadUrl: string | null;
  editUrl: string | null;
  generationHistory: PresentonGenerationEntry[];
  onReset: () => void;
}

export function PresentonCompletionCard({
  downloadUrl,
  editUrl,
  generationHistory,
  onReset,
}: PresentonCompletionCardProps) {
  return (
    <div className="mt-6 w-full max-w-lg mx-auto">
      <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/30 rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
              Professionell presentation klar!
            </h3>
            <p className="text-sm text-muted-foreground">
              Fullständigt designad med bilder, ikoner och layout
            </p>
          </div>
        </div>
        
        {/* Preview of what's included */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <FileImage className="h-5 w-5 mx-auto mb-1 text-primary" />
            <span className="text-xs text-muted-foreground">AI-bilder</span>
          </div>
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <Layers className="h-5 w-5 mx-auto mb-1 text-primary" />
            <span className="text-xs text-muted-foreground">Modern layout</span>
          </div>
          <div className="text-center p-2 bg-background/50 rounded-lg">
            <Palette className="h-5 w-5 mx-auto mb-1 text-primary" />
            <span className="text-xs text-muted-foreground">Tematiserat</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 pt-2">
          {downloadUrl && (
            <Button 
              size="lg"
              className="flex-1 min-w-[140px]"
              onClick={() => window.open(downloadUrl, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Ladda ner PPTX
            </Button>
          )}
          {editUrl && (
            <Button 
              size="lg"
              variant="outline"
              className="flex-1 min-w-[140px]"
              onClick={() => window.open(editUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Redigera online
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <Button 
            size="sm" 
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generera nytt alternativ
          </Button>
          
          {/* Alternatives display */}
          {generationHistory.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Settings2 className="h-4 w-4 mr-1" />
                  {generationHistory.length} alternativ
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50 w-56">
                <DropdownMenuLabel>Tidigare generationer</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {generationHistory.slice(-5).reverse().map((item, idx) => (
                  <DropdownMenuItem 
                    key={item.id} 
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                    onClick={() => item.downloadUrl && window.open(item.downloadUrl, '_blank')}
                  >
                    <span className="font-medium text-sm">
                      {idx === 0 ? '✓ Aktuell' : `Alternativ ${generationHistory.length - idx}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.style} • {new Date(item.timestamp).toLocaleTimeString('sv-SE')}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

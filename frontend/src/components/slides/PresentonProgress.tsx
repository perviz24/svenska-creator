/**
 * Presenton Progress Indicator Component
 * Shows progress during Presenton presentation generation
 */
import { Zap, FileText, Palette, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresentonProgressProps {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export function PresentonProgress({ status, progress }: PresentonProgressProps) {
  return (
    <div className="mt-6 w-full max-w-md mx-auto">
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 space-y-4 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">
                {status === 'pending' && 'Analyserar innehåll...'}
                {status === 'processing' && 'Skapar designade slides...'}
                {status === 'completed' && 'Klart!'}
                {status === 'failed' && 'Ett fel uppstod'}
              </span>
              <span className="font-semibold text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2.5 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className={cn(
            "text-center p-2 rounded-lg transition-all",
            progress >= 20 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <FileText className="h-4 w-4 mx-auto mb-1" />
            <span className="text-xs">Struktur</span>
          </div>
          <div className={cn(
            "text-center p-2 rounded-lg transition-all",
            progress >= 50 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Palette className="h-4 w-4 mx-auto mb-1" />
            <span className="text-xs">Design</span>
          </div>
          <div className={cn(
            "text-center p-2 rounded-lg transition-all",
            progress >= 80 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <FileImage className="h-4 w-4 mx-auto mb-1" />
            <span className="text-xs">Bilder</span>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Presenton skapar en professionellt designad presentation med AI-genererade bilder och modern layout.
        </p>
      </div>
    </div>
  );
}

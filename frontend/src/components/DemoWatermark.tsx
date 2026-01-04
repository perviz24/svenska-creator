import { cn } from '@/lib/utils';

interface DemoWatermarkProps {
  className?: string;
}

export function DemoWatermark({ className }: DemoWatermarkProps) {
  return (
    <div 
      className={cn(
        "absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {/* Diagonal watermark pattern */}
      <div className="absolute inset-0 flex items-center justify-center -rotate-12">
        <div className="flex flex-col items-center gap-2 opacity-30">
          <div className="flex items-center gap-3">
            <svg 
              viewBox="0 0 100 100" 
              className="w-16 h-16 text-foreground"
              fill="currentColor"
            >
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4"/>
              <path d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-4xl font-bold tracking-wider text-foreground uppercase">
              DEMO
            </span>
          </div>
          <span className="text-sm font-medium text-foreground/70">
            Testversion - Ej för distribution
          </span>
        </div>
      </div>

      {/* Corner badge */}
      <div className="absolute top-2 right-2 bg-amber-500/80 text-white text-xs font-semibold px-2 py-1 rounded">
        DEMO
      </div>
    </div>
  );
}
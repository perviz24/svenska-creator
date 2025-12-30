import { PresentationStyle } from '@/types/course';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemePreview {
  style: PresentationStyle;
  label: string;
  description: string;
  // Visual theme colors (matching Presenton themes)
  preview: {
    background: string;
    cardBg: string;
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
}

const themePreviewData: ThemePreview[] = [
  {
    style: 'modern',
    label: 'Modern',
    description: 'Ren och professionell',
    preview: {
      background: 'bg-gradient-to-br from-blue-50 to-blue-100',
      cardBg: 'bg-white',
      primary: 'bg-blue-600',
      secondary: 'bg-blue-100',
      text: 'text-slate-800',
      accent: 'bg-blue-500',
    },
  },
  {
    style: 'classic',
    label: 'Klassisk',
    description: 'Tidlös elegans',
    preview: {
      background: 'bg-gradient-to-br from-rose-50 to-pink-100',
      cardBg: 'bg-white',
      primary: 'bg-rose-500',
      secondary: 'bg-rose-100',
      text: 'text-slate-800',
      accent: 'bg-rose-400',
    },
  },
  {
    style: 'minimal',
    label: 'Minimalistisk',
    description: 'Lugn och fokuserad',
    preview: {
      background: 'bg-gradient-to-br from-teal-50 to-cyan-100',
      cardBg: 'bg-white',
      primary: 'bg-teal-500',
      secondary: 'bg-teal-100',
      text: 'text-slate-800',
      accent: 'bg-cyan-400',
    },
  },
  {
    style: 'creative',
    label: 'Kreativ',
    description: 'Djärv och dynamisk',
    preview: {
      background: 'bg-gradient-to-br from-amber-100 to-yellow-200',
      cardBg: 'bg-white',
      primary: 'bg-amber-500',
      secondary: 'bg-yellow-100',
      text: 'text-slate-900',
      accent: 'bg-orange-400',
    },
  },
  {
    style: 'corporate',
    label: 'Företag',
    description: 'Formell och auktoritativ',
    preview: {
      background: 'bg-gradient-to-br from-slate-800 to-slate-900',
      cardBg: 'bg-slate-700',
      primary: 'bg-blue-500',
      secondary: 'bg-slate-600',
      text: 'text-white',
      accent: 'bg-blue-400',
    },
  },
];

interface ThemePreviewSelectorProps {
  selectedStyle: PresentationStyle;
  onStyleChange: (style: PresentationStyle) => void;
  showCustomOption?: boolean;
  onCustomClick?: () => void;
}

export function ThemePreviewSelector({
  selectedStyle,
  onStyleChange,
  showCustomOption = true,
  onCustomClick,
}: ThemePreviewSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {themePreviewData.map((theme) => (
          <button
            key={theme.style}
            onClick={() => onStyleChange(theme.style)}
            className={cn(
              'group relative rounded-lg overflow-hidden border-2 transition-all duration-200',
              'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/50',
              selectedStyle === theme.style
                ? 'border-primary ring-2 ring-primary/30 shadow-md'
                : 'border-border/50 hover:border-border'
            )}
          >
            {/* Mini Preview */}
            <div className={cn('aspect-[16/10] p-2', theme.preview.background)}>
              {/* Title bar simulation */}
              <div className={cn('w-full h-2 rounded-full mb-1.5', theme.preview.primary)} />
              
              {/* Content area simulation */}
              <div className={cn('rounded p-1.5', theme.preview.cardBg)}>
                {/* Title */}
                <div className={cn('w-3/4 h-1.5 rounded-full mb-1', theme.preview.primary)} />
                
                {/* Bullet points */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <div className={cn('w-1 h-1 rounded-full', theme.preview.accent)} />
                    <div className={cn('w-4/5 h-1 rounded-full', theme.preview.secondary)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={cn('w-1 h-1 rounded-full', theme.preview.accent)} />
                    <div className={cn('w-3/5 h-1 rounded-full', theme.preview.secondary)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={cn('w-1 h-1 rounded-full', theme.preview.accent)} />
                    <div className={cn('w-2/3 h-1 rounded-full', theme.preview.secondary)} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Label */}
            <div className="p-2 bg-background border-t border-border/30">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">{theme.label}</p>
                  <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                </div>
                {selectedStyle === theme.style && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Custom Template Option */}
      {showCustomOption && (
        <button
          onClick={() => {
            onStyleChange('custom');
            onCustomClick?.();
          }}
          className={cn(
            'w-full rounded-lg border-2 border-dashed p-3 transition-all duration-200',
            'hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
            selectedStyle === 'custom'
              ? 'border-primary bg-primary/5'
              : 'border-border/50'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-lg">🎨</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Egen mall</p>
              <p className="text-xs text-muted-foreground">Ladda upp din egen design</p>
            </div>
            {selectedStyle === 'custom' && (
              <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

/**
 * Template Style Selector Component
 * Visual template style picker for Presenton presentations
 */
import { cn } from '@/lib/utils';

type ExportTemplate = 'professional' | 'modern' | 'minimal' | 'creative';

interface TemplateStyleSelectorProps {
  selected: ExportTemplate;
  onSelect: (template: ExportTemplate) => void;
}

interface TemplateOption {
  id: ExportTemplate;
  name: string;
  gradient: string;
  preview: React.ReactNode;
}

const templates: TemplateOption[] = [
  {
    id: 'professional',
    name: 'Professionell',
    gradient: 'from-slate-800 to-slate-900',
    preview: (
      <>
        <div className="h-1 w-8 bg-blue-500 rounded mb-1" />
        <div className="h-0.5 w-12 bg-white/60 rounded mb-0.5" />
        <div className="h-0.5 w-10 bg-white/40 rounded mb-0.5" />
        <div className="h-0.5 w-8 bg-white/30 rounded" />
        <div className="absolute bottom-1 right-1 w-6 h-4 bg-blue-500/30 rounded-sm" />
      </>
    ),
  },
  {
    id: 'modern',
    name: 'Modern',
    gradient: 'from-violet-600 to-indigo-800',
    preview: (
      <>
        <div className="h-1 w-6 bg-white rounded-full mb-1" />
        <div className="flex gap-1 mb-1">
          <div className="h-3 w-3 bg-white/20 rounded" />
          <div className="flex-1">
            <div className="h-0.5 w-full bg-white/50 rounded mb-0.5" />
            <div className="h-0.5 w-3/4 bg-white/30 rounded" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2 h-2 bg-white/10 rounded-full" />
      </>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    gradient: '',
    preview: (
      <div className="absolute inset-0 bg-white p-3">
        <div className="h-0.5 w-10 bg-gray-800 rounded mb-2" />
        <div className="h-0.5 w-14 bg-gray-300 rounded mb-0.5" />
        <div className="h-0.5 w-12 bg-gray-200 rounded mb-0.5" />
        <div className="h-0.5 w-10 bg-gray-200 rounded" />
      </div>
    ),
  },
  {
    id: 'creative',
    name: 'Kreativ',
    gradient: 'from-orange-400 via-pink-500 to-purple-600',
    preview: (
      <>
        <div className="absolute top-1 left-1 w-4 h-4 bg-yellow-300 rounded-full opacity-60" />
        <div className="absolute top-3 right-2 w-2 h-2 bg-cyan-300 rounded-full opacity-80" />
        <div className="mt-4 ml-1">
          <div className="h-1 w-8 bg-white rounded-full mb-1" />
          <div className="h-0.5 w-10 bg-white/60 rounded" />
        </div>
        <div className="absolute bottom-2 right-1 w-5 h-3 bg-white/20 rounded rotate-12" />
      </>
    ),
  },
];

export function TemplateStyleSelector({ selected, onSelect }: TemplateStyleSelectorProps) {
  return (
    <div className="w-full mt-2 mb-4">
      <span className="text-sm text-muted-foreground mb-3 block">Välj stil:</span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              "group relative aspect-[4/3] rounded-lg border-2 overflow-hidden transition-all duration-200 hover:scale-105",
              selected === template.id 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "absolute inset-0 p-2",
              template.gradient ? `bg-gradient-to-br ${template.gradient}` : ''
            )}>
              {template.preview}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm py-1 text-center">
              <span className="text-xs font-medium">{template.name}</span>
            </div>
            {selected === template.id && (
              <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-[8px] text-primary-foreground">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

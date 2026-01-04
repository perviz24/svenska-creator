import { useState } from 'react';
import { Wand2, Loader2, Edit2, Check, X, Sparkles, ArrowUp, ArrowDown, Scissors, Languages, ChevronDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { aiReviewEdit } from '@/lib/aiApi';
import { toast } from 'sonner';

export type AIAction = 
  | 'improve' 
  | 'expand' 
  | 'simplify' 
  | 'shorten' 
  | 'translate' 
  | 'professional' 
  | 'conversational'
  | 'custom';

interface AIReviewEditorProps {
  content: string;
  contentType: 'title' | 'description' | 'outline' | 'script' | 'slide' | 'exercise' | 'quiz';
  context?: string; // Additional context like course title
  language?: 'sv' | 'en';
  placeholder?: string;
  minHeight?: string;
  onSave: (newContent: string) => void;
  onCancel?: () => void;
  showInline?: boolean; // Show as inline edit mode
  readOnly?: boolean;
}

const AI_ACTIONS: { action: AIAction; label: string; icon: typeof Wand2; description: string }[] = [
  { action: 'improve', label: 'Förbättra', icon: Sparkles, description: 'Gör texten bättre' },
  { action: 'expand', label: 'Expandera', icon: ArrowUp, description: 'Lägg till mer detalj' },
  { action: 'simplify', label: 'Förenkla', icon: ArrowDown, description: 'Gör enklare att förstå' },
  { action: 'shorten', label: 'Korta ner', icon: Scissors, description: 'Gör texten kortare' },
  { action: 'professional', label: 'Professionell', icon: Wand2, description: 'Mer formell ton' },
  { action: 'conversational', label: 'Konversationell', icon: Wand2, description: 'Mer avslappnad ton' },
];

export function AIReviewEditor({
  content,
  contentType,
  context = '',
  language = 'sv',
  placeholder = 'Skriv eller klistra in innehåll...',
  minHeight = '120px',
  onSave,
  onCancel,
  showInline = false,
  readOnly = false,
}: AIReviewEditorProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isEditing, setIsEditing] = useState(showInline);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAIAction = async (action: AIAction, customInstruction?: string) => {
    if (!editedContent.trim() && action !== 'custom') {
      toast.error('Ingen text att bearbeta');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-review-edit', {
        body: {
          content: editedContent,
          action,
          customInstruction,
          contentType,
          context,
          language,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('För många förfrågningar. Vänta en stund och försök igen.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data.result) {
        setEditedContent(data.result);
        toast.success('Text uppdaterad med AI');
      }
    } catch (error) {
      console.error('AI review error:', error);
      toast.error('Kunde inte bearbeta med AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomCommand = () => {
    if (!customPrompt.trim()) return;
    handleAIAction('custom', customPrompt);
    setCustomPrompt('');
    setShowCustomInput(false);
  };

  const handleSave = () => {
    onSave(editedContent);
    if (!showInline) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    if (onCancel) {
      onCancel();
    } else {
      setIsEditing(false);
    }
  };

  // Read-only display mode
  if (!isEditing && !showInline) {
    return (
      <div 
        className="group relative p-3 rounded-lg border border-transparent hover:border-border/50 hover:bg-secondary/20 transition-all cursor-pointer"
        onClick={() => !readOnly && setIsEditing(true)}
      >
        <div className="text-sm whitespace-pre-wrap">{content || <span className="text-muted-foreground italic">Ingen text</span>}</div>
        {!readOnly && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
          >
            <Edit2 className="w-3 h-3" />
            Redigera
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              AI-åtgärder
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {AI_ACTIONS.map(({ action, label, icon: Icon, description }) => (
              <DropdownMenuItem
                key={action}
                onClick={() => handleAIAction(action)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                <div className="flex-1">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCustomInput(!showCustomInput)}>
              <Send className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Egen instruktion</div>
                <div className="text-xs text-muted-foreground">Skriv egen AI-kommando</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Actions */}
        <div className="flex gap-1">
          {AI_ACTIONS.slice(0, 3).map(({ action, label, icon: Icon }) => (
            <Button
              key={action}
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleAIAction(action)}
              className="gap-1 text-xs"
            >
              <Icon className="w-3 h-3" />
              {label}
            </Button>
          ))}
        </div>

        {isProcessing && (
          <Badge variant="outline" className="gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            AI bearbetar...
          </Badge>
        )}
      </div>

      {/* Custom Prompt Input */}
      {showCustomInput && (
        <div className="flex gap-2 animate-fade-in">
          <Input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Beskriv vad AI ska göra med texten..."
            onKeyDown={(e) => e.key === 'Enter' && handleCustomCommand()}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleCustomCommand}
            disabled={!customPrompt.trim() || isProcessing}
          >
            <Send className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCustomInput(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Text Editor */}
      <Textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        placeholder={placeholder}
        className={cn("resize-y", isProcessing && "opacity-50")}
        style={{ minHeight }}
        disabled={isProcessing}
      />

      {/* Action Buttons */}
      {!showInline && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isProcessing}>
            <X className="w-4 h-4 mr-1" />
            Avbryt
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isProcessing}>
            <Check className="w-4 h-4 mr-1" />
            Spara
          </Button>
        </div>
      )}

      {showInline && editedContent !== content && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isProcessing}>
            Återställ
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isProcessing}>
            Tillämpa ändringar
          </Button>
        </div>
      )}
    </div>
  );
}

// Simpler inline edit button for triggering edit mode
export function EditableField({
  value,
  onSave,
  contentType,
  context,
  language = 'sv',
  className,
}: {
  value: string;
  onSave: (newValue: string) => void;
  contentType: AIReviewEditorProps['contentType'];
  context?: string;
  language?: 'sv' | 'en';
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4">
          <AIReviewEditor
            content={value}
            contentType={contentType}
            context={context}
            language={language}
            showInline
            onSave={(newValue) => {
              onSave(newValue);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div 
      className={cn(
        "group relative p-2 rounded-md hover:bg-secondary/30 cursor-pointer transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span>{value}</span>
      <Edit2 className="w-3 h-3 absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
    </div>
  );
}

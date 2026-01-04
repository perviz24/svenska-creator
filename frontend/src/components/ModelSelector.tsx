import { useState, useEffect } from 'react';
import { Bot, Sparkles, Zap, Brain, Loader2, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai';
  description: string;
  strengths: string[];
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'highest' | 'standard';
  bestFor: string[];
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Snabb och balanserad - bra för de flesta uppgifter',
    strengths: ['Snabb', 'Kostnadseffektiv', 'Bra balans'],
    speed: 'fast',
    quality: 'high',
    bestFor: ['outline', 'script', 'quiz', 'exercises'],
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Högsta kvalitet - bäst för komplexa uppgifter',
    strengths: ['Djupare resonemang', 'Komplex analys', 'Multimodal'],
    speed: 'slow',
    quality: 'highest',
    bestFor: ['research', 'complex-outline', 'deep-analysis'],
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    description: 'Snabbast och billigast - bra för enkla uppgifter',
    strengths: ['Mycket snabb', 'Lägst kostnad', 'Enkel användning'],
    speed: 'fast',
    quality: 'standard',
    bestFor: ['titles', 'summaries', 'simple-edits'],
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Kraftfull allroundare med utmärkt resonemang',
    strengths: ['Stark logik', 'Kreativ', 'Lång kontext'],
    speed: 'medium',
    quality: 'highest',
    bestFor: ['script', 'creative-content', 'research'],
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    description: 'Balanserad prestanda till lägre kostnad',
    strengths: ['Bra balans', 'Multimodal', 'Kostnadseffektiv'],
    speed: 'fast',
    quality: 'high',
    bestFor: ['outline', 'slides', 'quiz'],
  },
];

type StepType = 'title' | 'outline' | 'script' | 'slides' | 'exercises' | 'quiz' | 'research';

interface ModelRecommendation {
  modelId: string;
  confidence: number;
  reasoning: string;
}

interface ModelSelectorProps {
  step: StepType;
  selectedModel?: string;
  onModelChange: (modelId: string) => void;
  showRecommendation?: boolean;
  courseTitle?: string;
  language?: 'sv' | 'en';
}

const stepToTaskMap: Record<StepType, string> = {
  title: 'Generera titlar',
  outline: 'Skapa kursöversikt',
  script: 'Skriva manus',
  slides: 'Generera slides',
  exercises: 'Skapa övningar',
  quiz: 'Generera quiz',
  research: 'Forskning',
};

const defaultModelForStep: Record<StepType, string> = {
  title: 'google/gemini-2.5-flash-lite',
  outline: 'google/gemini-2.5-flash',
  script: 'google/gemini-2.5-flash',
  slides: 'google/gemini-2.5-flash',
  exercises: 'google/gemini-2.5-flash',
  quiz: 'google/gemini-2.5-flash',
  research: 'google/gemini-2.5-pro',
};

export function ModelSelector({
  step,
  selectedModel,
  onModelChange,
  showRecommendation = true,
  courseTitle,
  language = 'sv',
}: ModelSelectorProps) {
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

  const currentModel = selectedModel || defaultModelForStep[step];
  const selectedModelInfo = AI_MODELS.find(m => m.id === currentModel);

  useEffect(() => {
    if (showRecommendation && courseTitle) {
      getAIRecommendation();
    }
  }, [step, courseTitle]);

  const getAIRecommendation = async () => {
    if (!courseTitle) return;
    
    setIsLoadingRecommendation(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-model', {
        body: {
          step,
          courseTitle,
          availableModels: AI_MODELS.map(m => ({ id: m.id, name: m.name, bestFor: m.bestFor })),
        },
      });

      if (!error && data?.recommendation) {
        setRecommendation(data.recommendation);
      }
    } catch (err) {
      console.log('Could not get AI recommendation, using defaults');
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  const applyRecommendation = () => {
    if (recommendation) {
      onModelChange(recommendation.modelId);
      toast.success('AI-rekommenderad modell vald');
    }
  };

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'fast': return <Zap className="w-3 h-3 text-green-500" />;
      case 'medium': return <Zap className="w-3 h-3 text-yellow-500" />;
      case 'slow': return <Zap className="w-3 h-3 text-orange-500" />;
      default: return null;
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'highest': return <Badge className="bg-purple-500/10 text-purple-600 text-[10px]">Högsta</Badge>;
      case 'high': return <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">Hög</Badge>;
      case 'standard': return <Badge className="bg-gray-500/10 text-gray-600 text-[10px]">Standard</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          AI-modell för {stepToTaskMap[step]}
        </label>
        {isLoadingRecommendation && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* AI Recommendation */}
      {showRecommendation && recommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI-rekommendation</span>
                  <Badge variant="outline" className="text-[10px]">
                    {Math.round(recommendation.confidence * 100)}% säkerhet
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{recommendation.reasoning}</p>
              </div>
              {recommendation.modelId !== currentModel && (
                <Button size="sm" variant="outline" onClick={applyRecommendation} className="gap-1">
                  <Check className="w-3 h-3" />
                  Använd
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Selector */}
      <Select value={currentModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedModelInfo && (
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>{selectedModelInfo.name}</span>
                {getSpeedIcon(selectedModelInfo.speed)}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {AI_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    {getSpeedIcon(model.speed)}
                    {getQualityBadge(model.quality)}
                    {recommendation?.modelId === model.id && (
                      <Badge className="bg-primary/10 text-primary text-[10px]">Rekommenderad</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Current Model Info */}
      {selectedModelInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-help">
                <Info className="w-3 h-3" />
                <span>Styrkor: {selectedModelInfo.strengths.join(', ')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-sm">{selectedModelInfo.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bäst för: {selectedModelInfo.bestFor.join(', ')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

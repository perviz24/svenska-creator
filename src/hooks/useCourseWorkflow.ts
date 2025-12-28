import { useState, useCallback } from 'react';
import { WorkflowState, WorkflowStep, TitleSuggestion, CourseOutline, CourseSettings } from '@/types/course';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const initialSettings: CourseSettings = {
  voiceId: 'sv-SE-MattiasNeural',
  voiceName: 'Mattias (Svenska, Maskulin)',
  targetDuration: 15,
  style: 'professional',
  includeQuizzes: true,
  enableResearch: true,
  language: 'sv',
};

const initialState: WorkflowState = {
  currentStep: 'title',
  completedSteps: [],
  title: '',
  selectedTitleId: null,
  titleSuggestions: [],
  outline: null,
  settings: initialSettings,
  isProcessing: false,
  error: null,
};

export function useCourseWorkflow() {
  const [state, setState] = useState<WorkflowState>(initialState);

  const setTitle = useCallback((title: string) => {
    setState(prev => ({ ...prev, title }));
  }, []);

  const generateTitleSuggestions = useCallback(async () => {
    if (!state.title.trim()) {
      toast.error('Ange en kurstitel först');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: { 
          title: state.title,
          language: state.settings.language 
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const suggestions: TitleSuggestion[] = data.suggestions || [];
      
      setState(prev => ({
        ...prev,
        titleSuggestions: suggestions,
        isProcessing: false,
      }));

      toast.success('Titelförslag genererade!');
    } catch (error) {
      console.error('Error generating titles:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera titelförslag';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  }, [state.title, state.settings.language]);

  const selectTitle = useCallback((id: string) => {
    setState(prev => {
      const suggestion = prev.titleSuggestions.find(s => s.id === id);
      return {
        ...prev,
        selectedTitleId: id,
        title: suggestion?.title || prev.title,
      };
    });
  }, []);

  const goToStep = useCallback((step: WorkflowStep) => {
    setState(prev => {
      const steps: WorkflowStep[] = ['title', 'outline', 'script', 'slides', 'voice', 'video', 'upload'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const newIndex = steps.indexOf(step);
      
      if (newIndex <= currentIndex || prev.completedSteps.includes(step)) {
        return { ...prev, currentStep: step };
      }
      return prev;
    });
  }, []);

  const completeStep = useCallback((step: WorkflowStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
    }));
  }, []);

  const nextStep = useCallback(() => {
    const steps: WorkflowStep[] = ['title', 'outline', 'script', 'slides', 'voice', 'video', 'upload'];
    setState(prev => {
      const currentIndex = steps.indexOf(prev.currentStep);
      if (currentIndex < steps.length - 1) {
        return {
          ...prev,
          currentStep: steps[currentIndex + 1],
          completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        };
      }
      return prev;
    });
  }, []);

  const generateOutline = useCallback(async () => {
    if (!state.title.trim()) {
      toast.error('Välj en titel först');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-outline', {
        body: { 
          title: state.title,
          targetDuration: state.settings.targetDuration,
          style: state.settings.style,
          language: state.settings.language,
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const outline: CourseOutline = data.outline;
      
      setState(prev => ({
        ...prev,
        outline,
        isProcessing: false,
      }));

      toast.success('Kursöversikt genererad!');
    } catch (error) {
      console.error('Error generating outline:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera kursöversikt';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  }, [state.title, state.settings]);

  const updateSettings = useCallback((settings: Partial<CourseSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  return {
    state,
    setTitle,
    generateTitleSuggestions,
    selectTitle,
    goToStep,
    completeStep,
    nextStep,
    generateOutline,
    updateSettings,
  };
}

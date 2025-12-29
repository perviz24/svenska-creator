import { useState, useCallback, useEffect } from 'react';
import { WorkflowState, WorkflowStep, TitleSuggestion, CourseOutline, CourseSettings, ModuleScript, Slide, ModuleAudio, VideoSettings, ModuleQuiz, ModuleExercises, ModuleSummary } from '@/types/course';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const initialSettings: CourseSettings = {
  voiceId: 'sv-SE-MattiasNeural',
  voiceName: 'Mattias (Svenska, Maskulin)',
  targetDuration: 15,
  style: 'professional',
  includeQuizzes: true,
  enableResearch: true,
  language: 'sv',
};

const initialVideoSettings: VideoSettings = {
  videoStyle: 'presentation',
};

const initialState: WorkflowState = {
  currentStep: 'title',
  completedSteps: [],
  title: '',
  selectedTitleId: null,
  titleSuggestions: [],
  outline: null,
  scripts: [],
  slides: {},
  exercises: {},
  quizzes: {},
  summaries: {},
  moduleAudio: {},
  videoSettings: initialVideoSettings,
  settings: initialSettings,
  isProcessing: false,
  error: null,
};

interface CourseRecord {
  id: string;
  title: string;
  selected_title_id: string | null;
  title_suggestions: TitleSuggestion[];
  settings: CourseSettings;
  outline: CourseOutline | null;
  current_step: WorkflowStep;
}

export function useCourseWorkflow() {
  const { user } = useAuth();
  const [state, setState] = useState<WorkflowState>(initialState);
  const [courseId, setCourseId] = useState<string | null>(null);

  // Load existing courses on mount
  useEffect(() => {
    if (user) {
      loadLatestCourse();
    }
  }, [user]);

  const loadLatestCourse = async () => {
    if (!user) return;

    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (course) {
        setCourseId(course.id);
        
        // Load scripts for this course
        const { data: scriptsData } = await supabase
          .from('module_scripts')
          .select('*')
          .eq('course_id', course.id);

        const scripts: ModuleScript[] = (scriptsData || []).map(s => ({
          moduleId: s.module_id,
          moduleTitle: s.module_title,
          ...((s.content as Record<string, unknown>) || {}),
        })) as ModuleScript[];

        // Parse the JSONB fields properly
        const titleSuggestions = Array.isArray(course.title_suggestions) 
          ? course.title_suggestions as unknown as TitleSuggestion[]
          : [];
        
        const settings = course.settings as unknown as CourseSettings || initialSettings;
        const outline = course.outline as unknown as CourseOutline | null;

        setState(prev => ({
          ...prev,
          title: course.title,
          selectedTitleId: course.selected_title_id,
          titleSuggestions,
          settings,
          outline,
          currentStep: course.current_step as WorkflowStep,
          scripts,
          completedSteps: getCompletedSteps(course.current_step as WorkflowStep),
        }));
      }
    } catch (error) {
      console.error('Error loading course:', error);
    }
  };

  const getCompletedSteps = (currentStep: WorkflowStep): WorkflowStep[] => {
    const steps: WorkflowStep[] = ['title', 'outline', 'script', 'slides', 'voice', 'video', 'upload'];
    const currentIndex = steps.indexOf(currentStep);
    return steps.slice(0, currentIndex);
  };

  const saveCourse = async (updates: Partial<CourseRecord>) => {
    if (!user) return;

    try {
      // Build properly typed update object
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.selected_title_id !== undefined) dbUpdates.selected_title_id = updates.selected_title_id;
      if (updates.current_step !== undefined) dbUpdates.current_step = updates.current_step;
      if (updates.title_suggestions !== undefined) {
        dbUpdates.title_suggestions = JSON.parse(JSON.stringify(updates.title_suggestions)) as Json;
      }
      if (updates.settings !== undefined) {
        dbUpdates.settings = JSON.parse(JSON.stringify(updates.settings)) as Json;
      }
      if (updates.outline !== undefined) {
        dbUpdates.outline = updates.outline ? JSON.parse(JSON.stringify(updates.outline)) as Json : null;
      }

      if (courseId) {
        // Update existing course
        await supabase
          .from('courses')
          .update(dbUpdates)
          .eq('id', courseId);
      } else {
        // Create new course
        const insertData = {
          user_id: user.id,
          title: updates.title || '',
          selected_title_id: updates.selected_title_id || null,
          title_suggestions: JSON.parse(JSON.stringify(updates.title_suggestions || [])) as Json,
          settings: JSON.parse(JSON.stringify(updates.settings || initialSettings)) as Json,
          outline: updates.outline ? JSON.parse(JSON.stringify(updates.outline)) as Json : null,
          current_step: updates.current_step || 'title',
        };

        const { data, error } = await supabase
          .from('courses')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        if (data) setCourseId(data.id);
      }
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };

  const saveScript = async (script: ModuleScript, audioUrl?: string, voiceId?: string) => {
    if (!user || !courseId) return;

    try {
      const insertData = {
        course_id: courseId,
        module_id: script.moduleId,
        module_title: script.moduleTitle,
        content: JSON.parse(JSON.stringify(script)) as Json,
        audio_url: audioUrl || null,
        voice_id: voiceId || null,
      };

      await supabase
        .from('module_scripts')
        .upsert(insertData, {
          onConflict: 'course_id,module_id',
        });
    } catch (error) {
      console.error('Error saving script:', error);
    }
  };

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

      // Save to database
      await saveCourse({
        title: state.title,
        title_suggestions: suggestions,
        settings: state.settings,
        current_step: 'title',
      });

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
  }, [state.title, state.settings]);

  const selectTitle = useCallback((id: string) => {
    setState(prev => {
      const suggestion = prev.titleSuggestions.find(s => s.id === id);
      const newTitle = suggestion?.title || prev.title;
      
      // Save selection to database
      saveCourse({
        title: newTitle,
        selected_title_id: id,
      });

      return {
        ...prev,
        selectedTitleId: id,
        title: newTitle,
      };
    });
  }, [courseId]);

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
    const steps: WorkflowStep[] = ['title', 'outline', 'script', 'slides', 'exercises', 'quiz', 'voice', 'video', 'upload'];
    setState(prev => {
      const currentIndex = steps.indexOf(prev.currentStep);
      if (currentIndex < steps.length - 1) {
        const newStep = steps[currentIndex + 1];
        
        // Save step progress
        saveCourse({ current_step: newStep });

        return {
          ...prev,
          currentStep: newStep,
          completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        };
      }
      return prev;
    });
  }, [courseId]);

  const updateOutline = useCallback((outline: CourseOutline) => {
    setState(prev => ({
      ...prev,
      outline,
    }));
    
    // Persist to database
    saveCourse({ outline });
  }, [courseId]);

  const addQuiz = useCallback((moduleId: string, quiz: ModuleQuiz) => {
    setState(prev => ({
      ...prev,
      quizzes: {
        ...prev.quizzes,
        [moduleId]: quiz,
      },
    }));
  }, []);

  const addExercises = useCallback((moduleId: string, moduleExercises: ModuleExercises) => {
    setState(prev => ({
      ...prev,
      exercises: {
        ...prev.exercises,
        [moduleId]: moduleExercises,
      },
    }));
  }, []);

  const addSummary = useCallback((moduleId: string, summary: ModuleSummary) => {
    setState(prev => ({
      ...prev,
      summaries: {
        ...prev.summaries,
        [moduleId]: summary,
      },
    }));
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

      // Save outline to database
      await saveCourse({ outline, current_step: 'outline' });

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
  }, [state.title, state.settings, courseId]);

  const generateScript = useCallback(async (moduleIndex: number) => {
    if (!state.outline) {
      toast.error('Ingen kursöversikt tillgänglig');
      return;
    }

    const module = state.outline.modules[moduleIndex];
    if (!module) {
      toast.error('Modulen kunde inte hittas');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { 
          module,
          courseTitle: state.title,
          style: state.settings.style,
          language: state.settings.language,
          enableResearch: state.settings.enableResearch,
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const script: ModuleScript = data.script;
      
      setState(prev => ({
        ...prev,
        scripts: [...prev.scripts, script],
        isProcessing: false,
      }));

      // Save script to database
      await saveScript(script);
      await saveCourse({ current_step: 'script' });

      toast.success(`Manus för "${module.title}" genererat!`);
    } catch (error) {
      console.error('Error generating script:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera manus';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  }, [state.outline, state.title, state.settings, courseId]);

  const uploadScript = useCallback(async (moduleId: string, script: ModuleScript) => {
    // Add the uploaded script to state
    setState(prev => {
      // Check if script for this module already exists
      const existingIndex = prev.scripts.findIndex(s => s.moduleId === moduleId);
      let newScripts: ModuleScript[];
      
      if (existingIndex >= 0) {
        // Replace existing script
        newScripts = [...prev.scripts];
        newScripts[existingIndex] = script;
      } else {
        // Add new script
        newScripts = [...prev.scripts, script];
      }
      
      return {
        ...prev,
        scripts: newScripts,
      };
    });

    // Save script to database
    await saveScript(script);
    await saveCourse({ current_step: 'script' });
  }, [courseId]);

  const updateSettings = useCallback((settings: Partial<CourseSettings>) => {
    setState(prev => {
      const newSettings = { ...prev.settings, ...settings };
      
      // Save settings to database
      saveCourse({ settings: newSettings });

      return {
        ...prev,
        settings: newSettings,
      };
    });
  }, [courseId]);

  const generateSlides = useCallback(async (moduleId: string, script: ModuleScript) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const scriptText = script.sections.map(s => s.content).join('\n\n');
      
      const { data, error } = await supabase.functions.invoke('generate-slides', {
        body: {
          script: scriptText,
          moduleTitle: script.moduleTitle,
          courseTitle: state.title,
          language: state.settings.language,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const slides: Slide[] = data.slides.map((slide: any) => ({
        moduleId,
        slideNumber: slide.slideNumber,
        title: slide.title,
        content: slide.content,
        speakerNotes: slide.speakerNotes,
        layout: slide.layout,
        suggestedImageQuery: slide.suggestedImageQuery,
        backgroundColor: slide.suggestedBackgroundColor,
      }));

      setState(prev => ({
        ...prev,
        slides: {
          ...prev.slides,
          [moduleId]: slides,
        },
        isProcessing: false,
      }));

      toast.success(`Slides för "${script.moduleTitle}" skapade!`);
    } catch (error) {
      console.error('Error generating slides:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera slides';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: message,
      }));
      toast.error(message);
    }
  }, [state.title, state.settings.language]);

  const updateSlide = useCallback((moduleId: string, slideIndex: number, updates: Partial<Slide>) => {
    setState(prev => {
      const moduleSlides = [...(prev.slides[moduleId] || [])];
      if (moduleSlides[slideIndex]) {
        moduleSlides[slideIndex] = { ...moduleSlides[slideIndex], ...updates };
      }
      return {
        ...prev,
        slides: {
          ...prev.slides,
          [moduleId]: moduleSlides,
        },
      };
    });
  }, []);

  const generateModuleAudio = useCallback(async (moduleId: string, script: ModuleScript) => {
    // This would store audio metadata - in a full implementation,
    // you'd upload the audio to storage and save the URL
    setState(prev => ({
      ...prev,
      moduleAudio: {
        ...prev.moduleAudio,
        [moduleId]: {
          moduleId,
          audioUrl: '', // Would be set after upload
          duration: script.estimatedDuration * 60,
          slideTiming: [],
        },
      },
    }));
  }, []);

  const updateVideoSettings = useCallback((updates: Partial<import('@/types/course').VideoSettings>) => {
    setState(prev => ({
      ...prev,
      videoSettings: {
        ...prev.videoSettings,
        ...updates,
      },
    }));
  }, []);

  const startNewCourse = useCallback(() => {
    setCourseId(null);
    setState(initialState);
  }, []);

  // Handler for uploaded content - stores it for use in generation
  const [uploadedContent, setUploadedContent] = useState<string>('');

  const handleContentUploaded = useCallback((content: string) => {
    setUploadedContent(prev => prev ? `${prev}\n\n${content}` : content);
    toast.success('Innehåll importerat och kommer användas i genereringen');
  }, []);

  const clearUploadedContent = useCallback(() => {
    setUploadedContent('');
  }, []);

  return {
    state,
    courseId,
    uploadedContent,
    setTitle,
    generateTitleSuggestions,
    selectTitle,
    goToStep,
    completeStep,
    nextStep,
    generateOutline,
    updateOutline,
    generateScript,
    uploadScript,
    generateSlides,
    updateSlide,
    updateSettings,
    generateModuleAudio,
    updateVideoSettings,
    addQuiz,
    addExercises,
    addSummary,
    startNewCourse,
    handleContentUploaded,
    clearUploadedContent,
  };
}

import { useState, useCallback, useEffect, useMemo } from 'react';
import { WorkflowState, WorkflowStep, TitleSuggestion, CourseOutline, CourseSettings, ModuleScript, Slide, ModuleAudio, VideoSettings, ModuleQuiz, ModuleExercises, ModuleSummary } from '@/types/course';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Demo limits applied when Admin Demo Mode is active
const adminDemoLimits = {
  enabled: true,
  maxSlides: 3,
  maxModules: 1,
  maxAudioDurationSeconds: 60,
  maxVideoDurationSeconds: 30,
  watermarkEnabled: true,
};

const initialSettings: CourseSettings = {
  voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  voiceName: 'George (Auktoritativ, lugn)',
  targetDuration: 15,
  style: 'professional',
  includeQuizzes: true,
  enableResearch: true,
  language: 'sv',
  aiQualityMode: 'quality',
  projectMode: 'course',
  demoMode: {
    enabled: false,
    maxSlides: 3,
    maxModules: 1,
    maxAudioDurationSeconds: 60,
    maxVideoDurationSeconds: 30,
    watermarkEnabled: true,
  },
};

const initialVideoSettings: VideoSettings = {
  videoStyle: 'presentation',
};

const initialPresentonState: import('@/types/course').PresentonState = {
  taskId: null,
  status: 'idle',
  progress: 0,
  downloadUrl: null,
  editUrl: null,
  generationHistory: [],
};

const initialState: WorkflowState = {
  currentStep: 'mode',
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
  presenton: initialPresentonState,
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
  
  // Check if Admin Demo Mode is active (from localStorage)
  const [isAdminDemoMode, setIsAdminDemoMode] = useState(() => {
    return localStorage.getItem('adminDemoMode') === 'true';
  });
  
  // Listen for Admin Demo Mode changes
  useEffect(() => {
    const checkAdminDemo = () => {
      setIsAdminDemoMode(localStorage.getItem('adminDemoMode') === 'true');
    };
    window.addEventListener('storage', checkAdminDemo);
    const interval = setInterval(checkAdminDemo, 1000);
    return () => {
      window.removeEventListener('storage', checkAdminDemo);
      clearInterval(interval);
    };
  }, []);
  
  // Effective demo mode: enabled if regular demo OR admin demo is active
  const effectiveDemoMode = useMemo(() => {
    if (isAdminDemoMode) {
      return adminDemoLimits; // Admin demo applies demo limits
    }
    return state.settings.demoMode;
  }, [isAdminDemoMode, state.settings.demoMode]);

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

        // Load slides for this course
        const { data: slidesData } = await supabase
          .from('slides')
          .select('*')
          .eq('course_id', course.id)
          .order('slide_number', { ascending: true });

        // Group slides by module
        const slidesMap: Record<string, Slide[]> = {};
        (slidesData || []).forEach((s) => {
          if (!slidesMap[s.module_id]) {
            slidesMap[s.module_id] = [];
          }
          slidesMap[s.module_id].push({
            moduleId: s.module_id,
            slideNumber: s.slide_number,
            title: s.title,
            content: s.content || '',
            speakerNotes: s.speaker_notes || '',
            layout: s.layout as Slide['layout'],
            backgroundColor: s.background_color || undefined,
            imageUrl: s.image_url || undefined,
            imageSource: s.image_source as Slide['imageSource'] || undefined,
            imageAttribution: s.image_attribution || undefined,
          });
        });

        // Load exercises for this course
        const { data: exercisesData } = await supabase
          .from('module_exercises')
          .select('*')
          .eq('course_id', course.id);

        const exercisesMap: Record<string, ModuleExercises> = {};
        (exercisesData || []).forEach((e) => {
          exercisesMap[e.module_id] = {
            moduleId: e.module_id,
            moduleTitle: e.module_title,
            exercises: (e.exercises as unknown as ModuleExercises['exercises']) || [],
          };
        });

        // Load quizzes for this course
        const { data: quizzesData } = await supabase
          .from('module_quizzes')
          .select('*')
          .eq('course_id', course.id);

        const quizzesMap: Record<string, ModuleQuiz> = {};
        (quizzesData || []).forEach((q) => {
          quizzesMap[q.module_id] = {
            moduleId: q.module_id,
            moduleTitle: q.module_title,
            questions: (q.questions as unknown as ModuleQuiz['questions']) || [],
          };
        });

        // Load audio from module_scripts
        const audioMap: Record<string, ModuleAudio> = {};
        (scriptsData || []).forEach((s) => {
          if (s.audio_url) {
            audioMap[s.module_id] = {
              moduleId: s.module_id,
              audioUrl: s.audio_url,
              duration: 0,
              slideTiming: [],
            };
          }
        });

        // Parse the JSONB fields properly
        const titleSuggestions = Array.isArray(course.title_suggestions) 
          ? course.title_suggestions as unknown as TitleSuggestion[]
          : [];
        
        const settings = course.settings as unknown as CourseSettings || initialSettings;
        const outline = course.outline as unknown as CourseOutline | null;

        // Load Presenton state from course record
        const presentonState: import('@/types/course').PresentonState = {
          taskId: (course as any).presenton_task_id || null,
          status: (course as any).presenton_status || 'idle',
          progress: (course as any).presenton_progress || 0,
          downloadUrl: (course as any).presenton_download_url || null,
          editUrl: (course as any).presenton_edit_url || null,
          generationHistory: Array.isArray((course as any).presenton_generation_history) 
            ? (course as any).presenton_generation_history 
            : [],
        };

        setState(prev => ({
          ...prev,
          title: course.title,
          selectedTitleId: course.selected_title_id,
          titleSuggestions,
          settings,
          outline,
          currentStep: course.current_step as WorkflowStep,
          scripts,
          slides: slidesMap,
          exercises: exercisesMap,
          quizzes: quizzesMap,
          moduleAudio: audioMap,
          presenton: presentonState,
          completedSteps: getCompletedSteps(course.current_step as WorkflowStep),
        }));
      }
    } catch (error) {
      console.error('Error loading course:', error);
    }
  };

  const getCompletedSteps = (currentStep: WorkflowStep): WorkflowStep[] => {
    const steps: WorkflowStep[] = ['mode', 'title', 'outline', 'script', 'slides', 'exercises', 'quiz', 'voice', 'video', 'upload'];
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

  const saveSlides = async (moduleId: string, slides: Slide[]) => {
    if (!user || !courseId) return;

    try {
      // Delete existing slides for this module first
      await supabase
        .from('slides')
        .delete()
        .eq('course_id', courseId)
        .eq('module_id', moduleId);

      // Insert new slides
      const insertData = slides.map((slide) => ({
        course_id: courseId,
        module_id: moduleId,
        slide_number: slide.slideNumber,
        title: slide.title,
        content: slide.content,
        speaker_notes: slide.speakerNotes,
        layout: slide.layout,
        background_color: slide.backgroundColor || null,
        image_url: slide.imageUrl || null,
        image_source: slide.imageSource || null,
        image_attribution: slide.imageAttribution || null,
      }));

      if (insertData.length > 0) {
        await supabase.from('slides').insert(insertData);
      }
      
      console.log(`Saved ${slides.length} slides for module ${moduleId}`);
    } catch (error) {
      console.error('Error saving slides:', error);
    }
  };

  const savePresentonState = async (presentonUpdates: Partial<import('@/types/course').PresentonState>) => {
    if (!user || !courseId) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      
      if (presentonUpdates.taskId !== undefined) dbUpdates.presenton_task_id = presentonUpdates.taskId;
      if (presentonUpdates.status !== undefined) dbUpdates.presenton_status = presentonUpdates.status;
      if (presentonUpdates.progress !== undefined) dbUpdates.presenton_progress = presentonUpdates.progress;
      if (presentonUpdates.downloadUrl !== undefined) dbUpdates.presenton_download_url = presentonUpdates.downloadUrl;
      if (presentonUpdates.editUrl !== undefined) dbUpdates.presenton_edit_url = presentonUpdates.editUrl;
      if (presentonUpdates.generationHistory !== undefined) {
        dbUpdates.presenton_generation_history = JSON.parse(JSON.stringify(presentonUpdates.generationHistory));
      }

      await supabase
        .from('courses')
        .update(dbUpdates)
        .eq('id', courseId);

      // Update local state
      setState(prev => ({
        ...prev,
        presenton: {
          ...prev.presenton,
          ...presentonUpdates,
        },
      }));
      
      console.log('Saved Presenton state:', presentonUpdates);
    } catch (error) {
      console.error('Error saving Presenton state:', error);
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

      if (error) {
        // Check if it's a FunctionsHttpError with response body
        if (error.message?.includes('402') || data?.error?.includes('credits')) {
          throw new Error('AI-krediter slut. Vänligen fyll på krediter för att fortsätta.');
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.error.includes('402')) {
          throw new Error('AI-krediter slut. Vänligen fyll på krediter för att fortsätta.');
        }
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
      // Mark the step we're leaving as completed so progress isn't lost when jumping around
      saveCourse({ current_step: step });
      return {
        ...prev,
        completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        currentStep: step,
      };
    });
  }, []);

  const completeStep = useCallback((step: WorkflowStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      // Determine steps based on project mode
      const courseSteps: WorkflowStep[] = ['mode', 'title', 'outline', 'script', 'slides', 'exercises', 'quiz', 'voice', 'video', 'upload'];
      const presentationSteps: WorkflowStep[] = ['mode', 'title', 'slides', 'upload'];
      
      const steps = prev.settings.projectMode === 'presentation' ? presentationSteps : courseSteps;
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

  const saveExercises = async (moduleId: string, moduleExercises: ModuleExercises) => {
    if (!user || !courseId) return;

    try {
      const insertData = {
        course_id: courseId,
        module_id: moduleId,
        module_title: moduleExercises.moduleTitle,
        exercises: JSON.parse(JSON.stringify(moduleExercises.exercises)),
      };

      await supabase
        .from('module_exercises')
        .upsert(insertData, { onConflict: 'course_id,module_id' });

      console.log(`Saved exercises for module ${moduleId}`);
    } catch (error) {
      console.error('Error saving exercises:', error);
    }
  };

  const saveQuiz = async (moduleId: string, quiz: ModuleQuiz) => {
    if (!user || !courseId) return;

    try {
      const insertData = {
        course_id: courseId,
        module_id: moduleId,
        module_title: quiz.moduleTitle,
        questions: JSON.parse(JSON.stringify(quiz.questions)),
      };

      await supabase
        .from('module_quizzes')
        .upsert(insertData, { onConflict: 'course_id,module_id' });

      console.log(`Saved quiz for module ${moduleId}`);
    } catch (error) {
      console.error('Error saving quiz:', error);
    }
  };

  const saveAudio = async (moduleId: string, audioUrl: string, voiceId?: string) => {
    if (!user || !courseId) return;

    try {
      await supabase
        .from('module_scripts')
        .update({ audio_url: audioUrl, voice_id: voiceId || null })
        .eq('course_id', courseId)
        .eq('module_id', moduleId);

      console.log(`Saved audio for module ${moduleId}`);
    } catch (error) {
      console.error('Error saving audio:', error);
    }
  };

  const addQuiz = useCallback((moduleId: string, quiz: ModuleQuiz) => {
    setState(prev => ({
      ...prev,
      quizzes: {
        ...prev.quizzes,
        [moduleId]: quiz,
      },
    }));
    
    // Persist to database
    saveQuiz(moduleId, quiz);
    saveCourse({ current_step: 'quiz' });
  }, [courseId]);

  const addExercises = useCallback((moduleId: string, moduleExercises: ModuleExercises) => {
    setState(prev => ({
      ...prev,
      exercises: {
        ...prev.exercises,
        [moduleId]: moduleExercises,
      },
    }));
    
    // Persist to database
    saveExercises(moduleId, moduleExercises);
    saveCourse({ current_step: 'exercises' });
  }, [courseId]);

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
    
    const isDemoMode = effectiveDemoMode?.enabled || false;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-outline', {
        body: { 
          title: state.title,
          targetDuration: isDemoMode ? 5 : state.settings.targetDuration, // Very short for demo
          style: state.settings.style,
          language: state.settings.language,
          maxModules: isDemoMode ? effectiveDemoMode.maxModules : state.settings.structureLimits?.maxModules,
          demoMode: isDemoMode,
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
    
    const isDemoMode = effectiveDemoMode?.enabled || false;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { 
          module: isDemoMode ? { ...module, duration: 2 } : module, // Shorter module duration for demo
          courseTitle: state.title,
          style: state.settings.style,
          language: state.settings.language,
          enableResearch: isDemoMode ? false : state.settings.enableResearch, // Skip research in demo for speed
          demoMode: isDemoMode,
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
    
    const isDemoMode = effectiveDemoMode?.enabled || false;
    
    try {
      const scriptText = script.sections.map(s => s.content).join('\n\n');
      
      const { data, error } = await supabase.functions.invoke('generate-slides', {
        body: {
          script: scriptText,
          moduleTitle: script.moduleTitle,
          courseTitle: state.title,
          language: state.settings.language,
          maxSlides: isDemoMode ? effectiveDemoMode.maxSlides : undefined,
          demoMode: isDemoMode,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      let slides: Slide[] = data.slides.map((slide: any) => ({
        moduleId,
        slideNumber: slide.slideNumber,
        title: slide.title,
        content: slide.content,
        speakerNotes: slide.speakerNotes,
        layout: slide.layout,
        suggestedImageQuery: slide.suggestedImageQuery,
        backgroundColor: slide.suggestedBackgroundColor,
        // Auto-assigned images from stock photo search
        imageUrl: slide.imageUrl,
        imageSource: slide.imageSource,
        imageAttribution: slide.imageAttribution,
      }));
      
      // Limit slides in demo mode
      if (isDemoMode && effectiveDemoMode?.maxSlides) {
        slides = slides.slice(0, effectiveDemoMode.maxSlides);
      }

      setState(prev => ({
        ...prev,
        slides: {
          ...prev.slides,
          [moduleId]: slides,
        },
        isProcessing: false,
      }));

      // Save slides to database
      await saveSlides(moduleId, slides);
      await saveCourse({ current_step: 'slides' });

      toast.success(`Slides för "${script.moduleTitle}" skapade!${isDemoMode ? ` (begränsat till ${slides.length} slides i demoläge)` : ''}`);
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
  }, [state.title, state.settings]);

  const updateSlide = useCallback((moduleId: string, slideIndex: number, updates: Partial<Slide>) => {
    setState(prev => {
      const moduleSlides = [...(prev.slides[moduleId] || [])];
      if (moduleSlides[slideIndex]) {
        moduleSlides[slideIndex] = { ...moduleSlides[slideIndex], ...updates };
      }
      
      // Save all slides for this module to database
      saveSlides(moduleId, moduleSlides);
      
      return {
        ...prev,
        slides: {
          ...prev.slides,
          [moduleId]: moduleSlides,
        },
      };
    });
  }, [courseId]);

  // Set all slides for a module (used by Presenton integration)
  const setModuleSlides = useCallback((moduleId: string, slides: Slide[]) => {
    setState(prev => ({
      ...prev,
      slides: {
        ...prev.slides,
        [moduleId]: slides,
      },
    }));
    
    // Save to database
    saveSlides(moduleId, slides);
    saveCourse({ current_step: 'slides' });
  }, [courseId]);

  const generateModuleAudio = useCallback(async (moduleId: string, script: ModuleScript, audioUrl?: string) => {
    const audio: ModuleAudio = {
      moduleId,
      audioUrl: audioUrl || '',
      duration: script.estimatedDuration * 60,
      slideTiming: [],
    };
    
    setState(prev => ({
      ...prev,
      moduleAudio: {
        ...prev.moduleAudio,
        [moduleId]: audio,
      },
    }));
    
    // Persist audio URL to database if provided
    if (audioUrl) {
      await saveAudio(moduleId, audioUrl, state.settings.voiceId);
      await saveCourse({ current_step: 'voice' });
    }
  }, [courseId, state.settings.voiceId]);

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
    isAdminDemoMode, // Expose admin demo mode status
    effectiveDemoMode, // Expose effective demo limits
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
    setModuleSlides,
    updateSettings,
    generateModuleAudio,
    updateVideoSettings,
    addQuiz,
    addExercises,
    addSummary,
    startNewCourse,
    handleContentUploaded,
    clearUploadedContent,
    savePresentonState,
  };
}

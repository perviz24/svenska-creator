/**
 * Course Persistence Hook
 * Handles all database operations for course data
 */
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import {
  CourseSettings,
  CourseOutline,
  TitleSuggestion,
  ModuleScript,
  Slide,
  ModuleExercises,
  ModuleQuiz,
  WorkflowStep,
  PresentonState,
} from '@/types/course';

interface CourseRecord {
  id: string;
  title: string;
  selected_title_id: string | null;
  title_suggestions: TitleSuggestion[];
  settings: CourseSettings;
  outline: CourseOutline | null;
  current_step: WorkflowStep;
}

export function useCoursePersistence(courseId: string | null) {
  const { user } = useAuth();

  const saveCourse = useCallback(async (updates: Partial<CourseRecord>): Promise<string | null> => {
    if (!user) return null;

    try {
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
        await supabase
          .from('courses')
          .update(dbUpdates)
          .eq('id', courseId);
        return courseId;
      } else {
        const insertData = {
          user_id: user.id,
          title: updates.title || '',
          selected_title_id: updates.selected_title_id || null,
          title_suggestions: JSON.parse(JSON.stringify(updates.title_suggestions || [])) as Json,
          settings: JSON.parse(JSON.stringify(updates.settings || {})) as Json,
          outline: updates.outline ? JSON.parse(JSON.stringify(updates.outline)) as Json : null,
          current_step: updates.current_step || 'title',
        };

        const { data, error } = await supabase
          .from('courses')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data?.id || null;
      }
    } catch (error) {
      console.error('Error saving course:', error);
      return null;
    }
  }, [user, courseId]);

  const saveScript = useCallback(async (script: ModuleScript, audioUrl?: string, voiceId?: string) => {
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
        .upsert(insertData, { onConflict: 'course_id,module_id' });
    } catch (error) {
      console.error('Error saving script:', error);
    }
  }, [user, courseId]);

  const saveSlides = useCallback(async (moduleId: string, slides: Slide[]) => {
    if (!user || !courseId) return;

    try {
      await supabase
        .from('slides')
        .delete()
        .eq('course_id', courseId)
        .eq('module_id', moduleId);

      const insertData = slides.map((slide) => {
        const bulletText = (slide.bulletPoints && slide.bulletPoints.length > 0)
          ? slide.bulletPoints.map((p) => `• ${p}`.trim()).join('\n')
          : '';

        const normalizedContent = slide.content?.trim()
          ? slide.content
          : bulletText;

        return {
          course_id: courseId,
          module_id: moduleId,
          slide_number: slide.slideNumber,
          title: slide.title,
          content: normalizedContent,
          speaker_notes: slide.speakerNotes,
          layout: slide.layout,
          background_color: slide.backgroundColor || null,
          image_url: slide.imageUrl || null,
          image_source: slide.imageSource || null,
          image_attribution: slide.imageAttribution || null,
        };
      });

      if (insertData.length > 0) {
        await supabase.from('slides').insert(insertData);
      }
    } catch (error) {
      console.error('Error saving slides:', error);
    }
  }, [user, courseId]);

  const saveExercises = useCallback(async (moduleId: string, moduleExercises: ModuleExercises) => {
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
    } catch (error) {
      console.error('Error saving exercises:', error);
    }
  }, [user, courseId]);

  const saveQuiz = useCallback(async (moduleId: string, quiz: ModuleQuiz) => {
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
    } catch (error) {
      console.error('Error saving quiz:', error);
    }
  }, [user, courseId]);

  const saveAudio = useCallback(async (moduleId: string, audioUrl: string, voiceId?: string) => {
    if (!user || !courseId) return;

    try {
      await supabase
        .from('module_scripts')
        .update({ audio_url: audioUrl, voice_id: voiceId || null })
        .eq('course_id', courseId)
        .eq('module_id', moduleId);
    } catch (error) {
      console.error('Error saving audio:', error);
    }
  }, [user, courseId]);

  const savePresentonState = useCallback(async (presentonUpdates: Partial<PresentonState>) => {
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
    } catch (error) {
      console.error('Error saving Presenton state:', error);
    }
  }, [user, courseId]);

  return {
    saveCourse,
    saveScript,
    saveSlides,
    saveExercises,
    saveQuiz,
    saveAudio,
    savePresentonState,
  };
}

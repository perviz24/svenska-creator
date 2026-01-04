/**
 * Course Generation Hook
 * Handles all AI-powered content generation for courses
 */
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  generateSlides as generateSlidesAPI,
  generateTitles as generateTitlesAPI,
  generateOutline as generateOutlineAPI,
  generateScript as generateScriptAPI,
} from '@/lib/courseApi';
import {
  TitleSuggestion,
  CourseOutline,
  CourseSettings,
  ModuleScript,
  Slide,
  DemoModeSettings,
} from '@/types/course';

interface ScriptGenerationResponse {
  module_id: string;
  module_title: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    slide_markers: string[];
  }>;
  total_words: number;
  estimated_duration: number;
  citations: string[];
}

interface GenerationCallbacks {
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
  onError: (message: string) => void;
}

export function useCourseGeneration(
  settings: CourseSettings,
  effectiveDemoMode: DemoModeSettings | undefined,
  callbacks: GenerationCallbacks
) {
  const { onProcessingStart, onProcessingEnd, onError } = callbacks;
  const isDemoMode = effectiveDemoMode?.enabled || false;

  const generateTitleSuggestions = useCallback(async (
    title: string
  ): Promise<TitleSuggestion[]> => {
    if (!title.trim()) {
      toast.error('Ange en kurstitel först');
      return [];
    }

    onProcessingStart();
    
    try {
      const data = await generateTitlesAPI({
        title,
        language: settings.language || 'sv'
      });

      toast.success('Titelförslag genererade!');
      return data.suggestions || [];
    } catch (error) {
      console.error('Error generating titles:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera titelförslag';
      onError(message);
      toast.error(message);
      return [];
    } finally {
      onProcessingEnd();
    }
  }, [settings.language, onProcessingStart, onProcessingEnd, onError]);

  const generateOutline = useCallback(async (
    title: string
  ): Promise<CourseOutline | null> => {
    if (!title.trim()) {
      toast.error('Välj en titel först');
      return null;
    }

    onProcessingStart();
    
    try {
      const data = await generateOutlineAPI({
        title,
        num_modules: isDemoMode ? (effectiveDemoMode?.maxModules || 1) : (settings.structureLimits?.maxModules || 5),
        language: settings.language || 'sv',
        additional_context: undefined,
      });

      const outline: CourseOutline = {
        title,
        description: `Generated course outline for: ${title}`,
        totalDuration: data.total_duration,
        modules: data.modules.map((m, index) => ({
          id: m.id,
          number: index + 1,
          title: m.title,
          description: m.description,
          duration: m.estimated_duration,
          learningObjectives: m.key_topics.map((topic, i) => ({
            id: `obj-${m.id}-${i}`,
            text: topic,
          })),
          subTopics: [],
        })),
      };

      toast.success('Kursöversikt genererad!');
      return outline;
    } catch (error) {
      console.error('Error generating outline:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera kursöversikt';
      onError(message);
      toast.error(message);
      return null;
    } finally {
      onProcessingEnd();
    }
  }, [settings, isDemoMode, effectiveDemoMode, onProcessingStart, onProcessingEnd, onError]);

  const generateScript = useCallback(async (
    module: { id: string; title: string; description?: string; duration?: number },
    courseTitle: string
  ): Promise<ModuleScript | null> => {
    onProcessingStart();
    
    try {
      const data: ScriptGenerationResponse = await generateScriptAPI({
        module_title: module.title,
        module_description: module.description || '',
        course_title: courseTitle,
        language: settings.language || 'sv',
        target_duration: isDemoMode ? 2 : (module.duration || 10),
        tone: settings.style || 'professional',
        additional_context: undefined,
      });

      const script: ModuleScript = {
        moduleId: data.module_id || module.id,
        moduleTitle: data.module_title || module.title,
        sections: data.sections.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          slideMarkers: s.slide_markers,
        })),
        estimatedDuration: data.estimated_duration,
        totalWords: data.total_words,
        citations: data.citations || [],
      };

      toast.success(`Manus för "${module.title}" genererat!`);
      return script;
    } catch (error) {
      console.error('Error generating script:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera manus';
      onError(message);
      toast.error(message);
      return null;
    } finally {
      onProcessingEnd();
    }
  }, [settings, isDemoMode, effectiveDemoMode, onProcessingStart, onProcessingEnd, onError]);

  const generateSlides = useCallback(async (
    script: ModuleScript,
    courseTitle: string
  ): Promise<Slide[]> => {
    onProcessingStart();
    
    try {
      const scriptContent = script.sections.map(s => `${s.title}\n${s.content}`).join('\n\n');
      
      const data = await generateSlidesAPI({
        script_content: scriptContent,
        module_title: script.moduleTitle,
        course_title: courseTitle,
        num_slides: isDemoMode ? effectiveDemoMode?.maxSlides || 3 : 10,
        language: settings.language || 'sv',
        tone: settings.style || 'professional',
        verbosity: 'standard',
      });

      let slides: Slide[] = data.slides.map((slide: any) => {
        const bulletPoints = Array.isArray(slide.bulletPoints)
          ? slide.bulletPoints.filter(Boolean)
          : undefined;

        const normalizedContent =
          (slide.content && String(slide.content).trim())
            ? String(slide.content)
            : (bulletPoints && bulletPoints.length > 0)
              ? bulletPoints.map((p: string) => `• ${p}`.trim()).join('\n')
              : '';

        return {
          moduleId: script.moduleId,
          slideNumber: slide.slide_number || slide.slideNumber,
          title: slide.title,
          subtitle: slide.subtitle,
          content: normalizedContent,
          bulletPoints,
          keyTakeaway: slide.keyTakeaway,
          speakerNotes: slide.speaker_notes || slide.speakerNotes,
          layout: slide.layout,
          suggestedImageQuery: slide.suggested_image_query || slide.suggestedImageQuery,
          iconSuggestion: slide.iconSuggestion,
          visualType: slide.visualType,
          backgroundColor: slide.suggestedBackgroundColor,
          imageUrl: slide.image_url || slide.imageUrl,
          imageSource: slide.image_source || slide.imageSource,
          imageAttribution: slide.image_attribution || slide.imageAttribution,
        };
      });
      
      if (isDemoMode && effectiveDemoMode?.maxSlides) {
        slides = slides.slice(0, effectiveDemoMode.maxSlides);
      }

      toast.success(`Slides för "${script.moduleTitle}" skapade!${isDemoMode ? ` (begränsat till ${slides.length} slides i demoläge)` : ''}`);
      return slides;
    } catch (error) {
      console.error('Error generating slides:', error);
      const message = error instanceof Error ? error.message : 'Kunde inte generera slides';
      onError(message);
      toast.error(message);
      return [];
    } finally {
      onProcessingEnd();
    }
  }, [settings, isDemoMode, effectiveDemoMode, onProcessingStart, onProcessingEnd, onError]);

  return {
    generateTitleSuggestions,
    generateOutline,
    generateScript,
    generateSlides,
  };
}

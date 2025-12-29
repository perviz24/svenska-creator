export interface TitleSuggestion {
  id: string;
  title: string;
  explanation: string;
}

export interface LearningObjective {
  id: string;
  text: string;
}

export interface SubTopic {
  id: string;
  title: string;
  duration: number; // in minutes
}

export interface Module {
  id: string;
  number: number;
  title: string;
  description: string;
  duration: number; // in minutes
  learningObjectives: LearningObjective[];
  subTopics: SubTopic[];
}

export interface CourseOutline {
  title: string;
  description: string;
  totalDuration: number; // in minutes
  modules: Module[];
}

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  slideMarkers: string[];
}

export interface ModuleScript {
  moduleId: string;
  moduleTitle: string;
  totalWords: number;
  estimatedDuration: number;
  citations: string[];
  sections: ScriptSection[];
}

export type SlideLayout = 'title' | 'title-content' | 'two-column' | 'image-focus' | 'quote' | 'bullet-points';

export interface Slide {
  id?: string;
  courseId?: string;
  moduleId: string;
  slideNumber: number;
  title: string;
  content: string;
  speakerNotes: string;
  layout: SlideLayout;
  imageUrl?: string;
  imageSource?: 'unsplash' | 'pexels' | 'shutterstock' | 'adobe' | 'getty' | 'ai-generated';
  imageAttribution?: string;
  suggestedImageQuery?: string;
  backgroundColor?: string;
}

export interface StockPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl?: string;
  source: string;
  attribution: string;
  downloadUrl?: string;
}

export interface StockProviderSettings {
  shutterstock?: { apiKey: string; apiSecret: string; enabled: boolean };
  adobe?: { apiKey: string; enabled: boolean };
  getty?: { apiKey: string; enabled: boolean };
}

export interface CourseSettings {
  voiceId: string;
  voiceName: string;
  targetDuration: number; // in minutes
  style: 'professional' | 'conversational' | 'academic';
  includeQuizzes: boolean;
  enableResearch: boolean;
  language: 'sv' | 'en';
  stockProviders?: StockProviderSettings;
  aiQualityMode: 'fast' | 'quality'; // fast = flash models, quality = pro/gpt-5 models
}

export interface ModuleAudio {
  moduleId: string;
  audioUrl: string;
  duration: number; // in seconds
  slideTiming: number[]; // timestamps for each slide transition
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ModuleQuiz {
  moduleId: string;
  moduleTitle: string;
  questions: QuizQuestion[];
}

export interface ExerciseSection {
  sectionTitle: string;
  sectionType: 'checkbox-list' | 'numbered-list' | 'free-text' | 'ranking' | 'description';
  description?: string;
  items?: string[];
  includeOther?: boolean;
}

export interface ExercisePart {
  partNumber: number;
  partTitle: string;
  sections: ExerciseSection[];
}

export interface Exercise {
  id: string;
  title: string;
  purpose: string;
  type: 'checklist' | 'reflection' | 'practical' | 'case-study' | 'self-assessment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  parts: ExercisePart[];
  learningObjectives: string[];
  footer?: string;
}

export interface ModuleExercises {
  moduleId: string;
  moduleTitle: string;
  exercises: Exercise[];
}

export interface ModuleSummary {
  moduleId: string;
  moduleTitle: string;
  briefSummary: string;
  keyPoints: string[];
  keyConcepts: { term: string; definition: string }[];
  actionItems?: string[];
}

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
  preview_video_url?: string;
  gender?: string;
  type?: 'public' | 'private';
}

export interface VideoSettings {
  avatarId?: string;
  avatarName?: string;
  videoStyle: 'presentation' | 'avatar';
}

export type WorkflowStep = 
  | 'title'
  | 'outline'
  | 'script'
  | 'slides'
  | 'exercises'
  | 'quiz'
  | 'voice'
  | 'video'
  | 'upload';

export interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  title: string;
  selectedTitleId: string | null;
  titleSuggestions: TitleSuggestion[];
  outline: CourseOutline | null;
  scripts: ModuleScript[];
  slides: Record<string, Slide[]>; // moduleId -> slides
  exercises: Record<string, ModuleExercises>; // moduleId -> exercises
  quizzes: Record<string, ModuleQuiz>; // moduleId -> quiz
  summaries: Record<string, ModuleSummary>; // moduleId -> summary
  moduleAudio: Record<string, ModuleAudio>; // moduleId -> audio
  videoSettings: VideoSettings;
  settings: CourseSettings;
  isProcessing: boolean;
  error: string | null;
}

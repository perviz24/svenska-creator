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

export interface CourseSettings {
  voiceId: string;
  voiceName: string;
  targetDuration: number; // in minutes
  style: 'professional' | 'conversational' | 'academic';
  includeQuizzes: boolean;
  enableResearch: boolean;
  language: 'sv' | 'en';
}

export type WorkflowStep = 
  | 'title'
  | 'outline'
  | 'script'
  | 'slides'
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
  settings: CourseSettings;
  isProcessing: boolean;
  error: string | null;
}

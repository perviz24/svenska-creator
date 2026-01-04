/**
 * Content Enhancement API Client
 * Handles exercises, quizzes, and AI-powered content improvements
 */

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// Exercise Generation
// ============================================================================

export interface ExerciseGenerationRequest {
  module_title: string;
  module_content: string;
  course_title: string;
  num_exercises?: number;
  difficulty?: string;
  language?: string;
}

export interface Exercise {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

export interface ExerciseGenerationResponse {
  exercises: Exercise[];
  total_points: number;
}

export async function generateExercises(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/exercises/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ============================================================================
// Quiz Generation
// ============================================================================

export interface QuizGenerationRequest {
  module_title: string;
  module_content: string;
  course_title: string;
  num_questions?: number;
  include_multiple_choice?: boolean;
  include_true_false?: boolean;
  language?: string;
}

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  points: number;
  difficulty: string;
}

export interface QuizGenerationResponse {
  quiz_title: string;
  questions: QuizQuestion[];
  total_points: number;
  passing_score: number;
}

export async function generateQuiz(request: QuizGenerationRequest): Promise<QuizGenerationResponse> {
  const response = await fetch(`${BACKEND_URL}/api/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ============================================================================
// Slide Enhancement
// ============================================================================

export interface SlideEnhancementRequest {
  slide_title: string;
  slide_content: string;
  enhancement_type: string;
  language?: string;
}

export interface SlideEnhancementResponse {
  enhanced_content: string;
  suggestions: string[];
  improved_title?: string;
}

export async function enhanceSlide(request: SlideEnhancementRequest): Promise<SlideEnhancementResponse> {
  const response = await fetch(`${BACKEND_URL}/api/slides/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return await response.json();
}

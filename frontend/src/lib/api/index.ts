/**
 * Unified API Client Exports
 * 
 * This file consolidates all API client exports for cleaner imports.
 * Instead of importing from multiple files, you can now import from '@/lib/api'
 * 
 * @example
 * import { generateTitles, searchPhotos, listHeyGenAvatars } from '@/lib/api';
 */

// ============================================================================
// Course Generation APIs
// ============================================================================
export {
  generateTitles,
  generateOutline,
  generateScript,
  generateSlides,
  type TitleGenerationRequest,
  type TitleGenerationResponse,
  type TitleSuggestion,
  type OutlineGenerationRequest,
  type OutlineGenerationResponse,
  type ModuleItem,
  type ScriptGenerationRequest,
  type ScriptGenerationResponse,
  type ScriptSection,
  type SlideGenerationRequest,
  type SlideGenerationResponse,
  type SlideContent,
} from '../courseApi';

// ============================================================================
// Content Enhancement APIs (Quiz, Exercise, Slide Enhancement)
// ============================================================================
export {
  generateExercises,
  generateQuiz,
  enhanceSlide,
  type ExerciseGenerationRequest,
  type ExerciseGenerationResponse,
  type Exercise,
  type QuizGenerationRequest,
  type QuizGenerationResponse,
  type QuizQuestion,
  type SlideEnhancementRequest,
  type SlideEnhancementResponse,
} from '../contentApi';

// ============================================================================
// Media APIs (Stock Photos & Videos)
// ============================================================================
export {
  searchPhotos,
  searchVideos,
  type StockPhoto,
  type StockVideo,
  type PhotoSearchResponse,
  type VideoSearchResponse,
} from '../mediaApi';

// ============================================================================
// Voice APIs (ElevenLabs TTS)
// ============================================================================
export {
  listElevenLabsVoices,
  generateVoice,
  estimateAudioDuration,
  type Voice,
  type VoiceGenerationRequest,
  type DurationEstimate,
} from '../voiceApi';

// ============================================================================
// Video APIs (HeyGen & Bunny.net)
// ============================================================================
export {
  listHeyGenAvatars,
  generateHeyGenVideo,
  checkHeyGenVideoStatus,
  listBunnyVideos,
  type Avatar,
  type VideoGenerationRequest,
  type VideoGenerationResponse,
  type VideoStatusResponse,
  type BunnyVideo,
} from '../videoApi';

// ============================================================================
// Export APIs (PPTX, Word)
// ============================================================================
export {
  exportSlides,
  exportWord,
  downloadBlob,
  type ExportSlide,
  type ExportSlidesRequest,
  type ExportWordSection,
  type ExportWordRequest,
} from '../exportApi';

// ============================================================================
// AI Utility APIs (Review, Translate, Analyze)
// ============================================================================
export {
  aiReviewEdit,
  translateContent,
  analyzeCourseStructure,
  recommendModel,
  analyzeManuscript,
  recommendResearchMode,
  getSystemDiagnostics,
  type AIReviewRequest,
  type AIReviewResponse,
  type TranslateRequest,
  type TranslateResponse,
  type AnalyzeStructureRequest,
  type RecommendModelRequest,
} from '../aiApi';

// ============================================================================
// Document APIs
// ============================================================================
export {
  parseDocument,
  parseTextContent,
  fileToBase64,
  getFileType,
  type ParseDocumentRequest,
  type ParseDocumentResponse,
} from '../documentApi';

// ============================================================================
// Research APIs
// ============================================================================
export {
  scrapeUrls,
  researchTopic,
  type ScrapeResult,
  type ScrapeResponse,
  type ResearchRequest,
  type ResearchResponse,
} from '../researchApi';

// ============================================================================
// Presenton APIs
// ============================================================================
export {
  generatePresentonPresentation,
  checkPresentonStatus,
} from '../presentonApi';

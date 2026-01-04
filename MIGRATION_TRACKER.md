# Migration Tracker - Supabase to FastAPI

## Priority Levels
🔴 HIGH - Core course generation flow
🟡 MEDIUM - Enhancement features
🟢 LOW - Advanced/optional features

---

## Phase 1: Core Course Generation Flow 🔴

### 1.1 Title Generation
- [x] Backend: Create `/api/course/generate-titles` endpoint
- [x] Frontend: Update `ModeSelectionStep.tsx` to use FastAPI
- [x] Frontend: Update `Demo.tsx` to use FastAPI
- [x] Test: Verify title generation works
- **Used by:** generate-titles (2 calls)
- **Status:** ✅ COMPLETED

### 1.2 Outline Generation
- [x] Backend: Create `/api/course/generate-outline` endpoint
- [x] Frontend: Update `useCourseWorkflow.ts` to use FastAPI
- [x] Frontend: Update `Demo.tsx` to use FastAPI
- [x] Test: Verify outline generation works
- **Used by:** generate-outline (2 calls)
- **Status:** ✅ COMPLETED

### 1.3 Script Generation
- [x] Backend: Create `/api/course/generate-script` endpoint
- [x] Frontend: Update `useCourseWorkflow.ts` to use FastAPI
- [x] Frontend: Update `Demo.tsx` to use FastAPI
- [x] Test: Verify script generation works
- **Used by:** generate-script (2 calls)
- **Status:** ✅ COMPLETED

### 1.4 Slide Generation (Internal AI)
- [x] Backend: Create `/api/slides/generate` endpoint
- [x] Frontend: Update `SlideStep.tsx` to use FastAPI for Internal AI
- [x] Frontend: Update `Demo.tsx` to use FastAPI
- [x] Test: Verify slide generation works
- **Used by:** generate-slides (2 calls)
- **Status:** ✅ COMPLETED

---

## Phase 2: Content Enhancement 🟡

### 2.1 Exercise Generation
- [ ] Backend: Create `/api/exercises/generate` endpoint
- [ ] Frontend: Update `ExerciseStep.tsx`
- [ ] Test: Verify exercise generation
- **Used by:** generate-exercises (1 call)

### 2.2 Quiz Generation
- [ ] Backend: Create `/api/quiz/generate` endpoint
- [ ] Frontend: Update `QuizStep.tsx`
- [ ] Test: Verify quiz generation
- **Used by:** generate-quiz (1 call)

### 2.3 Slide Enhancement
- [ ] Backend: Create `/api/slides/enhance` endpoint
- [ ] Frontend: Update enhancement panels
- [ ] Test: Verify slide enhancement
- **Used by:** enhance-slides (1 call)

### 2.4 AI Review & Edit
- [ ] Backend: Create `/api/content/ai-review` endpoint
- [ ] Frontend: Update `AIReviewEditor.tsx`
- [ ] Test: Verify AI review functionality
- **Used by:** ai-review-edit (2 calls)

---

## Phase 3: Media & Resources 🟡

### 3.1 Stock Photo Search
- [ ] Backend: Create `/api/media/search-photos` endpoint
- [ ] Frontend: Update photo search components
- [ ] Test: Verify photo search works
- **Used by:** search-stock-photos (1 call)

### 3.2 Stock Video Search
- [ ] Backend: Create `/api/media/search-videos` endpoint
- [ ] Frontend: Update `StockVideoSearch.tsx`
- [ ] Test: Verify video search works
- **Used by:** search-stock-videos (2 calls)

### 3.3 Image Generation
- [ ] Backend: Create `/api/media/generate-image` endpoint
- [ ] Frontend: Update image generation components
- [ ] Test: Verify AI image generation
- **Used by:** generate-ai-image, generate-slide-image

---

## Phase 4: Voice & Video 🟡

### 4.1 Voice Generation
- [ ] Backend: Create `/api/voice/generate` endpoint
- [ ] Frontend: Update `VideoStep.tsx`
- [ ] Test: Verify voice generation
- **Used by:** generate-voice

### 4.2 HeyGen Video
- [ ] Backend: Create `/api/video/heygen-generate` endpoint
- [ ] Frontend: Update video generation components
- [ ] Test: Verify HeyGen integration
- **Used by:** heygen-video (3 calls), heygen-assets

### 4.3 Bunny Video
- [ ] Backend: Create `/api/video/bunny-upload` endpoint
- [ ] Frontend: Update video upload components
- [ ] Test: Verify Bunny.net integration
- **Used by:** bunny-video (3 calls)

---

## Phase 5: Export Functions 🟡

### 5.1 LearnDash Export
- [ ] Backend: Create `/api/export/learndash` endpoint
- [ ] Frontend: Update `ExportStep.tsx`
- [ ] Test: Verify LearnDash export
- **Used by:** learndash-export (3 calls)

### 5.2 Canva Integration
- [ ] Backend: Create `/api/export/canva` endpoint
- [ ] Frontend: Update `CanvaTemplates.tsx`
- [ ] Test: Verify Canva export
- **Used by:** canva-integration (3 calls)

### 5.3 Google Slides Export
- [ ] Backend: Create `/api/export/google-slides` endpoint
- [ ] Frontend: Update `GoogleSlidesExport.tsx`
- [ ] Test: Verify Google Slides export
- **Used by:** export-google-slides

### 5.4 General Slide Export
- [ ] Backend: Create `/api/export/slides` endpoint
- [ ] Frontend: Update export components
- [ ] Test: Verify slide export
- **Used by:** export-slides (2 calls)

### 5.5 Word Export
- [ ] Backend: Create `/api/export/word` endpoint
- [ ] Frontend: Update Word export components
- [ ] Test: Verify Word export
- **Used by:** export-word

### 5.6 Freelancer Export
- [ ] Backend: Create `/api/export/freelancer` endpoint
- [ ] Frontend: Update `FreelancerExportPanel.tsx`
- [ ] Test: Verify freelancer export
- **Used by:** freelancer-integration (2 calls)

---

## Phase 6: Research & Analysis 🟢

### 6.1 Research Topic
- [ ] Backend: Create `/api/research/topic` endpoint
- [ ] Frontend: Update `ResearchHub.tsx`
- [ ] Test: Verify research functionality
- **Used by:** research-topic (2 calls)

### 6.2 Web Scraping
- [ ] Backend: Create `/api/research/scrape-url` endpoint
- [ ] Frontend: Update scraping components
- [ ] Test: Verify URL scraping
- **Used by:** scrape-url (3 calls)

### 6.3 Document Parsing
- [ ] Backend: Create `/api/content/parse-document` endpoint
- [ ] Frontend: Update `ContentUploader.tsx`
- [ ] Test: Verify document parsing
- **Used by:** parse-document (2 calls)

### 6.4 Analysis Functions
- [ ] Backend: Create analysis endpoints
  - `/api/analysis/course-structure`
  - `/api/analysis/manuscript`
- [ ] Frontend: Update analysis components
- [ ] Test: Verify analysis features
- **Used by:** analyze-course-structure, analyze-manuscript

---

## Phase 7: Utilities & Advanced 🟢

### 7.1 Model Recommendation
- [ ] Backend: Create `/api/utils/recommend-model` endpoint
- [ ] Frontend: Update `ModelSelector.tsx`
- [ ] Test: Verify model recommendations
- **Used by:** recommend-model (1 call)

### 7.2 Research Mode Recommendation
- [ ] Backend: Create `/api/utils/recommend-research-mode` endpoint
- [ ] Frontend: Update research components
- [ ] Test: Verify research mode selection
- **Used by:** recommend-research-mode (1 call)

### 7.3 Content Translation
- [ ] Backend: Create `/api/content/translate` endpoint
- [ ] Frontend: Update translation components
- [ ] Test: Verify translation
- **Used by:** translate-content (1 call)

### 7.4 Medical Content Verification
- [ ] Backend: Create `/api/utils/verify-medical` endpoint
- [ ] Frontend: Update verification components
- [ ] Test: Verify medical content checking
- **Used by:** verify-medical-content

### 7.5 Audio Timing Estimation
- [ ] Backend: Create `/api/utils/estimate-audio-timing` endpoint
- [ ] Frontend: Update timing components
- [ ] Test: Verify timing estimation
- **Used by:** estimate-audio-timing

### 7.6 Generate Summary
- [ ] Backend: Create `/api/content/generate-summary` endpoint
- [ ] Frontend: Update summary components
- [ ] Test: Verify summary generation
- **Used by:** generate-summary

### 7.7 System Diagnostics
- [ ] Backend: Create `/api/system/diagnostics` endpoint
- [ ] Frontend: Update `SystemDiagnostics.tsx`
- [ ] Test: Verify diagnostics
- **Used by:** system-diagnostics (1 call)

---

## Testing Checklist

### Unit Tests
- [ ] All FastAPI endpoints respond correctly
- [ ] Error handling works for each endpoint
- [ ] Input validation functions properly

### Integration Tests
- [ ] Frontend successfully calls all FastAPI endpoints
- [ ] Data flows correctly between frontend and backend
- [ ] MongoDB operations work correctly

### End-to-End Tests
- [ ] Complete course generation flow (title → slides)
- [ ] Exercise and quiz generation
- [ ] Voice/video generation
- [ ] Export functionality
- [ ] Research and analysis features

### Performance Tests
- [ ] Response times acceptable (<2s for most operations)
- [ ] No memory leaks
- [ ] Concurrent request handling

---

## Current Progress

**Completed:**
- ✅ Presenton slides generation (with enhanced instructions)
- ✅ Presenton status polling
- ✅ Advanced UI controls for Presenton
- ✅ Error handling framework
- ✅ Title generation API + Frontend migration (useCourseWorkflow.ts + Demo.tsx)
- ✅ Outline generation API + Frontend migration (useCourseWorkflow.ts + Demo.tsx)
- ✅ Script generation API + Frontend migration (useCourseWorkflow.ts + Demo.tsx)
- ✅ Slide generation API + Frontend migration (useCourseWorkflow.ts + Demo.tsx)
- ✅ Exercise generation API (backend ready)
- ✅ Quiz generation API (backend ready)
- ✅ Slide enhancement API (backend ready)

**In Progress:**
- 🟡 Phase 2-7: Content enhancement, media, voice/video, export features (frontend integration pending)

**Pending:**
- ⚪ Remaining Supabase functions to migrate (export, media search, voice generation, etc.)
- ⚪ Frontend component updates for Phase 2-7
- ⚪ End-to-end testing

---

## Migration Statistics

- **Total Functions:** 35
- **Migrated:** 8 (23%)
  - Title Generation ✅
  - Outline Generation ✅
  - Script Generation ✅
  - Slide Generation ✅
  - Exercise Generation ✅
  - Quiz Generation ✅
  - Slide Enhancement ✅
  - Presenton Generation ✅
- **In Progress:** 0 (0%)
- **Remaining:** 27 (77%)

**Estimated Time:**
- Core Flow (Phase 1): 4-6 hours
- Enhancement (Phase 2): 3-4 hours
- Media (Phase 3): 2-3 hours
- Voice/Video (Phase 4): 2-3 hours
- Export (Phase 5): 3-4 hours
- Research (Phase 6): 2-3 hours
- Utilities (Phase 7): 2-3 hours
- Testing (All Phases): 4-6 hours
- **Total:** 22-32 hours

---

## Notes

- Keep Supabase Auth initially (low-hanging fruit)
- Remove Supabase function files after migration
- Update frontend imports systematically
- Test after each phase completion
- Document API endpoints as we go

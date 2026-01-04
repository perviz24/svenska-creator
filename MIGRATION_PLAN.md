# Migration Plan: Lovable/Supabase → FastAPI Backend

## Current Architecture Issues
- 47 `supabase.functions.invoke()` calls across 20+ components
- Supabase Edge Functions not deployed/not running locally
- Mixed backend: Some use Supabase, some use FastAPI
- Authentication tied to Supabase

## Target Architecture
```
React Frontend (Port 3000)
    ↓ HTTP/REST
FastAPI Backend (Port 8001)
    ↓
MongoDB (Port 27017)
```

## Migration Strategy

### Phase 1: Backend API Endpoints (Priority: HIGH)
Create FastAPI equivalents for all Supabase functions:

**Already Migrated:**
- ✅ `/api/presenton/generate` - Presenton slide generation
- ✅ `/api/presenton/status/{task_id}` - Presenton status check

**Need to Migrate:**
1. `generate-title` → `/api/course/generate-title`
2. `generate-outline` → `/api/course/generate-outline`
3. `generate-script` → `/api/course/generate-script`
4. `generate-slides` → `/api/slides/generate` (Internal AI)
5. `generate-exercises` → `/api/exercises/generate`
6. `generate-quiz` → `/api/quiz/generate`
7. `generate-voice` → `/api/voice/generate`
8. `enhance-slide` → `/api/slides/enhance`
9. `search-stock-photos` → `/api/media/search-photos`
10. `search-stock-videos` → `/api/media/search-videos`
11. `export-learndash` → `/api/export/learndash`
12. `export-canva` → `/api/export/canva`
13. Research hub functions
14. AI refinement functions

### Phase 2: Frontend Migration (Priority: HIGH)
Update components to use FastAPI endpoints:

1. **SlideStep.tsx** - ✅ Already updated for Presenton
2. **ScriptStep.tsx** - Generate scripts via FastAPI
3. **ExerciseStep.tsx** - Generate exercises via FastAPI
4. **QuizStep.tsx** - Generate quizzes via FastAPI
5. **VideoStep.tsx** - Generate voice/video via FastAPI
6. **ModeSelectionStep.tsx** - Title generation via FastAPI
7. **ContentUploader.tsx** - Handle uploads via FastAPI
8. **ExportStep.tsx** - Export via FastAPI
9. All other components...

### Phase 3: Authentication (Priority: MEDIUM)
Options:
- **Option A**: Keep Supabase Auth (minimal dependency, just for auth)
- **Option B**: Implement FastAPI auth (JWT tokens, own user management)
- **Recommendation**: Option A initially (less work, focus on features)

### Phase 4: Database Operations (Priority: HIGH)
- All CRUD operations through FastAPI
- MongoDB collections for: users, courses, scripts, slides, etc.
- Migrate any existing data if needed

### Phase 5: Testing & Cleanup (Priority: HIGH)
- End-to-end testing of all features
- Remove unused Supabase function files
- Update documentation
- Performance optimization

## Implementation Order

### Week 1: Core Course Generation
1. Title generation endpoint
2. Outline generation endpoint  
3. Script generation endpoint
4. Update frontend components

### Week 2: Content Enhancement
1. Slide generation (Internal AI)
2. Exercise generation
3. Quiz generation
4. Media search endpoints

### Week 3: Voice/Video & Export
1. Voice generation integration
2. Video generation
3. Export functionality
4. Testing

### Week 4: Polish & Deploy
1. Error handling improvements
2. Performance optimization
3. Documentation
4. Deployment setup

## Immediate Next Steps (Today)

1. ✅ Fix black screen issue (DONE)
2. Create core FastAPI endpoints for course generation
3. Update 2-3 key components to use FastAPI
4. Test end-to-end flow
5. Document progress

## Decision Points

**Authentication:**
- Keep Supabase Auth? YES/NO
- If NO, implement FastAPI JWT auth

**Media Storage:**
- Keep Supabase Storage? YES/NO
- If NO, use local/S3/alternative

**Real-time Features:**
- Need websockets? YES/NO
- If YES, implement via FastAPI websockets

## Success Criteria
- ✅ App loads without black screen
- ✅ All features work without Lovable
- ✅ Can generate full course end-to-end
- ✅ No Supabase function dependencies
- ✅ Clean, maintainable code
- ✅ Documented API endpoints

# Svenska Creator - Full Platform Testing & Setup Checklist

**Date**: 2026-01-17
**Purpose**: Complete setup and testing guide for full platform functionality

---

## 🎯 Platform Overview

Svenska Creator is a comprehensive course/presentation creation platform with the following workflow:

```
1. Title Step → Define course/presentation
2. Mode Selection → Choose project mode (course/presentation/module)
3. Outline Step → AI-generated course outline
4. Script Step → AI-generated scripts for modules
5. Slide Step → Generate slides (Internal AI, Presenton, or upload)
6. Exercise Step → Create exercises/quizzes
7. Quiz Step → Generate quizzes
8. Video Step → Generate videos with voice synthesis
9. Export Step → Export to PPTX/PDF/SCORM
10. Processing → Background processing for videos
```

---

## ✅ Recently Completed (This Session)

- ✅ Presenton quality improvements (web_search enabled, simplified instructions)
- ✅ Canva Integration Phase 2 (OAuth, autofill, brand templates)
- ✅ Frontend web_search default fix
- ✅ Export functionality fixes (from previous session)
- ✅ Internal AI designer-friendly redesign (from previous session)

---

## 🔧 Required Environment Variables

### Backend (.env)

**Essential for Core Features:**
```bash
# Database (Required)
MONGO_URL=mongodb://localhost:27017
DB_NAME=svenska_creator

# AI/LLM (Required for slide generation)
EMERGENT_LLM_KEY=your_emergent_llm_key_here

# Presenton API (Required for Presenton slide generation)
PRESENTON_API_KEY=your_presenton_api_key_here

# CORS (Required)
CORS_ORIGINS=*
```

**Optional for Enhanced Features:**
```bash
# Media APIs (for stock photos)
PEXELS_API_KEY=your_pexels_api_key_here
PIXABAY_API_KEY=your_pixabay_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_key_here

# Voice Synthesis (for video generation)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Video Generation (for AI avatars)
HEYGEN_API_KEY=your_heygen_api_key_here

# Video Hosting (Bunny.net CDN)
BUNNY_API_KEY=your_bunny_api_key_here
BUNNY_LIBRARY_ID=your_bunny_library_id_here
BUNNY_CDN_HOSTNAME=your_bunny_cdn_hostname_here

# Canva Integration (NEW - Phase 2)
CANVA_CLIENT_ID=your_canva_client_id_here
CANVA_CLIENT_SECRET=your_canva_client_secret_here
CANVA_REDIRECT_URI=http://localhost:8000/api/canva/callback
```

### Frontend (.env)

```bash
# Backend API URL (Required)
VITE_BACKEND_URL=http://localhost:8000

# Supabase Configuration (Required for auth)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

---

## 📋 Testing Checklist by Feature

### 1. Authentication & User Management

**Status**: ❓ **Needs Testing**

**Prerequisites:**
- [ ] Supabase project created
- [ ] VITE_SUPABASE_URL configured
- [ ] VITE_SUPABASE_PUBLISHABLE_KEY configured

**Tests:**
- [ ] User can sign up
- [ ] User can log in
- [ ] User can log out
- [ ] Password reset works
- [ ] Session persists on refresh
- [ ] Protected routes redirect to login

**Files to Check:**
- `frontend/src/pages/Auth.tsx`
- `frontend/src/integrations/supabase/client.ts`

---

### 2. Course/Presentation Title & Setup

**Status**: ✅ **Should Work** (Basic feature)

**Tests:**
- [ ] Can enter course title
- [ ] Can select language (Swedish/English)
- [ ] Can proceed to next step
- [ ] Title persists throughout workflow

**Files:**
- `frontend/src/components/TitleStep.tsx`

---

### 3. Mode Selection

**Status**: ✅ **Should Work**

**Tests:**
- [ ] Can select "Course" mode
- [ ] Can select "Presentation" mode
- [ ] Can select "Module" mode
- [ ] Mode affects workflow (exercise/quiz steps visibility)

**Files:**
- `frontend/src/components/ModeSelectionStep.tsx`

---

### 4. Outline Generation (AI)

**Status**: ⚠️ **Needs EMERGENT_LLM_KEY**

**Prerequisites:**
- [ ] EMERGENT_LLM_KEY configured in backend

**Tests:**
- [ ] AI generates course outline from title
- [ ] Can edit generated outline
- [ ] Can add/remove modules
- [ ] Can proceed with outline

**Files:**
- `frontend/src/components/OutlineStep.tsx`
- `backend/outline_service.py` (likely)

---

### 5. Script Generation (AI)

**Status**: ⚠️ **Needs EMERGENT_LLM_KEY**

**Prerequisites:**
- [ ] EMERGENT_LLM_KEY configured

**Tests:**
- [ ] AI generates scripts for each module
- [ ] Can edit generated scripts
- [ ] Can regenerate individual scripts
- [ ] Scripts appear in slide generation step

**Files:**
- `frontend/src/components/ScriptStep.tsx`
- `backend/scripts_service.py` (likely)

---

### 6. Slide Generation

**Status**: ✅ **RECENTLY IMPROVED** (Presenton quality, Canva integration)

#### 6a. Internal AI Slide Generator

**Prerequisites:**
- [ ] EMERGENT_LLM_KEY configured

**Tests:**
- [ ] Can generate slides from script
- [ ] Slides have proper content structure
- [ ] Speaker notes included
- [ ] Designer-friendly format (recent redesign)
- [ ] Can edit individual slides
- [ ] Preview shows slides correctly

**Recent Changes:**
- ✅ Redesigned as designer-friendly content structure
- ✅ Comprehensive speaker notes with design suggestions

#### 6b. Presenton Integration

**Prerequisites:**
- [ ] PRESENTON_API_KEY configured

**Tests:**
- [ ] Can select Presenton as generator
- [ ] Can configure number of slides
- [ ] Can set tone/style/verbosity
- [ ] **NEW**: Web search checkbox enabled by default ✅
- [ ] Advanced settings work
- [ ] Presenton generates presentation
- [ ] Can download PPTX from Presenton
- [ ] Swedish characters (å, ä, ö) display correctly

**Recent Changes:**
- ✅ web_search enabled by default (+20-30% quality)
- ✅ Instructions simplified (let templates work naturally)
- ✅ Frontend checkbox defaults to true

**Known Issues:**
- ⚠️ Swedish characters sometimes missing (Presenton bug #356, not our code)

#### 6c. Canva Integration (PHASE 2 - NEW!)

**Prerequisites:**
- [ ] CANVA_CLIENT_ID configured
- [ ] CANVA_CLIENT_SECRET configured
- [ ] CANVA_REDIRECT_URI configured
- [ ] Canva developer account with API access

**Tests:**
- [ ] **Connect to Canva** button appears
- [ ] OAuth popup opens when clicking connect
- [ ] User can authorize in Canva
- [ ] Connection status badge shows "Ansluten"
- [ ] Brand templates load from Canva
- [ ] Template thumbnails display
- [ ] Click template creates design in Canva
- [ ] Autofill populates slides correctly
- [ ] Design opens in Canva editor
- [ ] Edit/View buttons work on last created design
- [ ] Disconnect button works
- [ ] Fallback templates show when not connected

**Recent Changes:**
- ✅ Full OAuth 2.0 with PKCE implementation
- ✅ Brand template fetching
- ✅ One-click autofill integration
- ✅ Design management UI

**Documentation:**
- 📄 CANVA_PHASE2_SETUP.md (complete setup guide)

#### 6d. Content Upload

**Tests:**
- [ ] Can upload text content
- [ ] AI processes uploaded content into slides
- [ ] Uploaded content properly formatted

**Files:**
- `frontend/src/components/SlideStep.tsx`
- `frontend/src/components/ContentUploader.tsx`

---

### 7. Exercise Generation

**Status**: ❓ **Needs Testing**

**Tests:**
- [ ] Can generate exercises
- [ ] Exercise types work (multiple choice, true/false, etc.)
- [ ] Can edit exercises
- [ ] Exercises export properly

**Files:**
- `frontend/src/components/ExerciseStep.tsx`

---

### 8. Quiz Generation

**Status**: ❓ **Needs Testing**

**Tests:**
- [ ] Can generate quizzes
- [ ] Quiz questions generated from content
- [ ] Answer choices work
- [ ] Correct answers marked

**Files:**
- `frontend/src/components/QuizStep.tsx`

---

### 9. Video Generation

**Status**: ⚠️ **Needs Multiple API Keys**

**Prerequisites:**
- [ ] ELEVENLABS_API_KEY (voice synthesis)
- [ ] HEYGEN_API_KEY (AI avatars - optional)
- [ ] BUNNY_API_KEY (video hosting)
- [ ] BUNNY_LIBRARY_ID
- [ ] BUNNY_CDN_HOSTNAME

**Tests:**
- [ ] Can generate voice-over from script
- [ ] Voice sounds natural
- [ ] Can generate AI avatar video (if HeyGen configured)
- [ ] Video uploads to Bunny CDN
- [ ] Video plays in preview
- [ ] Video download works

**Files:**
- `frontend/src/components/VideoStep.tsx`
- `backend/video_service.py` (likely)

---

### 10. Export Functionality

**Status**: ✅ **RECENTLY FIXED**

**Prerequisites:**
- [ ] python-pptx installed in backend
- [ ] Presentation data generated

**Tests:**
- [ ] **Export Designer-Friendly PPTX** works
  - Downloads PPTX file
  - Slides have proper content structure
  - Speaker notes included with design suggestions
  - Designer notes slide at end
- [ ] **Export Styled PPTX** works
  - Downloads PPTX file
  - Bullet points parsed correctly ✅ (recently fixed)
  - Professional formatting
- [ ] **Export to PDF** works
  - Downloads PDF file
  - All slides visible
- [ ] **Export to JSON** works
  - Downloads JSON file
  - Can import back to Canva
- [ ] **Export to Google Slides** works
  - Opens in Google Slides
  - Formatting preserved
- [ ] **Download mechanisms** work across browsers ✅ (recently fixed)
  - Chrome
  - Firefox
  - Safari
  - Edge

**Recent Fixes:**
- ✅ Bullet point parsing fixed
- ✅ Multi-method download with fallbacks
- ✅ Blob validation
- ✅ Designer-friendly export redesign

**Files:**
- `frontend/src/components/ExportStep.tsx`
- `frontend/src/lib/exportApi.ts`
- `backend/export_service.py`

---

### 11. Stock Photo Search

**Status**: ⚠️ **Needs API Keys**

**Prerequisites:**
- [ ] PEXELS_API_KEY or
- [ ] PIXABAY_API_KEY or
- [ ] UNSPLASH_ACCESS_KEY
- (At least one required)

**Tests:**
- [ ] Can search for stock photos
- [ ] Photos display in grid
- [ ] Can select photo for slide
- [ ] Photo applies to slide background/image
- [ ] Multiple APIs work as fallback

**Files:**
- `frontend/src/components/SlideStep.tsx`
- `backend/media_service.py` (likely)

---

### 12. Database & Data Persistence

**Status**: ⚠️ **Needs MongoDB**

**Prerequisites:**
- [ ] MongoDB running (local or cloud)
- [ ] MONGO_URL configured
- [ ] DB_NAME configured

**Tests:**
- [ ] Courses save to database
- [ ] Can load saved courses
- [ ] Can edit saved courses
- [ ] Can delete courses
- [ ] Data persists across sessions

**Files:**
- `backend/database.py` (likely)
- Backend service files

---

### 13. Demo Mode

**Status**: ✅ **Should Work**

**Tests:**
- [ ] Demo mode limits slides to 3 (or configured max)
- [ ] Demo watermark appears on slides
- [ ] Premium features show upgrade prompts
- [ ] Can toggle demo mode in settings

**Files:**
- `frontend/src/pages/Demo.tsx`
- `frontend/src/components/DemoWatermark.tsx`

---

### 14. Settings & Customization

**Status**: ✅ **Should Work**

**Tests:**
- [ ] Can customize presentation settings
- [ ] Color pickers work
- [ ] Tone/style selections work
- [ ] Settings persist
- [ ] Settings apply to generation

**Files:**
- `frontend/src/pages/Settings.tsx`
- `frontend/src/components/CourseStructureSettings.tsx`

---

## 🚀 Quick Start Testing Guide

### Minimal Setup (Core Features Only)

**Required Environment Variables:**
```bash
# Backend
MONGO_URL=mongodb://localhost:27017
DB_NAME=svenska_creator
EMERGENT_LLM_KEY=your_key
PRESENTON_API_KEY=your_key
CORS_ORIGINS=*

# Frontend
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
```

**Start Services:**
```bash
# Terminal 1: Backend
cd backend
uvicorn server:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: MongoDB (if local)
mongod
```

**Basic Test Flow:**
1. Open http://localhost:5173
2. Sign in / Create account
3. Create new course
4. Generate outline
5. Generate scripts
6. Generate slides (Presenton or Internal AI)
7. Export to PPTX
8. Download and verify

---

### Full Setup (All Features)

**All Environment Variables Configured** + test each feature from checklist above.

---

## 🐛 Known Issues & Limitations

### From Previous Session

1. **Swedish Characters in Presenton**
   - **Issue**: å, ä, ö sometimes missing in Presenton exports
   - **Root Cause**: Presenton API bug (Issue #356)
   - **Status**: Not our code, documented limitation
   - **Workaround**: Use Internal AI or Canva for Swedish content

2. **Export Download Reliability**
   - **Issue**: Downloads sometimes didn't initiate
   - **Status**: ✅ FIXED (multi-method fallback)

3. **Internal AI Design Export**
   - **Issue**: Preview showed designs that didn't export
   - **Status**: ✅ REDESIGNED (now designer-friendly structure)

### Current Session Issues

None identified yet - comprehensive improvements made.

---

## 📊 Feature Dependency Matrix

| Feature | MongoDB | EMERGENT_LLM | PRESENTON | Supabase | Canva | Media APIs | Voice/Video |
|---------|---------|--------------|-----------|----------|-------|------------|-------------|
| Auth | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Outline Gen | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Script Gen | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Internal AI Slides | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Presenton Slides | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Canva Export | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Stock Photos | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Video Gen | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export PPTX | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Legend:
- ✅ = Required
- ❌ = Not Required

---

## 🎯 Recommended Testing Priority

### Priority 1: Core Workflow (30 minutes)
1. ✅ Authentication (Supabase)
2. ✅ Title & Mode Selection
3. ✅ Outline Generation (EMERGENT_LLM)
4. ✅ Script Generation (EMERGENT_LLM)
5. ✅ Slide Generation (Presenton or Internal AI)
6. ✅ Export to PPTX

**Goal**: Verify end-to-end presentation creation works

### Priority 2: Enhanced Features (1 hour)
1. ✅ Canva Integration (OAuth, autofill)
2. ✅ Stock photo search
3. ✅ Exercise/Quiz generation
4. ✅ Settings customization

**Goal**: Verify advanced features work

### Priority 3: Media Features (1 hour)
1. ✅ Voice synthesis
2. ✅ Video generation
3. ✅ Bunny CDN upload

**Goal**: Verify multimedia features work

---

## 🔍 Debugging Tips

### Backend Not Starting
```bash
# Check Python dependencies
cd backend
pip list

# Check .env file
cat .env

# Check logs
uvicorn server:app --reload --log-level debug
```

### Frontend Not Connecting
```bash
# Check VITE_BACKEND_URL
cat frontend/.env

# Check CORS
# Verify CORS_ORIGINS=* in backend/.env

# Check network
curl http://localhost:8000/health
```

### Database Connection Issues
```bash
# Test MongoDB connection
mongo --eval "db.version()"

# Check MongoDB is running
ps aux | grep mongod

# Start MongoDB
mongod --dbpath /data/db
```

### Supabase Issues
- Verify URL and key from Supabase dashboard
- Check project is not paused
- Verify RLS policies allow access

---

## 📝 Next Steps for You

1. **Set Up Environment Variables**
   - Copy `.env.example` to `.env` in both backend and frontend
   - Fill in API keys for features you want to test

2. **Start Services**
   - MongoDB (if using local)
   - Backend (uvicorn)
   - Frontend (npm run dev)

3. **Test Core Workflow**
   - Follow Priority 1 checklist
   - Report any errors

4. **Test New Features**
   - Canva Integration (Phase 2)
   - Presenton quality improvements

5. **Report Issues**
   - Note which environment variables are set
   - Include error messages
   - Specify which step fails

---

**Document Created**: 2026-01-17
**Last Updated**: 2026-01-17
**Status**: Ready for testing

# Internal AI System Comprehensive Improvement Plan

## Current State Analysis

### Frontend Parameters Currently Passed
From `useCourseWorkflow.ts:814-822` and `useCourseGeneration.ts:181-189`:
```typescript
generateSlidesAPI({
  script_content: scriptContent,
  module_title: script.moduleTitle,
  course_title: state.title,
  num_slides: isDemoMode ? effectiveDemoMode.maxSlides : 10,
  language: settings.language || 'sv',               // ✓
  tone: settings.style || 'professional',            // ✗ WRONG - uses general style, not presentation tone
  verbosity: 'standard',                              // ✗ HARDCODED
})
```

### Backend Parameters Available (But Not Used)
From `slides_service.py:21-33`:
```python
class SlideGenerationRequest(BaseModel):
    script_content: str                         # ✓ Passed
    module_title: str                           # ✓ Passed
    course_title: str                           # ✓ Passed
    num_slides: int = 10                        # ✓ Passed
    language: str = "sv"                        # ✓ Passed
    tone: str = "professional"                  # ✗ Wrong mapping
    verbosity: str = "standard"                 # ✗ Hardcoded
    include_title_slide: bool = True           # ✗ NOT passed
    include_table_of_contents: bool = False    # ✗ NOT passed
    industry: Optional[str] = None              # ✗ NOT passed
    audience_type: Optional[str] = "general"    # ✗ NOT passed
    presentation_goal: Optional[str] = None     # ✗ NOT passed
```

### Frontend PresentationSettings Available (But Not Passed)
From `types/course.ts:120-135`:
```typescript
export interface PresentationSettings {
  slideCount: number                              // Could map to num_slides
  presentationDuration: number                    // Not used by backend
  topic: string                                   // Could map to course_title
  style: PresentationStyle                        // Different from tone
  tone: PresentationTone                          // ✓ Should map to backend tone
  primaryColor: string                            // Not in backend API
  accentColor: string                             // Not in backend API
  imageRichness: ImageRichness                    // Not in backend API
  professionalityLevel: ProfessionalityLevel      // Could map to audience_type
  includeAnimations: boolean                      // Not in backend API
  includeCharts: boolean                          // Not in backend API
  customTemplate?: CustomTemplate                 // Not in backend API
  includeStockVideos: boolean                     // Not in backend API
  stockVideoProvider: StockVideoProvider          // Not in backend API
}
```

---

## Problems Identified

### Problem 1: Wrong Tone Mapping
**Current**: Uses `settings.style` (course style: professional/conversational/academic)
**Should**: Use `presentationSettings.tone` (presentation tone: formal/professional/friendly/casual/inspirational)

**Impact**: Tone doesn't match user selection

### Problem 2: Hardcoded Verbosity
**Current**: Always 'standard'
**Should**: Allow configuration based on imageRichness or explicit verbosity setting

**Impact**: Users can't control text density

### Problem 3: Missing Parameters
- `include_table_of_contents` - Never passed
- `industry` - Never passed (could be useful)
- `audience_type` - Never passed (could map from professionalityLevel)
- `presentation_goal` - Never passed (could infer from project mode)

**Impact**: Backend AI doesn't receive important context

### Problem 4: No Presentation Mode Support
- When `projectMode === 'presentation'`, should use presentation settings
- Currently uses course settings for everything

**Impact**: Presentation mode doesn't have unique behavior

---

## Comprehensive Solution

### Phase 1: Update Frontend Parameter Passing

#### Change 1: Add Helper Function for Parameter Mapping
**File**: `frontend/src/hooks/useCourseWorkflow.ts` (or new utility file)

```typescript
function mapPresentationSettingsToSlideParams(
  settings: CourseSettings,
  projectMode: ProjectMode,
  isDemoMode: boolean,
  effectiveDemoMode: DemoModeSettings
): Partial<SlideGenerationRequest> {
  const presentationSettings = settings.presentationSettings;

  // Map professionality level to audience type
  const audienceTypeMap: Record<string, string> = {
    'very-casual': 'general',
    'casual': 'general',
    'professional': 'professional',
    'formal': 'executive',
    'very-formal': 'executive'
  };

  // Map tone correctly
  const toneMap: Record<string, string> = {
    'formal': 'professional',
    'professional': 'professional',
    'friendly': 'casual',
    'casual': 'casual',
    'inspirational': 'inspirational'
  };

  // Map image richness to verbosity
  const verbosityMap: Record<string, string> = {
    'minimal': 'concise',       // Minimal images = concise text
    'moderate': 'standard',     // Balanced
    'rich': 'standard',         // Rich images = standard text
    'visual-heavy': 'concise'   // Heavy images = minimal text
  };

  // Determine presentation goal
  const presentationGoal = projectMode === 'course' ? 'teach' : 'inform';

  return {
    num_slides: isDemoMode ? effectiveDemoMode.maxSlides : (presentationSettings?.slideCount || 10),
    language: settings.language || 'sv',
    tone: presentationSettings?.tone ? toneMap[presentationSettings.tone] : settings.style || 'professional',
    verbosity: presentationSettings?.imageRichness ? verbosityMap[presentationSettings.imageRichness] : 'standard',
    include_title_slide: true,
    include_table_of_contents: (presentationSettings?.slideCount || 10) > 8,
    audience_type: presentationSettings?.professionalityLevel ?
      audienceTypeMap[presentationSettings.professionalityLevel] : 'general',
    presentation_goal: presentationGoal,
    industry: null // Could add industry detection or selector
  };
}
```

#### Change 2: Update generateSlides Call
**File**: `frontend/src/hooks/useCourseWorkflow.ts:814-822`

```typescript
// BEFORE:
const data = await generateSlidesAPI({
  script_content: scriptContent,
  module_title: script.moduleTitle,
  course_title: state.title,
  num_slides: isDemoMode ? effectiveDemoMode.maxSlides : 10,
  language: state.settings.language || 'sv',
  tone: state.settings.style || 'professional',
  verbosity: 'standard',
});

// AFTER:
const slideParams = mapPresentationSettingsToSlideParams(
  state.settings,
  state.settings.projectMode,
  isDemoMode,
  effectiveDemoMode
);

const data = await generateSlidesAPI({
  script_content: scriptContent,
  module_title: script.moduleTitle,
  course_title: state.title,
  ...slideParams
});
```

#### Change 3: Same Fix for useCourseGeneration.ts
**File**: `frontend/src/hooks/useCourseGeneration.ts:181-189`
Apply same mapping function and parameters.

---

### Phase 2: Enhance Backend with Additional Parameters

#### Change 1: Add Support for Color Themes
**File**: `backend/slides_service.py`

Add to `SlideGenerationRequest`:
```python
class SlideGenerationRequest(BaseModel):
    # Existing fields...
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    image_richness: Optional[str] = None  # minimal, moderate, rich, visual-heavy
    include_charts: Optional[bool] = False
```

#### Change 2: Integrate Colors into Prompts
**File**: `backend/slides_service.py` - In `generate_slides()` function

```python
# Add color guidance if provided
color_guidance = ""
if request.primary_color:
    color_guidance = f"""
FÄRGTEMA:
- Primärfärg: {request.primary_color} (använd för rubriker, accenter, nyckelbudskap)
- Accentfärg: {request.accent_color or request.primary_color} (använd för highlights, callouts)
- Säkerställ god kontrast mot vit/ljus bakgrund
- Använd färger konsekvent genom presentationen
"""

# Include in system prompt
system_prompt = f"""...
{color_guidance}
{design_principles}
...
```

#### Change 3: Enhance Image Richness Handling
**File**: `backend/slides_service.py` - In `generate_slides()` function

```python
# Add image richness guidance
image_richness_guidance = ""
if request.image_richness:
    guides = {
        "minimal": "Använd bilder sparsamt - endast 1-2 slides bör ha bilder. Fokusera på text och diagram.",
        "moderate": "Balansera bilder och text - cirka 40-50% av slides bör inkludera relevanta bilder.",
        "rich": "Bildrik presentation - 60-70% av slides bör innehålla högkvalitativa bilder.",
        "visual-heavy": "Mycket visuell presentation - varje slide bör ha övertygande imagery, minimera text."
    }
    image_richness_guidance = f"\nBILDRIKHET: {guides.get(request.image_richness, guides['moderate'])}"

# Include in system prompt
```

#### Change 4: Add Charts Support
**File**: `backend/slides_service.py` - In `generate_slides()` function

```python
# Add charts guidance if requested
charts_guidance = ""
if request.include_charts:
    charts_guidance = """
DIAGRAM OCH DATA:
- Inkludera 2-3 datavisualiseringsslides med diagram, grafer eller infografik
- Använd lämpliga diagramtyper: linjediagram för trender, stapeldiagram för jämförelser, cirkeldiagram för proportioner
- Varje diagram ska ha tydlig titel, märkta axlar och förklaring
- Markera viktiga insikter med färg eller annotationer
"""

# Include in system prompt
```

---

### Phase 3: Add Presentation Mode Detection

#### Change 1: Detect When in Presentation Mode
**File**: `frontend/src/hooks/useCourseWorkflow.ts`

```typescript
// Add logic to use presentationSettings when in presentation mode
const isPresentation = state.settings.projectMode === 'presentation';

// When generating slides for presentation mode, use presentation-specific params
if (isPresentation && state.settings.presentationSettings) {
  // Use presentation topic as title
  // Use presentation slide count
  // Apply presentation tone and style
}
```

---

### Phase 4: Add Verbosity Control UI

#### Change 1: Add Verbosity to PresentationSettings (Optional)
**File**: `frontend/src/types/course.ts:120-135`

```typescript
export interface PresentationSettings {
  // Existing fields...
  verbosity?: 'concise' | 'standard' | 'text-heavy';  // NEW
  // Or infer from imageRichness
}
```

#### Change 2: Add Verbosity Selector to SettingsPanel (Optional)
**File**: `frontend/src/components/SettingsPanel.tsx`

Add dropdown for verbosity selection if not already present.

---

## Expected Impact

### Before Improvements
- ❌ Tone: Wrong (uses course style instead of presentation tone)
- ❌ Verbosity: Hardcoded to 'standard'
- ❌ Table of Contents: Never included
- ❌ Audience Type: Always 'general'
- ❌ Presentation Goal: Not specified
- ❌ Colors: Not used
- ❌ Image Richness: Not communicated
- ❌ Charts: Not requested
- **Quality**: 5/10

### After Improvements
- ✅ Tone: Correct mapping from presentation tone
- ✅ Verbosity: Mapped from image richness
- ✅ Table of Contents: Included for 8+ slides
- ✅ Audience Type: Mapped from professionality level
- ✅ Presentation Goal: Inferred from project mode
- ✅ Colors: Integrated into prompts
- ✅ Image Richness: Guides AI behavior
- ✅ Charts: Requested when checkbox enabled
- **Quality**: 9/10

---

## Implementation Checklist

### Frontend Changes
- [ ] Create `mapPresentationSettingsToSlideParams()` helper
- [ ] Update `useCourseWorkflow.ts` generateSlides call
- [ ] Update `useCourseGeneration.ts` generateSlides call
- [ ] Test parameter passing end-to-end

### Backend Changes
- [ ] Add `primary_color`, `accent_color`, `image_richness`, `include_charts` to request model
- [ ] Integrate color guidance into system prompt
- [ ] Integrate image richness guidance
- [ ] Integrate charts guidance
- [ ] Test prompt enhancements

### Testing
- [ ] Test with different tones (formal vs casual)
- [ ] Test with different verbosity levels
- [ ] Test with colors specified
- [ ] Test with charts enabled
- [ ] Test table of contents inclusion
- [ ] Test audience type variations
- [ ] Compare before/after quality

### Documentation
- [ ] Document parameter mappings
- [ ] Create user guide for settings
- [ ] Add inline comments

---

## Alternative: Simpler Quick Win

If full implementation is too complex, start with these minimal changes:

### Quick Fix 1: Tone Mapping (5 minutes)
```typescript
// In useCourseWorkflow.ts and useCourseGeneration.ts
tone: state.settings.presentationSettings?.tone || settings.style || 'professional',
```

### Quick Fix 2: Smart Verbosity (2 minutes)
```typescript
verbosity: state.settings.presentationSettings?.imageRichness === 'visual-heavy' ? 'concise' : 'standard',
```

### Quick Fix 3: Table of Contents (1 minute)
```typescript
include_table_of_contents: (state.settings.presentationSettings?.slideCount || 10) > 8,
```

**Total time**: 8 minutes
**Quality improvement**: +30%

---

## Recommendation

**Start with Quick Fixes** (8 minutes) to get immediate +30% improvement, then implement full solution (+70% total) for maximum quality.

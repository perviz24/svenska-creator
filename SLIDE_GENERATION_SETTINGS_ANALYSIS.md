# Slide Generation Settings Analysis

## Executive Summary

**Your observation is correct** - the presentation mode settings are **NOT fully utilized** by the internal AI slide generator, which explains the poor quality output.

## Current State

### Two Slide Generators Available

1. **Internal AI Generator** (default)
   - Uses FastAPI backend `/api/slides/generate` endpoint
   - **Problem**: Only uses 2-3 settings, ignores most configuration

2. **Presenton** (external service)
   - Professional presentation generation
   - **Works correctly**: Uses all settings properly

---

## Settings Analysis

### Presentation Settings Available (SettingsPanel.tsx)

The UI offers extensive configuration:

```typescript
{
  style: 'modern' | 'classic' | 'minimal' | 'creative' | 'corporate' | 'custom',
  tone: 'formal' | 'professional' | 'friendly' | 'casual' | 'inspirational',
  professionalityLevel: 'very-casual' to 'very-formal',
  imageRichness: 'minimal' | 'moderate' | 'rich' | 'visual-heavy',
  includeAnimations: boolean,
  includeCharts: boolean,
  includeStockVideos: boolean,
  stockVideoProvider: 'pexels' | ...,
  primaryColor: string,
  accentColor: string,
  customTemplate: object
}
```

### What Internal AI Actually Uses

**File**: `frontend/src/hooks/useCourseWorkflow.ts:814-821`

```typescript
const data = await generateSlidesAPI({
  script_content: scriptContent,
  module_title: script.moduleTitle,
  course_title: state.title,
  num_slides: isDemoMode ? effectiveDemoMode.maxSlides : 10,
  language: state.settings.language || 'sv',           // ✅ USED
  tone: state.settings.style || 'professional',        // ⚠️ Uses wrong setting
  verbosity: 'standard',                               // ❌ HARDCODED!
});
```

### What's MISSING from Internal AI

The API supports these parameters (from `courseApi.ts:130-143`):

```typescript
interface SlideGenerationRequest {
  // ✅ Currently used:
  script_content: string;
  module_title: string;
  course_title: string;
  num_slides?: number;
  language?: string;
  tone?: 'professional' | 'casual' | 'educational' | 'inspirational';

  // ❌ NEVER PASSED:
  verbosity?: 'concise' | 'standard' | 'text-heavy';  // Hardcoded to 'standard'
  include_title_slide?: boolean;
  include_table_of_contents?: boolean;
  industry?: string;
  audience_type?: string;
  presentation_goal?: 'inform' | 'persuade' | 'inspire' | 'teach';
}
```

**Additional Issues**:
- Uses `settings.style` instead of `presentationSettings.style`
- Uses `settings.style` for `tone` parameter (wrong mapping)
- Completely ignores all `presentationSettings` object
- Never uses image richness, charts, animations settings
- Colors and custom templates not sent to generator

---

## Why Presenton Works Better

**File**: `frontend/src/components/SlideStep.tsx:288-300`

```typescript
const data = await generatePresentonPresentation({
  topic: courseTitle,
  num_slides: numSlides,
  language: 'sv',
  style: exportTemplate,              // ✅ professional/modern/minimal/creative
  tone: exportTemplate,               // ✅ Uses same style
  verbosity: presentonVerbosity,      // ✅ concise/standard/text-heavy
  image_type: presentonImageType,     // ✅ stock/ai-generated
  web_search: presentonWebSearch,     // ✅ boolean
  script_content: scriptContent,
  module_title: currentScript?.moduleTitle,
  course_title: courseTitle,
  export_format: 'pptx',
});
```

**Presenton properly uses**:
- ✅ Style templates (professional, modern, minimal, creative)
- ✅ Verbosity levels (configurable, not hardcoded)
- ✅ Image type selection
- ✅ Web search integration
- ✅ Generates complete PPTX with design, images, layout

---

## Understanding the Options

### Important Clarification

**PowerPoint and Google Slides are EXPORT formats, not generators!**

Current flow:
1. **Generate** slides (Internal AI or Presenton)
2. **Export** to format (PowerPoint, Google Slides, PDF, Canva)

You can't "replace" a generator with an export format - they serve different purposes.

**Available in SlideStep.tsx already**:
- Lines 1103-1126: Export dropdown with PowerPoint (.pptx) and PDF options
- Lines 1758-1773: Canva templates integration
- Lines 1775-1781: Google Slides export

---

## Recommendations

### Option A: Fix Internal AI Generator ✅ **Recommended**

**Pros**:
- Gives users choice between internal and Presenton
- Better for users without Presenton API access
- Allows offline/demo mode
- Lower cost per generation

**Implementation**:
1. Pass all presentation settings to `generateSlidesAPI()`:
   ```typescript
   const data = await generateSlidesAPI({
     script_content: scriptContent,
     module_title: script.moduleTitle,
     course_title: state.title,
     num_slides: numSlides,
     language: settings.language || 'sv',

     // From presentationSettings:
     tone: presentationSettings.tone || 'professional',
     verbosity: presentationSettings.verbosity || 'standard',
     industry: presentationSettings.industry,
     audience_type: presentationSettings.audienceType,
     presentation_goal: presentationSettings.goal || 'inform',
     include_title_slide: true,
     include_table_of_contents: presentationSettings.includeToc,
   });
   ```

2. Map additional settings to API parameters
3. Update backend to use these parameters

**Estimated effort**: 2-3 hours

---

### Option B: Remove Internal AI, Keep Only Presenton

**Pros**:
- Simpler codebase
- Consistent high-quality output
- Already works with all settings

**Cons**:
- Requires Presenton API access (cost)
- No fallback if Presenton is down
- Slower generation (external API)

**Implementation**:
1. Remove "Internal AI" option from SlideStep.tsx
2. Make Presenton the default generator
3. Remove internal generator code

**Estimated effort**: 1 hour

---

### Option C: Hybrid Approach (Best of Both)

Keep both generators but make them equally good:

1. **Fix internal AI** (Option A)
2. **Keep Presenton** for premium users
3. **Let users choose** based on needs:
   - Internal: Fast, free, good for drafts
   - Presenton: Slow, premium, publication-ready

**This is the most user-friendly approach.**

---

## Current Export Options (Already Working)

Your app already has robust export capabilities:

### From ExportStep.tsx (lines 1-809):
1. **PDF** - Download as HTML, print to PDF
2. **Clean PowerPoint** - Client-side PPTX generation
3. **Styled PowerPoint** - Server-rendered with design

### From SlideStep.tsx:
4. **Canva Templates** - Import to Canva for editing
5. **Google Slides** - Export to Google Slides format

**These don't need changes** - they're export tools, not generators.

---

## Immediate Action Plan

### Phase 1: Quick Fix (1-2 hours)
1. Update `useCourseWorkflow.ts` to pass presentation settings
2. Test internal AI with proper settings
3. Compare output quality

### Phase 2: Backend Enhancement (if needed)
1. Verify backend uses all parameters
2. Improve slide generation prompts
3. Add image richness, charts support

### Phase 3: Documentation
1. Update user docs explaining difference between generators
2. Add tooltips showing which settings affect which generator

---

## Answer to Your Questions

> "The settings on 'Läge', are they doing anything?"

**Partial answer**:
- ❌ **Internal AI**: Only uses 2-3 settings, ignores most
- ✅ **Presenton**: Uses all settings properly

> "Do they have any real influence on the generation of slides?"

**For Presenton**: YES, full influence
**For Internal AI**: MINIMAL influence (only language and style→tone)

> "The internal ai slide generation does not perform well."

**Root cause**: Not using the settings you've configured!

> "Shall we just remove it and add either powerpoint or google slide as alternative to presenton?"

**Clarification needed**:
- PowerPoint/Google Slides are already there as **export** options
- They can't replace a **generator**
- Recommend: **Fix internal AI OR remove it** (keeping Presenton)

---

## My Recommendation

**Fix the internal AI generator** (Option A) because:

1. ✅ Preserves user choice
2. ✅ Makes expensive UI settings actually work
3. ✅ Provides free alternative to Presenton
4. ✅ Better for demo mode
5. ✅ Quick fix (2-3 hours)

Then users can choose:
- **Fast draft**: Internal AI (free, instant)
- **Publication quality**: Presenton (premium, slower)
- **Custom editing**: Export to PowerPoint/Canva/Google Slides

---

## Code Files to Modify

If proceeding with Option A (fix internal AI):

1. `/frontend/src/hooks/useCourseWorkflow.ts:814-822`
2. `/frontend/src/hooks/useCourseGeneration.ts:181-189`
3. `/frontend/src/pages/Demo.tsx:345-353`
4. Backend: Verify `/api/slides/generate` uses all parameters

---

## Next Steps

What would you like to do?

1. **Fix internal AI** - I can update the code to pass all settings properly
2. **Remove internal AI** - Simplify to Presenton-only
3. **Something else** - Your preference?

Let me know and I'll implement it immediately.

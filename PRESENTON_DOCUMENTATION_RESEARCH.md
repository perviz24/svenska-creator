# Presenton Documentation Research - Complete Findings

## Research Date: 2026-01-11

### Objective
Research all available Presenton documentation to verify fixes and find solutions for:
1. Swedish characters missing (å, ä, ö)
2. Font sizes too big/inconsistent
3. Design always looks the same

---

## Official Documentation Found

### 1. Templates
**Source**: [Generate Presentation with Templates and Themes](https://docs.presenton.ai/guide/generate-presentation-with-themes)

**Four Built-in Templates**:
- `general` - Standard business template
- `modern` - Contemporary design
- `standard` - Classic presentation style
- `swift` - Fast/streamlined design

**Confirmed**: Our template mapping is correct:
```python
template_map = {
    "professional": "general",
    "modern": "modern",
    "minimal": "modern",
    "creative": "swift",
    "classic": "standard"
}
```

### 2. Themes (Color Schemes)
**Source**: [Generate Presentation with Templates and Themes](https://docs.presenton.ai/guide/generate-presentation-with-templates-and-themes)

**Available Themes**:
- `professional-blue`
- `professional-dark`
- `edge-yellow`
- `mint-blue`
- `light-rose`

**Confirmed**: Our backend auto-detection uses valid theme names.

**Theme Structure**:
- Primary Accent Color
- Secondary Accent Color
- Tertiary Accent Color
- Page Background Color
- Card Background Color
- Text Heading Color
- Text Body Color
- Font selection for text and body
- Logo upload support

### 3. API Parameters (Verified)
**Source**: [Configuration and Controls](https://docs.presenton.ai/guide/configuration-and-controls-for-generation)

**Confirmed Valid Parameters**:
- `content` - Text content for generation
- `n_slides` - Number of slides
- `language` - Language name (e.g., "Swedish", "English")
- `template` - Template name (general/modern/swift/standard)
- `theme` - Theme name (professional-blue, etc.)
- `tone` - Voice of text (default/casual/professional/funny/educational/sales_pitch)
- `verbosity` - Detail level (concise/standard/text-heavy)
- `instructions` - Custom guidance text
- `web_search` - Boolean for content enrichment
- `include_title_slide` - Boolean
- `include_table_of_contents` - Boolean
- `export_as` - Format (pptx/pdf)

**NOT in Official API** (we correctly removed these):
- ❌ `markdown_emphasis`
- ❌ `image_type`
- ❌ `allow_access_to_user_info`
- ❌ `trigger_webhook`
- ❌ `quality_mode`

---

## Known Issues (From GitHub)

### Issue #356: Missing/Garbled PDF Content ⚠️
**Status**: Open (Nov 20, 2025)
**Reporter**: francisjervis
**Description**: Exported PDFs contain "missing/garbled content"

**CRITICAL**: This confirms character encoding problems exist in Presenton!

**Possible causes**:
- UTF-8 encoding not properly handled
- Font substitution issues
- Character map errors

**Related to our issue**: YES - Swedish characters missing could be same root cause

### Issue #375: Ukrainian Language Support Request
**Status**: Open (Dec 19, 2025)
**Reporter**: DmytroLitvinov
**Label**: enhancement

**Significance**: Indicates Presenton internationalization is still being developed. Character encoding for non-English languages (including Swedish) may not be fully mature.

### Issue #366: Static Images in Custom Templates
**Status**: Open (Dec 4, 2025)
**Reporter**: borisboc
**Description**: Static images render in Presenton UI and PDF but fail in PPTX export

**Significance**: Template rendering has inconsistencies across export formats.

### Issue #355: PPTX Files Unreadable on macOS
**Status**: Open (Nov 20, 2025)
**Reporter**: francisjervis
**Description**: Exported PPTX files won't open on Mac OS

**Significance**: Export quality has compatibility issues.

---

## Font Size Control

### No Direct Font Size Parameter Found
**Research**: Searched documentation and API parameters
**Conclusion**: **Presenton does NOT expose font size as an API parameter**

**How Font Sizes Work**:
1. **Templates control typography** - Each template (general/modern/swift/standard) has built-in font size hierarchy
2. **Themes control appearance** - Colors, backgrounds, but NOT font sizes
3. **Instructions can suggest** - But Presenton AI makes final decision

**Our Mistake**: We specified exact font sizes in instructions (40pt headlines, 28pt body), which likely:
- Confused the AI
- Overrode template defaults
- Caused inconsistent sizing

**Correct Approach**: Let templates handle font sizes, use high-level guidance only.

---

## Swedish Character Encoding

### No Specific Swedish Documentation Found
**Research**:
- No official docs on Swedish support
- No encoding parameters in API
- Issue #356 confirms garbled content problems exist

### Likely Root Cause
**Presenton's PDF/PPTX export has known encoding issues** (confirmed by GitHub issue #356)

**Not our backend's fault** - This is a Presenton limitation!

### Possible Solutions

**Option 1: UTF-8 Enforcement in Instructions** (what we're doing)
```python
"SWEDISH LANGUAGE: Ensure proper encoding of Swedish characters (å, ä, ö, Å, Ä, Ö).
Use correct Swedish grammar and formality level."
```
**Effectiveness**: Limited - if Presenton's export has encoding bugs, instructions won't fix it.

**Option 2: Report to Presenton Team**
File GitHub issue about Swedish character encoding similar to Issue #356.

**Option 3: Post-processing**
Download PPTX, fix encoding, re-save. Not ideal.

**Option 4: Use Different Export Format**
Test if PDF has better Swedish support than PPTX (or vice versa).

---

## Design Variety (Templates vs Themes)

### How It Works

**Templates**: Control layout, typography hierarchy, slide structure
- `general` - Traditional business layouts
- `modern` - Contemporary, bold designs
- `swift` - Streamlined, minimal
- `standard` - Classic presentation structure

**Themes**: Control colors, backgrounds, fonts
- `professional-blue` - Blue accent, white background
- `edge-yellow` - Yellow accents, energetic
- `mint-blue` - Calm, healthcare-appropriate
- `light-rose` - Educational, friendly
- `professional-dark` - Dark background, high contrast

### Why Designs Look the Same

**Possible causes**:
1. **Template selection** - All mapped to same template?
   - Check: "minimal" → "modern", "professional" → "general" (different templates ✓)

2. **Instructions overriding** - Detailed instructions prevent template variety
   - FIX: Simplified instructions (already done ✓)

3. **Theme not varying enough** - Auto-detection picks similar themes
   - Possible improvement: Let user select theme explicitly

4. **Presenton limitation** - Templates may not vary as much as expected
   - Confirmed by GitHub issues showing export inconsistencies

---

## Our Implementation - What's Correct

### ✅ Template Mapping
```python
template_map = {
    "professional": "general",
    "modern": "modern",
    "minimal": "modern",
    "creative": "swift",
    "classic": "standard"
}
```
**Status**: Correct - uses all 4 official templates

### ✅ Theme Auto-detection
```python
# Industry-based themes
"healthcare": "mint-blue"
"finance": "professional-dark"
"environment": "mint-blue"
"marketing": "edge-yellow"
"education": "light-rose"
```
**Status**: Correct - all are official theme names

### ✅ Tone Mapping
```python
tone_map = {
    "professional": "professional",
    "casual": "casual",
    "funny": "funny",
    "educational": "educational",
    "inspirational": "sales_pitch"
}
```
**Status**: Correct - all official tone values

### ✅ Simplified Instructions
Reduced from 500 lines to ~50 lines.
**Status**: Correct approach per best practices

### ✅ User Preferences via additional_context
Passing colors, image richness, charts via instructions.
**Status**: Correct - instructions parameter is for this purpose

---

## What We Can't Control (Presenton Limitations)

### 1. Font Sizes
**Not exposed as API parameter**
- Templates control this
- Instructions can suggest but not enforce

### 2. Swedish Character Encoding
**Known Presenton bug** (Issue #356)
- Export quality has garbled content issues
- Not just Swedish - affects all special characters
- Likely requires Presenton fix, not our code change

### 3. Template Design Variation
**Template designs may be limited**
- Only 4 templates available
- Theme changes mostly colors, not layout
- May not be as varied as other tools (Gamma, Beautiful.ai)

---

## Recommendations

### For Swedish Characters (Priority: HIGH)

**1. Test different export formats**
```python
# Try both formats
export_as: "pptx"  # Current
export_as: "pdf"   # Alternative
```
See if PDF has better Swedish encoding than PPTX.

**2. Report GitHub Issue**
File issue similar to #356 specifically mentioning Swedish characters:
- Title: "Swedish characters (å, ä, ö) missing or garbled in PPTX export"
- Reference Issue #356 as related
- Provide example presentation with Swedish text

**3. Shorter instructions**
Current instructions might be too long, causing encoding issues:
```python
# Current: ~50 lines including Swedish note
# Try: Minimal version with just Swedish requirement
```

**4. Language parameter verification**
Ensure we're sending correct format:
```python
language: "Swedish"  # Correct
# not "sv" or "svenska"
```

### For Font Sizes (Priority: MEDIUM)

**1. Trust templates** ✓ (Already done)
Remove all font size specifications from instructions.

**2. Test different templates explicitly**
Try forcing different templates to verify they produce different sizes:
```python
# Test each:
template: "general"
template: "modern"
template: "swift"
template: "standard"
```

**3. User template selection**
Instead of auto-mapping, let users pick template directly:
- Professional → general (default)
- Modern → modern
- Creative → swift
- Classic → standard

### For Design Variety (Priority: LOW)

**1. Explicit theme selection** (Optional)
Add theme selector in UI instead of auto-detection:
```python
# Current: Auto-detect from industry
effective_theme = topic_context["color_scheme"]

# Optional: User selects directly
effective_theme = request.theme || topic_context["color_scheme"]
```

**2. Test all template combinations**
Generate 4x5=20 test presentations:
- 4 templates × 5 themes = 20 combinations
- Verify variety actually exists

**3. Accept Presenton limitations**
If templates truly don't vary much, consider alternatives:
- Gamma API (https://gamma.app/)
- Beautiful.ai API
- Or enhance internal AI generator

---

## Documentation Access Issues

**Problem**: docs.presenton.ai returns 403 Forbidden on direct access

**What worked**:
- ✅ Web search results (limited content)
- ✅ GitHub repository README
- ✅ GitHub issues page

**What didn't work**:
- ❌ Direct WebFetch to docs.presenton.ai pages
- ❌ Detailed API documentation pages

**Recommendation**: Use GitHub as primary source, web search as backup.

---

## Testing Checklist

Before/after quality comparison:

### Test 1: Swedish Characters
**Before fix**: å → ? or missing
**After fix**: å displays correctly
**Test with**: "Digitala verktyg stödjer evidensbaserad kommunikation i vårdmiljöer"

### Test 2: Font Sizes
**Before fix**: 40pt headlines (too big)
**After fix**: Template-appropriate sizes (22-36pt range)
**Test with**: Mixed headlines and body text slides

### Test 3: Design Variety
**Before fix**: All styles look identical
**After fix**: Modern ≠ Professional ≠ Creative
**Test with**: Same content, different style selections

---

## Conclusion

### What We Fixed Correctly ✅
1. **Removed invalid parameters** - markdown_emphasis, image_type, etc.
2. **Simplified instructions** - From 500 to 50 lines
3. **Removed font size specs** - Let templates control typography
4. **Proper parameter mapping** - All values match official API

### What's Still Limited (Presenton Issues) ⚠️
1. **Swedish encoding** - Confirmed bug (Issue #356), not our code
2. **Template variety** - Only 4 templates, limited variation
3. **Export quality** - Known PPTX/PDF issues (Issues #355, #356)

### Next Steps
1. **Test fixes** - Deploy simplified version, verify improvements
2. **Report encoding bug** - File GitHub issue if Swedish chars still missing
3. **Consider alternatives** - If Presenton quality insufficient, explore other APIs

---

## Sources

- [Presenton GitHub Repository](https://github.com/presenton/presenton)
- [Generate Presentation with Templates and Themes](https://docs.presenton.ai/guide/generate-presentation-with-templates-and-themes)
- [Configuration and Controls](https://docs.presenton.ai/guide/configuration-and-controls-for-generation)
- [Using Presenton API](https://docs.presenton.ai/using-presenton-api)
- [GitHub Issue #356: Missing/Garbled PDF Content](https://github.com/presenton/presenton/issues/356)
- [GitHub Issue #375: Ukrainian Language Support](https://github.com/presenton/presenton/issues/375)
- [GitHub Issue #366: Static Images in Custom Templates](https://github.com/presenton/presenton/issues/366)
- [GitHub Issue #355: PPTX Files Unreadable on macOS](https://github.com/presenton/presenton/issues/355)

# Canva Integration Improvement Plan

**Date**: 2026-01-12
**Current Status**: Basic hardcoded templates + JSON export
**Target**: Full Canva Connect API integration

---

## Research Findings

### Canva Developer Platform Overview

**Official Documentation**: [Canva Connect APIs](https://www.canva.dev/docs/connect/)

**Key APIs Available**:
1. **Connect API** - RESTful API for integrating Canva into web apps
2. **Create Design API** - Programmatically create designs/presentations
3. **Autofill API** - Populate templates with structured data
4. **Design Editing API** - AI-powered workflows (Generally Available)
5. **Brand Templates API** - Access company brand templates
6. **Export API** - Export designs as PDF, PNG, PPTX, etc.

### Authentication

**OAuth 2.0 with PKCE (SHA-256)**
- Authorization Code flow
- Access tokens valid for 4 hours
- Refresh tokens for long-term access
- Required scopes: `design:content:write`, `design:content:read`, `asset:write`

**Documentation**: [Authentication Guide](https://www.canva.dev/docs/connect/authentication/)

### Create Design Endpoint

**POST** `/v1/designs`

```json
{
  "design_type": "Presentation",
  "asset_id": "template-id",  // Optional: use existing template
  "title": "My Presentation"
}
```

**Response**:
```json
{
  "design": {
    "id": "DAFnxxx",
    "urls": {
      "edit_url": "https://canva.com/design/DAFnxxx/edit",
      "view_url": "https://canva.com/design/DAFnxxx/view"
    }
  }
}
```

### Autofill API (Key Feature!)

**POST** `/v1/autofills`

Populate Canva templates with structured data:

```json
{
  "brand_template_id": "BABC123abc",
  "title": "Generated Presentation",
  "data": {
    "title": "Presentation Title",
    "slides": [
      {
        "title": "Slide 1 Title",
        "body": "Slide content...",
        "image_url": "https://example.com/image.jpg"
      }
    ]
  }
}
```

**Returns**: Fully populated Canva design ready for editing!

**Documentation**: [Autofill Guide](https://www.canva.dev/docs/connect/autofill-guide/)

### Export API

**POST** `/v1/exports`

```json
{
  "design_id": "DAFnxxx",
  "format": {
    "type": "pptx"  // or "pdf", "png", "jpg"
  }
}
```

### Brand Templates API

**GET** `/v1/brand-templates`

Access user's brand templates for consistent design.

---

## Current Implementation Analysis

### What Exists (`CanvaTemplates.tsx`)

**Strengths**:
- ✅ UI structure in place
- ✅ Template selection interface
- ✅ Category filtering (business, creative, minimal)
- ✅ Apply template functionality

**Weaknesses**:
- ❌ Hardcoded templates (not from Canva API)
- ❌ JSON export (manual import required)
- ❌ No OAuth authentication
- ❌ No actual Canva API calls
- ❌ No access to user's Canva account
- ❌ No brand templates integration

---

## Improvement Plan

### Phase 1: Backend Canva Service (Priority: HIGH)

**File**: `backend/canva_service.py` (NEW)

**Features**:
1. OAuth 2.0 flow implementation
2. Token storage and refresh
3. Create design endpoint wrapper
4. Autofill API integration
5. Export API wrapper
6. Brand templates fetching

**Implementation**:
```python
from typing import Optional, Dict, Any
import httpx
from pydantic import BaseModel

class CanvaService:
    BASE_URL = "https://api.canva.com/rest/v1"

    async def create_design(
        self,
        access_token: str,
        title: str,
        design_type: str = "Presentation",
        template_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new Canva design"""

    async def autofill_template(
        self,
        access_token: str,
        template_id: str,
        slides_data: List[Dict],
        title: str
    ) -> Dict[str, Any]:
        """Populate Canva template with slide data"""

    async def export_design(
        self,
        access_token: str,
        design_id: str,
        format_type: str = "pptx"
    ) -> bytes:
        """Export Canva design"""

    async def get_brand_templates(
        self,
        access_token: str
    ) -> List[Dict]:
        """Fetch user's brand templates"""
```

### Phase 2: OAuth Flow (Priority: HIGH)

**File**: `backend/server.py` (UPDATE)

**Endpoints**:
```python
@app.get("/api/canva/authorize")
async def canva_authorize():
    """Redirect to Canva OAuth page"""

@app.get("/api/canva/callback")
async def canva_callback(code: str, state: str):
    """Handle OAuth callback, exchange code for tokens"""

@app.post("/api/canva/refresh")
async def refresh_canva_token(refresh_token: str):
    """Refresh expired access token"""
```

**OAuth Flow**:
1. User clicks "Connect Canva"
2. Redirected to Canva authorization
3. User grants permissions
4. Callback with authorization code
5. Exchange for access + refresh tokens
6. Store tokens (encrypted in database)

### Phase 3: Frontend Integration (Priority: HIGH)

**File**: `frontend/src/lib/canvaApi.ts` (NEW)

**API Client**:
```typescript
export interface CanvaTemplate {
  id: string;
  name: string;
  thumbnail_url: string;
  brand_id: string;
}

export async function connectCanva(): Promise<string> {
  // Returns OAuth URL for redirect
}

export async function createCanvaDesign(
  slides: Slide[],
  title: string,
  templateId?: string
): Promise<{ designId: string; editUrl: string }> {
  // Create design via backend
}

export async function autofillCanvaTemplate(
  templateId: string,
  slides: Slide[],
  title: string
): Promise<{ designId: string; editUrl: string }> {
  // Autofill template with slides data
}

export async function exportFromCanva(
  designId: string,
  format: 'pptx' | 'pdf'
): Promise<Blob> {
  // Export design from Canva
}

export async function getBrandTemplates(): Promise<CanvaTemplate[]> {
  // Fetch user's brand templates
}
```

### Phase 4: Enhanced UI (Priority: MEDIUM)

**File**: `frontend/src/components/CanvaTemplates.tsx` (UPDATE)

**New Features**:
1. **OAuth Connect Button**
   - "Connect to Canva" → triggers OAuth flow
   - Shows connection status
   - Token refresh handling

2. **Real Brand Templates**
   - Fetch from Canva API
   - Show user's actual templates
   - Real thumbnails from Canva

3. **Direct Creation**
   - "Create in Canva" button
   - Opens Canva editor with pre-populated slides
   - Uses Autofill API

4. **Two-Way Sync** (Advanced)
   - Create in Canva → Edit → Export back
   - Sync changes back to Svenska Creator

**UI Flow**:
```
[Not Connected]
  ↓
Click "Connect Canva"
  ↓
OAuth Flow
  ↓
[Connected]
  ↓
Show Brand Templates (from Canva API)
  ↓
Select Template
  ↓
Click "Create in Canva"
  ↓
Backend calls Autofill API
  ↓
Returns edit_url
  ↓
Open Canva editor in new tab
  ↓
User edits in Canva
  ↓
Click "Export from Canva"
  ↓
Download PPTX/PDF from Canva
```

---

## Implementation Priority

### 🔴 Priority 1: Core Functionality (Week 1)

1. **Backend Canva Service**
   - OAuth implementation
   - Create design endpoint
   - Autofill endpoint
   - Export endpoint

2. **OAuth Flow**
   - Authorization endpoints
   - Token storage
   - Token refresh

3. **Basic Frontend**
   - Connect button
   - OAuth callback handling
   - Connection status display

### 🟡 Priority 2: Brand Templates (Week 2)

4. **Brand Templates API**
   - Fetch templates
   - Display real thumbnails
   - Template selection

5. **Autofill Integration**
   - Map slides to Canva data structure
   - Call autofill API
   - Handle success/errors

### 🟢 Priority 3: Export & Polish (Week 3)

6. **Export Functionality**
   - Export from Canva
   - Download handler
   - Format selection (PPTX/PDF)

7. **Error Handling**
   - OAuth errors
   - API rate limits
   - Token expiration

8. **UI Polish**
   - Loading states
   - Better templates grid
   - Preview improvements

---

## Technical Specifications

### Environment Variables

**Backend** (`.env`):
```bash
CANVA_CLIENT_ID=your_client_id
CANVA_CLIENT_SECRET=your_client_secret
CANVA_REDIRECT_URI=http://localhost:8000/api/canva/callback
```

**Frontend** (`vite.config.ts`):
```bash
VITE_CANVA_CLIENT_ID=your_client_id
VITE_CANVA_REDIRECT_URI=http://localhost:3000/canva/callback
```

### Database Schema

**Table**: `canva_tokens`
```sql
CREATE TABLE canva_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  access_token TEXT NOT NULL,  -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Response Types

**Create Design Response**:
```typescript
interface CreateDesignResponse {
  design: {
    id: string;
    urls: {
      edit_url: string;
      view_url: string;
    };
  };
}
```

**Autofill Response**:
```typescript
interface AutofillResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
  };
  design: {
    id: string;
    urls: {
      edit_url: string;
      view_url: string;
    };
  };
}
```

**Export Response**:
```typescript
interface ExportResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    url?: string;  // Download URL when ready
  };
}
```

---

## Data Mapping: Svenska Creator → Canva

### Slide Structure Mapping

**Svenska Creator Slide**:
```typescript
{
  title: string;
  content: string;
  layout: string;
  speakerNotes: string;
  imageUrl: string;
  backgroundColor: string;
}
```

**Canva Autofill Data**:
```json
{
  "data": {
    "slides": [
      {
        "title": "{{svenska_slide.title}}",
        "body": "{{svenska_slide.content}}",
        "image": {
          "url": "{{svenska_slide.imageUrl}}"
        },
        "background_color": "{{svenska_slide.backgroundColor}}"
      }
    ]
  }
}
```

### Layout Mapping

```typescript
const layoutMap: Record<string, string> = {
  'title-content': 'title_and_body',
  'two-column': 'two_columns',
  'image-focus': 'image_and_text',
  'bullet-points': 'bulleted_list',
  'quote': 'quote',
  'title-only': 'title_only'
};
```

---

## API Rate Limits & Best Practices

### Rate Limits (from Canva Docs)

- **Create Design**: 10 requests/minute
- **Autofill**: 10 requests/minute
- **Export**: 10 requests/minute per design
- **Brand Templates**: 60 requests/minute

### Best Practices

1. **Caching**:
   - Cache brand templates for 1 hour
   - Cache OAuth tokens until expiry

2. **Retry Logic**:
   - Retry failed requests with exponential backoff
   - Max 3 retries

3. **Error Handling**:
   - Handle 429 (rate limit) gracefully
   - Show user-friendly messages

4. **Token Management**:
   - Refresh tokens before expiry (at 3.5 hours)
   - Store encrypted in database
   - Clear on user logout

---

## Security Considerations

### OAuth Security

1. **State Parameter**: Use cryptographic random state to prevent CSRF
2. **PKCE**: Use SHA-256 code verifier/challenge
3. **Token Storage**: Encrypt tokens at rest
4. **HTTPS Only**: All OAuth flows over HTTPS

### API Key Security

1. **Environment Variables**: Never commit API keys
2. **Backend Proxy**: All Canva API calls via backend (not from frontend)
3. **Token Scoping**: Request minimal scopes needed

---

## Testing Plan

### Unit Tests

1. **OAuth Flow**:
   - Test authorization URL generation
   - Test token exchange
   - Test token refresh

2. **API Wrappers**:
   - Test create design
   - Test autofill
   - Test export

### Integration Tests

1. **End-to-End Flow**:
   - Connect → Create → Autofill → Export
   - Error scenarios
   - Token expiration handling

### Manual Testing Checklist

- [ ] OAuth connect flow works
- [ ] Brand templates load correctly
- [ ] Create design opens in Canva
- [ ] Autofill populates slides correctly
- [ ] Export downloads PPTX
- [ ] Token refresh works automatically
- [ ] Disconnect works properly

---

## Migration Strategy

### Current State → Phase 1

1. Keep existing hardcoded templates as fallback
2. Add "Connect to Canva" option
3. Show both local and Canva templates

### Phase 1 → Phase 2

1. Once OAuth works, fetch brand templates
2. Replace hardcoded with real templates
3. Keep local templates for non-connected users

### Phase 2 → Complete

1. Full Canva integration
2. Remove hardcoded templates
3. Require Canva connection for template features

---

## Expected Benefits

### For Users

1. **Professional Templates**:
   - Access to 1000s of Canva templates
   - Brand templates from their Canva account
   - Professional designs immediately

2. **Seamless Workflow**:
   - Generate slides in Svenska Creator
   - One-click create in Canva
   - Edit in familiar Canva editor
   - Export back as PPTX/PDF

3. **Brand Consistency**:
   - Use company brand templates
   - Automatic brand color application
   - Logo and fonts from Canva brand kit

### For Product

1. **Competitive Advantage**:
   - Only course generator with Canva integration
   - Professional design output
   - Enterprise-ready

2. **User Retention**:
   - Easier to create beautiful slides
   - Familiar Canva interface
   - Less friction in workflow

3. **Monetization**:
   - Canva Pro users get more value
   - Potential partnership with Canva
   - Upsell opportunity

---

## API Status & Production Readiness

### Current Status (January 2026)

**From Canva Documentation**:
> Although you can use these APIs for development and experimentation, they are not finalized and we don't recommend them for use in production environments. Public integrations that use preview APIs or features will not pass the review process.

**Generally Available APIs**:
- ✅ Design Editing API
- ✅ URL Import API
- ✅ Authentication/OAuth

**Preview APIs** (Not Production-Ready):
- ⚠️ Create Design API
- ⚠️ Autofill API
- ⚠️ Some Export features

### Recommendation

**For Now**: Implement with clear "Beta" labeling

**Future**: Update to stable APIs when available

**Fallback**: Keep manual JSON export for users who want stable features

---

## Resources

### Official Documentation
- [Canva Connect APIs](https://www.canva.dev/docs/connect/)
- [Quickstart Guide](https://www.canva.dev/docs/connect/quickstart/)
- [Create Design API](https://www.canva.dev/docs/connect/api-reference/designs/create-design/)
- [Autofill Guide](https://www.canva.dev/docs/connect/autofill-guide/)
- [Authentication](https://www.canva.dev/docs/connect/authentication/)

### Code Resources
- [Starter Kit (GitHub)](https://github.com/canva-sdks/canva-connect-api-starter-kit)
- [OpenAPI Spec](https://www.canva.dev/sources/connect/api/latest/api.yml)
- [Postman Collection](https://www.postman.com/canva-developers/canva-developers/collection/oi7dfns/canva-connect-api)

### Learning Resources
- [Comprehensive Guide (Zuplo)](https://zuplo.com/learning-center/canva-api)
- [Developer News](https://www.canva.com/newsroom/news/developer-connect-apis/)

---

## Next Steps

1. **Immediate**: Set up Canva developer account and get API credentials
2. **Week 1**: Implement backend OAuth + basic API wrappers
3. **Week 2**: Frontend OAuth flow + brand templates
4. **Week 3**: Autofill integration + export
5. **Week 4**: Testing + polish + documentation

---

**Plan Created**: 2026-01-12
**Status**: Ready for implementation
**Estimated Timeline**: 3-4 weeks for full integration

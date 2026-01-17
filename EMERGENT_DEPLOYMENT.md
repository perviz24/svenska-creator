# Emergent.sh Deployment Guide - Svenska Creator

**Date**: 2026-01-17
**Branch**: `claude/analyze-slide-connection-eFus7`

---

## 🚀 Quick Deploy to Emergent

### **Step 1: Add Environment Variables in Emergent**

Tell the Emergent agent or add manually in settings:

```bash
# ============================================================================
# Backend Environment Variables (REQUIRED)
# ============================================================================

EMERGENT_LLM_KEY=<your_emergent_llm_key>
PRESENTON_API_KEY=<your_presenton_api_key>

MONGO_URL=mongodb://localhost:27017
DB_NAME=svenska_creator
CORS_ORIGINS=*

# Canva Integration (ENABLED)
CANVA_CLIENT_ID=your_canva_client_id
CANVA_CLIENT_SECRET=your_canva_client_secret
CANVA_REDIRECT_URI=https://your-backend-url.emergent.sh/api/canva/callback

# ============================================================================
# Frontend Environment Variables (REQUIRED)
# ============================================================================

VITE_BACKEND_URL=https://your-backend-url.emergent.sh

# Demo Mode (Leave empty for no authentication required)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## ⚠️ Important: Update Canva Redirect URI

### **After Emergent deploys your backend:**

1. **Get your backend URL** from Emergent (e.g., `https://svenska-creator-api.emergent.sh`)

2. **Update in TWO places:**

   **A) In Emergent environment variables:**
   ```bash
   CANVA_REDIRECT_URI=https://your-actual-backend-url/api/canva/callback
   ```

   **B) In Canva Developer Portal:**
   - Go to https://www.canva.com/developers
   - Open your app settings
   - Add redirect URI: `https://your-actual-backend-url/api/canva/callback`
   - Click Save

3. **Redeploy** if needed

---

## 📝 Command to Tell Emergent Agent

Copy and paste this to Emergent:

```
Deploy branch: claude/analyze-slide-connection-eFus7

Add these environment variables:

Backend:
EMERGENT_LLM_KEY=<your_emergent_llm_key>
PRESENTON_API_KEY=<your_presenton_api_key>
MONGO_URL=mongodb://localhost:27017
DB_NAME=svenska_creator
CORS_ORIGINS=*
CANVA_CLIENT_ID=<your_canva_client_id>
CANVA_CLIENT_SECRET=<your_canva_client_secret>
CANVA_REDIRECT_URI=<use deployed backend URL>/api/canva/callback

Frontend:
VITE_BACKEND_URL=<use deployed backend URL>
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

Then show me the preview URL.
```

---

## ✅ What's Included in This Deployment

### **New Features (This Session):**

1. ✅ **Presenton Quality Improvements**
   - Web search enabled by default (+20-30% quality)
   - Simplified instructions for better design variety

2. ✅ **Canva Integration Phase 2** (FULL INTEGRATION!)
   - OAuth 2.0 connection
   - Brand template fetching
   - One-click autofill
   - Design management

3. ✅ **Export Improvements** (From Previous Session)
   - Designer-friendly PPTX export
   - Multi-method download fallbacks
   - Bullet point parsing fixes

---

## 🎯 Testing on Emergent Preview

Once deployed, test these features:

### **1. Demo Mode Access**
- Open preview URL
- Click "Testa Demo" button
- No login required!

### **2. Presenton Slide Generation**
- Create new presentation
- Choose "Presenton" generator
- Notice improved quality (web search enabled!)
- Generate slides

### **3. Canva Integration (NEW!)**
- Go to Canva tab
- Click "Anslut till Canva"
- OAuth popup opens
- Authorize with your Canva account
- Your brand templates load
- Click a template → Design auto-created in Canva!
- Edit in Canva's editor

### **4. Export**
- Export to Designer-Friendly PPTX
- Export to Styled PPTX
- Export to PDF
- All downloads should work

---

## 🔍 Troubleshooting

### **"Canva OAuth fails"**
- Check CANVA_REDIRECT_URI matches deployed backend URL
- Verify redirect URI is added in Canva Developer Portal
- Make sure both Client ID and Secret are correct

### **"Backend not found"**
- Verify VITE_BACKEND_URL is set correctly
- Check CORS_ORIGINS includes your frontend domain

### **"Presenton fails"**
- Verify PRESENTON_API_KEY is correct
- Check backend logs for errors

### **"EMERGENT_LLM fails"**
- Verify EMERGENT_LLM_KEY is correct
- Check API quota/limits

---

## 📊 Environment Variables Summary

| Variable | Value | Required? | Notes |
|----------|-------|-----------|-------|
| EMERGENT_LLM_KEY | <your_key> | ✅ Yes | AI generation |
| PRESENTON_API_KEY | <your_key> | ✅ Yes | Presenton slides |
| CANVA_CLIENT_ID | <your_id> | ✅ Yes (for Canva) | Phase 2 feature |
| CANVA_CLIENT_SECRET | <your_secret> | ✅ Yes (for Canva) | Phase 2 feature |
| CANVA_REDIRECT_URI | https://backend/api/canva/callback | ✅ Yes (for Canva) | Update after deploy |
| VITE_BACKEND_URL | https://backend-url | ✅ Yes | Frontend config |
| MONGO_URL | mongodb://localhost:27017 | ⚠️ Optional | Data persistence |
| CORS_ORIGINS | * | ✅ Yes | Allow requests |
| VITE_SUPABASE_URL | (empty) | ❌ No | Demo mode enabled |
| VITE_SUPABASE_PUBLISHABLE_KEY | (empty) | ❌ No | Demo mode enabled |

---

## 🎉 Expected Results

After deployment, you should be able to:

✅ Access demo mode without login
✅ Generate course outlines with AI
✅ Generate scripts with AI
✅ Generate slides with Presenton (improved quality!)
✅ Generate slides with Internal AI (designer-friendly!)
✅ Connect to Canva via OAuth
✅ Fetch your Canva brand templates
✅ Auto-create designs in Canva with one click
✅ Export to PPTX/PDF
✅ Download files successfully

---

## 📱 Access URLs (After Deployment)

**Frontend Preview:**
`https://your-frontend-url.emergent.sh`

**Backend API:**
`https://your-backend-url.emergent.sh`

**API Health Check:**
`https://your-backend-url.emergent.sh/health`

**Canva OAuth Callback:**
`https://your-backend-url.emergent.sh/api/canva/callback`

---

**Ready to Deploy!** 🚀

Copy the command above and send it to the Emergent agent.

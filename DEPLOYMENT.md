# Svenska Creator - Deployment Guide

## Current Status

- ✅ **Frontend**: Deployed to GitHub Pages at https://perviz24.github.io/svenska-creator/
- ⏳ **Backend**: Ready to deploy (see instructions below)

## Quick Deployment (Recommended: Render.com)

### Step 1: Deploy Backend to Render

1. Go to https://render.com and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect this repository: `perviz24/svenska-creator`
4. Configure the service:
   - **Name**: svenska-creator-backend
   - **Region**: Oregon (or closest to you)
   - **Branch**: main
   - **Root Directory**: backend
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

5. **Add Environment Variables** (click "Environment" tab):
   ```
   MONGO_URL=<your_mongodb_connection_string>
   DB_NAME=svenska_creator
   EMERGENT_LLM_KEY=<your_ai_key>
   PRESENTON_API_KEY=<your_presenton_key>
   PEXELS_API_KEY=<optional_media_key>
   ELEVENLABS_API_KEY=<optional_voice_key>
   ```

6. Click **"Create Web Service"**
7. Wait for deployment (5-10 minutes)
8. Copy your backend URL (e.g., `https://svenska-creator-backend.onrender.com`)

### Step 2: Update Frontend with Backend URL

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add a new repository secret:
   - **Name**: `VITE_BACKEND_URL`
   - **Value**: Your Render backend URL from Step 1

3. Update `.github/workflows/deploy-frontend.yml` to include environment variables:
   ```yaml
   - name: Build
     run: cd frontend && npm run build
     env:
       VITE_BACKEND_URL: ${{ secrets.VITE_BACKEND_URL }}
   ```

4. Commit and push - GitHub Actions will automatically redeploy

### Step 3: Test the Application

1. Visit: https://perviz24.github.io/svenska-creator/
2. Try creating a presentation
3. All features should now work!

## Required API Keys

### Essential (for basic functionality):
- **MONGO_URL**: MongoDB connection string (get free tier at https://mongodb.com/atlas)
- **EMERGENT_LLM_KEY**: AI model access key
- **PRESENTON_API_KEY**: For presentation generation

### Optional (for enhanced features):
- **PEXELS_API_KEY**: Stock photos
- **ELEVENLABS_API_KEY**: Voice synthesis
- **HEYGEN_API_KEY**: AI avatar videos
- **SUPABASE credentials**: Authentication and storage

## Alternative: Vercel Deployment

If you prefer Vercel:

1. **Frontend**: Already configured in `vercel.json`
2. **Backend**: Not recommended (limited Python support)
3. **Better approach**: Use Render for backend + GitHub Pages for frontend (current setup)

## Environment Variables Reference

See these files for all available configuration options:
- Backend: `backend/.env.example`
- Frontend: `frontend/.env.example`

## Troubleshooting

### "Failed to fetch" errors
- ✅ Check that VITE_BACKEND_URL is set correctly in GitHub Actions secrets
- ✅ Verify backend is running on Render
- ✅ Check Render logs for errors

### "Unknown error" when creating presentations
- ✅ Verify PRESENTON_API_KEY is set in Render environment variables
- ✅ Check EMERGENT_LLM_KEY is valid
- ✅ Ensure MONGO_URL is accessible from Render

### Build failures
- ✅ Check GitHub Actions logs
- ✅ Verify all dependencies are in package.json
- ✅ Clear build cache and retry

## Support

For issues or questions, check:
- Backend logs on Render dashboard
- GitHub Actions logs for frontend deployment
- Browser console for frontend errors

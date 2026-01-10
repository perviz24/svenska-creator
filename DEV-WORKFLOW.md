# Development Workflow Guide

## How We Work Together

This guide explains the development workflow for testing improvements before deploying to production.

## Workflow Overview

```
1. You request improvement
   ↓
2. I create feature branch (e.g., claude/new-feature)
   ↓
3. I push to GitHub (branch only, NOT main)
   ↓
4. You deploy that branch on emergent.sh
   ↓
5. You test on emergent.sh (works on mobile/desktop)
   ↓
6. If good → Merge to main | If needs work → I continue on same branch
```

## Step-by-Step Process

### When You Request an Improvement

**You say:** "Add feature X" or "Fix issue Y"

**I do:**
1. Create a new branch: `claude/descriptive-name`
2. Make the changes
3. Commit and push to GitHub
4. Tell you: "Changes ready on branch `claude/descriptive-name`"

### Testing on Emergent.sh

**You do:**

1. **Go to emergent.sh dashboard**
2. **Select the feature branch** to deploy (not main)
   - Look for branch name like: `claude/descriptive-name`
3. **Deploy** that branch
4. **Test** the deployed version
   - Works on mobile, tablet, desktop
   - Full backend + frontend deployed
   - Test all features I added/changed

### After Testing

**Option A: Changes Work ✅**
- Go to GitHub PR (I'll create one)
- Click "Merge pull request"
- Main branch now has the working feature
- Optional: Deploy main on emergent.sh as "stable" version

**Option B: Needs More Work 🔧**
- Tell me what needs fixing
- I continue working on the SAME branch
- Push updates
- You redeploy same branch on emergent.sh
- Test again
- Repeat until it works

**Option C: Doesn't Work at All ❌**
- Tell me to abandon this approach
- I create a new branch with different solution
- Old branch stays in GitHub (not merged)

## Benefits of This Workflow

✅ **Test before merging** - Main branch stays stable
✅ **Mobile testing** - Review on emergent.sh from anywhere
✅ **No local setup needed** - Everything deployed on emergent.sh
✅ **Easy rollback** - Just don't merge the PR
✅ **Iterate fast** - I keep updating same branch until it works
✅ **Clear history** - Each feature = one branch = one PR

## Branch Naming Convention

I'll use this pattern for branches:
- `claude/fix-supabase-error` - Bug fixes
- `claude/add-dark-mode` - New features
- `claude/improve-presenton-quality` - Enhancements
- `claude/refactor-api-calls` - Code improvements

## GitHub Pages Deployment

**Important:** GitHub Pages only deploys from `main` branch, not feature branches.

- Feature branches = NOT deployed to GitHub Pages
- Only after merge to main = Deployed to GitHub Pages
- This keeps your public site stable

## Emergent.sh Setup

**Recommended Configuration:**

1. **Have two deployments:**
   - **Staging**: Deploy feature branches for testing
   - **Production**: Deploy main branch only (when stable)

2. **Environment Variables:**
   - Set all API keys in emergent.sh dashboard
   - Same keys for both staging and production
   - Or use different keys if you want to test without affecting production data

## Current Status

- ✅ GitHub repository: `perviz24/svenska-creator`
- ✅ Feature branch: `claude/analyze-slide-connection-eFus7`
- ✅ Improvements included:
  - Presenton quality enhancements
  - GitHub Pages deployment fixes
  - Supabase configuration fixes
  - Full deployment configurations

**Next step:** Deploy `claude/analyze-slide-connection-eFus7` on emergent.sh to test all improvements!

## Common Scenarios

### Scenario 1: Testing Multiple Features
```
Branch A: claude/feature-one (testing on emergent.sh)
Branch B: claude/feature-two (ready, waiting for A to finish)

Test A → if good, merge → then test B
```

### Scenario 2: Working with Emergent.sh Agent Too
```
My branch: claude/my-feature
Emergent branch: emergent/their-feature

Test mine first → merge
Then test theirs → merge
No conflicts because tested separately
```

### Scenario 3: Emergency Fix
```
You: "Production is broken!"
Me: Create branch claude/hotfix-xyz
You: Deploy and test on emergent.sh immediately
If works: Fast merge to main
```

## Questions?

- **Can I test multiple branches at once?** Yes, if emergent.sh supports multiple deployments
- **What if I want to test locally later?** See `DEPLOYMENT.md` for local setup
- **How do I see what changed?** Check the PR on GitHub - shows all files changed
- **Can I edit the branch myself?** Yes, but tell me so we don't conflict

## Tips

💡 **Use descriptive names when requesting features** - helps me name branches clearly
💡 **Test thoroughly on emergent.sh** - check all affected features, not just new ones
💡 **Merge regularly** - don't let too many branches pile up
💡 **Keep main stable** - only merge tested, working code

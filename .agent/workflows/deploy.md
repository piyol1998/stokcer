---
description: Push changes to GitHub and deploy to Vercel
---

This workflow helps you push your local changes to GitHub. Since your project is connected to Vercel, pushing to GitHub will automatically trigger a deployment.

### 1. Set Remote (Run only once)
If you haven't linked this to your GitHub repository yet, run:
```powershell
git remote add origin [YOUR_GITHUB_REPO_URL]
```

### 2. Push Changes
// turbo
```powershell
git add .
git commit -m "Update from Antigravity"
git push -u origin main
```

### 3. Vercel Deployment
Once pushed, Vercel will automatically start building and deploying your site. You can monitor the progress on your [Vercel Dashboard](https://vercel.com/dashboard).

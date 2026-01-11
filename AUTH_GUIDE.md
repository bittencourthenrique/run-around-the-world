# GitHub Authentication Guide

Since GitHub CLI isn't available, we'll use a **Personal Access Token**. This is simple and secure!

## Step-by-Step Instructions

### Step 1: Create Personal Access Token

1. **Open this URL in your browser:**
   ```
   https://github.com/settings/tokens/new
   ```

2. **Fill in the form:**
   - **Note:** `Strava Journey App` (or any name you prefer)
   - **Expiration:** Choose your preference (90 days recommended)
   - **Scopes:** Check the `repo` checkbox (this gives full control of private repositories)
   
3. **Click "Generate token"** at the bottom

4. **IMPORTANT:** Copy the token immediately! It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ You won't be able to see it again after closing the page
   - Save it somewhere safe (password manager, notes, etc.)

### Step 2: Run the Setup Script

I've created a helper script for you. Run this command:

```bash
cd /Users/henriquealmeida/strava-journey-app
./setup-github-auth.sh
```

The script will:
- Ask you to paste your token
- Configure git to use the token
- Push both branches to GitHub
- Give you the PR link

### Alternative: Manual Method

If you prefer to do it manually:

```bash
cd /Users/henriquealmeida/strava-journey-app

# Replace YOUR_TOKEN with the token you copied
git remote set-url origin https://YOUR_TOKEN@github.com/bittencourthenrique/run-around-the-world.git

# Push main branch
git checkout main
git push -u origin main

# Push feature branch
git checkout feature/performance-optimizations
git push -u origin feature/performance-optimizations
```

### Step 3: Create Pull Request

After pushing, visit:
```
https://github.com/bittencourthenrique/run-around-the-world/compare/feature/performance-optimizations
```

Or go to your repository and click "Compare & pull request" when you see the banner.

## Security Note

The token is saved in `~/.github_token` with restricted permissions (600). You can delete it anytime with:
```bash
rm ~/.github_token
```

## Troubleshooting

**If push fails:**
- Make sure the token has `repo` scope checked
- Verify the token hasn't expired
- Check that the repository exists and you have access

**If you get "repository not found":**
- Make sure the repository `run-around-the-world` exists at: https://github.com/bittencourthenrique/run-around-the-world
- Verify you're logged into the correct GitHub account

**Need help?** Let me know what error message you see!

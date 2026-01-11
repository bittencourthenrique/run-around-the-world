# Setting Up Your First PR

Follow these steps to create your first Pull Request on GitHub:

## Step 1: Initialize Git Repository (if not already done)

```bash
cd /Users/henriquealmeida/strava-journey-app
git init
```

## Step 2: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `strava-journey-app`)
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. Copy the repository URL (e.g., `https://github.com/yourusername/strava-journey-app.git`)

## Step 3: Add Remote and Configure Git

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/strava-journey-app.git

# Configure your git user (if not already configured)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## Step 4: Stage All Files

```bash
# Add all files to staging
git add .

# Check what will be committed
git status
```

## Step 5: Create Initial Commit

```bash
git commit -m "Initial commit: Strava Journey Visualization MVP

- OAuth integration with Strava
- 3D globe map visualization with D3.js
- City search and route calculation
- Progress tracking with stats (distance, time, pace, elevation)
- Custom pin styles for activated/non-activated routes
- Performance optimizations for search and route loading"
```

## Step 6: Create Feature Branch for Your Changes

```bash
# Create and switch to a new branch
git checkout -b feature/performance-optimizations

# Or if you want to push the main branch first:
git checkout -b main
git push -u origin main
git checkout -b feature/performance-optimizations
```

## Step 7: Commit Your Performance Optimizations

```bash
# Stage the performance optimization changes
git add .

# Commit with descriptive message
git commit -m "Optimize search and route calculation performance

- Remove artificial 500ms delay from backend geocoding service
- Reduce debounce timeout from 500ms to 200ms for faster city search
- Remove redundant second API call fallback
- Add AbortController for request cancellation to prevent race conditions
- Implement delayed loading indicator (500ms) to prevent flickering
- Improve overall UX responsiveness"
```

## Step 8: Push to GitHub

```bash
# Push your branch to GitHub
git push -u origin feature/performance-optimizations
```

## Step 9: Create Pull Request

1. Go to your GitHub repository: `https://github.com/yourusername/strava-journey-app`
2. You should see a banner suggesting to create a PR for your new branch
3. Click "Compare & pull request"
4. Fill in the PR details:

**Title:**
```
Optimize search and route calculation performance
```

**Description:**
```markdown
## Summary
This PR optimizes the city search and route calculation performance to provide a faster, more responsive user experience.

## Changes

### City Search Performance
- ✅ Removed artificial 500ms delay from backend geocoding service
- ✅ Reduced debounce timeout from 500ms to 200ms for faster response
- ✅ Removed redundant second API call fallback (Brazil suffix)
- ✅ Added AbortController for request cancellation to prevent race conditions

### Route Calculation Performance  
- ✅ Implemented delayed loading indicator (500ms delay) to prevent flickering
- ✅ Loading indicator only shows if operation takes >500ms

## Performance Improvements
- **City search**: Response time reduced from 1000ms+ to ~200-500ms
- **Route calculation**: Loading indicator only appears for operations >500ms
- **Overall UX**: More responsive with less waiting

## Testing
- [x] City search responds faster
- [x] Loading indicator only shows for slow operations
- [x] No flickering on fast operations
- [x] Request cancellation works correctly
```

5. Click "Create pull request"

## Alternative: If Starting Fresh

If you want to start with the main branch first:

```bash
# After initial commit
git branch -M main
git push -u origin main

# Then create feature branch
git checkout -b feature/performance-optimizations
# ... make your changes and commit ...
git push -u origin feature/performance-optimizations
```

## Troubleshooting

If you get authentication errors:
- Use GitHub CLI: `gh auth login`
- Or use SSH: `git remote set-url origin git@github.com:yourusername/strava-journey-app.git`
- Or use Personal Access Token in the URL

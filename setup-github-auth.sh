#!/bin/bash

echo "🔐 GitHub Authentication Setup"
echo "================================"
echo ""
echo "This script will help you push to GitHub using a Personal Access Token."
echo ""

# Check if token is already set
if [ -f ~/.github_token ]; then
    echo "Found existing token file. Using it..."
    GITHUB_TOKEN=$(cat ~/.github_token)
else
    echo "Step 1: Create a Personal Access Token"
    echo "--------------------------------------"
    echo "1. Open this URL in your browser:"
    echo "   https://github.com/settings/tokens/new"
    echo ""
    echo "2. Fill in the form:"
    echo "   - Note: Strava Journey App"
    echo "   - Expiration: Choose your preference (90 days recommended)"
    echo "   - Scopes: Check 'repo' (full control of private repositories)"
    echo ""
    echo "3. Click 'Generate token'"
    echo "4. COPY the token (you won't see it again!)"
    echo ""
    read -p "Paste your token here and press Enter: " GITHUB_TOKEN
    
    # Save token securely
    echo "$GITHUB_TOKEN" > ~/.github_token
    chmod 600 ~/.github_token
    echo "✅ Token saved securely"
fi

echo ""
echo "Step 2: Configuring Git Remote"
echo "-------------------------------"

# Update remote URL to include token
cd /Users/henriquealmeida/strava-journey-app
git remote set-url origin https://${GITHUB_TOKEN}@github.com/bittencourthenrique/run-around-the-world.git

echo "✅ Remote configured with token"
echo ""

echo "Step 3: Pushing to GitHub"
echo "-------------------------"

# Push main branch
echo "Pushing main branch..."
git checkout main
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Main branch pushed successfully!"
    
    # Push feature branch
    echo ""
    echo "Pushing feature branch..."
    git checkout feature/performance-optimizations
    git push -u origin feature/performance-optimizations
    
    if [ $? -eq 0 ]; then
        echo "✅ Feature branch pushed successfully!"
        echo ""
        echo "🎉 Success! Your code is on GitHub!"
        echo ""
        echo "Next step: Create Pull Request"
        echo "Visit: https://github.com/bittencourthenrique/run-around-the-world/compare/feature/performance-optimizations"
    else
        echo "❌ Failed to push feature branch"
    fi
else
    echo "❌ Failed to push main branch"
    echo "Please check your token and try again"
fi

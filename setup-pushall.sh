#!/bin/bash

# Script untuk setup alias pushall dan remote origin2
# Usage: ./setup-pushall.sh

set -e

echo "🚀 Setting up git pushall alias and remotes..."
echo ""

# 1. Setup global alias pushall
echo "📝 Setting up global alias 'pushall'..."
git config --global alias.pushall "!git push origin && git push origin2"
echo "✅ Alias 'pushall' created globally"
echo ""

# 2. Check if we're in a git repository
if [ ! -d .git ]; then
    echo "⚠️  Warning: Not in a git repository. Skipping remote setup."
    echo "   Run this script from your repository directory."
    exit 0
fi

# 3. Check if origin exists
echo "🔍 Checking remote 'origin'..."
if git remote | grep -q "^origin$"; then
    echo "✅ Remote 'origin' exists:"
    git remote get-url origin
else
    echo "⚠️  Warning: Remote 'origin' not found."
    echo "   Make sure you've cloned the repository or added origin manually."
fi
echo ""

# 4. Check if origin2 exists, if not, add it
echo "🔍 Checking remote 'origin2'..."
if git remote | grep -q "^origin2$"; then
    echo "✅ Remote 'origin2' already exists:"
    git remote get-url origin2
else
    echo "📦 Adding remote 'origin2'..."
    read -p "Enter origin2 URL (default: https://github.com/kelastanpatembok/kelastanpatembok.git): " origin2_url
    origin2_url=${origin2_url:-https://github.com/kelastanpatembok/kelastanpatembok.git}
    
    # If URL contains username placeholder, prompt for username
    if [[ "$origin2_url" == *"@"* ]]; then
        git remote add origin2 "$origin2_url"
    else
        read -p "Enter GitHub username for origin2 (optional): " github_user
        if [ -n "$github_user" ]; then
            git remote add origin2 "https://${github_user}@github.com/kelastanpatembok/kelastanpatembok.git"
        else
            git remote add origin2 "$origin2_url"
        fi
    fi
    echo "✅ Remote 'origin2' added:"
    git remote get-url origin2
fi
echo ""

# 5. Verify setup
echo "🎉 Setup complete!"
echo ""
echo "📋 Current remotes:"
git remote -v
echo ""
echo "✨ You can now use: git pushall"
echo "   This will push to both origin and origin2 automatically."


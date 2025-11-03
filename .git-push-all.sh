#!/bin/bash
# Script to push to multiple remotes
# Usage: ./git-push-all.sh [branch_name]
# Example: ./git-push-all.sh develop

BRANCH=${1:-develop}

echo "Pushing to origin (SSH)..."
git push origin $BRANCH

if [ $? -ne 0 ]; then
  echo "Failed to push to origin"
  exit 1
fi

echo ""
echo "Pushing to origin2 (HTTPS with PAT)..."
echo "Please enter your GitHub Personal Access Token when prompted"
echo "Username: kelastanpatembok"
echo "Password: [Your PAT token]"

git push origin2 $BRANCH

if [ $? -ne 0 ]; then
  echo "Failed to push to origin2"
  exit 1
fi

echo ""
echo "Successfully pushed to both repositories!"

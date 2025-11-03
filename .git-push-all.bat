@echo off
REM Script to push to multiple remotes
REM Usage: .git-push-all.bat [branch_name]
REM Example: .git-push-all.bat develop

set BRANCH=%1
if "%BRANCH%"=="" set BRANCH=develop

echo Pushing to origin (SSH)...
git push origin %BRANCH%

if %errorlevel% neq 0 (
  echo Failed to push to origin
  exit /b %errorlevel%
)

echo.
echo Pushing to origin2 (HTTPS with PAT)...
echo Please enter your GitHub Personal Access Token when prompted
echo Username: kelastanpatembok
echo Password: [Your PAT token]

git push origin2 %BRANCH%

if %errorlevel% neq 0 (
  echo Failed to push to origin2
  exit /b %errorlevel%
)

echo.
echo Successfully pushed to both repositories!

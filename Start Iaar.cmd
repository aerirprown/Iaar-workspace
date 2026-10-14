@echo off
setlocal
set "IAAR_LAUNCH_ROOT=%~dp0"
if exist "%LOCALAPPDATA%\Iaar Workspace\iaar-workspace.exe" (
  start "" "%LOCALAPPDATA%\Iaar Workspace\iaar-workspace.exe" --repo "%IAAR_LAUNCH_ROOT%."
  exit /b 0
)
if exist "%IAAR_LAUNCH_ROOT%src-tauri\target\release\iaar-workspace.exe" (
  start "" "%IAAR_LAUNCH_ROOT%src-tauri\target\release\iaar-workspace.exe" --repo "%IAAR_LAUNCH_ROOT%."
  exit /b 0
)
echo Install Iaar Workspace from this project's GitHub Releases.
echo Or build with: powershell -NoProfile -ExecutionPolicy Bypass -File Setup.ps1 -Mode Desktop
echo See docs\getting-started.md for agent-guided setup.
pause

#!/usr/bin/env bash
# macOS / Linux counterpart of Setup.ps1.  Usage: ./setup.sh [check|preview|desktop]
set -euo pipefail
mode="${1:-check}"
cd "$(dirname "$0")"
[ -f workspace/workspace.json ] || { echo "Run setup.sh from the complete repository folder." >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1 && echo true || echo false; }
echo "Iaar Workspace setup"
echo "Node: $(has node) | npm: $(has npm) | Rust (desktop source build only): $(has cargo)"
has_cursor() {
  command -v cursor-agent >/dev/null 2>&1 && return 0
  local agent_path dir
  agent_path=$(command -v agent 2>/dev/null || true)
  [ -n "$agent_path" ] || return 1
  dir=$(dirname "$agent_path")
  [ "$(basename "$dir")" = cursor-agent ] && return 0
  [ -x "$dir/cursor-agent" ] && return 0
  return 1
}
echo "Codex CLI: $(has codex) | Claude Code CLI: $(has claude) | OpenCode: $(has opencode) | Cursor CLI: $(has_cursor && echo true || echo false)"
if ! command -v codex >/dev/null && ! command -v claude >/dev/null && ! command -v opencode >/dev/null && ! has_cursor; then
  echo "Install and configure Codex CLI, Claude Code CLI, OpenCode, or the Cursor CLI first. See docs/getting-started.md." >&2; exit 1
fi
case "$mode" in
  check)
    echo "Source preview: ./setup.sh preview"
    echo "Source desktop build: ./setup.sh desktop"; exit 0 ;;
  preview|desktop) ;;
  *) echo "Usage: ./setup.sh [check|preview|desktop]" >&2; exit 1 ;;
esac
command -v node >/dev/null && command -v npm >/dev/null || { echo "Install Node.js 22.20 or newer." >&2; exit 1; }
node -e "const p=process.versions.node.split('.').map(Number);if(p[0]<22||(p[0]===22&&p[1]<20))process.exit(1)" \
  || { echo "Node.js 22.20 or newer is required." >&2; exit 1; }
if [ "$mode" = desktop ] && ! command -v cargo >/dev/null; then
  echo "Install stable Rust (https://rustup.rs) and, on macOS, the Xcode Command Line Tools (xcode-select --install)." >&2; exit 1
fi
npm ci
if [ "$mode" = preview ]; then
  echo "Opening the report preview. Full terminal and voice features use the desktop app."
  exec npm run dev
fi
if [ "$(uname)" = Darwin ]; then
  npm run desktop:build -- --bundles app dmg
  echo "App ready in src-tauri/target/release/bundle/macos (disk image in bundle/dmg)."
  echo "Drag Iaar Workspace.app to Applications, then double-click 'Start Iaar.command'."
else
  npm run desktop:build:appimage
  echo "AppImage ready in src-tauri/target/release/bundle/appimage."
fi

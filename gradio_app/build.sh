#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADIO_DIR="$REPO_ROOT/gradio_app"
APP_DIR="$REPO_ROOT/app"

echo "→ Building React app..."
cd "$APP_DIR"
npm run build

echo "→ Copying dist to gradio_app/dist..."
rm -rf "$GRADIO_DIR/dist"
cp -r "$APP_DIR/dist" "$GRADIO_DIR/dist"

echo "→ Copying videos..."
mkdir -p "$GRADIO_DIR/dist/videos"
cp "$APP_DIR/public/videos/"*.mp4 "$GRADIO_DIR/dist/videos/"

echo "→ Copying landmarks..."
mkdir -p "$GRADIO_DIR/dist/landmarks"
cp "$APP_DIR/public/landmarks/"*.json "$GRADIO_DIR/dist/landmarks/"

echo "→ Copying favicon/icons..."
cp "$APP_DIR/public/favicon.svg" "$GRADIO_DIR/dist/" 2>/dev/null || true
cp "$APP_DIR/public/icons.svg"   "$GRADIO_DIR/dist/" 2>/dev/null || true

echo "✓ Done. Run: cd gradio_app && python3 app.py"

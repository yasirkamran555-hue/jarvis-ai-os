# JARVIS AI OS

A self-hosted, subscription-free personal AI operating system for desktop and mobile workflows.

## Tech stack

- Backend: Node.js + Express
- AI routing: local Ollama + Gemini + OpenRouter fallback
- Frontend: React + Vite + TailwindCSS
- Desktop shell: Electron
- Local model engine: Ollama

## Quick start

1. Install dependencies

```bash
npm install
```

2. Start the local model engine

```bash
docker-compose up -d
```

3. Start the app

```bash
npm run dev
```

4. For desktop app:

```bash
npm run start:electron
```

In chat, send **"open youtube inside of your instance"** to show YouTube inside
the Electron app. In a regular web browser, YouTube opens in the current tab
because YouTube prevents its homepage from being embedded in an iframe.

## Environment

Copy `.env.example` to `.env` and add your key(s) if using cloud providers.

## Notes

- Chat replies use the local Ollama model configured by `OLLAMA_MODEL`.
- The local model stays loaded for 30 minutes to avoid repeated cold-start delays. Defaults use a 2,048-token context, 256 generated tokens, and a 120-second request timeout to reduce memory use and keep replies responsive.
- Gemini and OpenRouter can be configured as optional providers for the basic AI API.
- The chat UI includes Quick, Balanced, and Deep response modes, persistent local chat history, and web search context.
- Web search uses Bing results and only shows results matching the query; search availability depends on network access.
- The desktop app can open YouTube inside JARVIS; the web app navigates the current tab because YouTube blocks iframe embedding.

## Main folders

- `backend/` - API server and AI service routing
- `frontend/` - React UI
- `electron/` - desktop app shell

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

## Environment

Copy `.env.example` to `.env` and add your key(s) if using cloud providers.

## Notes

- Local model routing defaults to Ollama.
- If the cloud provider is configured and available, it will be preferred.
- If the rate limit or service fails, the app falls back to local inference automatically.

## Main folders

- `backend/` - API server and AI service routing
- `frontend/` - React UI
- `electron/` - desktop app shell

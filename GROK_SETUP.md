# 🤖 GROK AI OS - Setup & Usage Guide

## Quick Start

### 1. Prerequisites
- Node.js 16+
- Docker & Docker Compose
- Ollama (for local AI models)

### 2. Installation

```bash
# Clone the repo (if you haven't)
cd jarvis-ai-os

# Install dependencies
npm install
npm --prefix frontend install

# Copy environment file
cp .env.example .env
```

### 3. Start Ollama (Local AI Engine)

```bash
# In a separate terminal
docker-compose up -d

# Or if you have Ollama installed locally:
ollama serve
```

### 4. Start the App

```bash
npm run dev
```

The app will start on:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

## Features

### 🧠 Advanced Reasoning
Ask Grok to analyze complex topics with deep reasoning.

### 🔍 Web Search Context
Enable search to include current context in responses.

### ✓ Fact-Checking
Get statements verified with sources and context.

### 💬 Smart Conversation
Multi-turn conversations with history retention.

### ⚡ Three Response Modes
- **Quick**: Fast responses
- **Balanced**: Speed + depth balance
- **Deep**: Advanced reasoning with full analysis

## API Endpoints

### Advanced Query
```
POST /api/advanced/query
Body: { prompt, sessionId, includeSearch, queryType }
```

### Reasoning
```
POST /api/advanced/reason
Body: { prompt, context, sessionId }
```

### Fact-Check
```
POST /api/advanced/factcheck
Body: { statement, sessionId }
```

### Conversation Management
```
GET /api/advanced/conversation/:sessionId
POST /api/advanced/conversation/:sessionId/clear
POST /api/advanced/conversation/:sessionId/context
```

## Troubleshooting

### Ollama Connection Error
- Ensure Ollama is running on http://localhost:11434
- Check `OLLAMA_URL` in `.env`

### Frontend can't reach API
- Ensure backend is running on port 4000
- Check CORS settings in `backend/server.js`
- Try http://localhost:4000/api/health

### Missing dependencies
```bash
npm install
npm --prefix frontend install
```

## Architecture

```
jarvis-ai-os/
├── backend/
│   ├── server.js           # Express server
│   ├── services/
│   │   ├── grokCore.js    # Grok AI logic
│   │   ├── advancedAI.js  # Advanced processing
│   │   ├── router.js       # AI routing
│   │   ├── ollama.js       # Ollama integration
│   │   └── gemini.js       # Gemini integration
│   └── routes/
│       ├── advanced.js     # Grok routes
│       ├── ai.js           # Basic AI routes
│       └── ...
├── frontend/
│   └── src/
│       ├── components/
│       │   └── GrokChat.jsx # Main UI
│       └── ...
└── docker-compose.yml
```

## Configuration

Edit `.env` to customize:

```env
# Port
PORT=4000

# Ollama settings
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Optional: Cloud providers
GEMINI_API_KEY=your_key
OPENROUTER_API_KEY=your_key

# Logging
LOG_LEVEL=info
```

## Tips

- Use **⚡ Quick** mode for fast responses
- Use **🧠 Deep** mode for complex analysis
- Enable **🔍 Search** for current topics
- Use **✓ Fact-check** to verify statements
- Keep conversations focused for better results

Enjoy! 🚀

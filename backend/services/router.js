import { callOllama } from './ollama.js';
import { callGemini } from './gemini.js';

const defaultLocalModel = process.env.OLLAMA_MODEL || 'llama3.1';

export async function routeAIRequest({ prompt, mode = 'local', context = '', selectedModel = defaultLocalModel }) {
  const safePrompt = `${context ? `${context}\n\n` : ''}${prompt}`;

  const attempts = [];

  if (mode === 'local' || !process.env.GEMINI_API_KEY) {
    attempts.push({ provider: 'local', runner: () => callOllama(safePrompt, selectedModel) });
  }

  if (process.env.GEMINI_API_KEY) {
    attempts.push({ provider: 'gemini', runner: () => callGemini(safePrompt, process.env.GEMINI_MODEL || 'gemini-2.0-flash') });
  }

  if (process.env.OPENROUTER_API_KEY) {
    attempts.push({ provider: 'openrouter', runner: async () => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
          messages: [{ role: 'user', content: safePrompt }],
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter request failed: ${body}`);
      }

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || 'No response from OpenRouter.';
    } });
  }

  if (attempts.length === 0) {
    return {
      provider: 'local',
      model: selectedModel,
      response: 'No providers configured. Ensure Ollama is running locally or add API keys to the .env file.',
      fallback: false
    };
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const response = await attempt.runner();
      return {
        provider: attempt.provider,
        model: selectedModel,
        response,
        fallback: attempt.provider !== 'local'
      };
    } catch (error) {
      lastError = error;
      console.warn(`AI provider failed: ${attempt.provider}`, error.message);
    }
  }

  const fallbackResponse = await callOllama(safePrompt, selectedModel).catch(() => {
    throw new Error(lastError?.message || 'All AI providers failed.');
  });

  return {
    provider: 'local',
    model: selectedModel,
    response: fallbackResponse,
    fallback: true
  };
}

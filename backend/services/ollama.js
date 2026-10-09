export async function callOllama(prompt, model = process.env.OLLAMA_MODEL || 'llama3.1:8b') {
  const numCtx = Number(process.env.OLLAMA_NUM_CTX || 2048);
  if (!Number.isInteger(numCtx) || numCtx <= 0) {
    throw new Error('OLLAMA_NUM_CTX must be a positive integer.');
  }
  const numPredict = Number(process.env.OLLAMA_NUM_PREDICT || 256);
  if (!Number.isInteger(numPredict) || numPredict <= 0) {
    throw new Error('OLLAMA_NUM_PREDICT must be a positive integer.');
  }
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('OLLAMA_TIMEOUT_MS must be a positive integer.');
  }

  try {
    const ollamaUrl = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || '30m',
        options: {
          temperature: 0.7,
          num_ctx: numCtx,
          num_predict: numPredict
        }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Ollama request failed: ${message}`);
    }

    const data = await response.json();
    if (typeof data?.response !== 'string' || !data.response.trim()) {
      throw new Error('Ollama returned an empty response.');
    }
    return data.response;
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${timeoutMs} ms.`);
    }
    throw new Error(`Local Ollama model unavailable: ${error.message}`);
  }
}

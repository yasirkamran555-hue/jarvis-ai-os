export async function callOllama(prompt, model = 'llama3.1') {
  const numCtx = Number(process.env.OLLAMA_NUM_CTX || 4096);
  if (!Number.isInteger(numCtx) || numCtx <= 0) {
    throw new Error('OLLAMA_NUM_CTX must be a positive integer.');
  }

  try {
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_ctx: numCtx
        }
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Ollama request failed: ${message}`);
    }

    const data = await response.json();
    return data?.response || 'No response returned from Ollama.';
  } catch (error) {
    throw new Error(`Local Ollama model unavailable: ${error.message}`);
  }
}

export async function callOllama(prompt, model = 'llama3.1') {
  try {
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7
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

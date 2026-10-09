import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '127.0.0.1',
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    timeout: Number(process.env.OLLAMA_TIMEOUT_MS || 120000)
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'openrouter/auto'
  },
  sandbox: {
    timeout: Number(process.env.SANDBOX_TIMEOUT_MS || 20000),
    maxSize: Number(process.env.SANDBOX_MAX_SIZE_MB || 50)
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    rateLimitMs: Number(process.env.RATE_LIMIT_MS || 100),
    maxRequests: Number(process.env.MAX_REQUESTS_PER_MIN || 60)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

export function validateConfig() {
  const errors = [];

  if (!config.ollama.url) errors.push('OLLAMA_URL not set');
  if (config.security.corsOrigin === '') errors.push('CORS_ORIGIN is empty');

  if (errors.length > 0) {
    console.warn('⚠️  Config warnings:', errors);
  }

  return errors;
}
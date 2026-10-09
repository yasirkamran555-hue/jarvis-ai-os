import { callOllama } from './ollama.js';
// Grok system personality
const GROK_SYSTEM_PROMPT = `You are Grok, an AI assistant inspired by Hitchhiker's Guide to the Galaxy.
Personality:
- Sharp, witty, sometimes sarcastic but never mean
- Intellectually honest and will challenge assumptions
- Provides deep analysis and reasoning
- Uses humor to make complex topics accessible
- Always direct and doesn't sugarcoat

Style:
- Engage conversationally
- Show your reasoning process
- Challenge the user's assumptions constructively
- Use relevant examples and analogies
- Be concise but thorough`;

export async function grokChat({
  prompt,
  context = '',
  conversationHistory = [],
  searchResults = [],
  mode = 'advanced'
}) {
  try {
    const enhancedPrompt = buildGrokPrompt({
      prompt,
      context,
      conversationHistory,
      searchResults
    });

    const response = await callOllama(
      `${enhancedPrompt}${modeInstruction(mode)}`,
      process.env.OLLAMA_MODEL || 'llama3.1'
    );

    return {
      ok: true,
      response,
      mode,
      timestamp: new Date().toISOString(),
      metadata: {
        reasoning_depth: mode === 'advanced' ? 'deep' : mode,
        has_search_context: searchResults.length > 0
      }
    };
  } catch (error) {
    console.error('Grok chat error', error.message);
    throw error;
  }
}

function modeInstruction(mode) {
  if (mode === 'quick') return '\nKeep the answer brief and direct.';
  if (mode === 'advanced') return '\nGive a thorough, well-structured answer with useful examples.';
  return '';
}

function buildGrokPrompt({ prompt, context, conversationHistory, searchResults }) {
  let fullPrompt = GROK_SYSTEM_PROMPT + '\n\n';

  if (conversationHistory.length > 0) {
    fullPrompt += 'Recent conversation:\n';
    conversationHistory.slice(-3).forEach(msg => {
      fullPrompt += `${msg.role}: ${msg.content}\n`;
    });
    fullPrompt += '\n';
  }

  if (searchResults.length > 0) {
    fullPrompt += 'Relevant context:\n';
    searchResults.forEach((result, i) => {
      fullPrompt += `${i + 1}. ${result.title}: ${result.snippet}\n`;
    });
    fullPrompt += '\n';
  }

  if (context) {
    fullPrompt += `Additional context: ${context}\n\n`;
  }

  fullPrompt += `User: ${prompt}\n\nGrok:`;
  return fullPrompt;
}

export async function searchWeb(query) {
  const searchUrl = new URL('https://www.bing.com/search');
  searchUrl.searchParams.set('q', query);

  const response = await fetch(searchUrl, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Web search failed with HTTP ${response.status}.`);
  }

  const html = await response.text();
  const stopWords = new Set(['about', 'after', 'also', 'and', 'are', 'but', 'for', 'from', 'how', 'into', 'latest', 'news', 'the', 'this', 'what', 'when', 'where', 'with']);
  const queryTerms = (query.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(term => term.length >= 2 && !stopWords.has(term));
  if (queryTerms.length === 0) {
    throw new Error('Add a few specific keywords to search the web.');
  }
  const queryTermPatterns = queryTerms.map(term => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i'));

  const results = [...html.matchAll(/<li\b[^>]*class="[^"]*\bb_algo\b[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(([, resultHtml]) => {
      const titleMatch = resultHtml.match(/<h2\b[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i);
      if (!titleMatch) return null;

      const snippetMatch = resultHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      const title = stripHtml(titleMatch[2]);
      const snippet = stripHtml(snippetMatch?.[1] || '');
      const url = resolveSearchResultUrl(decodeHtml(titleMatch[1]));
      const searchableText = `${title} ${snippet}`.toLowerCase();

      if (!title || !url || !snippet || !queryTermPatterns.some(pattern => pattern.test(searchableText))) return null;
      return { title, snippet, url };
    })
    .filter(Boolean)
    .slice(0, 5);

  if (results.length === 0) {
    throw new Error('The web search provider returned no relevant results. Try a more specific query.');
  }

  return results;
}

function resolveSearchResultUrl(href) {
  try {
    const parsed = new URL(href);
    const redirect = parsed.searchParams.get('u');
    if (redirect?.startsWith('a1')) {
      const decoded = Buffer.from(redirect.slice(2), 'base64url').toString('utf8');
      if (decoded.startsWith('https://') || decoded.startsWith('http://')) return decoded;
    }

    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {
    return null;
  }

  return null;
}

function stripHtml(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export async function factCheck(statement, searchContext = '', mode = 'balanced') {
  const prompt = `Fact-check this statement: "${statement}"
  
Provide:
1. Accuracy assessment (True/Partially True/Unverifiable)
2. Key sources and context
3. Related facts
4. Common misconceptions

Be thorough but concise.${searchContext ? `\n\nRelevant context and web search results:\n${searchContext}` : ''}${modeInstruction(mode)}`;

  return await callOllama(prompt, 'llama3.1');
}

export async function realtimeReasoning(prompt, context = '', mode = 'balanced') {
  const fullContext = `${context}\n\nAnalyze and provide deep reasoning:\n${prompt}${modeInstruction(mode)}`;
  return await callOllama(fullContext, 'llama3.1');
}

export async function analyzeCode(code, language, mode = 'balanced') {
  const prompt = `Review this ${language} code and provide:
1. What it does
2. Potential issues or improvements
3. Security concerns if any
4. Performance suggestions

Code:
\`\`\`${language}
${code}
\`\`\`${modeInstruction(mode)}`;

  return await callOllama(prompt, 'llama3.1');
}

import { callOllama } from './ollama.js';
import { callGemini } from './gemini.js';

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

    let response;
    if (mode === 'advanced') {
      response = await advancedReasoning(enhancedPrompt, conversationHistory);
    } else if (mode === 'quick') {
      response = await callOllama(enhancedPrompt, 'llama3.1');
    } else {
      response = await callOllama(enhancedPrompt, 'llama3.1');
    }

    return {
      ok: true,
      response,
      mode,
      timestamp: new Date().toISOString(),
      metadata: {
        reasoning_depth: mode === 'advanced' ? 'deep' : 'standard',
        has_search_context: searchResults.length > 0
      }
    };
  } catch (error) {
    console.error('Grok chat error', error.message);
    throw error;
  }
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

async function advancedReasoning(prompt, history) {
  return await callOllama(prompt, 'llama3.1');
}

export async function searchWeb(query) {
  const keywords = query.toLowerCase().split(' ');
  return [
    {
      title: `About ${keywords[0] || 'topic'}`,
      snippet: `Comprehensive information on ${query}. Deep analysis and context.`,
      url: 'https://example.com/1',
      relevance: 0.95
    },
    {
      title: `${keywords[1] || 'Latest'} insights`,
      snippet: `Real-time updates and recent developments related to your query.`,
      url: 'https://example.com/2',
      relevance: 0.87
    },
    {
      title: `Expert view: ${query}`,
      snippet: `Professional analysis and detailed perspectives from experts.`,
      url: 'https://example.com/3',
      relevance: 0.82
    }
  ];
}

export async function factCheck(statement) {
  const prompt = `Fact-check this statement: "${statement}"
  
Provide:
1. Accuracy assessment (True/Partially True/Unverifiable)
2. Key sources and context
3. Related facts
4. Common misconceptions

Be thorough but concise.`;

  return await callOllama(prompt, 'llama3.1');
}

export async function realtimeReasoning(prompt, context = '') {
  const fullContext = `${context}\n\nAnalyze and provide deep reasoning:\n${prompt}`;
  return await callOllama(fullContext, 'llama3.1');
}

export async function analyzeCode(code, language) {
  const prompt = `Review this ${language} code and provide:
1. What it does
2. Potential issues or improvements
3. Security concerns if any
4. Performance suggestions

Code:
\`\`\`${language}
${code}
\`\`\``;

  return await callOllama(prompt, 'llama3.1');
}

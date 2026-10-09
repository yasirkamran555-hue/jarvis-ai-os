import { grokChat, searchWeb, factCheck, realtimeReasoning, analyzeCode } from './grokCore.js';

export async function processAdvancedQuery({
  prompt,
  queryType = 'general',
  includeSearch = false,
  conversationHistory = [],
  context = '',
  mode = 'balanced'
}) {
  try {
    let searchResults = [];

    if (includeSearch) {
      searchResults = await searchWeb(prompt);
    }

    const searchContext = searchResults.length
      ? searchResults.map((result, index) => `${index + 1}. ${result.title}: ${result.snippet} (${result.url})`).join('\n')
      : '';
    const fullContext = [context, searchContext].filter(Boolean).join('\n\n');
    const historyContext = conversationHistory
      .slice(-5)
      .map(message => `${message.role}: ${message.content}`)
      .join('\n');
    const specializedContext = [context, historyContext, searchContext].filter(Boolean).join('\n\n');

    let result;
    if (queryType === 'reasoning') {
      result = await realtimeReasoning(prompt, specializedContext, mode);
    } else if (queryType === 'factcheck') {
      result = await factCheck(prompt, specializedContext, mode);
    } else if (queryType === 'code-review') {
      result = await analyzeCode(prompt, 'javascript', mode);
    } else {
      const grokResult = await grokChat({
        prompt,
        context: fullContext,
        conversationHistory,
        searchResults,
        mode
      });
      result = grokResult.response;
    }

    return {
      ok: true,
      response: result,
      hasSearch: searchResults.length > 0,
      searchResults: searchResults.slice(0, 3),
      queryType,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Advanced query error', error.message);
    throw error;
  }
}

export class ConversationManager {
  constructor(maxHistory = 20) {
    this.history = [];
    this.maxHistory = maxHistory;
    this.context = '';
  }

  addMessage(role, content, metadata = {}) {
    this.history.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getContext() {
    return this.history.slice(-5);
  }

  setCustomContext(context) {
    this.context = context;
  }

  clear() {
    this.history = [];
    this.context = '';
  }

  export() {
    return {
      history: this.history,
      context: this.context,
      size: this.history.length
    };
  }
}

export function detectIntent(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.match(/why|how|explain|understand|analyze|think/)) return 'reasoning';
  if (lowerPrompt.match(/code|function|debug|program|script/)) return 'code-review';
  if (lowerPrompt.match(/fact|true|verify|check|correct|accurate/)) return 'factcheck';
  if (lowerPrompt.match(/latest|news|current|today|happening|trends/)) return 'search';
  if (lowerPrompt.match(/create|write|generate|imagine|story|idea/)) return 'creative';
  
  return 'general';
}

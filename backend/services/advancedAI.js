import { grokChat, searchWeb, factCheck, realtimeReasoning, analyzeCode } from './grokCore.js';

export async function processAdvancedQuery({
  prompt,
  queryType = 'general',
  includeSearch = false,
  conversationHistory = [],
  context = ''
}) {
  try {
    let searchResults = [];

    if (includeSearch || shouldSearch(prompt)) {
      searchResults = await searchWeb(prompt);
    }

    let result;
    if (queryType === 'reasoning') {
      result = await realtimeReasoning(prompt, context);
    } else if (queryType === 'factcheck') {
      result = await factCheck(prompt);
    } else if (queryType === 'code-review') {
      result = await analyzeCode(prompt, 'javascript');
    } else {
      const grokResult = await grokChat({
        prompt,
        context,
        conversationHistory,
        searchResults,
        mode: 'advanced'
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

function shouldSearch(prompt) {
  const searchKeywords = ['latest', 'news', 'today', 'current', 'recent', 'now', 'happening', 'trends'];
  return searchKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
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

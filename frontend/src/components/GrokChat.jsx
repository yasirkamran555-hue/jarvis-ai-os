import { useState, useRef, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const responseModes = [
  { id: 'quick', label: '⚡ Quick', desc: 'Fast' },
  { id: 'balanced', label: '⚖️ Balanced', desc: 'Balanced' },
  { id: 'advanced', label: '🧠 Deep', desc: 'Reasoning' }
];

const queryTypes = [
  { id: 'general', label: '💬 Chat', icon: '🤖' },
  { id: 'reasoning', label: '🧠 Think', icon: '🔬' },
  { id: 'search', label: '🔍 Search', icon: '📡' },
  { id: 'factcheck', label: '✓ Fact-check', icon: '🔍' }
];

function isYouTubeOpenCommand(prompt) {
  return /\b(?:open|launch|go to|navigate to|show me)\b[\s\S]{0,60}\b(?:youtube(?:\.com)?|youtu\.be)\b/i.test(prompt);
}

export default function GrokChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '⚡ I\'m Grok. Ask me anything - reasoning, analysis, code review, fact-checking, or just conversation. What\'s on your mind?',
      isInitial: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseMode, setResponseMode] = useState('balanced');
  const [queryType, setQueryType] = useState('general');
  const [includeSearch, setIncludeSearch] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (isYouTubeOpenCommand(input)) {
        if (window.jarvis?.openYoutube) {
          await window.jarvis.openYoutube();
        } else {
          const youtubeWindow = window.open('https://www.youtube.com/', '_blank');
          if (!youtubeWindow) {
            throw new Error('Your browser blocked the YouTube tab. Allow pop-ups for this app and try again.');
          }
          youtubeWindow.opener = null;
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Opened YouTube in a new window.'
        }]);
        return;
      }

      let endpoint = '/advanced/query';
      let payload = {
        prompt: input,
        sessionId,
        includeSearch: includeSearch || queryType === 'search',
        queryType: queryType === 'general' ? 'general' : queryType
      };

      if (queryType === 'reasoning') {
        endpoint = '/advanced/reason';
      } else if (queryType === 'factcheck') {
        endpoint = '/advanced/factcheck';
        payload.statement = input;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        metadata: data.metadata || {}
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.searchResults && data.searchResults.length > 0) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Found ${data.searchResults.length} sources`,
          searchResults: data.searchResults
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${error.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-900/5 to-slate-950 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-block rounded-2xl border border-purple-500/30 bg-purple-900/20 px-8 py-4 backdrop-blur">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              ⚡ GROK
            </h1>
            <p className="text-xs text-purple-300 mt-2">Advanced AI Reasoning Engine</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4 rounded-2xl border border-purple-500/20 bg-slate-900/40 backdrop-blur p-4">
          {/* Response Mode */}
          <div>
            <p className="text-xs uppercase tracking-[0.2rem] text-purple-400 mb-2">⚙️ Mode</p>
            <div className="grid grid-cols-3 gap-2">
              {responseModes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setResponseMode(mode.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    responseMode === mode.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Query Types */}
          <div>
            <p className="text-xs uppercase tracking-[0.2rem] text-purple-400 mb-2">🎯 Type</p>
            <div className="grid grid-cols-4 gap-2">
              {queryTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setQueryType(type.id)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                    queryType === type.id
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/50'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Search */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSearch}
              onChange={(e) => setIncludeSearch(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-xs text-slate-300">🔍 Include search context</span>
          </label>
        </div>

        {/* Chat Area */}
        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur p-6 space-y-4 max-h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : message.role === 'system'
                    ? 'bg-slate-800/50 text-slate-300 text-xs italic'
                    : 'bg-slate-800/80 text-slate-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.searchResults && (
                  <div className="mt-2 space-y-1 border-t border-slate-700/50 pt-2">
                    {message.searchResults.map((result, i) => (
                      <a
                        key={i}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-purple-300 hover:text-purple-200"
                      >
                        {result.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 text-slate-300 px-4 py-3 rounded-lg">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Grok anything... (Shift+Enter for new line)"
            className="flex-1 rounded-lg border border-purple-500/30 bg-slate-900/80 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
            rows="3"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-bold text-white shadow-lg shadow-purple-500/30 transition hover:opacity-90 disabled:opacity-50 self-end"
          >
            {loading ? '⏳' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}

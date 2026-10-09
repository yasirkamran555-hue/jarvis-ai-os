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

function getYouTubeUrl(prompt) {
  const search = prompt.match(/\bsearch(?:\s+youtube)?\s+(?:for\s+)?(.+?)(?:\s+and\s+(?:open|play)\b.*)?$/i);
  if (search) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(search[1].trim())}`;
  }

  return 'https://www.youtube.com/';
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
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef(null);
  const conversationTitle = messages.find(message => message.role === 'user')?.content;

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
        const youtubeUrl = getYouTubeUrl(input);
        if (window.jarvis?.isElectron) {
          setYoutubeOpen(true);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Opened YouTube inside JARVIS.'
          }]);
        } else {
          window.location.assign(youtubeUrl);
        }
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

  const handleNewChat = () => {
    setMessages([{
      role: 'assistant',
      content: '⚡ I\'m Grok. Ask me anything - reasoning, analysis, code review, fact-checking, or just conversation. What\'s on your mind?',
      isInitial: true
    }]);
    setInput('');
    setYoutubeOpen(false);
    setSessionId(`session-${Date.now()}`);
  };

  return (
    <div className="flex h-screen min-h-[560px] overflow-hidden bg-[#0b0f14] text-[#e7e9ea]">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0b0f14] px-3 py-4 md:flex">
        <div className="mb-7 flex items-center gap-3 px-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-black">𝕏</span>
          <span className="text-lg font-semibold tracking-tight">Grok</span>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          disabled={loading}
          className="mb-5 flex h-11 items-center gap-3 rounded-full bg-[#e7e9ea] px-4 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50"
        >
          <span className="text-xl leading-none">+</span>
          New chat
        </button>

        <nav className="space-y-1" aria-label="Main navigation">
          <div className="flex items-center gap-4 rounded-full bg-white/10 px-4 py-3 text-sm font-medium">
            <span aria-hidden="true">✳</span>
            <span>Grok</span>
          </div>
          <div className="flex items-center gap-4 rounded-full px-4 py-3 text-sm text-[#8b98a5]">
            <span aria-hidden="true">⌕</span>
            <span>Explore</span>
          </div>
        </nav>

        <div className="mt-8 px-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#717b85]">Recent</p>
          {conversationTitle ? (
            <button
              type="button"
              title={conversationTitle}
              className="w-full truncate rounded-lg px-2 py-2 text-left text-sm text-[#aab3bb] hover:bg-white/5 hover:text-white"
            >
              {conversationTitle}
            </button>
          ) : (
            <p className="px-2 text-sm text-[#717b85]">Your chats will appear here</p>
          )}
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#263746] text-sm font-semibold">J</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">JARVIS AI OS</p>
            <p className="text-xs text-[#717b85]">Local assistant</p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 md:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-black md:hidden">𝕏</span>
            <h1 className="text-lg font-semibold tracking-tight">Grok</h1>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-[#aab3bb]">Beta</span>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[#c5cbd1]">
            <span className="text-[#8b98a5]">Mode</span>
            <select
              aria-label="Response mode"
              value={responseMode}
              onChange={event => setResponseMode(event.target.value)}
              className="max-w-28 cursor-pointer border-0 bg-transparent p-0 text-xs text-white outline-none"
            >
              {responseModes.map(mode => <option key={mode.id} value={mode.id} className="bg-[#111820]">{mode.label}</option>)}
            </select>
          </label>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {youtubeOpen && (
            <section className="mx-auto mt-4 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black" aria-label="YouTube browser">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold">YouTube</h2>
                <button
                  type="button"
                  onClick={() => setYoutubeOpen(false)}
                  className="rounded-full px-3 py-1.5 text-sm text-[#aab3bb] hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
              <webview
                src={getYouTubeUrl(messages.filter(message => message.role === 'user').at(-1)?.content || '')}
                title="YouTube"
                allowpopups="true"
                webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes"
                className="h-[55vh] min-h-[360px] w-full bg-white"
              />
            </section>
          )}

          <section
            className={`min-h-0 flex-1 overflow-y-auto px-4 md:px-8 ${messages.length === 1 && messages[0].isInitial ? 'flex items-center justify-center' : ''}`}
            aria-label="Conversation"
          >
            {messages.length === 1 && messages[0].isInitial ? (
              <div className="mx-auto max-w-2xl pb-16 text-center">
                <div className="mb-5 text-4xl text-white">✳</div>
                <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">What can I help with?</h2>
                <p className="text-sm text-[#8b98a5]">Ask anything, explore an idea, or get something done.</p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-8 py-8">
                {messages.filter(message => !message.isInitial).map((message, index) => (
                  <article key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role !== 'user' && (
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">✳</span>
                    )}
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'rounded-3xl bg-[#202a33] px-5 py-3' : 'pt-2'}`}>
                      <p className={`whitespace-pre-wrap text-[15px] leading-7 ${message.role === 'system' ? 'text-sm text-[#8b98a5]' : 'text-[#e7e9ea]'}`}>{message.content}</p>
                      {message.searchResults && (
                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                          {message.searchResults.map((result, resultIndex) => (
                            <a
                              key={resultIndex}
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-sky-300 hover:text-sky-200"
                            >
                              {result.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {loading && (
                  <div className="flex items-center gap-3 text-sm text-[#8b98a5]" role="status">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-black">✳</span>
                    Grok is thinking…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </section>

          <div className="shrink-0 px-4 pb-5 pt-3 md:px-8">
            <div className="mx-auto max-w-3xl rounded-[28px] border border-white/15 bg-[#151a20] px-4 py-3 shadow-lg transition focus-within:border-white/25">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything"
                aria-label="Message Grok"
                className="max-h-40 min-h-12 w-full resize-y border-0 bg-transparent px-1 py-2 text-[15px] leading-6 text-white outline-none placeholder:text-[#717b85]"
                rows="1"
                disabled={loading}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {queryTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setQueryType(type.id)}
                      aria-pressed={queryType === type.id}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        queryType === type.id
                          ? 'bg-white/15 text-white'
                          : 'text-[#8b98a5] hover:bg-white/5 hover:text-[#e7e9ea]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-[#8b98a5] hover:bg-white/5 hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeSearch}
                      onChange={event => setIncludeSearch(event.target.checked)}
                      className="accent-white"
                    />
                    Search context
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-black transition hover:bg-[#d7dbdf] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#717b85]"
                >
                  {loading ? '…' : '↑'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-[#717b85]">Grok can make mistakes. Check important information.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PersonalDataPanel from './PersonalDataPanel.jsx';

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

const welcomeMessage = {
  role: 'assistant',
  content: '⚡ I\'m Grok. Ask me anything - reasoning, analysis, code review, fact-checking, or just conversation. What\'s on your mind?',
  isInitial: true
};

const markdownComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-2xl font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-5 text-xl font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:text-sky-200">{children}</a>,
  blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-white/20 pl-4 text-[#aab3bb]">{children}</blockquote>,
  pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm">{children}</pre>,
  code: ({ children }) => <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#dbeafe]">{children}</code>
};

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem('jarvis-chats') || '[]');
    return Array.isArray(saved)
      ? saved.filter(chat => chat && typeof chat.id === 'string' && Array.isArray(chat.messages))
      : [];
  } catch (error) {
    console.warn('Could not restore saved chats:', error);
    return [];
  }
}

function loadPreferences() {
  try {
    return JSON.parse(localStorage.getItem('jarvis-preferences') || '{}');
  } catch (error) {
    console.warn('Could not restore saved preferences:', error);
    return {};
  }
}

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
  const [chats, setChats] = useState(loadChats);
  const [sessionId, setSessionId] = useState(() => {
    const saved = loadChats();
    const activeId = localStorage.getItem('jarvis-active-chat');
    return saved.some(chat => chat.id === activeId) ? activeId : (saved[0]?.id || `session-${Date.now()}`);
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseMode, setResponseMode] = useState(() => loadPreferences().responseMode || 'balanced');
  const [queryType, setQueryType] = useState(() => loadPreferences().queryType || 'general');
  const [includeSearch, setIncludeSearch] = useState(() => loadPreferences().includeSearch === true);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [personalDataOpen, setPersonalDataOpen] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(false);
  const [storageError, setStorageError] = useState('');
  const requestController = useRef(null);
  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);
  const activeChat = chats.find(chat => chat.id === sessionId);
  const messages = activeChat?.messages || [welcomeMessage];
  const conversationTitle = messages.find(message => message.role === 'user')?.content;

  useEffect(() => {
    let active = true;
    const restoreLocalData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/data`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);

        let storedChats = data.chats;
        const legacyChats = loadChats();
        if (storedChats.length === 0 && legacyChats.length > 0) {
          const importResponse = await fetch(`${BASE_URL}/data/chats/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chats: legacyChats })
          });
          const importData = await importResponse.json();
          if (!importResponse.ok) throw new Error(importData.error || `Chat import failed (HTTP ${importResponse.status}).`);
          storedChats = legacyChats;
        } else if (legacyChats.length > 0) {
          const legacyIds = new Set(legacyChats.map(chat => chat.id));
          storedChats = [...legacyChats, ...storedChats.filter(chat => !legacyIds.has(chat.id))].slice(0, 50);
        }

        if (!active) return;
        setChats(storedChats);
        const savedSessionId = localStorage.getItem('jarvis-active-chat');
        setSessionId(storedChats.some(chat => chat.id === savedSessionId)
          ? savedSessionId
          : (storedChats[0]?.id || `session-${Date.now()}`));
        setResponseMode(responseModes.some(mode => mode.id === data.preferences.responseMode)
          ? data.preferences.responseMode
          : 'balanced');
        setQueryType(queryTypes.some(type => type.id === data.preferences.queryType)
          ? data.preferences.queryType
          : 'general');
        setIncludeSearch(data.preferences.includeSearch === true);
        setStorageAvailable(true);
        setStorageError('');
      } catch (error) {
        if (!active) return;
        console.error('Could not load local JARVIS data:', error);
        setStorageError(`Local database unavailable: ${error.message}. Chats will stay in this browser until storage is restored.`);
      } finally {
        if (active) setDataReady(true);
      }
    };

    restoreLocalData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    try {
      localStorage.setItem('jarvis-chats', JSON.stringify(chats));
      localStorage.setItem('jarvis-active-chat', sessionId);
      localStorage.setItem('jarvis-preferences', JSON.stringify({ responseMode, queryType, includeSearch }));
    } catch (error) {
      console.error('Could not save the browser backup of JARVIS data:', error);
      setStorageError(`Browser backup could not be saved: ${error.message}.`);
    }
    if (!storageAvailable) return;

    const timer = setTimeout(async () => {
      try {
        const [chatResponse, preferenceResponse] = await Promise.all([
          fetch(`${BASE_URL}/data/chats`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chats })
          }),
          fetch(`${BASE_URL}/data/preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ responseMode, queryType, includeSearch })
          })
        ]);
        for (const response of [chatResponse, preferenceResponse]) {
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
          }
        }
        setStorageError('');
      } catch (error) {
        console.error('Could not persist JARVIS data:', error);
        setStorageAvailable(false);
        setStorageError(`Could not save to the local database: ${error.message}. Your browser backup is still available.`);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [chats, sessionId, responseMode, queryType, includeSearch, dataReady, storageAvailable]);

  const retryLocalStorage = async () => {
    try {
      const response = await fetch(`${BASE_URL}/data`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
      if (data.chats.length === 0 && chats.length > 0) {
        const importResponse = await fetch(`${BASE_URL}/data/chats/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chats })
        });
        const importData = await importResponse.json();
        if (!importResponse.ok) throw new Error(importData.error || `Chat import failed (HTTP ${importResponse.status}).`);
      } else {
        const localIds = new Set(chats.map(chat => chat.id));
        setChats([...chats, ...data.chats.filter(chat => !localIds.has(chat.id))].slice(0, 50));
      }
      setStorageAvailable(true);
      setStorageError('');
    } catch (error) {
      console.error('Could not reconnect to the local JARVIS database:', error);
      setStorageError(`Local database is still unavailable: ${error.message}.`);
    }
  };

  const updateChatMessages = (chatId, update) => {
    setChats(current => {
      const existing = current.find(chat => chat.id === chatId);
      const nextMessages = update(existing?.messages || [welcomeMessage]);
      const nextTitle = existing?.title || nextMessages.find(message => message.role === 'user')?.content?.slice(0, 80) || '';
      const nextChat = { id: chatId, title: nextTitle, messages: nextMessages, updatedAt: Date.now() };
      return [nextChat, ...current.filter(chat => chat.id !== chatId)].slice(0, 50);
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const chatId = sessionId;
    updateChatMessages(chatId, previous => [...previous.filter(message => !message.isInitial), userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (isYouTubeOpenCommand(input)) {
        const youtubeUrl = getYouTubeUrl(input);
        if (window.jarvis?.isElectron) {
          setYoutubeOpen(true);
          updateChatMessages(chatId, previous => [...previous, {
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
        sessionId: chatId,
        includeSearch: includeSearch || queryType === 'search',
        queryType: queryType === 'general' ? undefined : queryType,
        mode: responseMode
      };
      const controller = new AbortController();
      requestController.current = controller;

      if (queryType === 'reasoning') {
        endpoint = '/advanced/reason';
      } else if (queryType === 'factcheck') {
        endpoint = '/advanced/factcheck';
        payload.statement = input;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        metadata: data.metadata || {}
      };

      updateChatMessages(chatId, previous => [...previous, assistantMessage]);

      if (data.searchResults && data.searchResults.length > 0) {
        updateChatMessages(chatId, previous => [...previous, {
          role: 'system',
          content: `Found ${data.searchResults.length} sources`,
          searchResults: data.searchResults
        }]);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        updateChatMessages(chatId, previous => [...previous, {
          role: 'assistant',
          content: `⚠️ Error: ${error.message}`
        }]);
      }
    } finally {
      requestController.current = null;
      setLoading(false);
    }
  };

  const handleStop = () => requestController.current?.abort();

  const handleExplore = () => {
    setQueryType('search');
    setIncludeSearch(true);
    setSidebarOpen(false);
    composerRef.current?.focus();
  };

  const handleNewChat = () => {
    const nextId = `session-${Date.now()}`;
    setChats(current => [{ id: nextId, title: '', messages: [welcomeMessage], updatedAt: Date.now() }, ...current]);
    setSessionId(nextId);
    setInput('');
    setYoutubeOpen(false);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen min-h-[560px] overflow-hidden bg-[#0b0f14] text-[#e7e9ea]">
      {sidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex shadow-2xl' : 'hidden md:flex'} w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0b0f14] px-3 py-4 md:static md:shadow-none`}>
        <div className="mb-7 flex items-center gap-3 px-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-black">𝕏</span>
          <span className="text-lg font-semibold tracking-tight">Grok</span>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
              disabled={loading || !dataReady}
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
          <button
            type="button"
            onClick={handleExplore}
            className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-left text-sm text-[#8b98a5] hover:bg-white/5 hover:text-white"
          >
            <span aria-hidden="true">⌕</span>
            <span>Explore</span>
          </button>
        </nav>

        <div className="mt-8 px-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#717b85]">Recent</p>
          {chats.filter(chat => chat.title).length > 0 ? (
            <div className="max-h-[45vh] space-y-1 overflow-y-auto">
              {chats.filter(chat => chat.title).map(chat => (
                <button
                  key={chat.id}
                  type="button"
                  title={chat.title}
                  onClick={() => {
                    setSessionId(chat.id);
                    setYoutubeOpen(false);
                    setSidebarOpen(false);
                  }}
                  className={`w-full truncate rounded-lg px-2 py-2 text-left text-sm transition ${
                    chat.id === sessionId ? 'bg-white/10 text-white' : 'text-[#aab3bb] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {chat.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 text-sm text-[#717b85]">Your chats will appear here</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setPersonalDataOpen(true);
            setSidebarOpen(false);
          }}
          className="mb-3 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#aab3bb] hover:bg-white/5 hover:text-white"
        >
          <span aria-hidden="true">▤</span>
          <span>Your personal data</span>
        </button>

        <div className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#263746] text-sm font-semibold">J</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">JARVIS AI OS</p>
            <p className="text-xs text-[#717b85]">Local data storage</p>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 md:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#aab3bb] hover:bg-white/10 md:hidden"
            >
              ☰
            </button>
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

        {storageError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/20 bg-amber-300/5 px-4 py-2 text-xs text-amber-100/90 md:px-7">
            <span>{storageError}</span>
            {!storageAvailable && <button type="button" onClick={retryLocalStorage} className="rounded-full border border-amber-100/20 px-3 py-1 hover:bg-white/5">Retry local storage</button>}
          </div>
        )}

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
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#e7e9ea]">{message.content}</p>
                      ) : (
                        <div className={`text-[15px] leading-7 ${message.role === 'system' ? 'text-sm text-[#8b98a5]' : 'text-[#e7e9ea]'}`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</ReactMarkdown>
                        </div>
                      )}
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
                ref={composerRef}
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
                disabled={loading || !dataReady}
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
                  onClick={loading ? handleStop : handleSend}
                  disabled={!loading && (!input.trim() || !dataReady)}
                  aria-label={loading ? 'Stop generating' : 'Send message'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-semibold transition ${
                    loading
                      ? 'bg-white/15 text-white hover:bg-white/25'
                      : 'bg-white text-black hover:bg-[#d7dbdf] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#717b85]'
                  }`}
                >
                  {loading ? '■' : '↑'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-[#717b85]">Grok can make mistakes. Check important information.</p>
          </div>
        </div>
      </main>
      <PersonalDataPanel open={personalDataOpen} onClose={() => setPersonalDataOpen(false)} />
    </div>
  );
}

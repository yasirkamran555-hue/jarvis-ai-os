import { useEffect, useMemo, useState } from 'react';
import VoiceJarvis from './components/VoiceJarvis.jsx';
import CodeSandbox from './components/CodeSandbox.jsx';
import ModelSelector from './components/ModelSelector.jsx';
import SystemDashboard from './components/SystemDashboard.jsx';
import { getHealth, sendChatMessage, fetchSystemStatus } from './services/api.js';

const starterPrompts = [
  'Summarize today’s highest-priority tasks.',
  'Create a Python script to monitor CPU and memory.',
  'Give me a daily intelligence brief for my workspace.'
];

export default function App() {
  const [status, setStatus] = useState('Connecting...');
  const [systemData, setSystemData] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'JARVIS is online. Ask for a daily brief, system diagnostics, or code generation.'
    }
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('local');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const health = await getHealth();
        setStatus(health.ok ? 'Online' : 'Degraded');
      } catch (error) {
        setStatus('Offline');
      }

      try {
        const sys = await fetchSystemStatus();
        setSystemData(sys);
      } catch (error) {
        setSystemData({
          hostname: 'local-machine',
          platform: 'unknown',
          memory: { total: 'N/A', free: 'N/A', used: 'N/A' }
        });
      }
    };

    init();
  }, []);

  const systemSummary = useMemo(() => {
    if (!systemData) return 'Awaiting system diagnostics...';
    return `${systemData.hostname} • ${systemData.platform} • ${systemData.memory?.used || '0 GB'} used`;
  }, [systemData]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendChatMessage({
        prompt: input.trim(),
        mode: model,
        selectedModel: model === 'local' ? 'llama3.1' : 'gemini-2.0-flash'
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `System error: ${error.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-sky-500/20 bg-slate-900/60 p-5 shadow-glow md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28rem] text-sky-300">JARVIS AI OS</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Personal AI Command Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${status === 'Online' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
              {status}
            </span>
            <button className="button-primary">Wake Jarvis</button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-[0.2rem] text-slate-400">Mode</p>
                <h2 className="mt-3 text-xl font-semibold text-sky-300">Local-first</h2>
              </div>
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-[0.2rem] text-slate-400">Voice</p>
                <h2 className="mt-3 text-xl font-semibold text-cyan-300">Ready</h2>
              </div>
              <div className="panel p-4">
                <p className="text-xs uppercase tracking-[0.2rem] text-slate-400">Sandbox</p>
                <h2 className="mt-3 text-xl font-semibold text-violet-300">Active</h2>
              </div>
            </div>

            <div className="panel p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-sky-300">AI Command Console</h3>
                <ModelSelector value={model} onChange={setModel} />
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="button-secondary text-xs"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mb-4 space-y-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-xl p-3 ${message.role === 'assistant' ? 'bg-sky-500/10 text-sky-100' : 'bg-slate-800 text-slate-100'}`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-[0.2rem] text-slate-400">{message.role}</div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                ))}
                {loading && <div className="text-sm text-sky-300">JARVIS is thinking...</div>}
              </div>

              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={3}
                  className="flex-1 resize-none"
                  placeholder="Ask JARVIS to summarize, build code, or diagnose your machine..."
                />
                <button className="button-primary self-end" onClick={handleSend} disabled={loading}>
                  {loading ? 'Working...' : 'Send'}
                </button>
              </div>
            </div>

            <CodeSandbox />
          </div>

          <div className="space-y-6">
            <VoiceJarvis />
            <SystemDashboard summary={systemSummary} systemData={systemData} />
          </div>
        </div>
      </div>
    </div>
  );
}

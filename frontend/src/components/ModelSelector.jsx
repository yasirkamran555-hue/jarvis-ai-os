export default function ModelSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs uppercase tracking-[0.2rem] text-slate-400">Router</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-[140px]">
        <option value="local">Local Ollama</option>
        <option value="gemini">Gemini</option>
        <option value="openrouter">OpenRouter</option>
      </select>
    </div>
  );
}

import { useState } from 'react';
import { runCode } from '../services/api.js';

export default function CodeSandbox() {
  const [language, setLanguage] = useState('bash');
  const [code, setCode] = useState('# Example: print local environment\nnode -v\npython3 --version');
  const [output, setOutput] = useState('Execution output will appear here...');
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const result = await runCode({ language, code });
      setOutput(result.stdout || result.stderr || 'No output received.');
    } catch (error) {
      setOutput(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-violet-300">Local Code Sandbox</h3>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="bash">bash</option>
          <option value="python">python</option>
          <option value="javascript">javascript</option>
        </select>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        className="w-full font-mono text-sm"
      />

      <div className="mt-4 flex justify-end">
        <button className="button-primary" onClick={handleRun} disabled={loading}>
          {loading ? 'Running...' : 'Execute'}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 font-mono text-xs text-slate-200">
        {output}
      </div>
    </div>
  );
}

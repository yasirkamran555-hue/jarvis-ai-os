import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options) {
  const response = await fetch(`${BASE_URL}/data${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  return data;
}

function formatSize(size) {
  return size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export default function PersonalDataPanel({ open, onClose }) {
  const [memories, setMemories] = useState([]);
  const [files, setFiles] = useState([]);
  const [memoryInput, setMemoryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async signal => {
    setLoading(true);
    setError('');
    try {
      const [memoryData, fileData] = await Promise.all([
        request('/memories', { signal }),
        request('/files', { signal })
      ]);
      setMemories(memoryData.memories);
      setFiles(fileData.files);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [open]);

  if (!open) return null;

  const addMemory = async event => {
    event.preventDefault();
    const content = memoryInput.trim();
    if (!content) return;
    setLoading(true);
    setError('');
    try {
      await request('/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      setMemoryInput('');
      await refresh();
    } catch (saveError) {
      setError(saveError.message);
      setLoading(false);
    }
  };

  const uploadFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a file no larger than 5 MB.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const contentBase64 = String(dataUrl).split(',')[1];
      await request('/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, contentBase64 })
      });
      await refresh();
    } catch (uploadError) {
      setError(uploadError.message);
      setLoading(false);
    }
  };

  const downloadFile = async file => {
    setError('');
    try {
      const response = await fetch(`${BASE_URL}/data/files/${encodeURIComponent(file.id)}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Download failed (HTTP ${response.status}).`);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  };

  const deleteItem = async (path, label) => {
    setLoading(true);
    setError('');
    try {
      await request(path, { method: 'DELETE' });
      await refresh();
    } catch (deleteError) {
      setError(`Could not delete ${label}: ${deleteError.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-data-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111820] p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="personal-data-title" className="text-xl font-semibold">Your personal data</h2>
            <p className="mt-1 text-sm text-[#8b98a5]">Stored in <code className="text-[#c5cbd1]">data/jarvis.db</code> on this computer. Memories are included in JARVIS chat context.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close personal data" className="rounded-full px-3 py-1 text-lg text-[#aab3bb] hover:bg-white/10">×</button>
        </div>

        <div className="mb-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100/80">
          The local database is not encrypted. Anyone with access to your Windows account and app files may be able to read it. Uploaded files are stored here and are not sent to the AI.
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

        <section aria-labelledby="memories-title" className="mb-7">
          <h3 id="memories-title" className="mb-3 text-sm font-semibold">Saved memories</h3>
          <form onSubmit={addMemory} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={memoryInput}
              onChange={event => setMemoryInput(event.target.value)}
              maxLength={2000}
              placeholder="For example: I prefer concise answers."
              aria-label="New personal memory"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
            <button type="submit" disabled={loading || !memoryInput.trim()} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">Save memory</button>
          </form>
          <ul className="mt-3 space-y-2">
            {memories.map(memory => (
              <li key={memory.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.04] p-3 text-sm">
                <span className="whitespace-pre-wrap">{memory.content}</span>
                <button type="button" disabled={loading} onClick={() => deleteItem(`/memories/${encodeURIComponent(memory.id)}`, 'memory')} className="shrink-0 text-xs text-red-300 hover:text-red-200 disabled:opacity-50">Delete</button>
              </li>
            ))}
            {!loading && memories.length === 0 && <li className="text-sm text-[#717b85]">No saved memories yet.</li>}
          </ul>
        </section>

        <section aria-labelledby="files-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id="files-title" className="text-sm font-semibold">Uploaded files</h3>
              <p className="mt-1 text-xs text-[#717b85]">Up to 5 MB per file and 100 MB total. Files are stored locally, not analyzed by the AI.</p>
            </div>
            <label className={`cursor-pointer rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
              Add file
              <input type="file" className="sr-only" aria-label="Upload a file to local storage" onChange={uploadFile} disabled={loading} />
            </label>
          </div>
          <ul className="space-y-2">
            {files.map(file => (
              <li key={file.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-3 text-sm">
                <span className="min-w-0 truncate">{file.name}<span className="ml-2 text-xs text-[#717b85]">{formatSize(file.size)}</span></span>
                <span className="flex shrink-0 gap-3">
                  <button type="button" onClick={() => downloadFile(file)} className="text-xs text-sky-300 hover:text-sky-200">Download</button>
                  <button type="button" disabled={loading} onClick={() => deleteItem(`/files/${encodeURIComponent(file.id)}`, 'file')} className="text-xs text-red-300 hover:text-red-200 disabled:opacity-50">Delete</button>
                </span>
              </li>
            ))}
            {!loading && files.length === 0 && <li className="text-sm text-[#717b85]">No uploaded files yet.</li>}
          </ul>
        </section>

        {loading && <p role="status" className="mt-4 text-xs text-[#8b98a5]">Updating local data…</p>}
      </section>
    </div>
  );
}

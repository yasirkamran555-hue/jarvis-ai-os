export default function SystemDashboard({ summary, systemData }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 text-lg font-semibold text-emerald-300">System Dashboard</h3>
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
        {summary}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 p-3">
          <span className="text-slate-400">Hostname</span>
          <span>{systemData?.hostname || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 p-3">
          <span className="text-slate-400">Platform</span>
          <span>{systemData?.platform || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 p-3">
          <span className="text-slate-400">Memory Used</span>
          <span>{systemData?.memory?.used || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

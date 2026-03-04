import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              LogSage
            </h1>
            <p className="text-sm text-neutral-400 mt-1">AI-Native SRE Agent Cockpit</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">System Active</span>
          </div>
        </header>

        <Dashboard />
      </div>
    </main>
  );
}

import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ResultsPanel from './components/ResultsPanel';

function App() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalysis = (result) => {
    setAnalysisResult(result);
  };

  const handleLoadingChange = (value) => {
    setLoading(value);
  };

  const handleErrorChange = (value) => {
    setError(value);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(251,113,133,0.14),_transparent_55%)]" />

      <div className="relative max-w-6xl mx-auto px-4 py-8 lg:py-10">
        <header className="mb-8 lg:mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-300 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time log insights
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Log Analyzer AI</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Drop in server logs and instantly get categorized issues, root cause hypotheses, and practical fixeswithout
              reading every line.
            </p>
          </div>

          <div className="flex gap-2 text-xs text-slate-400">
            <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
              <p className="font-medium text-slate-200">Backend</p>
              <p className="mt-1">http://localhost:5000/api/analyze</p>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] items-start">
          <FileUpload
            onResult={handleAnalysis}
            onLoadingChange={handleLoadingChange}
            onErrorChange={handleErrorChange}
          />
          <ResultsPanel result={analysisResult} loading={loading} error={error} />
        </main>
      </div>
    </div>
  );
}

export default App;

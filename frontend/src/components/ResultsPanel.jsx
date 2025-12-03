import React from 'react';

function ResultsPanel({ result, loading, error }) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-[0_18px_45px_rgba(15,23,42,0.95)] backdrop-blur min-h-[260px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-300">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <div className="text-center">
            <p className="font-medium">Analyzing log with AI…</p>
            <p className="mt-1 text-xs text-slate-400">This usually takes only a few seconds.</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-700/70 bg-slate-950/80 shadow-[0_18px_45px_rgba(127,29,29,0.85)] min-h-[260px]">
        <div className="px-5 py-4 border-b border-red-900/70 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-red-300">Error while analyzing log</h2>
        </div>
        <div className="px-5 py-4 text-sm text-red-100 whitespace-pre-wrap">
          {error}
        </div>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-[0_18px_45px_rgba(15,23,42,0.95)] backdrop-blur min-h-[260px] flex items-center justify-center text-center">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Analysis results</h2>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Upload a log file to generate a compact incident summary with root cause and suggested fixes.
          </p>
        </div>
      </section>
    );
  }

  const analysis = result.analysis || {};

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-[0_18px_45px_rgba(15,23,42,0.95)] backdrop-blur max-h-[480px] overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800/70 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Analysis results</h2>
          <p className="mt-1 text-xs text-slate-400">Summarized from the uploaded log file.</p>
        </div>
        {result.filename && (
          <span className="max-w-[180px] truncate rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-200">
            {result.filename}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4 overflow-y-auto">
        {analysis.issueType && (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Issue type</p>
            <p className="text-sm font-medium text-slate-50">{analysis.issueType}</p>
          </div>
        )}

        {analysis.rootCause && (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Likely root cause</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {analysis.rootCause}
            </p>
          </div>
        )}

        {Array.isArray(analysis.suggestedFix) && analysis.suggestedFix.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Suggested fixes</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
              {analysis.suggestedFix.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
          {analysis.severity && (
            <div className="space-y-1">
              <p className="uppercase tracking-wide text-slate-500">Severity</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-medium">
                <span
                  className={
                    'h-1.5 w-1.5 rounded-full ' +
                    (analysis.severity === 'Critical'
                      ? 'bg-red-400'
                      : analysis.severity === 'High'
                      ? 'bg-orange-400'
                      : analysis.severity === 'Medium'
                      ? 'bg-amber-300'
                      : 'bg-emerald-300')
                  }
                />
                {analysis.severity}
              </span>
            </div>
          )}

          {typeof analysis.confidence === 'number' && (
            <div className="space-y-1">
              <p className="uppercase tracking-wide text-slate-500">Confidence</p>
              <p className="text-sm">{analysis.confidence}%</p>
            </div>
          )}
        </div>

        {Array.isArray(analysis.relatedLogs) && analysis.relatedLogs.length > 0 && (
          <div className="space-y-1 text-[11px]">
            <p className="uppercase tracking-wide text-slate-500">Related log patterns</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.relatedLogs.map((item, index) => (
                <span
                  key={index}
                  className="rounded-full bg-slate-900/90 px-2 py-1 text-xs text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ResultsPanel;

import React, { useState } from 'react';
import { analyzeLogFile } from '../api';

function FileUpload({ onResult, onLoadingChange, onErrorChange }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (onErrorChange) onErrorChange(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      if (onErrorChange) onErrorChange('Please select a log file to upload.');
      return;
    }

    try {
      if (onLoadingChange) onLoadingChange(true);
      if (onErrorChange) onErrorChange(null);

      const result = await analyzeLogFile(selectedFile);
      if (onResult) onResult(result);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Failed to analyze log file.';
      if (onErrorChange) onErrorChange(message);
    } finally {
      if (onLoadingChange) onLoadingChange(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-[0_18px_45px_rgba(15,23,42,0.95)] backdrop-blur">
      <div className="border-b border-slate-800/70 px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Upload log file</h2>
          <p className="mt-1 text-xs text-slate-400">
            Drop in a single log file to generate a summarized incident report.
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          .log / .txt / .json
        </span>
      </div>

      <form className="space-y-4 px-5 py-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-xs font-medium text-slate-300 mb-2 block">Log file</span>
          <div className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 px-4 py-6 text-center hover:border-emerald-500/60 transition-colors">
            <input
              type="file"
              accept=".log,.txt,.json"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="pointer-events-none">
              <p className="text-sm font-medium text-slate-100">
                {selectedFile ? selectedFile.name : 'Click to choose a log file'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Up to 10MB. Raw text or server log files work best.
              </p>
            </div>
          </div>
        </label>

        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>
            We never echo your full log back in the UIonly summarized insights.
          </p>
        </div>

        <button
          type="submit"
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_10px_35px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400 hover:shadow-[0_16px_45px_rgba(16,185,129,0.6)]"
        >
          Analyze log
        </button>
      </form>
    </section>
  );
}

export default FileUpload;

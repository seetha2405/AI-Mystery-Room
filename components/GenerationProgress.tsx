'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GenerationProgress({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Connecting to the case room...');
  const [statusText, setStatusText] = useState('Waiting for the generation stream.');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setError('');
    const stream = new EventSource(`/api/cases/jobs/${jobId}/stream`);
    stream.onmessage = (event) => {
      const update = JSON.parse(event.data) as {
        stage?: string;
        percent?: number;
        message?: string;
        done?: boolean;
        caseId?: string;
        error?: { message?: string };
      };

      if (update.error) {
        setError(update.error.message || 'Generation failed. Please try again.');
        stream.close();
        return;
      }
      if (update.done && update.caseId) {
        stream.close();
        router.replace(`/case/${update.caseId}`);
        return;
      }
      if (typeof update.percent === 'number') setProgress(update.percent);
      if (update.stage) setStage(update.stage.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()));
      if (update.message) setStatusText(update.message);
    };
    stream.onerror = () => {
      setError('The generation stream was interrupted. Retry to reconnect.');
      stream.close();
    };

    return () => stream.close();
  }, [jobId, retry, router]);

  return (
    <div className="card p-8">
      <p className="gold text-sm uppercase tracking-[0.24em]">Generation in progress</p>
      <h2 className="mt-3 text-3xl font-bold">{stage}</h2>
      <p className="mt-3 muted">{statusText}</p>

      <div className="mt-8 h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm muted">
        <span>{progress}%</span>
        <span>AI pipeline</span>
      </div>

      {error ? (
        <div role="alert" className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((current) => current + 1)} className="mt-3 rounded-lg border border-slate-600 px-4 py-2 text-sm hover:border-yellow-400">Retry stream</button>
        </div>
      ) : null}

      <button type="button" onClick={() => router.push('/')} className="mt-6 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-yellow-400">Cancel</button>
    </div>
  );
}

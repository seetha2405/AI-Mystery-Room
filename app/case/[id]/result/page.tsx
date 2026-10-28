'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SecretSolution } from '@/lib/types';

export default function CaseResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [solution, setSolution] = useState<SecretSolution | null>(null);
  const [correct, setCorrect] = useState(searchParams.get('correct') === 'true');

  useEffect(() => {
    if (!params?.id) return;
    const raw = window.localStorage.getItem(`ai-mystery-solutions:${params.id}`);
    if (raw) {
      setSolution(JSON.parse(raw));
    }
    const result = window.localStorage.getItem('ai-mystery-last-result');
    if (result) {
      const parsed = JSON.parse(result);
      setCorrect(parsed.correct);
    }
  }, [params?.id]);

  if (!solution) {
    return <main className="app-shell"><div className="card p-8">Loading verdict...</div></main>;
  }

  return (
    <main className="app-shell max-w-5xl space-y-6">
      <div className={`card p-8 ${correct ? 'success' : 'problem'}`}>
        <p className="text-xs uppercase tracking-[0.24em] text-yellow-300">Verdict</p>
        <h1 className="mt-3 text-4xl font-bold">{correct ? 'Correct accusation' : 'Wrong accusation'}</h1>
        <p className="mt-3 text-lg muted">{correct ? 'You solved the case.' : 'The case was not solved. The truth has been revealed below.'}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Truth</h2>
          <div className="mt-4 space-y-3 text-sm">
            <p><span className="font-semibold">Culprit:</span> {solution.culpritId}</p>
            <p><span className="font-semibold">Motive:</span> {solution.motive}</p>
            <p><span className="font-semibold">Method:</span> {solution.method}</p>
            <p><span className="font-semibold">Opportunity:</span> {solution.opportunity}</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-2xl font-bold">Timeline</h2>
          <ul className="mt-4 space-y-3">
            {solution.timeline.map((entry) => (
              <li key={entry.time} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                <span className="font-semibold text-yellow-300">{entry.time}</span> — {entry.event}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-bold">Clue map</h2>
        <div className="mt-4 space-y-4">
          {solution.clueMap.map((clue) => (
            <div key={clue.clueId} className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="font-semibold">{clue.clueId}</p>
              <p className="mt-2 text-sm muted">{clue.explanation}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-yellow-300">Evidence: {clue.evidenceIds.join(', ')}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-bold">Red herrings</h2>
        <div className="mt-4 space-y-4">
          {solution.redHerrings.map((item) => (
            <div key={item.suspectId} className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="font-semibold">{item.suspectId}</p>
              <p className="mt-2 text-sm muted">{item.whatItLooksLike}</p>
              <p className="mt-2 text-sm">Why it fails: {item.whyItFails}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/" className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-slate-950">Play again</Link>
        <Link href="/cases" className="rounded-xl border border-slate-700 px-4 py-2">My Cases</Link>
      </div>
    </main>
  );
}

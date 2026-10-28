'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicCase } from '@/lib/types';

export default function MyCasesList() {
  const [cases, setCases] = useState<{ publicCase: PublicCase }[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('ai-mystery-cases');
      setCases(raw ? JSON.parse(raw) : []);
    } catch {
      setCases([]);
    }
  }, []);

  if (!cases.length) {
    return (
      <div className="card p-8">
        <h2 className="text-2xl font-bold">My Cases</h2>
        <p className="mt-4 muted">No cases yet. Generate your first mystery from the home screen.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-slate-950">Back home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map(({ publicCase }) => (
        <Link key={publicCase.id} href={`/case/${publicCase.id}`} className="card block p-5 transition hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-yellow-300">{publicCase.difficulty}</p>
              <h3 className="mt-2 text-xl font-bold">{publicCase.title}</h3>
              <p className="mt-2 muted">{publicCase.setting}</p>
            </div>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs uppercase">{publicCase.status}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

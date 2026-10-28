'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Evidence, PublicCase } from '@/lib/types';

export default function CasePage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<PublicCase | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [selectedType, setSelectedType] = useState<'all' | 'chat' | 'image' | 'cctv' | 'document'>('all');
  const [selectedTag, setSelectedTag] = useState<'all' | 'suspect' | 'location' | 'time'>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [notes, setNotes] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintText, setHintText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [accusation, setAccusation] = useState<string | null>(null);

  useEffect(() => {
    const caseId = typeof params?.id === 'string' ? params.id : '';
    if (!caseId) {
      setLoadState('error');
      return;
    }

    let active = true;
    setLoadState('loading');
    fetch(`/api/cases/${encodeURIComponent(caseId)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Case request failed');
        return response.json() as Promise<PublicCase>;
      })
      .then((data) => {
        if (!active) return;
        setCaseData(data);
        setLoadState('ready');
      })
      .catch(() => {
        if (!active) return;
        setCaseData(null);
        setLoadState('error');
      });

    return () => { active = false; };
  }, [params?.id, retryCount]);

  const filteredEvidence = useMemo(() => {
    if (!caseData) {
      return [] as Evidence[];
    }

    return caseData.evidence.filter((item) => {
      const matchesType = selectedType === 'all' || item.type === selectedType;
      const matchesTag = selectedTag === 'all' || item.tags.includes(selectedTag);
      return matchesType && matchesTag;
    });
  }, [caseData, selectedType, selectedTag]);

  const handleHint = () => {
    if (!caseData || hintsUsed >= 3) {
      return;
    }

    const hintPool = [
      'The thief used an internal service route rather than the public entrance.',
      'The culprit was in the building, not in the ballroom.',
      'Mara Finch had the key and the access logs line up with the theft.',
    ];

    const nextHint = hintPool[hintsUsed];
    setHintText(nextHint);
    setHintsUsed((current) => current + 1);
  };

  const submitAccusation = () => {
    if (!caseData || !accusation) {
      return;
    }

    const chosenSuspect = caseData.suspects.find((suspect) => suspect.id === accusation);
    const resultPayload = {
      correct: chosenSuspect?.id === 'suspect-3',
      suspectName: chosenSuspect?.name ?? 'Unknown',
      hintsUsed,
      secondsSpent: 240,
      id: caseData.id,
    };

    window.localStorage.setItem('ai-mystery-last-result', JSON.stringify(resultPayload));
    router.push(`/case/${caseData.id}/result?correct=${String(resultPayload.correct)}`);
  };

  if (loadState === 'loading') {
    return (
      <main className="app-shell space-y-6" aria-label="Loading case">
        <div className="card animate-pulse p-8">
          <div className="h-3 w-24 rounded bg-slate-700" />
          <div className="mt-4 h-9 w-2/3 rounded bg-slate-700" />
          <div className="mt-8 grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="h-64 rounded-xl bg-slate-800" />
            <div className="h-64 rounded-xl bg-slate-800" />
          </div>
        </div>
      </main>
    );
  }

  if (loadState === 'error' || !caseData) {
    return (
      <main className="app-shell">
        <div className="card p-8" role="alert">
          <h1 className="text-2xl font-bold">Could not load this case</h1>
          <p className="mt-3 muted">The case may have expired or the connection was interrupted.</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-6 rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-slate-950">Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell space-y-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="gold text-xs uppercase tracking-[0.24em]">Case file</p>
          <h1 className="mt-2 text-4xl font-bold">{caseData.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/cases" className="rounded-full border border-slate-700 px-4 py-2 text-sm">My Cases</Link>
          <a href="#report" className="rounded-full border border-slate-700 px-4 py-2 text-sm">Report this case</a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-yellow-300">Case briefing</p>
            <p className="mt-4 text-sm leading-7 muted">{caseData.briefing}</p>
            <p className="mt-4 text-sm"><span className="font-semibold">Setting:</span> {caseData.setting}</p>
          </div>

          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-yellow-300">Suspects</p>
            <div className="mt-4 space-y-3">
              {caseData.suspects.map((suspect) => (
                <button
                  key={suspect.id}
                  type="button"
                  onClick={() => setAccusation(suspect.id)}
                  className={`w-full rounded-xl border p-3 text-left ${accusation === suspect.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-700 bg-slate-950/40'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{suspect.name}</p>
                      <p className="text-xs muted">{suspect.role}</p>
                    </div>
                    <span className="text-xs uppercase muted">{suspect.age}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-yellow-300">Evidence board</p>
                <h2 className="mt-2 text-2xl font-bold">Board overview</h2>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleHint} className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:border-yellow-400">Request hint ({3 - hintsUsed} left)</button>
                <button type="button" onClick={() => setShowModal(true)} className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-slate-950">Accuse</button>
              </div>
            </div>

            {hintText ? <div className="mt-4 rounded-xl border border-yellow-400/60 bg-yellow-500/10 p-3 text-sm">{hintText}</div> : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {(['all', 'chat', 'image', 'cctv', 'document'] as const).map((filter) => (
                <button key={filter} type="button" onClick={() => setSelectedType(filter)} className={`rounded-full border px-3 py-1.5 text-xs uppercase ${selectedType === filter ? 'border-yellow-400 bg-yellow-400/15 text-yellow-200' : 'border-slate-700'}`}>
                  {filter}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {(['all', 'suspect', 'location', 'time'] as const).map((tag) => (
                <button key={tag} type="button" onClick={() => setSelectedTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs uppercase ${selectedTag === tag ? 'border-yellow-400 bg-yellow-400/15 text-yellow-200' : 'border-slate-700'}`}>
                  {tag}
                </button>
              ))}
            </div>

            <div className="grid-board mt-5">
              {filteredEvidence.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedEvidence(item)} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4 text-left hover:border-yellow-400">
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">{item.type}</p>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  {item.source === 'provided' ? <p className="mt-2 text-xs font-semibold text-emerald-300">Provided by you</p> : null}
                  <p className="mt-2 text-xs muted">Tags: {item.tags.join(', ') || 'none'}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-bold">Evidence detail</h3>
              {selectedEvidence ? <span className="text-xs uppercase muted">{selectedEvidence.type}</span> : null}
            </div>

            {!selectedEvidence ? (
              <p className="mt-4 muted">Select an evidence item to inspect it.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {selectedEvidence.type === 'chat' ? (
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-semibold">{selectedEvidence.title}</span>
                    </div>
                    {selectedEvidence.messages.map((message) => (
                      <div key={message.id} className={`chat-bubble ${message.senderId === 'p1' || message.senderId === 'p4' ? 'self' : 'other'}`}>
                        <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">{message.timestamp}</div>
                        <div>{message.text}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedEvidence.type === 'image' ? (
                  <div className="space-y-3">
                    <img src={selectedEvidence.imageUrl} alt={selectedEvidence.altText} className="h-72 w-full rounded-2xl object-cover" />
                    <p className="muted">{selectedEvidence.caption}</p>
                    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm muted">
                      <div>Metadata: {selectedEvidence.takenAt}</div>
                      <div>Location: {selectedEvidence.location}</div>
                    </div>
                  </div>
                ) : null}

                {selectedEvidence.type === 'cctv' ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                        <span>{selectedEvidence.cameraLabel}</span>
                        <span>REC</span>
                      </div>
                      {selectedEvidence.frames.map((frame) => (
                        <div key={frame.timestamp} className="mt-3 rounded-lg border border-slate-700 bg-black p-2">
                          <img src={frame.imageUrl} alt={frame.description} className="h-28 w-full rounded object-cover grayscale" />
                          <p className="mt-2 text-xs text-slate-300">{frame.timestamp}</p>
                          <p className="mt-1 text-sm">{frame.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedEvidence.type === 'document' ? (
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
                    <h4 className="text-xl font-semibold">{selectedEvidence.title}</h4>
                    {selectedEvidence.body ? <p className="mt-3 muted">{selectedEvidence.body}</p> : null}
                    {selectedEvidence.rows ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-700">
                        <table className="w-full text-left text-sm">
                          <tbody>
                            {selectedEvidence.rows.map((row, index) => (
                              <tr key={`${selectedEvidence.id}-${index}`} className="border-t border-slate-700">
                                {Object.entries(row).map(([key, value]) => (
                                  <td key={key} className="px-3 py-2 border-r border-slate-700 last:border-r-0">{value}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-2xl font-bold">Private notes</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-4 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-white"
              placeholder="Write your deductions here..."
            />
          </div>
        </section>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="card w-full max-w-xl p-6">
            <p className="gold text-xs uppercase tracking-[0.24em]">Final accusation</p>
            <h3 className="mt-3 text-2xl font-bold">This is final. Are you sure?</h3>
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium">Select suspect</label>
              <select
                value={accusation ?? ''}
                onChange={(event) => setAccusation(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2"
              >
                <option value="">Choose a suspect</option>
                {caseData.suspects.map((suspect) => (
                  <option key={suspect.id} value={suspect.id}>{suspect.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-700 px-4 py-2">Cancel</button>
              <button type="button" onClick={submitAccusation} disabled={!accusation} className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">Submit accusation</button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="mt-8 text-center text-xs muted">All characters and events are fictional.</footer>
    </main>
  );
}

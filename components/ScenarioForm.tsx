'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';

const examples = [
  'A jewel disappears from a hotel during a wedding rehearsal.',
  'A museum conservator finds their rare painting replaced with a copy.',
  'A ferry host vanishes with a bag of blackmail letters at midnight.',
  'A newspaper editor receives a warning before the city archive is ransacked.',
  'A vineyard owner loses a locked ledger just before an acquisition deal.',
];

type ProofFile = { file: File; previewUrl: string };

export default function ScenarioForm() {
  const router = useRouter();
  const [scenario, setScenario] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [proofs, setProofs] = useState<ProofFile[]>([]);
  const [evidenceText, setEvidenceText] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const proofUrls = useRef(new Set<string>());
  const descriptionIsValid = scenario.trim().length >= config.scenarioMinLength
    && scenario.trim().length <= config.scenarioMaxLength;

  useEffect(() => () => proofUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addProofs = (files: FileList | null) => {
    if (!files) return;

    const nextProofs = [...proofs];
    for (const file of Array.from(files)) {
      if (nextProofs.length >= config.maxProofFiles) {
        setStatus(`You can add up to ${config.maxProofFiles} images.`);
        break;
      }

      const extension = file.name.toLowerCase().split('.').pop();
      const acceptedType = config.allowedProofMimeTypes.includes(file.type as typeof config.allowedProofMimeTypes[number])
        || (file.type === '' && ['png', 'jpg', 'jpeg'].includes(extension ?? ''));
      if (!acceptedType) {
        setStatus(`${file.name} is not a PNG or JPG image.`);
        continue;
      }
      if (file.size > config.maxProofFileBytes) {
        setStatus(`${file.name} exceeds the 5 MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      proofUrls.current.add(previewUrl);
      nextProofs.push({ file, previewUrl });
    }

    setProofs(nextProofs);
  };

  const removeProof = (index: number) => {
    const removed = proofs[index];
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
      proofUrls.current.delete(removed.previewUrl);
    }
    setProofs((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!descriptionIsValid || loading) return;

    setLoading(true);
    setStatus('Checking your case details and proofs...');

    try {
      const formData = new FormData();
      formData.set('scenario', scenario.trim());
      formData.set('difficulty', difficulty);
      formData.set('evidenceText', evidenceText);
      proofs.forEach(({ file }) => formData.append('files', file));

      const response = await fetch('/api/cases', { method: 'POST', body: formData });
      const json = await response.json();
      if (!response.ok || !json.jobId) {
        setStatus(json?.error?.message || 'Your case could not be created. Please try again.');
        setLoading(false);
        return;
      }

      router.push(`/generate/${json.jobId}`);
    } catch {
      setStatus('We could not reach the case service. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <div className="mb-6">
        <p className="gold text-sm uppercase tracking-[0.22em]">AI Mystery Room</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Give us a story. We&apos;ll give you a crime.</h1>
      </div>

      <section aria-labelledby="description-label">
        <label id="description-label" htmlFor="scenario" className="mb-3 block text-sm font-medium">Case description</label>
        <textarea
          id="scenario"
          className="w-full min-h-32 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-yellow-400"
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
          minLength={config.scenarioMinLength}
          maxLength={config.scenarioMaxLength}
          required
          aria-describedby="scenario-count"
        />
        <p id="scenario-count" className="mt-2 text-right font-mono text-xs muted">
          {scenario.length} / {config.scenarioMaxLength}
        </p>
      </section>

      <section aria-labelledby="proofs-heading" className="mt-6 border-t border-slate-700 pt-5">
        <h2 id="proofs-heading" className="text-lg font-semibold">Proofs (optional)</h2>
        <p className="mt-1 text-sm muted">Add up to 5 PNG or JPG images, 5 MB each.</p>
        <label htmlFor="proof-files" className="mt-4 inline-flex cursor-pointer rounded-lg border border-slate-600 px-4 py-2 text-sm hover:border-yellow-400">
          Choose images
        </label>
        <input
          id="proof-files"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          multiple
          onChange={(event) => {
            addProofs(event.target.files);
            event.target.value = '';
          }}
          className="sr-only"
        />

        {proofs.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Selected proof images">
            {proofs.map(({ file, previewUrl }, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-700">
                <img src={previewUrl} alt={`Preview of ${file.name}`} className="h-28 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-2 text-xs">
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => removeProof(index)} aria-label={`Remove ${file.name}`} className="shrink-0 rounded border border-slate-600 px-2 py-1 hover:border-red-400">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <label htmlFor="evidence-text" className="mb-2 mt-5 block text-sm font-medium">Paste text evidence</label>
        <textarea
          id="evidence-text"
          className="w-full min-h-24 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-yellow-400"
          value={evidenceText}
          onChange={(event) => setEvidenceText(event.target.value)}
          placeholder="Chat logs, notes, or other evidence..."
          maxLength={10000}
        />
      </section>

      <section className="mt-6 border-t border-slate-700 pt-5">
        <label htmlFor="difficulty" className="mb-2 block text-sm font-medium">Difficulty</label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </section>

      <button
        type="submit"
        disabled={!descriptionIsValid || loading}
        className="mt-6 w-full rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Creating case...' : 'Create Case'}
      </button>

      {status ? <p role="status" className="mt-4 text-sm muted">{status}</p> : null}

      <div className="mt-6 border-t border-slate-700 pt-5">
        <p className="mb-3 text-sm font-medium">Try an example</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setScenario(example)}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs hover:border-yellow-400"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

import ScenarioForm from '@/components/ScenarioForm';

export default function HomePage() {
  return (
    <main className="app-shell">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="gold text-xs uppercase tracking-[0.28em]">Detective board</p>
        </div>
        <a href="/cases" className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-yellow-400">My Cases</a>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <ScenarioForm />

        <aside className="card p-6">
          <h2 className="text-2xl font-bold">How it works</h2>
          <ul className="mt-6 space-y-4 muted">
            <li>1. Describe the case and choose a difficulty.</li>
            <li>2. The app weaves a full case with suspects, clues, and red herrings.</li>
            <li>3. Inspect evidence, request hints, and accuse one suspect.</li>
            <li>4. Reveal the truth and see the clue map.</li>
          </ul>
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
            <p className="gold text-xs uppercase tracking-[0.2em]">Safety</p>
            <p className="mt-2 text-sm muted">All characters and events are fictional. Unsafe prompts are rejected before generation begins.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

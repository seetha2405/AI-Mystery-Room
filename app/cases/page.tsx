import MyCasesList from '@/components/MyCasesList';

export default function CasesPage() {
  return (
    <main className="app-shell">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="gold text-xs uppercase tracking-[0.24em]">Archive</p>
          <h1 className="mt-2 text-4xl font-bold">My Cases</h1>
        </div>
        <a href="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm hover:border-yellow-400">New case</a>
      </div>
      <MyCasesList />
    </main>
  );
}

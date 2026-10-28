'use client';

import { useParams } from 'next/navigation';
import GenerationProgress from '@/components/GenerationProgress';

export default function GeneratePage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  return (
    <main className="app-shell max-w-3xl">
      <GenerationProgress jobId={jobId} />
    </main>
  );
}

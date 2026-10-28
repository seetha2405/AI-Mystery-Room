import { getCaseById } from '@/lib/jobs';

export async function GET(_request: Request, context: RouteContext<'/api/cases/[id]'>) {
  const { id } = await context.params;
  const storedCase = getCaseById(id);
  if (!storedCase) {
    return Response.json({ error: { code: 'CASE_NOT_FOUND', message: 'This case could not be found. Try returning to generation.' } }, { status: 404 });
  }

  return Response.json(storedCase.publicCase);
}
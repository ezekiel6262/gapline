import { auth } from '@clerk/nextjs/server';
import { database } from '@/lib/database';
import { validState } from '@/lib/state-validation';

const keys = new Set(['portfolio','policies','calls','money-actions','eligibility']);
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { key: string } }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in required' }, { status: 401 });
  if (!keys.has(params.key)) return Response.json({ error: 'Invalid collection' }, { status: 400 });
  const { data, error } = await database().from('user_state').select('value').eq('user_id',userId).eq('key',params.key).maybeSingle();
  if (error) return Response.json({ error: 'Cloud storage unavailable' }, { status: 503 });
  return Response.json({ value: data?.value ?? null });
}

export async function PUT(request: Request, { params }: { params: { key: string } }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in required' }, { status: 401 });
  if (!keys.has(params.key)) return Response.json({ error: 'Invalid collection' }, { status: 400 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const text = await request.text();
  if (text.length > 100_000) return Response.json({ error: 'Collection too large' }, { status: 413 });
  let value: unknown;
  try { value = JSON.parse(text).value; } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!validState(params.key,value)) return Response.json({error:'Invalid collection data'}, {status:400});
  const { error } = await database().from('user_state').upsert({ user_id:userId,key:params.key,value,updated_at:new Date().toISOString() });
  return error ? Response.json({error:'Cloud storage unavailable'}, {status:503}) : Response.json({saved:true});
}

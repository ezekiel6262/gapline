import { POST } from '@/app/api/snapshots/route';
export const dynamic='force-dynamic';
export async function GET(request:Request) { return POST(request); }

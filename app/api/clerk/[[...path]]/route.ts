// Official Clerk Frontend API proxy for deployments without custom DNS.
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function proxy(request:Request,{params}:{params:{path?:string[]}}) {
  const secret=process.env.CLERK_SECRET_KEY;
  if(!secret) return Response.json({error:'Authentication unavailable'},{status:503});
  const incoming=new URL(request.url);
  const target=new URL(`/${(params.path??[]).map(encodeURIComponent).join('/')}`, 'https://frontend-api.clerk.dev');
  target.search=incoming.search;
  const headers=new Headers(request.headers);
  for(const name of ['host','content-length','connection','clerk-secret-key','clerk-proxy-url']) headers.delete(name);
  headers.set('Clerk-Secret-Key',secret);
  headers.set('Clerk-Proxy-Url','https://gapline-mu.vercel.app/api/clerk');
  headers.set('X-Forwarded-For',request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()??request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'');
  try {
    const upstream=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
    const outgoing=new Headers(upstream.headers);
    for(const name of ['content-encoding','content-length','transfer-encoding']) outgoing.delete(name);
    outgoing.set('Cache-Control','no-store');
    const location=outgoing.get('location');
    if(location?.startsWith('https://frontend-api.clerk.dev')) outgoing.set('location',location.replace('https://frontend-api.clerk.dev','https://gapline-mu.vercel.app/api/clerk'));
    return new Response(upstream.body,{status:upstream.status,headers:outgoing});
  } catch {return Response.json({error:'Authentication service temporarily unavailable'},{status:502});}
}
export {proxy as GET,proxy as POST,proxy as PUT,proxy as PATCH,proxy as DELETE,proxy as OPTIONS};

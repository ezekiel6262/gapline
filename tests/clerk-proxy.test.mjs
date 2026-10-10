import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { GET, POST } = await import(pathToFileURL(resolve('app/%5F%5Fclerk/[[...path]]/route.ts')).href);
const originalFetch=globalThis.fetch;
const originalSecret=process.env.CLERK_SECRET_KEY;
let received;
try {
  delete process.env.CLERK_SECRET_KEY;
  assert.equal((await GET(new Request('https://gapline-mu.vercel.app/__clerk/v1/environment'),{params:{path:['v1','environment']}})).status,503);
  process.env.CLERK_SECRET_KEY='test-only-not-a-real-credential';
  globalThis.fetch=async (url,options)=>{received={url:String(url),options};return new Response('{}',{status:200,headers:{'content-type':'application/json'}});};
  const response=await GET(new Request('https://gapline-mu.vercel.app/__clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js?test=1',{headers:{'x-vercel-forwarded-for':'203.0.113.7','clerk-secret-key':'untrusted-input'}}),{params:{path:['npm','@clerk','clerk-js@5','dist','clerk.browser.js']}});
  assert.equal(response.status,200);
  assert.equal(received.url,'https://frontend-api.clerk.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js?test=1');
  assert.equal(received.options.headers.get('Clerk-Proxy-Url'),'https://gapline-mu.vercel.app/__clerk');
  assert.equal(received.options.headers.get('Clerk-Secret-Key'),process.env.CLERK_SECRET_KEY);
  assert.equal(received.options.headers.get('X-Forwarded-For'),'203.0.113.7');
  assert.equal(response.headers.get('cache-control'),'no-store');
  await POST(new Request('https://gapline-mu.vercel.app/__clerk/v1/client',{method:'POST',body:'hello'}),{params:{path:['v1','client']}});
  assert.equal(Buffer.from(received.options.body).toString(),'hello');
  globalThis.fetch=async ()=>new Response(null,{status:302,headers:{location:'https://frontend-api.clerk.dev/v1/client'}});
  const redirect=await GET(new Request('https://gapline-mu.vercel.app/__clerk/v1/client'),{params:{path:['v1','client']}});
  assert.equal(redirect.headers.get('location'),'https://gapline-mu.vercel.app/__clerk/v1/client');
  globalThis.fetch=async ()=>{throw new Error('test upstream failure');};
  assert.equal((await GET(new Request('https://gapline-mu.vercel.app/__clerk/v1/client'),{params:{path:['v1','client']}})).status,502);
  console.log('Clerk proxy routing, forwarding and failure checks passed');
} finally {
  globalThis.fetch=originalFetch;
  if(originalSecret===undefined)delete process.env.CLERK_SECRET_KEY;else process.env.CLERK_SECRET_KEY=originalSecret;
}

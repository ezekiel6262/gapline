import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { request as httpRequest } from 'node:http';
process.loadEnvFile('.env.replacement.local');
const require=createRequire(import.meta.url);
const sdkPath=require.resolve('@clerk/backend',{paths:[realpathSync('node_modules/@clerk/nextjs')]});
const {createClerkClient}=await import(pathToFileURL(sdkPath).href);
const key=process.env.NEXT_PUBLIC_GAPLINE_CUSTOM_CLERK_PUBLISHABLE_KEY;
assert.equal(Buffer.from(key.replace(/^pk_live_/,''),'base64').toString(),'clerk.trygapline.xyz$');
const clerk=createClerkClient({secretKey:process.env.GAPLINE_CUSTOM_CLERK_SECRET_KEY,publishableKey:key});
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const base=process.argv[2]??'http://localhost:3003';
assert.ok(['http://localhost:3003','https://trygapline.xyz'].includes(base),'Unapproved test target');
const marker=`gapline-test-${randomUUID()}`;
const users=[],sessions=[];
const request=async(method,token,body,host='trygapline.xyz')=>{
  if(base.startsWith('http://'))return new Promise((resolve,reject)=>{
    const payload=body?JSON.stringify(body):undefined;
    const req=httpRequest(`${base}/api/state/portfolio`,{method,headers:{host,...(token?{authorization:`Bearer ${token}`}:{ }),...(body?{'content-type':'application/json'}:{})},signal:AbortSignal.timeout(15000)},response=>{let text='';response.on('data',chunk=>text+=chunk);response.on('end',()=>{try{resolve({status:response.statusCode,value:response.headers['content-type']?.includes('json')?JSON.parse(text):null});}catch(error){reject(error);}});});
    req.on('error',reject);req.end(payload);
  });
  const response=await fetch(`${base}/api/state/portfolio`,{method,headers:{host,origin:'https://trygapline.xyz',...(token?{authorization:`Bearer ${token}`}:{ }),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});
  return {status:response.status,value:response.headers.get('content-type')?.includes('json')?await response.json():null};
};
try {
  assert.equal((await request('GET')).status,401);
  const testing=await clerk.testingTokens.createTestingToken();
  for(let i=0;i<2;i++) {
    const user=await clerk.users.createUser({emailAddress:[`${marker}-${i}@example.com`],skipPasswordRequirement:true,externalId:`${marker}-${i}`});
    users.push(user.id);
    const ticket=await clerk.signInTokens.createSignInToken({userId:user.id,expiresInSeconds:120});
    const login=await fetch(`https://clerk.trygapline.xyz/v1/client/sign_ins?__clerk_testing_token=${encodeURIComponent(testing.token)}`,{method:'POST',headers:{origin:'https://trygapline.xyz','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({strategy:'ticket',ticket:ticket.token})});
    const result=await login.json();
    if(!login.ok)throw Object.assign(new Error('Frontend sign-in failed'),{code:result.errors?.map(e=>e.code).join(',')});
    const sessionId=result.response?.created_session_id??result.created_session_id;
    assert.ok(sessionId,'Frontend sign-in did not create a session');
    sessions.push(sessionId);
  }
  console.log('Two temporary custom-domain sign-in sessions created');
  const ownerToken=(await clerk.sessions.getToken(sessions[0])).jwt;
  const portfolio=[{ticker:'NVDA',company:'Temporary verification fixture',qty:1}];
  const saved=await request('PUT',ownerToken,{value:portfolio});
  console.log('Authenticated save status',saved.status,saved.value?.error??'');
  assert.equal(saved.status,200,'Authenticated save rejected');
  const loaded=await request('GET',ownerToken);
  assert.equal(loaded.status,200);
  assert.deepEqual(loaded.value.value,portfolio);
  const otherToken=(await clerk.sessions.getToken(sessions[1])).jwt;
  const other=await request('GET',otherToken);
  assert.equal(other.status,200);
  assert.equal(other.value.value,null,'Other account received owner data');
  if(base.startsWith('http://'))assert.equal((await request('GET',ownerToken,undefined,'gapline-mu.vercel.app')).status,401,'New-instance token accepted by legacy instance');
  console.log('Authenticated cloud save/read, account isolation and anonymous rejection passed');
} catch(error) {
  console.error('Custom auth verification failed:',error.name,error.code==='ERR_ASSERTION'?error.message:error.errors?.map(e=>e.code)??error.code??'request failure');
  process.exitCode=1;
} finally {
  for(const id of sessions)await clerk.sessions.revokeSession(id);
  if(users.length){
    const {error}=await db.from('user_state').delete().in('user_id',users);
    if(error)throw new Error('Temporary state cleanup failed');
    for(const id of users){const user=await clerk.users.getUser(id);assert.ok(user.externalId?.startsWith(marker));await clerk.users.deleteUser(id);}
    const {data,error:verifyError}=await db.from('user_state').select('user_id').in('user_id',users);
    assert.equal(verifyError,null);assert.equal(data.length,0);
  }
  console.log('Only this run’s temporary sessions, users and cloud fixtures removed');
}

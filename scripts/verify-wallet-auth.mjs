import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
process.loadEnvFile('.env.replacement.local');
const require=createRequire(import.meta.url);
const {createClerkClient}=await import(pathToFileURL(require.resolve('@clerk/backend',{paths:[realpathSync('node_modules/@clerk/nextjs')]})).href);
const key=process.env.NEXT_PUBLIC_GAPLINE_CUSTOM_CLERK_PUBLISHABLE_KEY;
assert.equal(Buffer.from(key.replace(/^pk_live_/,''),'base64').toString(),'clerk.trygapline.xyz$');
const clerk=createClerkClient({secretKey:process.env.GAPLINE_CUSTOM_CLERK_SECRET_KEY,publishableKey:key});
const marker=`gapline-wallet-test-${randomUUID()}`;
let userId,sessionId;
const request=async(path,{token,method='GET',body,origin='https://trygapline.xyz'}={})=>{
  const response=await fetch(`https://trygapline.xyz${path}`,{method,headers:{origin,...token?{authorization:`Bearer ${token}`}:{},...body?{'Content-Type':'application/json'}:{}},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(20000)});
  return {status:response.status,data:await response.json()};
};
try{
  assert.equal((await request('/api/wallet/quote',{method:'POST',body:{}})).status,401);
  assert.equal((await request('/api/guardian/service')).status,401);
  const user=await clerk.users.createUser({emailAddress:[`${marker}@example.com`],skipPasswordRequirement:true,externalId:marker});userId=user.id;
  const testing=await clerk.testingTokens.createTestingToken();
  const ticket=await clerk.signInTokens.createSignInToken({userId,expiresInSeconds:120});
  const login=await fetch(`https://clerk.trygapline.xyz/v1/client/sign_ins?__clerk_testing_token=${encodeURIComponent(testing.token)}`,{method:'POST',headers:{origin:'https://trygapline.xyz','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({strategy:'ticket',ticket:ticket.token})});
  assert.equal(login.ok,true);const result=await login.json();sessionId=result.response?.created_session_id??result.created_session_id;assert.ok(sessionId);
  const token=(await clerk.sessions.getToken(sessionId)).jwt;
  assert.equal((await request('/api/wallet/quote',{token,method:'POST',body:{},origin:'https://invalid.example'})).status,403);
  assert.equal((await request('/api/wallet/quote',{token,method:'POST',body:{}})).status,400);
  const body={mode:'wallet',ticker:'NVDA',amount:'1',walletAddress:'0x1111111111111111111111111111111111111111'};
  assert.equal((await request('/api/wallet/quote',{token,method:'POST',body:{...body,mode:'guardian'}})).status,409);
  const quote=await request('/api/wallet/quote',{token,method:'POST',body});
  assert.ok([200,503].includes(quote.status));
  if(quote.status===200)assert.equal(quote.data.executionEnabled,false);
  else assert.equal(typeof quote.data.error,'string');
  const guardian=await request('/api/guardian/service',{token});assert.equal(guardian.status,200);assert.equal(guardian.data.executionEnabled,false);assert.equal(guardian.data.status,'not_configured');
  console.log('Wallet API: anonymous rejection, CSRF rejection, input validation and mode separation passed');
  console.log(`Production browser quote status ${quote.status}; signing disabled. Guardian host not configured.`);
}finally{
  if(sessionId)await clerk.sessions.revokeSession(sessionId);
  if(userId){const user=await clerk.users.getUser(userId);assert.equal(user.externalId,marker);await clerk.users.deleteUser(userId);}
  console.log('Only this verification session and temporary user removed');
}

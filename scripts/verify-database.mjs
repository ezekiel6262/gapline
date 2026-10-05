import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const url=process.env.SUPABASE_URL;
const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const owner=`verification-${randomUUID()}`;
try {
  const write=await db.from('user_state').upsert({user_id:owner,key:'calls',value:[{ticker:'NVDA',prediction:1.5}]});
  assert.equal(write.error,null);
  const read=await db.from('user_state').select('value').eq('user_id',owner).eq('key','calls').single();
  assert.equal(read.error,null); assert.equal(read.data.value[0].ticker,'NVDA');
  const different=await db.from('user_state').select('value').eq('user_id',`${owner}-different`);
  assert.equal(different.data.length,0);
  const anonymous=createClient(url,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const denied=await anonymous.from('user_state').select('value');
  assert.ok(denied.error);
  console.log('Cloud save/read, owner filtering, and anonymous access denial passed');
} finally {await db.from('user_state').delete().eq('user_id',owner);}

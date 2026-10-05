import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
process.loadEnvFile('.env.production.local');
const secret=process.env.CRON_SECRET?.trim();
if(!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error('Unexpected cron credential format');
const result=spawnSync('vercel',['env','update','CRON_SECRET','production','--yes'],{input:secret,encoding:'utf8',shell:true});
if(result.status!==0) throw new Error('Could not update cron credential');
const sql=postgres(process.env.POSTGRES_URL,{ssl:'require',max:1,prepare:false});
try {
  const rows=await sql`select id from vault.secrets where name='gapline_cron_secret'`;
  if(rows.length) await sql`select vault.update_secret(${rows[0].id},${secret},'gapline_cron_secret','Gapline snapshot authorization')`;
  console.log('Cron credential normalized in Vercel and Supabase Vault.');
} finally {await sql.end();}

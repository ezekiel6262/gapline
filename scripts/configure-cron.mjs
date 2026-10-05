import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const secret=randomBytes(32).toString('hex');
for (const environment of ['production']) {
  const result=spawnSync('vercel',['env','add','CRON_SECRET',environment],{input:secret,encoding:'utf8',shell:true});
  if(result.status!==0) throw new Error(`Cron configuration failed for ${environment}`);
  console.log(`CRON_SECRET configured for ${environment}`);
}

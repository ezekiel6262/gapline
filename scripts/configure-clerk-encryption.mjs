import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const result=spawnSync('vercel',['env','add','CLERK_ENCRYPTION_KEY','production','--sensitive','--scope','larryclues-projects'],{input:randomBytes(32).toString('hex'),encoding:'utf8',shell:true});
if(result.status!==0)throw new Error('Middleware encryption configuration failed');
console.log('Production Clerk middleware encryption configured; value not logged.');

import {createGuardianServer} from '../services/guardian/server.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const entry=process.env.GAPLINE_BAW_ENTRY;
if(!entry)throw new Error('Set GAPLINE_BAW_ENTRY to the installed official Binance CLI JavaScript entry');
const execute=promisify(execFile);
const runBaw=async(args)=>{const {stdout}=await execute(process.execPath,[entry,...args],{timeout:12000,maxBuffer:1024*1024,windowsHide:true});return JSON.parse(stdout);};
const result=await runBaw(['wallet','address','--json']);
const address=result.data?.addresses?.find(item=>item.binanceChainId==='56')?.address;
assert.ok(result.success&&address,'Connect the local Agentic Wallet first');
const token=randomBytes(32).toString('hex'),ownerId='user_local_verification';
const server=createGuardianServer({token,ownerId,runBaw});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const headers={Authorization:`Bearer ${token}`,'X-Gapline-Owner':ownerId,'Content-Type':'application/json'};
try{
  const health=await(await fetch(`${url}/health`,{headers})).json();assert.equal(health.sessionValid,true);
  console.log('Private service session check passed; signing disabled');
  const quote=await fetch(`${url}/quote`,{method:'POST',headers,body:JSON.stringify({mode:'guardian',ticker:'NVDA',amount:'1',walletAddress:address})});
  const data=await quote.json();assert.equal(quote.status,200);assert.equal(data.executionEnabled,false);
  console.log('Private service live 1-USDT quote passed; no transaction submitted');
}finally{await new Promise(resolve=>server.close(resolve));}

import test from 'node:test';
import assert from 'node:assert/strict';
import {walletSnapshot} from '../lib/wallet/browser.ts';
import {parseIntent,reviewQuotes,usdtUnits,USDT,STOCK_TOKENS} from '../lib/wallet/trading.ts';
import {createGuardianServer} from '../services/guardian/server.mjs';
const address='0x1111111111111111111111111111111111111111';
const intent={ticker:'NVDA',amount:'1.25',walletAddress:address,mode:'wallet'};
test('browser wallet never signs and rejects non-BSC or missing accounts',async()=>{
  const calls=[];const provider={request:async({method})=>{calls.push(method);return ({eth_requestAccounts:[address],eth_accounts:[address],eth_chainId:'0x38',eth_getBalance:'0xde0b6b3a7640000'})[method];}};
  assert.equal((await walletSnapshot(provider,true)).balanceWei,'1000000000000000000');
  assert.deepEqual(calls,['eth_requestAccounts','eth_chainId','eth_getBalance']);
  await assert.rejects(walletSnapshot({request:async({method})=>method==='eth_accounts'?[address]:'0x1'}),/BNB Smart Chain/);
  await assert.rejects(walletSnapshot({request:async()=>[]}),/No wallet/);
});
test('trade intent validation and exact USDT units',()=>{
  assert.deepEqual(parseIntent(intent),intent);
  assert.equal(usdtUnits('1.25'),'1250000000000000000');
  assert.equal(usdtUnits('0.000001'),'1000000000000');
  for(const change of [{amount:'51'},{amount:'0'},{amount:'1e1'},{amount:'1; swap'},{amount:1},{amount:'0.0000001'},{ticker:'__proto__'},{walletAddress:'0x'},{mode:'auto'}])assert.throws(()=>parseIntent({...intent,...change}));
});
const route={quoteId:'ignored',binanceChainId:'56',fromTokenAmount:usdtUnits(intent.amount),toTokenAmount:'1000000000000000',fromToken:{tokenContractAddress:USDT,tokenUnitPrice:'1',isHoneyPot:false,taxRate:'0'},toToken:{tokenContractAddress:STOCK_TOKENS.NVDA,isHoneyPot:false,taxRate:'0'},priceImpactPercent:'-0.2',vendorName:'Test vendor',executionMode:'RFQ'};
test('quote binding rejects mismatches and never enables execution',()=>{
  const result=reviewQuotes([route],intent,1000);
  assert.equal(result.routes[0].checksPassed,true);assert.equal(result.executionEnabled,false);
  assert.equal(Date.parse(result.expiresAt),21000);
  for(const change of [{binanceChainId:'1'},{fromTokenAmount:'1'},{toTokenAmount:'0'},{fromToken:{tokenContractAddress:address}},{toToken:{tokenContractAddress:address}}])assert.throws(()=>reviewQuotes([{...route,...change}],intent));
  for(const change of [{priceImpactPercent:null},{priceImpactPercent:''},{priceImpactPercent:'3'},{executionMode:'SWAP'},{fromToken:{...route.fromToken,isHoneyPot:undefined}}])assert.equal(reviewQuotes([{...route,...change}],intent).routes[0].checksPassed,false);
  const overCap=reviewQuotes([{...route,fromTokenAmount:usdtUnits('50'),fromToken:{...route.fromToken,tokenUnitPrice:'2'}}],{...intent,amount:'50'},1000);
  assert.equal(overCap.routes[0].checksPassed,false);assert.equal(overCap.executionEnabled,false);
});
test('private Guardian rejects unauthorized access, wallet mismatch and all execution endpoints',async()=>{
  const calls=[];const token='x'.repeat(32),ownerId='user_test';
  const runBaw=async(args)=>{
    calls.push(args);
    if(args[1]==='status')return {success:true,data:{status:'CONNECTED'}};
    if(args[1]==='settings')return {success:true,data:{sessionExpireTime:new Date(Date.now()+3600000).toISOString()}};
    if(args[1]==='address')return {success:true,data:{addresses:[{binanceChainId:'56',address}]}};
    if(args[1]==='quote')return {success:true,data:{fromCoinSymbol:'USDT',fromCoinAmount:'1.25',toCoinSymbol:'NVDAB',toCoinAmount:'0.001'}};
    throw new Error('Forbidden command');
  };
  const server=createGuardianServer({token,ownerId,runBaw});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const headers={Authorization:`Bearer ${token}`,'X-Gapline-Owner':ownerId,'Content-Type':'application/json'};
  try {
    assert.equal((await fetch(`${url}/health`)).status,401);
    assert.equal((await fetch(`${url}/health`,{headers:{...headers,'X-Gapline-Owner':'user_other'}})).status,401);
    assert.equal(calls.length,0);
    const health=await (await fetch(`${url}/health`,{headers})).json();assert.equal(health.sessionValid,true);assert.equal(health.executionEnabled,false);
    assert.equal((await fetch(`${url}/execute`,{method:'POST',headers})).status,404);
    const response=await fetch(`${url}/quote`,{method:'POST',headers,body:JSON.stringify({...intent,mode:'guardian'})});
    assert.equal(response.status,200);assert.equal((await response.json()).executionEnabled,false);
    assert.equal((await fetch(`${url}/quote`,{method:'POST',headers,body:JSON.stringify({...intent,mode:'guardian',walletAddress:'0x2222222222222222222222222222222222222222'})})).status,403);
    assert.ok(calls.every(args=>['status','settings','address','quote'].includes(args[1])));
  }finally{await new Promise(resolve=>server.close(resolve));}
});

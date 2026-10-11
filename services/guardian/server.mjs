import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseIntent,STOCK_TOKENS,USDT} from '../../lib/wallet/trading.ts';

// Private operator preparation service. Deliberately contains NO swap/send/sign command.
export function createGuardianServer({token,ownerId,runBaw}) {
  if(typeof token!=='string'||token.length<32||typeof ownerId!=='string'||!ownerId.startsWith('user_'))throw new Error('Configure private service authentication');
  let active=false;
  const server=http.createServer(async(req,res)=>{
    const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    const auth=Buffer.from(req.headers.authorization??''),expected=Buffer.from(`Bearer ${token}`);
    if(auth.length!==expected.length||!timingSafeEqual(auth,expected)||req.headers['x-gapline-owner']!==ownerId){reply(401,{error:'Unauthorized'});return;}
    if(active){reply(429,{error:'Service busy; try again later'});return;}
    active=true;
    try {
      if(req.method==='GET'&&req.url==='/health') {
        const status=await runBaw(['wallet','status','--json']);
        const connected=status.success===true&&status.data?.status==='CONNECTED';
        const settings=connected?await runBaw(['wallet','settings','--json']):null;
        const expiry=Date.parse(settings?.data?.sessionExpireTime??'');
        reply(200,{walletStatus:connected?'CONNECTED':'UNCONNECTED',sessionValid:connected&&settings?.success===true&&Number.isFinite(expiry)&&expiry>Date.now(),executionEnabled:false});return;
      }
      if(req.method==='POST'&&req.url==='/quote') {
        let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>2000){reply(413,{error:'Request too large'});return;}}
        let intent;try{intent=parseIntent(JSON.parse(body));}catch{reply(400,{error:'Invalid quote request'});return;}
        if(intent.mode!=='guardian'){reply(400,{error:'Wrong execution mode'});return;}
        const status=await runBaw(['wallet','status','--json']);
        if(status.success!==true||status.data?.status!=='CONNECTED'){reply(409,{error:'Reconnect the private Binance session'});return;}
        const addresses=await runBaw(['wallet','address','--json']);
        const address=addresses.success===true&&addresses.data?.addresses?.find(item=>item.binanceChainId==='56')?.address;
        if(typeof address!=='string'||address.toLowerCase()!==intent.walletAddress.toLowerCase()){reply(403,{error:'Wallet is not authorized for this private service'});return;}
        const result=await runBaw(['market-order','quote','--fromTokenQty',intent.amount,'--fromToken',USDT,'--toToken',STOCK_TOKENS[intent.ticker],'--binanceChainId','56','--slippage','1','--json']);
        const quote=result.data;
        if(result.success!==true||quote?.fromCoinSymbol!=='USDT'||quote.toCoinSymbol!==`${intent.ticker}B`||Number(quote.fromCoinAmount)!==Number(intent.amount)||typeof quote.toCoinAmount!=='string'||quote.toCoinAmount.length>80||!/^\d+(\.\d+)?$/.test(quote.toCoinAmount)||!Number.isFinite(Number(quote.toCoinAmount))||Number(quote.toCoinAmount)<=0){reply(502,{error:'Provider quote unavailable or mismatched'});return;}
        reply(200,{mode:'guardian',ticker:intent.ticker,inputUSDT:intent.amount,outputAmount:quote.toCoinAmount,quotedAt:new Date().toISOString(),executionEnabled:false,blockers:['Security review, simulation, policy trigger and explicit authorization are required before execution']});return;
      }
      reply(404,{error:'Unsupported operation; signing is disabled'});
    }catch{console.error('guardian_preparation_failed');reply(503,{error:'Private wallet preparation unavailable'});}
    finally{active=false;}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const entry=process.env.GAPLINE_BAW_ENTRY;
  if(!entry||!isAbsolute(entry)||!entry.endsWith('.js'))throw new Error('GAPLINE_BAW_ENTRY must be the absolute installed Binance CLI JavaScript entry');
  const execute=promisify(execFile);
  const server=createGuardianServer({token:process.env.GUARDIAN_SERVICE_TOKEN,ownerId:process.env.GUARDIAN_OPERATOR_USER_ID,runBaw:async(args)=>{
    const {stdout}=await execute(process.execPath,[entry,...args],{timeout:12000,maxBuffer:1024*1024,windowsHide:true});return JSON.parse(stdout);
  }});
  // Loopback by default. Remote hosting needs TLS and a deliberately configured private ingress.
  server.listen(8787,'127.0.0.1',()=>console.log('Guardian preparation service listening on loopback port 8787; signing disabled'));
}

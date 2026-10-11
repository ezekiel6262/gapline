import {auth} from '@clerk/nextjs/server';
import {parseIntent} from '@/lib/wallet/trading';
function serviceUrl() {
  const url=new URL(process.env.GUARDIAN_SERVICE_URL!);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Invalid service URL');
  return url;
}
export async function GET() {
  const {userId}=await auth();
  if(!userId)return Response.json({error:'Sign in to inspect Guardian'},{status:401});
  if(!process.env.GUARDIAN_SERVICE_URL||!process.env.GUARDIAN_SERVICE_TOKEN)return Response.json({status:'not_configured',executionEnabled:false,reason:'Private Guardian host and authentication are not configured.'});
  if(userId!==process.env.GUARDIAN_OPERATOR_USER_ID)return Response.json({status:'not_authorized',executionEnabled:false,reason:'This account has no private Guardian wallet authorization.'},{status:403});
  try {
    const url=serviceUrl();
    const response=await fetch(new URL('/health',url),{headers:{Authorization:`Bearer ${process.env.GUARDIAN_SERVICE_TOKEN}`,'X-Gapline-Owner':userId},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Service unavailable');
    const data=await response.json();
    if(!['CONNECTED','UNCONNECTED'].includes(data.walletStatus)||typeof data.sessionValid!=='boolean')throw new Error('Invalid service response');
    return Response.json({status:'connected',walletStatus:data.walletStatus,sessionValid:data.sessionValid,executionEnabled:false,reason:'Service preparation is available; signing and policy execution remain disabled.'},{headers:{'Cache-Control':'no-store'}});
  }catch{console.error('guardian_service_unavailable');return Response.json({status:'unavailable',executionEnabled:false,reason:'Private Guardian service is unavailable; no funds can move.'},{status:503});}
}
export async function POST(request:Request) {
  const {userId}=await auth();
  if(!userId)return Response.json({error:'Sign in to request a Guardian quote'},{status:401});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
  if(!process.env.GUARDIAN_SERVICE_URL||!process.env.GUARDIAN_SERVICE_TOKEN)return Response.json({error:'Private Guardian host is not configured'},{status:503});
  if(userId!==process.env.GUARDIAN_OPERATOR_USER_ID)return Response.json({error:'This account has no private Guardian wallet authorization'},{status:403});
  let intent;
  try{const text=await request.text();if(text.length>2000)throw new Error('Request too large');intent=parseIntent(JSON.parse(text));if(intent.mode!=='guardian')throw new Error('Wrong execution mode');}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Invalid request'},{status:400});}
  try {
    const response=await fetch(new URL('/quote',serviceUrl()),{method:'POST',headers:{Authorization:`Bearer ${process.env.GUARDIAN_SERVICE_TOKEN}`,'X-Gapline-Owner':userId,'Content-Type':'application/json'},body:JSON.stringify(intent),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Quote unavailable');
    const data=await response.json();
    if(data.ticker!==intent.ticker||data.inputUSDT!==intent.amount||typeof data.outputAmount!=='string'||!/^\d+(\.\d+)?$/.test(data.outputAmount))throw new Error('Invalid private quote');
    return Response.json({ticker:intent.ticker,amount:intent.amount,outputAmount:data.outputAmount,executionEnabled:false,reason:'Private Binance quote received. Security review, simulation, policy triggers and explicit authorization are still required.'},{headers:{'Cache-Control':'no-store'}});
  }catch{console.error('guardian_quote_unavailable');return Response.json({error:'Private Guardian quote unavailable. No order was signed or submitted.'},{status:503});}
}

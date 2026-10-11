import {auth} from '@clerk/nextjs/server';
import {createBinanceWeb3ClientFromEnv} from '@/lib/binance/client';
import {parseIntent,reviewQuotes,usdtUnits,USDT,STOCK_TOKENS} from '@/lib/wallet/trading';
export async function POST(request:Request) {
  const {userId}=await auth();
  if(!userId)return Response.json({error:'Sign in to request a quote'},{status:401});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
  let intent;
  try {const text=await request.text();if(text.length>2000)throw new Error('Request too large');intent=parseIntent(JSON.parse(text));}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Invalid request'},{status:400});}
  if(intent.mode==='guardian')return Response.json({error:'Guardian uses its separately authorized private service; it cannot spend from a connected browser wallet'},{status:409});
  try {
    const raw=await createBinanceWeb3ClientFromEnv().getTradeQuotes({amount:usdtUnits(intent.amount),fromTokenAddress:USDT,toTokenAddress:STOCK_TOKENS[intent.ticker],userWalletAddress:intent.walletAddress});
    return Response.json(reviewQuotes(raw,intent),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    // Record only a stable event: upstream payloads can contain credentials or PII.
    console.error('wallet_quote_unavailable');
    const restricted=error instanceof Error&&/40304|restricted|451/.test(error.message);
    return Response.json({error:restricted?'Binance quote access is restricted for this deployment. Signing is disabled.':'Executable quote unavailable. No transaction was signed or sent.'},{status:503});
  }
}

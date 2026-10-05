import { auth } from '@clerk/nextjs/server';
import { getPublicBstockMarket } from '@/lib/binance/public-rwa';
export async function POST(request:Request) {
  const {userId}=await auth();
  if(!userId) return Response.json({error:'Sign in to review a policy'},{status:401});
  let body:{ticker?:string;amountUsd?:number};
  try {body=await request.json();} catch {return Response.json({error:'Invalid request'},{status:400});}
  if(!body.ticker||!['NVDA','TSLA','AAPL','SPY'].includes(body.ticker)||!Number.isFinite(body.amountUsd)||body.amountUsd!<=0||body.amountUsd!>50) return Response.json({error:'Choose a supported asset and an amount up to $50'},{status:400});
  const market=await getPublicBstockMarket(body.ticker);
  return Response.json({status:'blocked',market,checks:[{name:'Trade size',passed:true},{name:'Executable onchain quote',passed:false},{name:'Transaction simulation',passed:false},{name:'Verified liquidity depth',passed:false}],reason:'Executable onchain quote and transaction simulation are required. Public exchange prices cannot authorize a wallet transaction.'});
}

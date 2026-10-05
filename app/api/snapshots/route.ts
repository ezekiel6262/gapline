import { database } from '@/lib/database';
import { getPublicBstockMarket } from '@/lib/binance/public-rwa';
export const dynamic='force-dynamic';

export async function GET() {
  const {data,error}=await database().from('market_snapshots').select('ticker,source,price,reference,captured_at').order('captured_at',{ascending:false}).limit(100);
  if(error) return Response.json({error:'Snapshot history unavailable'},{status:503});
  return Response.json({snapshots:data});
}

export async function POST(request:Request) {
  if(!process.env.CRON_SECRET || request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`) return Response.json({error:'Unauthorized'},{status:401});
  const results=await Promise.allSettled(['NVDA','TSLA','AAPL','SPY'].map(async ticker=>{
    const market=await getPublicBstockMarket(ticker);
    if(!market) throw new Error('Market unavailable');
    const {error}=await database().from('market_snapshots').insert({ticker,source:'live-binance-public',price:market.price,reference:market.referencePrice,captured_at:market.updatedAt});
    if(error) throw new Error('Snapshot storage failed');
    return ticker;
  }));
  return Response.json({saved:results.filter(result=>result.status==='fulfilled').length,failed:results.filter(result=>result.status==='rejected').length});
}

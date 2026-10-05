import postgres from 'postgres';
process.loadEnvFile('.env.local');
const sql=postgres(process.env.POSTGRES_URL,{ssl:'require',max:1,prepare:false});
try {
  for(const ticker of ['NVDA','TSLA','AAPL','SPY']) {
    const pair=`${ticker}BUSDT`;
    const base='https://data-api.binance.vision/api/v3';
    const responses=await Promise.all([fetch(`${base}/ticker/24hr?symbol=${pair}`),fetch(`${base}/klines?symbol=${pair}&interval=1d&limit=10`)]);
    if(responses.some(response=>!response.ok)) throw new Error('Public market unavailable');
    const [market,klines]=await Promise.all(responses.map(response=>response.json()));
    const friday=[...klines].reverse().find(row=>row[6]<=market.closeTime&&new Date(row[6]).getUTCDay()===5);
    if(!friday) throw new Error('Friday reference unavailable');
    await sql`insert into public.market_snapshots(ticker,source,price,reference,captured_at) values (${ticker},'live-binance-public',${market.lastPrice},${friday[4]},${new Date(market.closeTime).toISOString()})`;
  }
  console.log(JSON.stringify(await sql`select ticker,count(*)::int as observations from public.market_snapshots group by ticker`));
} finally {await sql.end();}

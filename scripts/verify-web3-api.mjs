import {readFileSync} from 'node:fs';
import ts from 'typescript';
// Local direct provider diagnostic, never a proxy for a restricted deployment.
process.loadEnvFile(process.argv[2]??'.env.local');
if(!process.env.BINANCE_WEB3_API_KEY||!process.env.BINANCE_WEB3_API_SECRET){console.log(JSON.stringify({module:'Binance Web3 RWA Data API',status:'blocked',code:'local_developer_credentials_missing'}));process.exit(1);}
const source=readFileSync(new URL('../lib/binance/client.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createBinanceWeb3ClientFromEnv}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
try{
  const client=createBinanceWeb3ClientFromEnv();const results=await client.searchRwa('NVDA','bstock');
  const assets=results.flatMap(result=>result.assets).filter(asset=>asset.binanceChainId==='56'&&asset.platformId==='bstock');
  if(!assets.length)throw new Error('No BSC bStock returned');
  const prices=await client.getRwaPrices(assets.map(asset=>asset.tokenContractAddress));
  console.log(JSON.stringify({module:'Binance Web3 RWA Data API',status:'passed',assets:assets.length,prices:prices.length,checkedAt:new Date().toISOString()}));
}catch(error){
  const code=error instanceof Error?error.message.match(/^Binance Web3 API (\d+):/)?.[1]:undefined;
  console.log(JSON.stringify({module:'Binance Web3 RWA Data API',status:'blocked',code:code??'request_unavailable',checkedAt:new Date().toISOString()}));process.exitCode=1;
}

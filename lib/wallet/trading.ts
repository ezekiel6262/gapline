export const USDT = '0x55d398326f99059fF775485246999027B3197955';
export const STOCK_TOKENS = {
  NVDA:'0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
  TSLA:'0x5b1910eaad6450e50f816082aa078c41f10c292f',
  AAPL:'0x431a3bee82e2ca41e49895cbece5bb0f76a89b7a',
  SPY:'0x7138b48df7d98d7e3cc221bfe7192d0a178182d8',
} as const;
export type TradeIntent={ticker:keyof typeof STOCK_TOKENS; amount:string; walletAddress:string; mode:'wallet'|'guardian'};
export function validAddress(value:unknown):value is string {
  return typeof value==='string'&&/^0x[0-9a-fA-F]{40}$/.test(value)&&!/^0x0{40}$/.test(value);
}
export function parseIntent(value:unknown):TradeIntent {
  if(!value||typeof value!=='object')throw new Error('Invalid trade request');
  const body=value as Record<string,unknown>;
  if(typeof body.ticker!=='string'||!Object.hasOwn(STOCK_TOKENS,body.ticker))throw new Error('Unsupported asset');
  if(typeof body.amount!=='string'||!/^\d{1,2}(\.\d{1,6})?$/.test(body.amount)||Number(body.amount)<=0||Number(body.amount)>50)throw new Error('Enter an amount above 0 and at most 50 USDT');
  if(!validAddress(body.walletAddress))throw new Error('Connect a valid wallet');
  if(body.mode!=='wallet'&&body.mode!=='guardian')throw new Error('Choose an execution mode');
  return {ticker:body.ticker as TradeIntent['ticker'],amount:body.amount,walletAddress:body.walletAddress,mode:body.mode};
}
export function usdtUnits(amount:string) {
  const [whole,fraction='']=amount.split('.');
  return (BigInt(whole)*BigInt(10)**BigInt(18)+BigInt(fraction.padEnd(18,'0'))).toString();
}
export type QuoteReview={status:'review';executionEnabled:false;mode:TradeIntent['mode'];ticker:string;amount:string;walletAddress:string;fromToken:string;toToken:string;quotedAt:string;expiresAt:string;routes:Array<{vendor:string;executionMode:string;outputUnits:string;impactPercent:number|null;checksPassed:boolean}>;blockers:string[]};
export function reviewQuotes(raw:unknown,intent:TradeIntent,now=Date.now()):QuoteReview {
  if(!Array.isArray(raw)||raw.length>30)throw new Error('Invalid provider quote');
  const expectedAmount=usdtUnits(intent.amount),to=STOCK_TOKENS[intent.ticker];
  const routes=raw.map((entry:Record<string,unknown>)=>{
    if(!entry||typeof entry!=='object')throw new Error('Invalid provider route');
    const from=entry.fromToken as Record<string,unknown>|undefined,target=entry.toToken as Record<string,unknown>|undefined;
    if(entry.binanceChainId!=='56'||entry.fromTokenAmount!==expectedAmount||typeof from?.tokenContractAddress!=='string'||from.tokenContractAddress.toLowerCase()!==USDT.toLowerCase()||typeof target?.tokenContractAddress!=='string'||target.tokenContractAddress.toLowerCase()!==to.toLowerCase())throw new Error('Provider quote does not match your trade');
    if(typeof entry.toTokenAmount!=='string'||!/^\d{1,78}$/.test(entry.toTokenAmount)||BigInt(entry.toTokenAmount)<=BigInt(0))throw new Error('Invalid output amount');
    const impact=typeof entry.priceImpactPercent==='string'&&entry.priceImpactPercent.trim()!==''?Math.abs(Number(entry.priceImpactPercent)):NaN;
    const price=Number(from.tokenUnitPrice);
    const checksPassed=Number.isFinite(impact)&&impact<=1&&Number.isFinite(price)&&price>0&&Number(intent.amount)*price<=50&&from.isHoneyPot===false&&target.isHoneyPot===false&&from.taxRate==='0'&&target.taxRate==='0'&&entry.executionMode==='RFQ';
    return {vendor:typeof entry.vendorName==='string'?entry.vendorName.slice(0,80):'Unknown',executionMode:typeof entry.executionMode==='string'?entry.executionMode:'Unknown',outputUnits:entry.toTokenAmount,impactPercent:Number.isFinite(impact)?impact:null,checksPassed};
  });
  return {status:'review',executionEnabled:false,mode:intent.mode,ticker:intent.ticker,amount:intent.amount,walletAddress:intent.walletAddress,fromToken:USDT,toToken:to,quotedAt:new Date(now).toISOString(),expiresAt:new Date(now+20000).toISOString(),routes,blockers:[...(!routes.length?['No executable route returned']:[]),...routes.some(route=>!route.checksPassed)?['Route risk, impact or valuation evidence is missing or failed']:[], 'RFQ typed-order verification, issuer eligibility, simulation and daily-spend reservations must pass before signing']};
}

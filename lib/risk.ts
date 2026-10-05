export type ExecutionCheck = {
  chainId:number; amountUsd:number; dailyUsedUsd:number; dailyCapUsd:number;
  priceImpactPct:number; quoteExpiresAt:number; simulationPassed:boolean;
  confidence:'High'|'Medium'|'Low'; eligible:boolean; approved:boolean;
};
export function checkExecution(check:ExecutionCheck,now=Date.now()) {
  const reasons:string[]=[];
  if(check.chainId!==56) reasons.push('Only BSC mainnet is supported');
  if(!Number.isFinite(check.amountUsd)||check.amountUsd<=0||check.amountUsd>50) reasons.push('Trade must be between $0 and $50');
  if(!Number.isFinite(check.priceImpactPct)||check.priceImpactPct<0||check.priceImpactPct>1) reasons.push('Price impact exceeds 1%');
  if(!Number.isFinite(check.dailyUsedUsd)||!Number.isFinite(check.dailyCapUsd)||check.dailyUsedUsd<0||check.dailyCapUsd<=0||check.dailyUsedUsd+check.amountUsd>check.dailyCapUsd) reasons.push('Daily allowance exceeded');
  if(!Number.isFinite(check.quoteExpiresAt)||check.quoteExpiresAt<=now) reasons.push('Quote has expired');
  if(!check.simulationPassed) reasons.push('Transaction simulation required');
  if(check.confidence==='Low') reasons.push('Insufficient verified market confidence');
  if(!check.eligible) reasons.push('Issuer eligibility required');
  if(!check.approved) reasons.push('User approval required');
  return {allowed:reasons.length===0,reasons};
}

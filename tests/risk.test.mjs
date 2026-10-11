import assert from 'node:assert/strict';
import {checkExecution} from '../lib/risk.ts';
const safe={chainId:56,amountUsd:5,dailyUsedUsd:0,dailyCapUsd:50,priceImpactPct:.2,quoteExpiresAt:2000,simulationPassed:true,confidence:'High',eligible:true,approved:true};
assert.equal(checkExecution(safe,1000).allowed,true);
for(const change of [{simulationPassed:false},{quoteExpiresAt:999},{amountUsd:51},{amountUsd:NaN},{chainId:1},{priceImpactPct:1.01},{approved:false},{eligible:false},{dailyUsedUsd:49},{confidence:'Low'}]) assert.equal(checkExecution({...safe,...change},1000).allowed,false);
console.log('Execution invariants passed (10 failure cases)');
// Runtime input is not made trustworthy by a TypeScript annotation.
for(const change of [{confidence:undefined},{confidence:'Unknown'},{simulationPassed:'true'},{approved:1},{eligible:'yes'}])
  assert.equal(checkExecution({...safe,...change},1000).allowed,false);
console.log('Malformed runtime evidence fails closed (5 cases)');
assert.equal(checkExecution({...safe,dailyCapUsd:500,dailyUsedUsd:100},1000).allowed,false);

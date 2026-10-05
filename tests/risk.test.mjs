import assert from 'node:assert/strict';
import {checkExecution} from '../lib/risk.ts';
const safe={chainId:56,amountUsd:5,dailyUsedUsd:0,dailyCapUsd:50,priceImpactPct:.2,quoteExpiresAt:2000,simulationPassed:true,confidence:'High',eligible:true,approved:true};
assert.equal(checkExecution(safe,1000).allowed,true);
for(const change of [{simulationPassed:false},{quoteExpiresAt:999},{amountUsd:51},{amountUsd:NaN},{chainId:1},{priceImpactPct:1.01},{approved:false},{eligible:false},{dailyUsedUsd:49},{confidence:'Low'}]) assert.equal(checkExecution({...safe,...change},1000).allowed,false);
console.log('Execution invariants passed (10 failure cases)');

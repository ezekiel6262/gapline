import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyBstockReceipt} from '../lib/wallet/receipt.ts';
import {STOCK_TOKENS} from '../lib/wallet/trading.ts';
const hash='0x'+'1'.repeat(64),blockHash='0x'+'2'.repeat(64),wallet='0x'+'3'.repeat(40),other='0x'+'4'.repeat(40);
const topic=address=>'0x'+address.slice(2).padStart(64,'0');
function fixture(changes={}) {
  const log={address:STOCK_TOKENS.NVDA,transactionHash:hash,blockHash,topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',topic(other),topic(wallet)],data:'0x'+(1n).toString(16).padStart(64,'0'),removed:false};
  const data={eth_chainId:'0x38',eth_blockNumber:'0x66',eth_getTransactionReceipt:{transactionHash:hash,blockHash,blockNumber:'0x64',status:'0x1',logs:[log]},eth_getTransactionByHash:{hash,blockHash,blockNumber:'0x64'},eth_getBlockByNumber:{hash:blockHash,number:'0x64'},...changes};
  return {data,rpc:async(method)=>data[method]};
}
test('receipt proves confirmed canonical BSC bStock movement, not strategy execution',async()=>{
  const {rpc}=fixture();const proof=await verifyBstockReceipt(hash,wallet,rpc,STOCK_TOKENS);
  assert.equal(proof.confirmations,'3');assert.equal(proof.transfers[0].ticker,'NVDA');assert.equal(proof.transfers[0].amountUnits,'1');
  assert.match(proof.proof,/not proof/);
});
test('receipt verification fails closed on missing, failed, testnet, unconfirmed and reorged transactions',async()=>{
  const base=fixture().data;
  for(const change of [{eth_chainId:'0x61'},{eth_getTransactionReceipt:null},{eth_blockNumber:'0x64'},{eth_getTransactionReceipt:{...base.eth_getTransactionReceipt,status:'0x0'}},{eth_getTransactionByHash:{...base.eth_getTransactionByHash,hash:blockHash}},{eth_getBlockByNumber:{hash,number:'0x64'}}])await assert.rejects(verifyBstockReceipt(hash,wallet,fixture(change).rpc,STOCK_TOKENS));
});
test('unrelated wallet, fake tokens, zero transfers and detached logs never count as demo evidence',async()=>{
  const base=fixture().data,receipt=base.eth_getTransactionReceipt,log=receipt.logs[0];
  for(const change of [{address:other},{data:'0x'+'0'.repeat(64)},{removed:true},{transactionHash:blockHash},{topics:[log.topics[0],topic(other),topic(other)]}])await assert.rejects(verifyBstockReceipt(hash,wallet,fixture({eth_getTransactionReceipt:{...receipt,logs:[{...log,...change}]}}).rpc,STOCK_TOKENS));
  await assert.rejects(verifyBstockReceipt('not-a-hash',wallet,fixture().rpc,STOCK_TOKENS));
});

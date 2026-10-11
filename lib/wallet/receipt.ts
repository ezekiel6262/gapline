export type ReadRpc=(method:string,params:unknown[])=>Promise<unknown>;
const HASH=/^0x[0-9a-fA-F]{64}$/;
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const WORD=/^0x[0-9a-fA-F]{64}$/;
const HEX=/^0x[0-9a-fA-F]+$/;
const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
function object(value:unknown):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Malformed RPC response');
  return value as Record<string,unknown>;
}
function hexNumber(value:unknown) {
  if(typeof value!=='string'||!HEX.test(value)||value.length>66)throw new Error('Malformed block or chain number');
  return BigInt(value);
}
export type ReceiptEvidence={chainId:56;hash:string;walletAddress:string;blockNumber:string;confirmations:string;blockHash:string;transfers:Array<{ticker:string;token:string;from:string;to:string;amountUnits:string}>;proof:'bStock token movement, not proof of an executed Gapline strategy'};
export async function verifyBstockReceipt(hash:string,walletAddress:string,rpc:ReadRpc,stockTokens:Record<string,string>):Promise<ReceiptEvidence> {
  if(!HASH.test(hash)||!ADDRESS.test(walletAddress)||/^0x0{40}$/.test(walletAddress))throw new Error('Enter a full transaction hash and nonzero BSC wallet address');
  if(hexNumber(await rpc('eth_chainId',[]))!==BigInt(56))throw new Error('Receipt verification requires BSC mainnet, chain 56');
  const [rawReceipt,rawTransaction,latest]=await Promise.all([rpc('eth_getTransactionReceipt',[hash]),rpc('eth_getTransactionByHash',[hash]),rpc('eth_blockNumber',[])]);
  if(!rawReceipt||!rawTransaction)throw new Error('Transaction is missing or not mined yet');
  const receipt=object(rawReceipt),tx=object(rawTransaction);
  if(receipt.status!=='0x1')throw new Error('Transaction failed or execution status is unavailable');
  if(typeof receipt.transactionHash!=='string'||receipt.transactionHash.toLowerCase()!==hash.toLowerCase()||typeof tx.hash!=='string'||tx.hash.toLowerCase()!==hash.toLowerCase())throw new Error('Transaction hash mismatch');
  if(typeof receipt.blockHash!=='string'||!HASH.test(receipt.blockHash)||tx.blockHash!==receipt.blockHash||tx.blockNumber!==receipt.blockNumber)throw new Error('Mined transaction and receipt do not agree');
  const blockNumber=hexNumber(receipt.blockNumber),head=hexNumber(latest);
  if(head<blockNumber||head-blockNumber+BigInt(1)<BigInt(3))throw new Error('Wait for at least three block confirmations');
  const canonical=object(await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]));
  if(canonical.hash!==receipt.blockHash||hexNumber(canonical.number)!==blockNumber)throw new Error('Receipt is not in the canonical block');
  if(!Array.isArray(receipt.logs)||receipt.logs.length>1000)throw new Error('Invalid receipt logs');
  const owner=walletAddress.toLowerCase(),entries=Object.entries(stockTokens);
  const transfers:ReceiptEvidence['transfers']=[];
  for(const rawLog of receipt.logs) {
    const log=object(rawLog);
    const asset=entries.find(([,address])=>typeof log.address==='string'&&address.toLowerCase()===log.address.toLowerCase());
    if(!asset||!Array.isArray(log.topics)||log.topics[0]!==TRANSFER)continue;
    if(log.removed===true||log.transactionHash!==receipt.transactionHash||log.blockHash!==receipt.blockHash)throw new Error('Transfer log is not bound to this receipt');
    if(log.topics.length!==3||!WORD.test(log.topics[1])||!WORD.test(log.topics[2])||!/^0x0{24}/i.test(log.topics[1])||!/^0x0{24}/i.test(log.topics[2])||typeof log.data!=='string'||!WORD.test(log.data))throw new Error('Malformed token transfer');
    const from=`0x${log.topics[1].slice(-40)}`.toLowerCase(),to=`0x${log.topics[2].slice(-40)}`.toLowerCase();
    const units=BigInt(log.data);
    if(units>BigInt(0)&&(from===owner||to===owner))transfers.push({ticker:asset[0],token:asset[1],from,to,amountUnits:units.toString()});
  }
  if(!transfers.length)throw new Error('No nonzero allowlisted bStock transfer involves the supplied wallet');
  return {chainId:56,hash,walletAddress,blockNumber:blockNumber.toString(),blockHash:receipt.blockHash,confirmations:(head-blockNumber+BigInt(1)).toString(),transfers,proof:'bStock token movement, not proof of an executed Gapline strategy'};
}

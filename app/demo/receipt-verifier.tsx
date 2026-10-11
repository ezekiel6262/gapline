'use client';
import {useRef,useState} from 'react';
import {verifyBstockReceipt,type ReceiptEvidence} from '@/lib/wallet/receipt';
import {STOCK_TOKENS} from '@/lib/wallet/trading';
export default function ReceiptVerifier() {
  const [hash,setHash]=useState(''),[wallet,setWallet]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [evidence,setEvidence]=useState<ReceiptEvidence|null>(null);
  const revision=useRef(0);
  const verify=async()=>{
    const current=revision.current;setBusy(true);setError('');setEvidence(null);
    try{
      const rpc=async(method:string,params:unknown[])=>{
        const response=await fetch('https://bsc-dataseed.bnbchain.org',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new Error('Public BSC RPC unavailable');
        const data=await response.json();if(data.error||!Object.hasOwn(data,'result'))throw new Error('RPC could not verify this transaction');return data.result;
      };
      const result=await verifyBstockReceipt(hash.trim(),wallet.trim(),rpc,STOCK_TOKENS);
      if(current===revision.current)setEvidence(result);
    }catch(cause){if(current===revision.current)setError(cause instanceof Error?cause.message:'Verification failed');}finally{setBusy(false);}
  };
  const edit=()=>{revision.current++;setEvidence(null);setError('');};
  return <section className="card demo-section"><span className="eyebrow">READ-ONLY MAINNET EVIDENCE</span><h2>Verify a bStock transaction</h2><p>No transaction is attached to this submission yet. A quote or local-chain test does not replace a live BSC-mainnet demonstration.</p><label htmlFor="demo-wallet">Public BSC wallet address involved in the transfer</label><input id="demo-wallet" value={wallet} onChange={event=>{edit();setWallet(event.target.value);}} placeholder="0x…" maxLength={42}/><label htmlFor="demo-hash">Confirmed transaction hash</label><input id="demo-hash" value={hash} onChange={event=>{edit();setHash(event.target.value);}} placeholder="0x…" maxLength={66}/><button className="primary" disabled={busy||!hash||!wallet} onClick={verify}>{busy?'Checking BSC mainnet…':'Verify receipt · no signing'}</button>{error&&<p role="alert">{error}</p>}{evidence&&<div role="status"><h3>Verified bStock token movement</h3><p>BSC mainnet · block {evidence.blockNumber} · {evidence.confirmations} confirmations</p>{evidence.transfers.map((transfer,index)=><p className="demo-address" key={index}>{transfer.ticker}B · {transfer.token}<br/>{transfer.amountUnits} smallest token units<br/>From {transfer.from}<br/>To {transfer.to}</p>)}<a href={`https://bscscan.com/tx/${evidence.hash}`} target="_blank" rel="noreferrer">Inspect on BscScan</a><p>{evidence.proof}. This checks the supplied public address, not the identity of its owner.</p></div>}</section>;
}

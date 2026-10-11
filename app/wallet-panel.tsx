'use client';
import {useEffect,useRef,useState} from 'react';
import {useUser} from '@clerk/nextjs';
import {walletSnapshot,type WalletProvider} from '@/lib/wallet/browser';
import {STOCK_TOKENS,USDT,type QuoteReview} from '@/lib/wallet/trading';
import './wallet-panel.css';
type WalletChoice={id:string;name:string;provider:WalletProvider};
export default function WalletPanel() {
  const {user}=useUser();
  const [open,setOpen]=useState(false),[choices,setChoices]=useState<WalletChoice[]>([]),[selected,setSelected]=useState('');
  const [wallet,setWallet]=useState<{address:string;balanceWei:string}|null>(null);
  const [mode,setMode]=useState<'wallet'|'guardian'>('wallet'),[ticker,setTicker]=useState<keyof typeof STOCK_TOKENS>('NVDA'),[amount,setAmount]=useState('1');
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[quote,setQuote]=useState<QuoteReview|null>(null);
  const [guardian,setGuardian]=useState('Not checked'),[expired,setExpired]=useState(false);
  const [guardianAddress,setGuardianAddress]=useState('');
  const revision=useRef(0);
  const provider=choices.find(choice=>choice.id===selected)?.provider;
  useEffect(()=>{
    const announce=(event:Event)=>{
      const detail=(event as CustomEvent<{info:{uuid:string;name:string};provider:WalletProvider}>).detail;
      if(typeof detail?.provider?.request!=='function'||typeof detail.info?.uuid!=='string'||typeof detail.info?.name!=='string')return;
      setChoices(items=>items.some(item=>item.id===detail.info.uuid)?items:[...items,{id:detail.info.uuid,name:detail.info.name.slice(0,60),provider:detail.provider}]);
    };
    window.addEventListener('eip6963:announceProvider',announce);
    const injected=(window as Window&{ethereum?:WalletProvider}).ethereum;
    if(injected?.request)setChoices([{id:'injected',name:'Browser wallet',provider:injected}]);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return()=>window.removeEventListener('eip6963:announceProvider',announce);
  },[]);
  useEffect(()=>{if(!selected&&choices.length)setSelected(choices[0].id);},[choices,selected]);
  useEffect(()=>{
    revision.current++;setWallet(null);setQuote(null);
    const reset=()=>{revision.current++;setWallet(null);setQuote(null);setNotice('Wallet account or network changed. Reconnect to continue.');};
    provider?.on?.('accountsChanged',reset);provider?.on?.('chainChanged',reset);provider?.on?.('disconnect',reset);
    return()=>{provider?.removeListener?.('accountsChanged',reset);provider?.removeListener?.('chainChanged',reset);provider?.removeListener?.('disconnect',reset);};
  },[provider,user?.id]);
  useEffect(()=>{revision.current++;setQuote(null);setExpired(false);},[mode,ticker,amount,guardianAddress]);
  useEffect(()=>{if(!quote)return;const timer=window.setTimeout(()=>setExpired(true),Math.max(0,Date.parse(quote.expiresAt)-Date.now()));return()=>window.clearTimeout(timer);},[quote]);
  const connect=async()=>{
    if(!provider){setNotice('Open Gapline in a browser with a wallet extension, or the Binance Wallet dApp browser.');return;}
    setBusy(true);setNotice('');const current=revision.current;
    try{const next=await walletSnapshot(provider,true);if(current===revision.current)setWallet(next);}
    catch(error){setNotice(error instanceof Error?error.message:'Wallet connection declined');}finally{setBusy(false);}
  };
  const review=async()=>{
    setBusy(true);setNotice('');setQuote(null);const current=revision.current;
    try{
      if(mode==='guardian') {
        const response=await fetch('/api/guardian/service',guardianAddress?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,ticker,amount,walletAddress:guardianAddress})}:{cache:'no-store'});const data=await response.json();
        if(current===revision.current)setGuardian(data.outputAmount?`${data.outputAmount} ${ticker}B quoted for ${amount} USDT. ${data.reason}`:data.reason??data.error??'Service unavailable');return;
      }
      if(!provider||!wallet)throw new Error('Connect your BSC wallet first');
      const fresh=await walletSnapshot(provider);
      if(fresh.address.toLowerCase()!==wallet.address.toLowerCase())throw new Error('Wallet changed. Reconnect first');
      const response=await fetch('/api/wallet/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,ticker,amount,walletAddress:fresh.address})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??'Quote unavailable');
      if(current===revision.current){setQuote(data);setExpired(false);}
    }catch(error){if(current===revision.current)setNotice(error instanceof Error?error.message:'Review failed');}finally{setBusy(false);}
  };
  return <><button className="secondary" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="wallet-panel">Wallets</button>{open&&<section id="wallet-panel" className="wallet-panel card" aria-label="Wallet execution modes">
    <div className="section-heading"><div><h2>Wallets & execution</h2><p>Connecting never grants permission to trade.</p></div><button className="secondary" onClick={()=>setOpen(false)} aria-label="Close wallet panel">Close</button></div>
    <label htmlFor="execution-mode">Execution mode</label><select id="execution-mode" value={mode} onChange={event=>setMode(event.target.value as typeof mode)}><option value="wallet">My wallet · approve each order</option><option value="guardian">Guardian · private Binance service</option></select>
    {mode==='wallet'?<><label htmlFor="wallet-choice">Browser wallet</label><select id="wallet-choice" value={selected} onChange={event=>setSelected(event.target.value)}>{choices.length?choices.map(choice=><option key={choice.id} value={choice.id}>{choice.name}</option>):<option>No wallet detected</option>}</select><button className="secondary" disabled={busy} onClick={connect}>{wallet?'Refresh connection':'Connect wallet'}</button>{wallet&&<><p className="wallet-address">{wallet.address}</p><p>BNB Smart Chain · gas balance {(Number(wallet.balanceWei)/1e18).toFixed(6)} BNB</p><button className="secondary" onClick={()=>{revision.current++;setWallet(null);setQuote(null);}}>Forget connection</button></>}<label htmlFor="quote-ticker">bStock</label><select id="quote-ticker" value={ticker} onChange={event=>setTicker(event.target.value as typeof ticker)}>{Object.keys(STOCK_TOKENS).map(asset=><option key={asset}>{asset}</option>)}</select><label htmlFor="quote-amount">USDT amount · maximum 50</label><input id="quote-amount" type="number" min="0.000001" max="50" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/><p className="wallet-address">Pay USDT: {USDT}<br/>Receive {ticker}B: {STOCK_TOKENS[ticker]}</p></>:<p>{guardian}</p>}
    {mode==='guardian'&&<><label htmlFor="guardian-wallet-address">Authorized private BSC wallet address (optional for health check)</label><input id="guardian-wallet-address" value={guardianAddress} onChange={event=>setGuardianAddress(event.target.value)} placeholder="0x…"/><label htmlFor="guardian-ticker">bStock</label><select id="guardian-ticker" value={ticker} onChange={event=>setTicker(event.target.value as typeof ticker)}>{Object.keys(STOCK_TOKENS).map(asset=><option key={asset}>{asset}</option>)}</select><label htmlFor="guardian-amount">USDT amount · maximum 50</label><input id="guardian-amount" type="number" min="0.000001" max="50" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/><p className="wallet-address">Pay USDT: {USDT}<br/>Receive {ticker}B: {STOCK_TOKENS[ticker]}</p></>}
    <button className="primary" disabled={busy||!user} onClick={review}>{busy?'Checking…':mode==='wallet'?'Request live quote':guardianAddress?'Request private quote':'Check Guardian service'}</button>{!user&&<p>Sign in before requesting private execution checks.</p>}
    {quote&&<div role="status"><h3>{expired?'Quote expired':'Live quote review'}</h3>{quote.routes.map((route,index)=><p key={index}>{route.vendor} · {route.executionMode} · impact {route.impactPercent===null?'unavailable':`${route.impactPercent}%`} · {route.checksPassed?'quote checks passed':'blocked'}</p>)}{quote.blockers.map(reason=><p key={reason}>{reason}</p>)}</div>}{notice&&<p role="alert">{notice}</p>}<p className="form-hint">Signing disabled until the RFQ order, eligibility, simulation and authorization checks are implemented and verified. No funds move from this panel.</p>
  </section>}</>;
}

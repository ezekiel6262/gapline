"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { Activity, Bell, Check, ChevronRight, CircleDollarSign, Gift, Landmark, Link2, Plus, ShieldCheck, Sparkles, Target, WalletCards, X } from "lucide-react";
import { holdings as demoHoldings, marketSummary, markets } from "@/lib/demo-data";
import MoneyPlans, { type MoneyPlan } from './money-plans';

type View = "Weekend" | "Gap Monitor" | "Guardian" | "Money" | "Calls" | "Scorecard";
type Holding = { ticker: string; company: string; qty: number; friday: number; now: number | null; issuer: string | null; spark: readonly number[] };
type Policy = { id: number; text: string; ticker: string; threshold: number; action: string; maxTrade: number; status: "draft" | "approved" };
type Call = { id: number; ticker: string; prediction: number; createdAt: string };

function useStoredState<T>(key: string, initial: T) {
  const { user, isLoaded } = useUser();
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [cloudLoaded,setCloudLoaded] = useState(false);
  useEffect(() => {
    if (!isLoaded) {
      const timer=window.setTimeout(()=>{try {const saved=window.localStorage.getItem(`gapline:v2:guest:${key}`);setValue(saved?JSON.parse(saved) as T:initial);}catch{setValue(initial);}setLoadedOwner('guest');setReady(true);},2000);
      return()=>window.clearTimeout(timer);
    }
    let cancelled = false;
    setReady(false);
    setCloudLoaded(false);
    const storageKey = `gapline:v2:${user?.id ?? 'guest'}:${key}`;
    const load = async () => {
      let next = initial;
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) next = JSON.parse(saved) as T;
        if (user) {
          const response = await fetch(`/api/state/${key}`);
          if (response.ok) { const result = await response.json(); if (result.value !== null) next = result.value as T; if(!cancelled)setCloudLoaded(true); }
        }
      } catch { /* Keep the local fallback when offline. */ }
      if (!cancelled) { setValue(next); setLoadedOwner(user?.id ?? 'guest'); setReady(true); }
    };
    void load();
    return () => { cancelled = true; };
  // The initial value is a seed; changes must not reset a loaded collection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id, isLoaded]);
  useEffect(() => {
    if (!ready || loadedOwner !== (user?.id ?? 'guest')) return;
    window.localStorage.setItem(`gapline:v2:${user?.id ?? 'guest'}:${key}`, JSON.stringify(value));
    if (!user || !cloudLoaded) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/state/${key}`, { method:'PUT', headers:{'Content-Type':'application/json'},body:JSON.stringify({value}),signal:controller.signal }).catch(()=>{});
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, value, ready, loadedOwner, cloudLoaded, user?.id]);
  return [value, setValue] as const;
}

function AccountControl() {
  const { user, isLoaded } = useUser();
  const [timedOut,setTimedOut]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setTimedOut(true),10000);return()=>window.clearTimeout(timer);},[]);
  if (!isLoaded) return <span className="updated" role="status">{timedOut?'Guest · sign-in setup pending':'Loading account…'}</span>;
  return user ? <UserButton afterSignOutUrl="/"/> : <SignInButton mode="modal"><button className="secondary">Sign in · save portfolio</button></SignInButton>;
}

function Logo() {
  return <span className="logo" aria-hidden="true"><Activity size={20} /></span>;
}

function marketClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
  const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(get("weekday"));
  const seconds = Number(get("hour"))*3600 + Number(get("minute"))*60 + Number(get("second"));
  const open = 9*3600+30*60, close = 16*3600;
  const isOpen = day >= 1 && day <= 5 && seconds >= open && seconds < close;
  let remaining: number;
  if (isOpen) remaining = close-seconds;
  else if (day >= 1 && day <= 5 && seconds < open) remaining = open-seconds;
  else {
    const daysAhead = day === 5 ? 3 : day === 6 ? 2 : day === 0 ? 1 : 1;
    remaining = (24*3600-seconds) + (daysAhead-1)*24*3600 + open;
  }
  const days=Math.floor(remaining/86400), hours=Math.floor((remaining%86400)/3600), mins=Math.floor((remaining%3600)/60);
  return { isOpen, countdown: `${days ? `${days}D ` : ""}${String(hours).padStart(2,"0")}H ${String(mins).padStart(2,"0")}M` };
}

function MarketBanner({ compact=false }: { compact?: boolean }) {
  const [clock,setClock]=useState<ReturnType<typeof marketClock>|null>(null);
  useEffect(()=>{setClock(marketClock(new Date())); const id=window.setInterval(()=>setClock(marketClock(new Date())),30_000); return()=>window.clearInterval(id); },[]);
  if(!clock) return <section className={`weekend-banner ${compact?'compact':''}`}><p>Loading market session clock…</p></section>;
  return <section className={`weekend-banner ${compact?"compact":""}`}><div><span className="status-pill"><span/> {clock.isOpen?"US market open":"Weekend mode"}</span><p>{clock.isOpen?"Traditional and tokenized markets are trading together.":compact?"Compare the closed reference with markets trading now.":"US markets are closed. Your portfolio is still moving onchain."}</p></div><div className="countdown"><small>{clock.isOpen?"MARKET CLOSES IN":"MARKET OPENS IN"}</small><strong>{clock.countdown}</strong>{compact?null:<span>{clock.isOpen?"Today, 4:00pm New York":"Next session, 9:30am New York"}</span>}</div></section>;
}

function Sparkline({ values, loss = false }: { values: readonly number[]; loss?: boolean }) {
  if (values.length < 2) return <span className="not-covered">Not covered</span>;
  const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${36 - ((value - min) / spread) * 28}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 100 42" role="img" aria-label={loss ? "Falling price" : "Rising price"}><polyline points={points} fill="none" stroke={loss ? "#B4500F" : "#1D5AD8"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PriceChart({ values, reference }: { values: number[]; reference: number }) {
  if (values.length < 2) return <div className="empty-state compact">Waiting for live market history.</div>;
  const min = Math.min(...values) * .998, max = Math.max(...values) * 1.002, spread = max - min || 1;
  const line = values.map((value, index) => `${(index / (values.length - 1)) * 720},${180 - ((value - min) / spread) * 140}`).join(" ");
  const refY = 180 - ((reference - min) / spread) * 140;
  return <div className="chart-wrap"><svg viewBox="0 0 720 210" className="price-chart" role="img" aria-label="Recent daily token market closes and current price"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1D5AD8" stopOpacity=".2"/><stop offset="1" stopColor="#1D5AD8" stopOpacity="0"/></linearGradient></defs><line x1="0" x2="720" y1={refY} y2={refY} stroke="#8A919C" strokeDasharray="7 8"/><polygon points={`0,190 ${line} 720,190`} fill="url(#area)"/><polyline points={line} fill="none" stroke="#1D5AD8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="chart-labels"><span>RECENT DAILY TOKEN CLOSES (UTC)</span><span>NOW</span></div></div>;
}

function WeekendView({ goTo, holdings: savedHoldings, onAddHolding }: { goTo: (view: View) => void; holdings: Holding[]; onAddHolding: () => void }) {
  const [livePrices,setLivePrices] = useState<Record<string,ReturnType<typeof marketSummary>>>({});
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      const results = await Promise.allSettled(Object.keys(markets).map(async ticker => {
        const response = await fetch(`/api/market?ticker=${ticker}`, {signal:controller.signal});
        const result = await response.json();
        if (!response.ok || !result.source?.startsWith('live-')) throw new Error('No live market');
        return [ticker,result] as const;
      }));
      if (!controller.signal.aborted) setLivePrices(Object.fromEntries(results.filter((r): r is PromiseFulfilledResult<readonly [string,ReturnType<typeof marketSummary>]> => r.status === 'fulfilled').map(r=>r.value)));
    };
    void refresh();
    const timer = window.setInterval(()=>void refresh(),60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  },[]);
  const holdings = savedHoldings.map(holding => {
    const price=livePrices[holding.ticker];
    return price ? {...holding,friday:price.reference,now:price.implied,issuer:price.issuers[0]?.issuer ?? null,spark:price.history} : {...holding,now:null,issuer:null,spark:[]};
  });
  const covered = holdings.filter((holding) => holding.now !== null);
  const fridayValue = covered.reduce((sum, holding) => sum + holding.qty * holding.friday, 0);
  const currentValue = covered.reduce((sum, holding) => sum + holding.qty * holding.now!, 0);
  const change = currentValue - fridayValue;
  const historyLength = covered.length ? Math.min(...covered.map(item=>item.spark.length)) : 0;
  const portfolioHistory = Array.from({length:historyLength},(_,index)=>covered.reduce((sum,item)=>sum+item.qty*item.spark[item.spark.length-historyLength+index],0));
  const biggest = [...covered].sort((a,b)=>Math.abs((b.now!-b.friday)/b.friday)-Math.abs((a.now!-a.friday)/a.friday))[0];
  const biggestMove = biggest ? (biggest.now!-biggest.friday)/biggest.friday*100 : null;
  return <>
    <MarketBanner/>
    <main className="content">
      <div className="page-heading"><div><span className="eyebrow">SHADOW PORTFOLIO</span><h1>Your weekend, live.</h1></div><button className="secondary" onClick={onAddHolding}><Plus size={16}/> Add holding</button></div>
      <section className="overview-grid">
        <article className="card portfolio-card">
          <div className="card-top"><div><span className="muted">Live covered portfolio value</span><div className="hero-number">${currentValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><span className={change>=0?"gain":"loss"}>{change>=0?"+":""}${change.toFixed(2)} · {(fridayValue ? change/fridayValue*100 : 0).toFixed(2)}% since Friday token-market close</span></div><div className="live"><span/> {covered.length?'LIVE':'LOADING'}</div></div>
          <PriceChart values={portfolioHistory} reference={fridayValue}/>
        </article>
        <article className="guardian-card">
          <div className="card-top"><div className="guardian-title"><ShieldCheck/><span>Weekend Guardian</span></div><span className="live light">LOCKED</span></div>
          <p className="guardian-kicker">REVIEWABLE POLICIES · NO AUTOMATIC TRADES</p>
          <h2>Protection starts with your rules</h2>
          <p>Approve a capped policy, then inspect its preflight. No funds move without a valid quote, passing simulation and wallet authorization.</p>
          <div className="action-stats"><div><small>MAX IMPACT</small><strong>1.00%</strong></div><div><small>STATUS</small><strong>Policy preview</strong></div></div>
          <button onClick={() => goTo("Guardian")} className="dark-button">Open Guardian <ChevronRight size={17}/></button>
        </article>
      </section>
      <section className="card holdings-card">
        <div className="section-heading"><div><h2>Your holdings</h2><p>Your quantities valued using live tokenized markets. Uncovered holdings are excluded from totals.</p></div><span className="updated">Refreshes every minute</span></div>
        <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Quantity</th><th>Friday close</th><th>Now</th><th>Weekend move</th><th>Issuer</th><th>Trend</th><th></th></tr></thead><tbody>{holdings.map((holding) => {
          const move = holding.now ? ((holding.now-holding.friday)/holding.friday)*100 : null;
          return <tr key={holding.ticker} onClick={() => holding.now && goTo("Gap Monitor")} className={holding.now ? "clickable" : ""}><td><strong>{holding.ticker}</strong><span>{holding.company}</span></td><td className="mono">{holding.qty}</td><td className="mono">${holding.friday.toFixed(2)}</td><td className="mono">{holding.now ? `$${holding.now.toFixed(2)}` : "—"}</td><td className={`mono ${move !== null && move >= 0 ? "gain" : "loss"}`}>{move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</td><td>{holding.issuer ? <span className="issuer">{holding.issuer}</span> : <span className="not-covered">Not covered</span>}</td><td><Sparkline values={holding.spark} loss={move !== null && move < 0}/></td><td><ChevronRight size={18}/></td></tr>})}</tbody></table></div>
      </section>
      <section className="lower-grid"><article className="gap-card"><div><span className="eyebrow">LARGEST LIVE TOKEN GAP</span><h2>{biggest ? <>{biggest.ticker} · <span className={biggestMove!>=0?'gain':'loss'}>{biggestMove!>=0?'+':''}{biggestMove!.toFixed(2)}%</span> since Friday</> : 'Waiting for live prices'}</h2><p>Compared with Friday’s token-market close, not the brokerage close.</p></div><button onClick={() => goTo("Gap Monitor")} className="primary">See the live gap</button></article><article className="card quick-card"><span className="eyebrow">PLAN YOUR NEXT MOVE</span><div className="quick-actions"><button onClick={()=>goTo("Money")}><CircleDollarSign/>Cash out<span>Plan a sleeve conversion</span></button><button onClick={()=>goTo("Money")}><Gift/>Send a gift<span>Prepare a stock gift</span></button></div></article></section>
      <p className="disclaimer">Weekend estimates use tokenized-stock markets and may not predict the next traditional-market open. Tokenized stocks are not the same as brokerage shares. Not financial advice.</p>
    </main>
  </>;
}

function GapView() {
  const [ticker, setTicker] = useState("NVDA");
  const [summary, setSummary] = useState(() => marketSummary("NVDA"));
  const [marketState, setMarketState] = useState<"loading" | "live" | "public-live" | "demo" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setMarketState("loading");
    fetch(`/api/market?ticker=${encodeURIComponent(ticker)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Market data request failed");
        setSummary(result);
        setMarketState(result.source === "live-binance-rwa" ? "live" : result.source === "live-binance-public" ? "public-live" : "demo");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSummary(marketSummary(ticker));
        setMarketState("error");
      });
    return () => controller.abort();
  }, [ticker]);

  const last = summary.issuers[0].price;
  const maxDepth = summary.issuers.reduce((sum, item) => sum + item.depthUsd, 0);
  const issuerDifference = summary.issuers.length > 1
    ? Math.abs(summary.issuers[0].price - summary.issuers[1].price) / summary.implied * 100
    : null;
  return <>
    <MarketBanner compact/>
    <main className="content"><div className="page-heading"><div><span className="eyebrow">LIVE MARKET INTELLIGENCE</span><h1>Gap Monitor</h1></div><span className={`data-source ${marketState}`} title={marketState === "public-live" ? "Verified contract from Binance's public RWA catalog; price from Binance's public spot market." : undefined}>{marketState === "live" ? "Live · Binance RWA API" : marketState === "public-live" ? "Live · Binance public market" : marketState === "loading" ? "Refreshing…" : marketState === "error" ? "Live data unavailable · Demo shown" : "Recorded demo"}</span></div>
      <div className="ticker-tabs">{Object.keys(markets).map((item) => <button key={item} onClick={() => setTicker(item)} className={ticker===item ? "active" : ""}>{item}</button>)}</div>
      <section className="gap-hero card"><div className="gap-stats"><div><small>FRIDAY REFERENCE</small><strong>${summary.reference.toFixed(2)}</strong><span>Market closed</span></div><div><small>LAST TOKEN MARKET PRICE</small><strong>${last.toFixed(2)}</strong><span className={summary.gap >= 0 ? "gain" : "loss"}>{summary.gap >= 0 ? "+" : ""}{summary.gap.toFixed(2)}%</span></div></div><div className="implied"><small>IMPLIED MONDAY OPEN</small><strong>${summary.implied.toFixed(2)}</strong><span className="confidence">{summary.confidence} confidence</span><p>Quote-depth weighting pending</p></div></section>
      <section className="monitor-grid"><article className="card"><div className="section-heading"><div><h2>{ticker} across the weekend</h2><p>Normalized issuer prices against Friday&apos;s close.</p></div></div><PriceChart values={summary.history} reference={summary.reference}/><div className="legend"><span><i className="blue"/>Tokenized price</span><span><i className="dashed"/>Friday reference</span></div></article><article className="card why-card"><span className="eyebrow">WHY {summary.confidence.toUpperCase()} CONFIDENCE?</span><h2>{summary.confidence === "Low" ? "Liquidity depth is not verified yet." : "The markets broadly agree."}</h2><div className="metric-row"><span>Total quoted depth</span><strong>{maxDepth ? `$${(maxDepth/1000).toFixed(1)}k` : "Pending"}</strong></div><div className="metric-row"><span>Issuer difference</span><strong>{issuerDifference === null ? "One issuer" : `${issuerDifference.toFixed(2)}%`}</strong></div><div className="metric-row"><span>Trade guardrail</span><strong>1.00%</strong></div><p className="note">The Guardian will not act until executable quote depth is connected, simulation passes and confidence is not low.</p></article></section>
      <section className="card issuer-table"><div className="section-heading"><div><h2>Issuer comparison</h2><p>Same underlying, different onchain markets.</p></div></div>{summary.issuers.map((issuer) => <div className="issuer-row" key={issuer.issuer}><div><span className="token-mark">{issuer.issuer[0]}</span><strong>{ticker} · {issuer.issuer}</strong></div><div><small>PRICE</small><strong className="mono">${issuer.price.toFixed(2)}</strong></div><div><small>DEPTH WITHIN 1%</small><strong className="mono">{issuer.depthUsd ? `$${issuer.depthUsd.toLocaleString()}` : "Pending quote"}</strong></div><span className="confidence">Included</span></div>)}</section>
      <p className="disclaimer">This is a weekend estimate, not a promise of Monday&apos;s open. Trades are spot-only and subject to liquidity, issuer and custody risk. Not financial advice.</p>
    </main>
  </>;
}

function GuardianView({ policies, setPolicies }: { policies: Policy[]; setPolicies: (next: Policy[]) => void }) {
  const [rule, setRule] = useState("If NVDA drops more than 3% this weekend, protect $25 of my sleeve.");
  const [draft, setDraft] = useState<Policy | null>(null);
  const [error,setError] = useState('');
  const [simulation, setSimulation] = useState<"idle" | "checking" | "ready">("idle");
  const compile = () => {
    if (!/\b(NVDA|TSLA|AAPL|SPY)\b/i.test(rule) || !/drops?|down|falls?/i.test(rule) || !/protect|sell/i.test(rule) || !/\d+(?:\.\d+)?\s*%/.test(rule) || !/\$\d+(?:\.\d+)?/.test(rule)) {
      setError('Use a supported ticker, a percentage drop, and a dollar amount to protect. Other instructions require explicit structured rules.'); setDraft(null); return;
    }
    const ticker = (rule.match(/\b(NVDA|TSLA|AAPL|SPY)\b/i)?.[1] ?? "NVDA").toUpperCase();
    const threshold = Number(rule.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? 3);
    const maxTrade = Number(rule.match(/\$(\d+(?:\.\d+)?)/)?.[1] ?? 25);
    if (threshold <= 0 || threshold > 100 || maxTrade <= 0 || maxTrade > 50) {setError('Use a drop from 0–100% and an amount up to $50.');return;}
    setError('');
    setDraft({ id: Date.now(), text: rule, ticker, threshold, maxTrade, action: "Sell sleeve to USDT", status: "draft" });
    setSimulation("idle");
  };
  const approve = () => {
    if (!draft) return;
    setPolicies([{ ...draft, status: "approved" }, ...policies.filter((item) => item.id !== draft.id)]);
    setDraft(null);
  };
  const simulate = async () => {
    setSimulation("checking");
    try {
      const response=await fetch('/api/guardian/preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker:draft?.ticker ?? policies[0]?.ticker ?? 'NVDA',amountUsd:draft?.maxTrade ?? policies[0]?.maxTrade ?? 25})});
      const result=await response.json();
      setError(result.error ?? result.reason ?? '');
      setSimulation(response.ok?'ready':'idle');
    } catch {setError('Preflight unavailable. No action has been submitted.');setSimulation('idle');}
  };
  return <main className="content module-page">
    <div className="page-heading"><div><span className="eyebrow">SIMULATION-FIRST PROTECTION</span><h1>Weekend Guardian</h1><p>Turn a plain-English instruction into a capped, reviewable policy.</p></div><span className="data-source demo">Wallet execution pending connection</span></div>
    {error && <p role="status" className="form-hint">{error}</p>}
    <section className="guardian-builder">
      <article className="card form-card"><span className="step">1</span><h2>Write your rule</h2><label htmlFor="guardian-rule">Plain-English instruction</label><textarea id="guardian-rule" value={rule} onChange={(event) => setRule(event.target.value)} rows={5}/><div className="form-hint">Hard hackathon cap: $50 per trade. Low-confidence markets remain blocked.</div><button className="primary" onClick={compile}>Compile policy</button></article>
      <article className="card policy-card"><span className="step">2</span><h2>Review typed policy</h2>{draft ? <><div className="policy-grid"><div><small>ASSET</small><strong>{draft.ticker}</strong></div><div><small>TRIGGER</small><strong>Gap ≤ −{draft.threshold}%</strong></div><div><small>ACTION</small><strong>{draft.action}</strong></div><div><small>MAX TRADE</small><strong>${Math.min(draft.maxTrade,50).toFixed(2)}</strong></div></div><div className="guardrail-list"><span><Check/>Quote impact below 1%</span><span><Check/>Passing simulation required</span><span><Check/>No action on low confidence</span></div><button className="dark-button" onClick={approve}>Approve policy</button></> : <div className="empty-state">Compile a rule to see exactly what the Guardian would be allowed to do.</div>}</article>
    </section>
    <section className="card action-log"><div className="section-heading"><div><h2>Guardian activity</h2><p>Every decision is visible—even when no trade is sent.</p></div><button className="secondary" onClick={simulate}>{simulation === "checking" ? "Running checks…" : "Run policy preflight"}</button></div>{simulation === "ready" && <div className="simulation-result"><ShieldCheck/><div><strong>Policy preflight complete—execution remains locked</strong><span>The $50 cap and policy shape passed. A live executable quote and Binance transaction simulation are still required before signing.</span></div></div>}{policies.length ? policies.map((policy) => <div className="log-row" key={policy.id}><span className="status-dot active"/><div><strong>{policy.ticker}: {policy.action}</strong><span>{policy.text}</span></div><span className="confidence">Approved · max ${Math.min(policy.maxTrade,50)}</span></div>) : <div className="empty-state compact">No approved policies yet.</div>}</section>
  </main>;
}

function MoneyView() {
  const [plans,setPlans] = useStoredState<MoneyPlan[]>('money-actions',[]);
  const validPlans=plans.filter(plan=>typeof plan==='object'&&plan!==null&&Number.isFinite(plan.amount));
  return <MoneyPlans plans={validPlans} onSave={plan=>setPlans([plan,...validPlans])} onRemove={id=>setPlans(validPlans.filter(plan=>plan.id!==id))}/>;
}


function CallsView({ calls, setCalls }: { calls: Call[]; setCalls: (calls: Call[]) => void }) {
  const [ticker,setTicker]=useState("NVDA"); const [prediction,setPrediction]=useState(1.5);
  const submit=()=>{if(!Number.isFinite(prediction)||Math.abs(prediction)>100){window.alert('Enter a predicted move between −100% and +100%.');return;}setCalls([{id:Date.now(),ticker,prediction,createdAt:new Date().toISOString()},...calls]);};
  return <main className="content module-page"><div className="page-heading"><div><span className="eyebrow">COMMUNITY SIGNAL</span><h1>Weekend Calls</h1><p>Call Monday’s opening move, then let the scorecard grade it.</p></div><span className="data-source demo">Closes Sunday 23:59 UTC</span></div><section className="calls-grid"><article className="card form-card"><h2>Make your call</h2><label>Ticker</label><select value={ticker} onChange={(e)=>setTicker(e.target.value)}>{Object.keys(markets).map(x=><option key={x}>{x}</option>)}</select><label>Expected Monday move</label><div className="money-input"><input type="number" step="0.1" value={prediction} onChange={(e)=>setPrediction(Number(e.target.value))}/><span>%</span></div><button className="primary" onClick={submit}>Save call</button></article><article className="card leaderboard"><span className="eyebrow">YOUR SIGNALS</span><h2>{calls.length} saved calls</h2><p>Your calls are stored with their creation time. Shared rankings and accuracy grading require an independent Monday opening-price feed.</p></article></section><section className="card"><div className="section-heading"><div><h2>Your calls</h2><p>Sign in to sync calls across devices.</p></div></div>{calls.length?calls.map(call=><div className="issuer-row" key={call.id}><div><span className="token-mark">{call.ticker[0]}</span><strong>{call.ticker}</strong></div><div><small>PREDICTION</small><strong>{call.prediction>=0?"+":""}{call.prediction.toFixed(1)}%</strong></div><span className="confidence">Awaiting Monday</span></div>):<div className="empty-state compact">No calls yet.</div>}</section></main>;
}

function ScorecardView() {
  const [snapshots,setSnapshots]=useState<Array<{ticker:string;price:number;reference:number;captured_at:string}>>([]);
  const [status,setStatus]=useState('Loading stored market history…');
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/snapshots',{signal:controller.signal}).then(async response=>{
      const result=await response.json();
      if(!response.ok) throw new Error(result.error);
      setSnapshots(result.snapshots);
      setStatus(result.snapshots.length?'Live snapshots saved in cloud storage':'The first scheduled market snapshot is pending.');
    }).catch(error=>{if(error.name!=='AbortError')setStatus('Market history is temporarily unavailable.');});
    return()=>controller.abort();
  },[]);
  const latest=snapshots.filter((item,index)=>snapshots.findIndex(other=>other.ticker===item.ticker)===index);
  return <main className="content module-page"><div className="page-heading"><div><span className="eyebrow">MONDAY REVIEW</span><h1>Scorecard</h1><p>Review your saved weekend signal and its underlying market history.</p></div><span className="data-source public-live">Cloud history</span></div><section className="card score-table"><div className="section-heading"><div><h2>Latest observations</h2><p>{status}</p></div></div>{latest.map(row=><div className="score-row" key={row.ticker}><strong>{row.ticker}</strong><span><small>TOKEN PRICE</small>${Number(row.price).toFixed(2)}</span><span><small>FRIDAY TOKEN CLOSE</small>${Number(row.reference).toFixed(2)}</span><span><small>CAPTURED</small>{new Date(row.captured_at).toLocaleString()}</span></div>)}{!latest.length&&<div className="empty-state compact">No stored observations yet.</div>}</section><p className="disclaimer">Monday prediction accuracy will appear once a traditional-market opening-price source is connected. Token-market closes and exchange prices are labelled separately.</p></main>;
}

function AddHoldingModal({ onClose, onAdd }: { onClose: () => void; onAdd: (holding: Holding) => void }) {
  const [ticker,setTicker]=useState("MSFT"); const [qty,setQty]=useState(1);
  const submit=()=>{ const key=ticker.trim().toUpperCase(); if(!/^[A-Z]{1,8}$/.test(key)||!Number.isFinite(qty)||qty<=0){window.alert('Enter a valid ticker and a positive quantity.');return;} onAdd({ticker:key,company:key,qty,friday:0,now:null,issuer:null,spark:[]}); onClose(); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal card" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(e)=>e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button><span className="eyebrow">MANUAL PORTFOLIO ENTRY</span><h2 id="add-title">Add a brokerage holding</h2><p>Gapline stores the ticker and quantity in this browser. No broker credentials are requested.</p><label>Ticker</label><input value={ticker} onChange={(e)=>setTicker(e.target.value)}/><label>Quantity</label><input type="number" min="0.001" step="0.001" value={qty} onChange={(e)=>setQty(Number(e.target.value))}/><button className="primary" onClick={submit}>Add holding</button></section></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("Weekend");
  const [portfolio, setPortfolio] = useStoredState<Holding[]>("portfolio", []);
  const [policies, setPolicies] = useStoredState<Policy[]>("policies", []);
  const [calls, setCalls] = useStoredState<Call[]>("calls", []);
  const [showAdd, setShowAdd] = useState(false);
  const tabs: View[] = ["Weekend","Gap Monitor","Guardian","Money","Calls","Scorecard"];
  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>setView('Weekend')}><Logo/><strong>Gapline</strong></button><nav aria-label="Primary navigation">{tabs.map(tab=><button key={tab} onClick={()=>setView(tab)} className={view===tab?'active':''}>{tab}</button>)}</nav><div className="header-actions"><AccountControl/></div></header>
    {view==='Weekend'?<WeekendView goTo={setView} holdings={portfolio} onAddHolding={()=>setShowAdd(true)}/>:view==='Gap Monitor'?<GapView/>:view==='Guardian'?<GuardianView policies={policies} setPolicies={setPolicies}/>:view==='Money'?<MoneyView/>:view==='Calls'?<CallsView calls={calls} setCalls={setCalls}/>:<ScorecardView/>}
    <nav className="mobile-nav" aria-label="Mobile navigation">{tabs.map(tab=><button key={tab} onClick={()=>setView(tab)} className={view===tab?'active':''}><span>{tab==='Weekend'?'Home':tab==='Gap Monitor'?'Gaps':tab}</span></button>)}</nav>
    {showAdd&&<AddHoldingModal onClose={()=>setShowAdd(false)} onAdd={holding=>{const existing=portfolio.find(item=>item.ticker===holding.ticker);setPortfolio(existing?portfolio.map(item=>item.ticker===holding.ticker?{...item,qty:item.qty+holding.qty}:item):[...portfolio,holding]);}}/>}
  </div>;
}

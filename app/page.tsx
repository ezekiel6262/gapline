"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, Check, ChevronRight, CircleDollarSign, Gift, Landmark, Link2, Plus, ShieldCheck, Sparkles, Target, WalletCards, X } from "lucide-react";
import { holdings as demoHoldings, marketSummary, markets } from "@/lib/demo-data";

type View = "Weekend" | "Gap Monitor" | "Guardian" | "Money" | "Calls" | "Scorecard";
type Holding = { ticker: string; company: string; qty: number; friday: number; now: number | null; issuer: string | null; spark: readonly number[] };
type Policy = { id: number; text: string; ticker: string; threshold: number; action: string; maxTrade: number; status: "draft" | "active" };
type Call = { id: number; ticker: string; prediction: number; createdAt: string };

function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const saved = window.localStorage.getItem(`gapline:v1:${key}`);
    if (saved) {
      try { setValue(JSON.parse(saved) as T); } catch { window.localStorage.removeItem(`gapline:v1:${key}`); }
    }
  }, [key]);
  useEffect(() => {
    window.localStorage.setItem(`gapline:v1:${key}`, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
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
  const [clock,setClock]=useState(()=>marketClock(new Date()));
  useEffect(()=>{ const id=window.setInterval(()=>setClock(marketClock(new Date())),30_000); return()=>window.clearInterval(id); },[]);
  return <section className={`weekend-banner ${compact?"compact":""}`}><div><span className="status-pill"><span/> {clock.isOpen?"US market open":"Weekend mode"}</span><p>{clock.isOpen?"Traditional and tokenized markets are trading together.":compact?"Compare the closed reference with markets trading now.":"US markets are closed. Your portfolio is still moving onchain."}</p></div><div className="countdown"><small>{clock.isOpen?"MARKET CLOSES IN":"MARKET OPENS IN"}</small><strong>{clock.countdown}</strong>{compact?null:<span>{clock.isOpen?"Today, 4:00pm New York":"Next session, 9:30am New York"}</span>}</div></section>;
}

function Sparkline({ values, loss = false }: { values: readonly number[]; loss?: boolean }) {
  if (values.length < 2) return <span className="not-covered">Not covered</span>;
  const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${36 - ((value - min) / spread) * 28}`).join(" ");
  return <svg className="sparkline" viewBox="0 0 100 42" role="img" aria-label={loss ? "Falling price" : "Rising price"}><polyline points={points} fill="none" stroke={loss ? "#B4500F" : "#1D5AD8"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PriceChart({ values, reference }: { values: number[]; reference: number }) {
  const min = Math.min(...values) * .998, max = Math.max(...values) * 1.002, spread = max - min || 1;
  const line = values.map((value, index) => `${(index / (values.length - 1)) * 720},${180 - ((value - min) / spread) * 140}`).join(" ");
  const refY = 180 - ((reference - min) / spread) * 140;
  return <div className="chart-wrap"><svg viewBox="0 0 720 210" className="price-chart" role="img" aria-label="Weekend price history"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1D5AD8" stopOpacity=".2"/><stop offset="1" stopColor="#1D5AD8" stopOpacity="0"/></linearGradient></defs><line x1="0" x2="720" y1={refY} y2={refY} stroke="#8A919C" strokeDasharray="7 8"/><polygon points={`0,190 ${line} 720,190`} fill="url(#area)"/><polyline points={line} fill="none" stroke="#1D5AD8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="chart-labels"><span>FRI 4PM</span><span>SAT 12PM</span><span>SUN 12PM</span><span>NOW</span></div></div>;
}

function WeekendView({ goTo, holdings, onAddHolding }: { goTo: (view: View) => void; holdings: Holding[]; onAddHolding: () => void }) {
  const covered = holdings.filter((holding) => holding.now !== null);
  const fridayValue = covered.reduce((sum, holding) => sum + holding.qty * holding.friday, 0);
  const currentValue = covered.reduce((sum, holding) => sum + holding.qty * holding.now!, 0);
  const change = currentValue - fridayValue;
  return <>
    <MarketBanner/>
    <main className="content">
      <div className="page-heading"><div><span className="eyebrow">SHADOW PORTFOLIO</span><h1>Your weekend, live.</h1></div><button className="secondary" onClick={onAddHolding}><Plus size={16}/> Add holding</button></div>
      <section className="overview-grid">
        <article className="card portfolio-card">
          <div className="card-top"><div><span className="muted">Recorded portfolio example</span><div className="hero-number">${currentValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><span className={change>=0?"gain":"loss"}>{change>=0?"+":""}${change.toFixed(2)} · {(change/fridayValue*100).toFixed(2)}% since Friday close</span></div><div className="live"><span/> SAMPLE</div></div>
          <PriceChart values={[23982,24040,23991,24132,24220,24195,24301,currentValue]} reference={fridayValue}/>
        </article>
        <article className="guardian-card">
          <div className="card-top"><div className="guardian-title"><ShieldCheck/><span>Weekend Guardian</span></div><span className="live light"><span/> LIVE</span></div>
          <p className="guardian-kicker">LATEST DEMO · SIMULATION ONLY</p>
          <h2>TSLA sleeve protection previewed</h2>
          <p>Your −3% rule fired in the demo. Policy limits passed; a live quote and transaction simulation are still required.</p>
          <div className="action-stats"><div><small>MAX IMPACT</small><strong>1.00%</strong></div><div><small>STATUS</small><strong>Policy preview</strong></div></div>
          <button onClick={() => goTo("Guardian")} className="dark-button">Open Guardian <ChevronRight size={17}/></button>
        </article>
      </section>
      <section className="card holdings-card">
        <div className="section-heading"><div><h2>Your holdings</h2><p>Browser-saved brokerage quantities with recorded sample pricing.</p></div><span className="updated">Live repricing in Gap Monitor</span></div>
        <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Quantity</th><th>Friday close</th><th>Now</th><th>Weekend move</th><th>Issuer</th><th>Trend</th><th></th></tr></thead><tbody>{holdings.map((holding) => {
          const move = holding.now ? ((holding.now-holding.friday)/holding.friday)*100 : null;
          return <tr key={holding.ticker} onClick={() => holding.now && goTo("Gap Monitor")} className={holding.now ? "clickable" : ""}><td><strong>{holding.ticker}</strong><span>{holding.company}</span></td><td className="mono">{holding.qty}</td><td className="mono">${holding.friday.toFixed(2)}</td><td className="mono">{holding.now ? `$${holding.now.toFixed(2)}` : "—"}</td><td className={`mono ${move !== null && move >= 0 ? "gain" : "loss"}`}>{move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</td><td>{holding.issuer ? <span className="issuer">{holding.issuer}</span> : <span className="not-covered">Not covered</span>}</td><td><Sparkline values={holding.spark} loss={move !== null && move < 0}/></td><td><ChevronRight size={18}/></td></tr>})}</tbody></table></div>
      </section>
      <section className="lower-grid"><article className="gap-card"><div><span className="eyebrow">BIGGEST WEEKEND GAP</span><h2>TSLA is <span className="loss">−3.31%</span> below Friday</h2><p>Recorded example—open Gap Monitor for the live market.</p></div><button onClick={() => goTo("Gap Monitor")} className="primary">See the live gap</button></article><article className="card quick-card"><span className="eyebrow">USE YOUR TOKENS NOW</span><div className="quick-actions"><button onClick={()=>goTo("Money")}><CircleDollarSign/>Cash out<span>Turn a sleeve into USDT</span></button><button onClick={()=>goTo("Money")}><Gift/>Send a gift<span>Share a piece of a stock</span></button></div></article></section>
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
      <section className="gap-hero card"><div className="gap-stats"><div><small>FRIDAY REFERENCE</small><strong>${summary.reference.toFixed(2)}</strong><span>Market closed</span></div><div><small>LAST ONCHAIN TRADE</small><strong>${last.toFixed(2)}</strong><span className={summary.gap >= 0 ? "gain" : "loss"}>{summary.gap >= 0 ? "+" : ""}{summary.gap.toFixed(2)}%</span></div></div><div className="implied"><small>IMPLIED MONDAY OPEN</small><strong>${summary.implied.toFixed(2)}</strong><span className="confidence">{summary.confidence} confidence</span><p>Liquidity-weighted across issuers</p></div></section>
      <section className="monitor-grid"><article className="card"><div className="section-heading"><div><h2>{ticker} across the weekend</h2><p>Normalized issuer prices against Friday&apos;s close.</p></div></div><PriceChart values={summary.history} reference={summary.reference}/><div className="legend"><span><i className="blue"/>Tokenized price</span><span><i className="dashed"/>Friday reference</span></div></article><article className="card why-card"><span className="eyebrow">WHY {summary.confidence.toUpperCase()} CONFIDENCE?</span><h2>{summary.confidence === "Low" ? "Liquidity depth is not verified yet." : "The markets broadly agree."}</h2><div className="metric-row"><span>Total quoted depth</span><strong>{maxDepth ? `$${(maxDepth/1000).toFixed(1)}k` : "Pending"}</strong></div><div className="metric-row"><span>Issuer difference</span><strong>{issuerDifference === null ? "One issuer" : `${issuerDifference.toFixed(2)}%`}</strong></div><div className="metric-row"><span>Trade guardrail</span><strong>1.00%</strong></div><p className="note">The Guardian will not act until executable quote depth is connected, simulation passes and confidence is not low.</p></article></section>
      <section className="card issuer-table"><div className="section-heading"><div><h2>Issuer comparison</h2><p>Same underlying, different onchain markets.</p></div></div>{summary.issuers.map((issuer) => <div className="issuer-row" key={issuer.issuer}><div><span className="token-mark">{issuer.issuer[0]}</span><strong>{ticker} · {issuer.issuer}</strong></div><div><small>PRICE</small><strong className="mono">${issuer.price.toFixed(2)}</strong></div><div><small>DEPTH WITHIN 1%</small><strong className="mono">{issuer.depthUsd ? `$${issuer.depthUsd.toLocaleString()}` : "Pending quote"}</strong></div><span className="confidence">Included</span></div>)}</section>
      <p className="disclaimer">This is a weekend estimate, not a promise of Monday&apos;s open. Trades are spot-only and subject to liquidity, issuer and custody risk. Not financial advice.</p>
    </main>
  </>;
}

function GuardianView({ policies, setPolicies }: { policies: Policy[]; setPolicies: (next: Policy[]) => void }) {
  const [rule, setRule] = useState("If NVDA drops more than 3% this weekend, protect $25 of my sleeve.");
  const [draft, setDraft] = useState<Policy | null>(null);
  const [simulation, setSimulation] = useState<"idle" | "checking" | "ready">("idle");
  const compile = () => {
    const ticker = (rule.match(/\b(NVDA|TSLA|AAPL|SPY)\b/i)?.[1] ?? "NVDA").toUpperCase();
    const threshold = Number(rule.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? 3);
    const maxTrade = Number(rule.match(/\$(\d+(?:\.\d+)?)/)?.[1] ?? 25);
    setDraft({ id: Date.now(), text: rule, ticker, threshold, maxTrade, action: "Sell sleeve to USDT", status: "draft" });
    setSimulation("idle");
  };
  const approve = () => {
    if (!draft) return;
    setPolicies([{ ...draft, status: "active" }, ...policies.filter((item) => item.id !== draft.id)]);
    setDraft(null);
  };
  const simulate = () => {
    setSimulation("checking");
    window.setTimeout(() => setSimulation("ready"), 900);
  };
  return <main className="content module-page">
    <div className="page-heading"><div><span className="eyebrow">SIMULATION-FIRST PROTECTION</span><h1>Weekend Guardian</h1><p>Turn a plain-English instruction into a capped, reviewable policy.</p></div><span className="data-source public-live">Agentic Wallet connected</span></div>
    <section className="guardian-builder">
      <article className="card form-card"><span className="step">1</span><h2>Write your rule</h2><label htmlFor="guardian-rule">Plain-English instruction</label><textarea id="guardian-rule" value={rule} onChange={(event) => setRule(event.target.value)} rows={5}/><div className="form-hint">Hard hackathon cap: $50 per trade. Low-confidence markets remain blocked.</div><button className="primary" onClick={compile}>Compile policy</button></article>
      <article className="card policy-card"><span className="step">2</span><h2>Review typed policy</h2>{draft ? <><div className="policy-grid"><div><small>ASSET</small><strong>{draft.ticker}</strong></div><div><small>TRIGGER</small><strong>Gap ≤ −{draft.threshold}%</strong></div><div><small>ACTION</small><strong>{draft.action}</strong></div><div><small>MAX TRADE</small><strong>${Math.min(draft.maxTrade,50).toFixed(2)}</strong></div></div><div className="guardrail-list"><span><Check/>Quote impact below 1%</span><span><Check/>Passing simulation required</span><span><Check/>No action on low confidence</span></div><button className="dark-button" onClick={approve}>Approve policy</button></> : <div className="empty-state">Compile a rule to see exactly what the Guardian would be allowed to do.</div>}</article>
    </section>
    <section className="card action-log"><div className="section-heading"><div><h2>Guardian activity</h2><p>Every decision is visible—even when no trade is sent.</p></div><button className="secondary" onClick={simulate}>{simulation === "checking" ? "Running checks…" : "Run policy preflight"}</button></div>{simulation === "ready" && <div className="simulation-result"><ShieldCheck/><div><strong>Policy preflight complete—execution remains locked</strong><span>The $50 cap and policy shape passed. A live executable quote and Binance transaction simulation are still required before signing.</span></div></div>}{policies.length ? policies.map((policy) => <div className="log-row" key={policy.id}><span className="status-dot active"/><div><strong>{policy.ticker}: {policy.action}</strong><span>{policy.text}</span></div><span className="confidence">Active · max ${Math.min(policy.maxTrade,50)}</span></div>) : <div className="empty-state compact">No active policies yet.</div>}</section>
  </main>;
}

function MoneyView() {
  const [mode, setMode] = useState<"Cash-Out" | "Gifts" | "Vaults" | "Splitter">("Cash-Out");
  const [amount, setAmount] = useState(25);
  const [saved, setSaved] = useStoredState<string[]>("money-actions", []);
  const save = (label: string) => setSaved([`${label} · ${new Date().toLocaleDateString()}`, ...saved]);
  return <main className="content module-page"><div className="page-heading"><div><span className="eyebrow">REAL-LIFE MONEY</span><h1>Use your tokens</h1><p>Preview practical flows without hiding price, liquidity or issuer risk.</p></div><span className="data-source demo">Preview mode · no funds move</span></div>
    <div className="subnav">{(["Cash-Out","Gifts","Vaults","Splitter"] as const).map((item)=><button className={mode===item?"active":""} onClick={()=>setMode(item)} key={item}>{item}</button>)}</div>
    {mode === "Cash-Out" && <section className="money-grid"><article className="card form-card"><CircleDollarSign/><h2>Weekend Cash-Out</h2><p>Turn part of a tokenized sleeve into BSC USDT.</p><label>Amount needed</label><div className="money-input"><span>$</span><input type="number" min="5" max="50" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div><label>Sell from</label><select><option>NVDAB · bStocks sleeve</option><option>TSLAB · bStocks sleeve</option></select><button className="primary" onClick={()=>save(`Cash-Out preview for $${amount}`)}>Preview quote</button></article><article className="card fair-price"><span className="eyebrow">FAIR PRICE CHECK</span><h2>No execution until every check passes.</h2><div className="metric-row"><span>Trade cap</span><strong>${Math.min(amount,50).toFixed(2)}</strong></div><div className="metric-row"><span>Maximum impact</span><strong>1.00%</strong></div><div className="metric-row"><span>Simulation</span><strong>Required</strong></div><div className="metric-row"><span>Settlement</span><strong>BSC USDT</strong></div><p className="note">A real quote must replace these limits before the Agentic Wallet can be asked to sign.</p></article></section>}
    {mode === "Gifts" && <section className="money-grid"><article className="card form-card"><Gift/><h2>Stock Gift</h2><label>Gift</label><select><option>AAPLB · Apple bStock</option><option>NVDAB · NVIDIA bStock</option></select><label>USD amount</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/><label>Message</label><input defaultValue="A small piece of the future."/><button className="primary" onClick={()=>save(`Gift draft for $${amount}`)}>Create gift draft</button></article><article className="card"><span className="eyebrow">ESCROW STATUS</span><h2>Contract deployment required</h2><p>The claim-link UX is ready for an audited three-function GiftEscrow. Until it is deployed and verified, Gapline will not pretend a gift is funded.</p><div className="blocked"><ShieldCheck/> Safe by default · deposits disabled</div></article></section>}
    {mode === "Vaults" && <section className="money-grid"><article className="card form-card"><Target/><h2>Goal Vault</h2><label>Goal name</label><input defaultValue="School fees"/><label>Target</label><input type="number" defaultValue="1200"/><label>Due date</label><input type="date" defaultValue="2027-03-01"/><button className="primary" onClick={()=>save("School fees vault saved")}>Save vault plan</button></article><article className="card vault-chart"><span className="eyebrow">GLIDE PATH</span><h2>Risk falls as the due date approaches.</h2><div className="glide"><span style={{width:"68%"}}>Stocks 68%</span><span style={{width:"32%"}}>USDT 32%</span></div><p>Weekly rebalances begin 60 days before payment and stop once fully stable seven days before due.</p></article></section>}
    {mode === "Splitter" && <section className="money-grid"><article className="card form-card"><Sparkles/><h2>Salary Splitter</h2><label>When incoming USDT exceeds</label><input type="number" defaultValue="100"/><label>Invest this percentage</label><input type="number" defaultValue="15"/><label>Target basket</label><select><option>AI & semiconductors</option><option>Broad market</option></select><button className="primary" onClick={()=>save("15% salary split rule saved")}>Save splitter rule</button></article><article className="card"><span className="eyebrow">AUTOMATION READINESS</span><h2>Rule saved locally</h2><p>Activation requires wallet incoming-transfer monitoring plus the same quote, simulation and policy checks used by Guardian.</p></article></section>}
    {saved.length > 0 && <section className="card saved-list"><h2>Saved previews</h2>{saved.slice(0,4).map((item)=><div className="log-row" key={item}><Check/><span>{item}</span></div>)}</section>}
  </main>;
}

function CallsView({ calls, setCalls }: { calls: Call[]; setCalls: (calls: Call[]) => void }) {
  const [ticker,setTicker]=useState("NVDA"); const [prediction,setPrediction]=useState(1.5);
  const submit=()=>setCalls([{id:Date.now(),ticker,prediction,createdAt:new Date().toISOString()},...calls]);
  return <main className="content module-page"><div className="page-heading"><div><span className="eyebrow">COMMUNITY SIGNAL</span><h1>Weekend Calls</h1><p>Call Monday’s opening move, then let the scorecard grade it.</p></div><span className="data-source demo">Closes Sunday 23:59 UTC</span></div><section className="calls-grid"><article className="card form-card"><h2>Make your call</h2><label>Ticker</label><select value={ticker} onChange={(e)=>setTicker(e.target.value)}>{Object.keys(markets).map(x=><option key={x}>{x}</option>)}</select><label>Expected Monday move</label><div className="money-input"><input type="number" step="0.1" value={prediction} onChange={(e)=>setPrediction(Number(e.target.value))}/><span>%</span></div><button className="primary" onClick={submit}>Lock call locally</button></article><article className="card leaderboard"><span className="eyebrow">8-WEEK LEADERBOARD · SAMPLE</span><h2>Accuracy, not volume.</h2>{[["0x84…9A2F","75%"],["Maya","67%"],["Ade","63%"]].map((row,i)=><div className="rank" key={row[0]}><span>{i+1}</span><strong>{row[0]}</strong><em>{row[1]}</em></div>)}</article></section><section className="card"><div className="section-heading"><div><h2>Your calls</h2><p>Stored in this browser until account persistence is connected.</p></div></div>{calls.length?calls.map(call=><div className="issuer-row" key={call.id}><div><span className="token-mark">{call.ticker[0]}</span><strong>{call.ticker}</strong></div><div><small>PREDICTION</small><strong>{call.prediction>=0?"+":""}{call.prediction.toFixed(1)}%</strong></div><span className="confidence">Awaiting Monday</span></div>):<div className="empty-state compact">No calls yet.</div>}</section></main>;
}

function ScorecardView() {
  return <main className="content module-page"><div className="page-heading"><div><span className="eyebrow">MONDAY REVIEW</span><h1>Scorecard</h1><p>Separate useful weekend signals from lucky guesses.</p></div><button className="secondary"><Link2 size={16}/> Share card</button></div><section className="score-hero"><article><small>IMPLIED OPEN ERROR</small><strong>0.42%</strong><span>Sample weekend</span></article><article><small>GUARDIAN RESULT</small><strong>+$18.40</strong><span>Estimated offset</span></article><article><small>CALL HIT RATE</small><strong>3 / 4</strong><span>Sample history</span></article></section><section className="card score-table"><div className="section-heading"><div><h2>Opening review</h2><p>Sample structure; live grading starts after the first stored weekend.</p></div><span className="data-source demo">Illustrative data</span></div>{[["NVDA","+0.8%","+1.1%","0.3%"],["TSLA","−2.4%","−2.9%","0.5%"],["AAPL","+0.6%","+0.4%","0.2%"]].map(row=><div className="score-row" key={row[0]}><strong>{row[0]}</strong><span><small>IMPLIED</small>{row[1]}</span><span><small>ACTUAL OPEN</small>{row[2]}</span><span><small>ERROR</small>{row[3]}</span></div>)}</section><p className="disclaimer">Sample results are clearly marked and are not evidence of historical performance. Live scorecards require stored weekend snapshots and an independently sourced Monday open.</p></main>;
}

function AddHoldingModal({ onClose, onAdd }: { onClose: () => void; onAdd: (holding: Holding) => void }) {
  const [ticker,setTicker]=useState("MSFT"); const [qty,setQty]=useState(1);
  const submit=()=>{ const key=ticker.toUpperCase(); onAdd({ticker:key,company:key,qty,friday:0,now:null,issuer:null,spark:[]}); onClose(); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal card" role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(e)=>e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button><span className="eyebrow">MANUAL PORTFOLIO ENTRY</span><h2 id="add-title">Add a brokerage holding</h2><p>Gapline stores the ticker and quantity in this browser. No broker credentials are requested.</p><label>Ticker</label><input value={ticker} onChange={(e)=>setTicker(e.target.value)}/><label>Quantity</label><input type="number" min="0.001" step="0.001" value={qty} onChange={(e)=>setQty(Number(e.target.value))}/><button className="primary" onClick={submit}>Add holding</button></section></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("Weekend");
  const [portfolio, setPortfolio] = useStoredState<Holding[]>("portfolio", [...demoHoldings]);
  const [policies, setPolicies] = useStoredState<Policy[]>("policies", []);
  const [calls, setCalls] = useStoredState<Call[]>("calls", []);
  const [showAdd, setShowAdd] = useState(false);
  const tabs: View[] = ["Weekend","Gap Monitor","Guardian","Money","Calls","Scorecard"];
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setView("Weekend")}><Logo/><strong>Gapline</strong></button><nav aria-label="Primary navigation">{tabs.map((tab) => <button key={tab} onClick={() => setView(tab)} className={view===tab ? "active" : ""}>{tab}</button>)}</nav><div className="header-actions"><button className="icon-button" aria-label="Alerts"><Bell size={20}/><span className="badge">3</span></button><button className="account"><span>Level 2 · Holder</span><strong>Agentic Wallet ready</strong></button></div></header>{view==="Weekend" ? <WeekendView goTo={setView} holdings={portfolio} onAddHolding={()=>setShowAdd(true)}/> : view==="Gap Monitor" ? <GapView/> : view==="Guardian" ? <GuardianView policies={policies} setPolicies={setPolicies}/> : view==="Money" ? <MoneyView/> : view==="Calls" ? <CallsView calls={calls} setCalls={setCalls}/> : <ScorecardView/>}<nav className="mobile-nav" aria-label="Mobile navigation">{(["Weekend","Gap Monitor","Guardian","Money"] as View[]).map((tab) => <button key={tab} onClick={() => setView(tab)} className={view===tab ? "active" : ""}><span>{tab==="Weekend"?"Home":tab==="Gap Monitor"?"Gaps":tab}</span></button>)}</nav>{showAdd&&<AddHoldingModal onClose={()=>setShowAdd(false)} onAdd={(holding)=>setPortfolio([...portfolio,holding])}/>}</div>;
}

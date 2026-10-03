"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, Bell, ChevronRight, CircleDollarSign, Gift, Landmark, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { holdings, marketSummary, markets } from "@/lib/demo-data";

type View = "Weekend" | "Gap Monitor" | "Guardian" | "Money" | "Calls" | "Scorecard";

function Logo() {
  return <span className="logo" aria-hidden="true"><Activity size={20} /></span>;
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

function WeekendView({ goTo }: { goTo: (view: View) => void }) {
  const covered = holdings.filter((holding) => holding.now !== null);
  const fridayValue = covered.reduce((sum, holding) => sum + holding.qty * holding.friday, 0);
  const currentValue = covered.reduce((sum, holding) => sum + holding.qty * holding.now, 0);
  const change = currentValue - fridayValue;
  return <>
    <section className="weekend-banner">
      <div><span className="status-pill"><span /> Weekend mode</span><p>US markets are closed. Your portfolio is still moving onchain.</p></div>
      <div className="countdown"><small>MARKET OPENS IN</small><strong>1D 08H 42M</strong><span>Monday, 9:30am New York</span></div>
    </section>
    <main className="content">
      <div className="page-heading"><div><span className="eyebrow">SHADOW PORTFOLIO</span><h1>Your weekend, live.</h1></div><button className="secondary">Add holding</button></div>
      <section className="overview-grid">
        <article className="card portfolio-card">
          <div className="card-top"><div><span className="muted">Estimated value now</span><div className="hero-number">${currentValue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><span className="gain">+${change.toFixed(2)} · +{(change/fridayValue*100).toFixed(2)}% since Friday close</span></div><div className="live"><span/> LIVE</div></div>
          <PriceChart values={[23982,24040,23991,24132,24220,24195,24301,currentValue]} reference={fridayValue}/>
        </article>
        <article className="guardian-card">
          <div className="card-top"><div className="guardian-title"><ShieldCheck/><span>Weekend Guardian</span></div><span className="live light"><span/> LIVE</span></div>
          <p className="guardian-kicker">LAST ACTION · 18 MIN AGO</p>
          <h2>TSLA sleeve moved to USDT</h2>
          <p>Your −3% rule fired. $480.00 was quoted, simulated and executed within your limits.</p>
          <div className="action-stats"><div><small>PRICE IMPACT</small><strong>0.18%</strong></div><div><small>TX STATUS</small><strong>Confirmed</strong></div></div>
          <button onClick={() => goTo("Guardian")} className="dark-button">Open Guardian <ChevronRight size={17}/></button>
        </article>
      </section>
      <section className="card holdings-card">
        <div className="section-heading"><div><h2>Your holdings</h2><p>Brokerage quantities priced with live tokenized markets.</p></div><span className="updated">Updated just now</span></div>
        <div className="table-scroll"><table><thead><tr><th>Holding</th><th>Quantity</th><th>Friday close</th><th>Now</th><th>Weekend move</th><th>Issuer</th><th>Trend</th><th></th></tr></thead><tbody>{holdings.map((holding) => {
          const move = holding.now ? ((holding.now-holding.friday)/holding.friday)*100 : null;
          return <tr key={holding.ticker} onClick={() => holding.now && goTo("Gap Monitor")} className={holding.now ? "clickable" : ""}><td><strong>{holding.ticker}</strong><span>{holding.company}</span></td><td className="mono">{holding.qty}</td><td className="mono">${holding.friday.toFixed(2)}</td><td className="mono">{holding.now ? `$${holding.now.toFixed(2)}` : "—"}</td><td className={`mono ${move !== null && move >= 0 ? "gain" : "loss"}`}>{move === null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</td><td>{holding.issuer ? <span className="issuer">{holding.issuer}</span> : <span className="not-covered">Not covered</span>}</td><td><Sparkline values={holding.spark} loss={move !== null && move < 0}/></td><td><ChevronRight size={18}/></td></tr>})}</tbody></table></div>
      </section>
      <section className="lower-grid"><article className="gap-card"><div><span className="eyebrow">BIGGEST WEEKEND GAP</span><h2>TSLA is <span className="loss">−3.31%</span> below Friday</h2><p>Both issuers agree, with enough depth for a small sleeve trade.</p></div><button onClick={() => goTo("Gap Monitor")} className="primary">See the gap</button></article><article className="card quick-card"><span className="eyebrow">USE YOUR TOKENS NOW</span><div className="quick-actions"><button><CircleDollarSign/>Cash out<span>Turn a sleeve into USDT</span></button><button><Gift/>Send a gift<span>Share a piece of a stock</span></button></div></article></section>
      <p className="disclaimer">Weekend estimates use tokenized-stock markets and may not predict the next traditional-market open. Tokenized stocks are not the same as brokerage shares. Not financial advice.</p>
    </main>
  </>;
}

function GapView() {
  const [ticker, setTicker] = useState("NVDA");
  const summary = useMemo(() => marketSummary(ticker), [ticker]);
  const last = summary.issuers[0].price;
  const maxDepth = summary.issuers.reduce((sum, item) => sum + item.depthUsd, 0);
  return <>
    <section className="weekend-banner compact"><div><span className="status-pill"><span/> Weekend mode</span><p>Compare the closed reference with markets trading now.</p></div><div className="countdown"><small>MARKET OPENS IN</small><strong>1D 08H 42M</strong></div></section>
    <main className="content"><div className="page-heading"><div><span className="eyebrow">LIVE MARKET INTELLIGENCE</span><h1>Gap Monitor</h1></div><span className="updated">Updated 8 sec ago</span></div>
      <div className="ticker-tabs">{Object.keys(markets).map((item) => <button key={item} onClick={() => setTicker(item)} className={ticker===item ? "active" : ""}>{item}</button>)}</div>
      <section className="gap-hero card"><div className="gap-stats"><div><small>FRIDAY REFERENCE</small><strong>${summary.reference.toFixed(2)}</strong><span>Market closed</span></div><div><small>LAST ONCHAIN TRADE</small><strong>${last.toFixed(2)}</strong><span className={summary.gap >= 0 ? "gain" : "loss"}>{summary.gap >= 0 ? "+" : ""}{summary.gap.toFixed(2)}%</span></div></div><div className="implied"><small>IMPLIED MONDAY OPEN</small><strong>${summary.implied.toFixed(2)}</strong><span className="confidence">{summary.confidence} confidence</span><p>Liquidity-weighted across issuers</p></div></section>
      <section className="monitor-grid"><article className="card"><div className="section-heading"><div><h2>{ticker} across the weekend</h2><p>Normalized issuer prices against Friday&apos;s close.</p></div></div><PriceChart values={summary.history} reference={summary.reference}/><div className="legend"><span><i className="blue"/>Tokenized price</span><span><i className="dashed"/>Friday reference</span></div></article><article className="card why-card"><span className="eyebrow">WHY {summary.confidence.toUpperCase()} CONFIDENCE?</span><h2>The markets broadly agree.</h2><div className="metric-row"><span>Total quoted depth</span><strong>${(maxDepth/1000).toFixed(1)}k</strong></div><div className="metric-row"><span>Issuer difference</span><strong>{(Math.abs(summary.issuers[0].price-summary.issuers[1].price)/summary.implied*100).toFixed(2)}%</strong></div><div className="metric-row"><span>Trade guardrail</span><strong>1.00%</strong></div><p className="note">The Guardian will only act when simulation passes and confidence is not low.</p></article></section>
      <section className="card issuer-table"><div className="section-heading"><div><h2>Issuer comparison</h2><p>Same underlying, different onchain markets.</p></div></div>{summary.issuers.map((issuer) => <div className="issuer-row" key={issuer.issuer}><div><span className="token-mark">{issuer.issuer[0]}</span><strong>{ticker} · {issuer.issuer}</strong></div><div><small>PRICE</small><strong className="mono">${issuer.price.toFixed(2)}</strong></div><div><small>DEPTH WITHIN 1%</small><strong className="mono">${issuer.depthUsd.toLocaleString()}</strong></div><span className="confidence">Included</span></div>)}</section>
      <p className="disclaimer">This is a weekend estimate, not a promise of Monday&apos;s open. Trades are spot-only and subject to liquidity, issuer and custody risk. Not financial advice.</p>
    </main>
  </>;
}

function Placeholder({ view }: { view: View }) {
  const icons = { Guardian: ShieldCheck, Money: WalletCards, Calls: Sparkles, Scorecard: Landmark } as const;
  const Icon = icons[view as keyof typeof icons] ?? Activity;
  return <main className="content placeholder"><div className="placeholder-icon"><Icon/></div><span className="eyebrow">PRODUCTION BUILD IN PROGRESS</span><h1>{view}</h1><p>The complete interaction design is preserved in the handoff. This route is next in the implementation queue after the market-data core.</p><button className="primary">Preview coming next</button></main>;
}

export default function Home() {
  const [view, setView] = useState<View>("Weekend");
  const tabs: View[] = ["Weekend","Gap Monitor","Guardian","Money","Calls","Scorecard"];
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setView("Weekend")}><Logo/><strong>Gapline</strong></button><nav aria-label="Primary navigation">{tabs.map((tab) => <button key={tab} onClick={() => setView(tab)} className={view===tab ? "active" : ""}>{tab}</button>)}</nav><div className="header-actions"><button className="icon-button" aria-label="Alerts"><Bell size={20}/><span className="badge">3</span></button><button className="account"><span>Level 3 · Hedger</span><strong>0x84…9A2F</strong></button></div></header>{view==="Weekend" ? <WeekendView goTo={setView}/> : view==="Gap Monitor" ? <GapView/> : <Placeholder view={view}/>}<nav className="mobile-nav" aria-label="Mobile navigation">{(["Weekend","Gap Monitor","Guardian","Money"] as View[]).map((tab) => <button key={tab} onClick={() => setView(tab)} className={view===tab ? "active" : ""}><span>{tab==="Weekend"?"Home":tab==="Gap Monitor"?"Gaps":tab}</span></button>)}</nav></div>;
}

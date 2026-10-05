"use client";
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export type MoneyPlan = {id:number;kind:string;ticker:string;amount:number;message?:string;goal?:string;due?:string;percent?:number;basket?:string;createdAt:string};
export default function MoneyPlans({plans,onSave,onRemove}:{plans:MoneyPlan[];onSave:(plan:MoneyPlan)=>void;onRemove:(id:number)=>void}) {
  const [mode,setMode]=useState('Cash-Out');
  const [ticker,setTicker]=useState('NVDA');
  const [amount,setAmount]=useState(25);
  const [message,setMessage]=useState('A small piece of the future.');
  const [goal,setGoal]=useState('School fees');
  const [due,setDue]=useState('2027-03-01');
  const [percent,setPercent]=useState(15);
  const [basket,setBasket]=useState('Broad market');
  const [notice,setNotice]=useState('');
  const save=()=>{
    if(!Number.isFinite(amount)||amount<=0||(mode==='Cash-Out'||mode==='Gifts')&&amount>50){setNotice('Enter a positive amount; transaction plans are capped at $50.');return;}
    if(mode==='Vaults'&&(!goal.trim()||!due||new Date(`${due}T23:59:59Z`).getTime()<=Date.now())){setNotice('Choose a goal name and a future due date.');return;}
    if(mode==='Splitter'&&(!Number.isFinite(percent)||percent<=0||percent>100)){setNotice('Choose an investment allocation between 0 and 100%.');return;}
    onSave({id:Date.now(),kind:mode,ticker,amount,message:mode==='Gifts'?message:undefined,goal:mode==='Vaults'?goal.trim():undefined,due:mode==='Vaults'?due:undefined,percent:mode==='Splitter'?percent:undefined,basket:mode==='Splitter'?basket:undefined,createdAt:new Date().toISOString()});
    setNotice('Plan saved. This is not a funded transaction or an active automation.');
  };
  const days=Math.max(0,Math.ceil((new Date(`${due}T23:59:59Z`).getTime()-Date.now())/86400000));
  const stockPercent=days>=60?100:days<=7?0:Math.round((days-7)/53*100);
  return <main className="content module-page"><div className="page-heading"><div><span className="eyebrow">REAL-LIFE MONEY</span><h1>Use your tokens</h1><p>Save a practical plan. Signing and settlement stay separate.</p></div><span className="data-source demo">Planning only · no funds move</span></div>
    <div className="subnav">{['Cash-Out','Gifts','Vaults','Splitter'].map(item=><button key={item} onClick={()=>{setMode(item);setNotice('');}} className={item===mode?'active':''}>{item}</button>)}</div>
    <section className="money-grid"><article className="card form-card"><h2>{mode==='Vaults'?'Goal Vault':mode==='Splitter'?'Salary Splitter':mode==='Gifts'?'Stock Gift':'Weekend Cash-Out'}</h2>
      {(mode==='Cash-Out'||mode==='Gifts')&&<><label htmlFor="money-asset">Tokenized stock</label><select id="money-asset" value={ticker} onChange={e=>setTicker(e.target.value)}>{['NVDA','TSLA','AAPL','SPY'].map(asset=><option key={asset}>{asset}</option>)}</select></>}
      <label htmlFor="money-amount">{mode==='Vaults'?'Target in USD':mode==='Splitter'?'Incoming USDT threshold':'USD amount (maximum $50)'}</label><input id="money-amount" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(Number(e.target.value))}/>
      {mode==='Gifts'&&<><label htmlFor="gift-message">Gift message</label><input id="gift-message" maxLength={280} value={message} onChange={e=>setMessage(e.target.value)}/></>}
      {mode==='Vaults'&&<><label htmlFor="vault-name">Goal name</label><input id="vault-name" maxLength={100} value={goal} onChange={e=>setGoal(e.target.value)}/><label htmlFor="vault-due">Due date</label><input id="vault-due" type="date" value={due} onChange={e=>setDue(e.target.value)}/></>}
      {mode==='Splitter'&&<><label htmlFor="split-percent">Investment allocation (%)</label><input id="split-percent" type="number" min="0.1" max="100" value={percent} onChange={e=>setPercent(Number(e.target.value))}/><label htmlFor="split-basket">Target basket</label><select id="split-basket" value={basket} onChange={e=>setBasket(e.target.value)}><option>Broad market</option><option>AI & semiconductors</option></select></>}
      <button className="primary" onClick={save}>Save {mode.toLowerCase()} plan</button>{notice&&<p role="status" className="form-hint">{notice}</p>}
    </article><article className="card fair-price"><span className="eyebrow">ACTIVATION CHECKLIST</span><h2>Plans do not authorize transfers.</h2><div className="metric-row"><span>Network</span><strong>BNB Smart Chain</strong></div><div className="metric-row"><span>Per-trade cap</span><strong>$50</strong></div><div className="metric-row"><span>Maximum impact</span><strong>1%</strong></div><div className="metric-row"><span>Wallet and simulation</span><strong>Required</strong></div>
      {mode==='Vaults'&&<><h3>{days} days until due</h3><div className="glide"><span style={{width:`${stockPercent}%`}}>Stocks {stockPercent}%</span><span style={{width:`${100-stockPercent}%`}}>USDT {100-stockPercent}%</span></div><p>Illustrative allocation based on your date: reduce stock exposure during the last 60 days, reaching USDT seven days before payment. No rebalance is scheduled.</p></>}
      {mode==='Gifts'&&<p>Funding and claim links require a deployed, verified escrow contract. No gift address or receipt is fabricated.</p>}
      {mode==='Splitter'&&<p>The saved allocation is {percent}% into {basket}. Incoming-transfer monitoring and order execution are not active.</p>}
      <div className="blocked"><ShieldCheck/>Execution locked until prerequisites pass</div>
    </article></section>
    <section className="card saved-list"><h2>Your saved plans</h2><p>Guest plans stay on this device. Sign in to sync plans privately across devices.</p>{plans.length?plans.map(plan=><div className="log-row" key={plan.id}><div><strong>{plan.kind} · {plan.goal??plan.ticker}</strong><span>${plan.amount.toFixed(2)}{plan.due?` · due ${plan.due}`:''}{plan.percent?` · ${plan.percent}% into ${plan.basket}`:''}{plan.message?` · ${plan.message}`:''}</span></div><span className="confidence">Not activated</span><button className="secondary" onClick={()=>onRemove(plan.id)} aria-label={`Remove ${plan.kind} plan`}>Remove</button></div>):<div className="empty-state compact">No plans saved yet.</div>}</section>
  </main>;
}

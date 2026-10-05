type RecordValue=Record<string,unknown>;
const record=(value:unknown):value is RecordValue=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const number=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const text=(value:unknown,max:number)=>typeof value==='string'&&value.length>0&&value.length<=max;
const ticker=(value:unknown)=>typeof value==='string'&&/^[A-Z][A-Z.]{0,9}$/.test(value);
const supported=(value:unknown)=>['NVDA','TSLA','AAPL','SPY'].includes(String(value));
const timestamp=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function validState(key:string,value:unknown):boolean {
  if(!['portfolio','policies','calls','money-actions','eligibility'].includes(key))return false;
  if(key==='eligibility') return record(value)&&JSON.stringify(value).length<=2000;
  if(!Array.isArray(value)||value.length>500) return false;
  return value.every(item=>{
    if(!record(item)) return false;
    switch(key) {
      case 'portfolio':return ticker(item.ticker)&&number(item.qty,0.00000001,1e9)&&text(item.company,200);
      case 'policies':return number(item.id,1,Number.MAX_SAFE_INTEGER)&&supported(item.ticker)&&number(item.threshold,0.0001,100)&&number(item.maxTrade,0.01,50)&&['draft','approved'].includes(String(item.status))&&text(item.text,2000)&&item.action==='Sell sleeve to USDT';
      case 'calls':return number(item.id,1,Number.MAX_SAFE_INTEGER)&&supported(item.ticker)&&number(item.prediction,-100,100)&&timestamp(item.createdAt);
      case 'money-actions':{
        if(!number(item.id,1,Number.MAX_SAFE_INTEGER)||!supported(item.ticker)||!timestamp(item.createdAt))return false;
        if(item.kind==='Cash-Out'||item.kind==='Gifts')return number(item.amount,0.01,50)&&(item.message===undefined||typeof item.message==='string'&&item.message.length<=280);
        if(item.kind==='Vaults')return number(item.amount,0.01,1e9)&&text(item.goal,100)&&typeof item.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.due)&&timestamp(item.due);
        if(item.kind==='Splitter')return number(item.amount,0.01,1e9)&&number(item.percent,0.01,100)&&['Broad market','AI & semiconductors'].includes(String(item.basket));
        return false;
      }
      default:return false;
    }
  });
}

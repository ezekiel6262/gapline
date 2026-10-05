process.loadEnvFile('.env.production.local');
const headers={Authorization:`Bearer ${process.env.CLERK_SECRET_KEY}`,'Content-Type':'application/json'};
const response=await fetch('https://api.clerk.com/v1/domains',{headers});
if(!response.ok) throw new Error(`Domain lookup failed: ${response.status}`);
const result=await response.json();
const domain=result.data.find(item=>item.name==='gapline-mu.vercel.app');
if(!domain) throw new Error('Production domain not found');
const update=await fetch(`https://api.clerk.com/v1/domains/${domain.id}`,{method:'PATCH',headers,body:JSON.stringify({proxy_url:'https://gapline-mu.vercel.app/api/clerk'})});
const data=await update.json();
if(!update.ok){console.log(JSON.stringify({status:update.status,errors:data.errors?.map(error=>({code:error.code,message:error.message}))}));process.exitCode=1;}
else console.log('Production authentication proxy configured.');

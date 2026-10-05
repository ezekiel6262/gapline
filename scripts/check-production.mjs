process.loadEnvFile('.env.production.local');
console.log(JSON.stringify({authMode:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')?'production':'development',databaseConfigured:!!process.env.SUPABASE_URL,cronConfigured:!!process.env.CRON_SECRET}));
if(process.argv.includes('--live')) {
  const base='https://gapline-mu.vercel.app';
  const response=await fetch(`${base}/api/cron/snapshots`,{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}});
  console.log('Snapshot job',response.status,await response.text());
  const history=await fetch(`${base}/api/snapshots`);
  const data=await history.json();
  console.log('History',history.status,'observations',data.snapshots?.length ?? 0);
  const state=await fetch(`${base}/api/state/portfolio`);
  console.log('Private state without session',state.status);
}

import postgres from 'postgres';
process.loadEnvFile('.env.production.local');
const sql=postgres(process.env.POSTGRES_URL,{ssl:'require',max:1,prepare:false});
try {
  console.log('Recent scheduler runs',JSON.stringify(await sql`select status,return_message,end_time from cron.job_run_details where jobid=(select jobid from cron.job where jobname='gapline-minute-snapshots') order by runid desc limit 3`));
  console.log('Recent HTTP outcomes',JSON.stringify(await sql`select status_code,timed_out,error_msg,created from net._http_response order by id desc limit 3`));
  console.log('Stored observations',JSON.stringify(await sql`select ticker,count(*),max(captured_at) as latest from public.market_snapshots group by ticker`));
} finally {await sql.end();}

import postgres from 'postgres';
process.loadEnvFile('.env.production.local');
const sql=postgres(process.env.POSTGRES_URL,{ssl:'require',max:1,prepare:false});
try {
  await sql`create extension if not exists pg_cron`;
  await sql`create extension if not exists pg_net with schema extensions`;
  const existing=await sql`select id from vault.secrets where name='gapline_cron_secret'`;
  if(!existing.length) await sql`select vault.create_secret(${process.env.CRON_SECRET},'gapline_cron_secret','Gapline snapshot authorization')`;
  const jobs=await sql`select jobid from cron.job where jobname='gapline-minute-snapshots'`;
  if(!jobs.length) {
    const command="select net.http_get(url := 'https://gapline-mu.vercel.app/api/cron/snapshots', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'gapline_cron_secret')), timeout_milliseconds := 15000);";
    await sql`select cron.schedule('gapline-minute-snapshots','* * * * *',${command})`;
  }
  console.log(JSON.stringify(await sql`select jobname,schedule,active from cron.job where jobname='gapline-minute-snapshots'`));
} finally {await sql.end();}

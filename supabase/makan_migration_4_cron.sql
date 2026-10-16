-- Schedules the ops agent tick every minute. Replace __CRON_SECRET__ with the Vercel CRON_SECRET
-- before running (never commit the real value). Needs pg_cron + pg_net.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('makan-agent-tick') where exists (select 1 from cron.job where jobname = 'makan-agent-tick');
select cron.schedule('makan-agent-tick', '* * * * *', $$
  select net.http_get(url := 'https://makan-hour-app.vercel.app/api/agents/tick',
    headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__'), timeout_milliseconds := 20000);
$$);

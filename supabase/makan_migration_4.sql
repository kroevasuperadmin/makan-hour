-- Makan Hour migration 4: agent automation. Idempotent, only touches makan_* / agent_task_log.
-- agent_task_log: one row per real agent action. Nothing is seeded; demo-session runs carry is_demo = true.
create table if not exists public.agent_task_log (
  id bigint generated always as identity primary key,
  task_type text not null,
  agent text not null,
  started_at timestamptz not null default now(),
  duration_s numeric(10,3) not null,
  human_minutes_equiv numeric(8,2) not null,
  cost_usd numeric(12,6) not null default 0,
  human_cost_usd numeric(12,4) not null,
  outcome text not null,
  is_demo boolean not null default false,
  detail jsonb);
create index if not exists agent_task_log_started on public.agent_task_log(started_at desc);
alter table public.agent_task_log enable row level security;
revoke all on public.agent_task_log from anon, authenticated;

-- Agent outputs: caterer manifests, reconciliation results, follow-up drafts, daily reports.
create table if not exists public.makan_agent_outputs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('caterer_manifest','reconciliation','payment_followup','delivery_check','daily_report','support_answer','refund_decision')),
  session_id text not null default 'demo',
  created_at timestamptz not null default now(),
  is_demo boolean not null default true,
  body jsonb not null);
create index if not exists makan_agent_outputs_kind on public.makan_agent_outputs(kind, created_at desc);
alter table public.makan_agent_outputs enable row level security;
revoke all on public.makan_agent_outputs from anon, authenticated;

-- De-dupe markers so each agent acts once per demo run (reset clears them with the session row).
alter table public.makan_session add column if not exists agent_cutoff_at timestamptz;
alter table public.makan_session add column if not exists agent_manifest_at timestamptz;
alter table public.makan_session add column if not exists agent_report_at timestamptz;
alter table public.makan_drops add column if not exists agent_checked_stage int;

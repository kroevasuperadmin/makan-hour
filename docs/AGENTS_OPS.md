# Human-Replacing AI Agents: ops automation

| Workflow | Agent | Trigger | Status |
|---|---|---|---|
| Order intake reminder (staff without an order, 10:00) | ops-agent `api/agents/tick` | Supabase pg_cron, every minute | automated (in-app nudge only) |
| 10:30 cutoff lock | ops-agent | pg_cron, every minute | automated |
| Headcount + consolidation to caterer (manifest per caterer/office/dish, min-10 check, 15% commission, payout) | ops-agent | after cutoff | automated; caterer still taps Confirm batch |
| Delivery confirmation vs 12:00-12:45 window | ops-agent | when a drop is marked delivered | automated |
| Payment reconciliation (demo invoice + live Stripe sessions, read-only) | finance-agent `api/agents/daily` | Vercel cron 06:00 UTC (14:00 MYT) | automated |
| Failed-payment follow-up | finance-agent | daily | drafts written, sending needs approval |
| Daily report | finance-agent | daily | automated |
| Refund decisions | support-agent `api/agents/support` `{refund}` | on request | automated decision; demo credit only, no real Stripe refund |
| Support Q&A (LLM) | support-agent `{question}` | on request | built, flag `SUPPORT_AGENT_ON=1`; needs `XAI_API_KEY` or `OPENAI_API_KEY` |
| Caterer onboarding (halal cert, contract) | none | — | manual |

Every action writes one row to `agent_task_log`. Outputs (manifests, reports, drafts) go to `makan_agent_outputs`.
Metrics: `https://makan-hour-app.vercel.app/metrics?k=<METRICS_SECRET>`.
Setup: `supabase/makan_migration_4.sql`, then `supabase/makan_migration_4_cron.sql` with the secret filled in.
Vercel env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, METRICS_SECRET, SUPPORT_AGENT_ON. Deploy: `scripts/deploy-web.sh`.

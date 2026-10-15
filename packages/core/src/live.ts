// Live shared state for the three apps. Backed by Supabase tables prefixed makan_
// (session, orders, drops, profiles). Seeded staff orders stay local and deterministic;
// only the things that change during the demo live in the database.
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Drop, DropStage, Order } from './types';
import { DEMO_START, seedDrops } from './seed';

export const SESSION = 'demo';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export interface LiveSession {
  cutoffPassed: boolean; batchConfirmed: boolean; clockBase: number; clockStartedAt: number;
  nudged: string[]; invoiceStatus: 'unpaid' | 'paid'; invoicePaidRef: string | null; invoicePaidVia: string | null;
  // Present only once supabase/makan_topups_push.sql has run; until then the app keeps these on the device.
  topUpsAllowed?: boolean; topUpPaidRef?: string | null;
}
// Set by fetchLive when the top-up columns exist, so writes never name a missing column.
export let hasTopUpCols = false;
export interface LiveState { session: LiveSession; orders: Order[]; drops: Drop[]; profiles: Record<string, { floor: string; desk: string }>; }

export function defaultSession(): LiveSession {
  return { cutoffPassed: false, batchConfirmed: false, clockBase: DEMO_START, clockStartedAt: Date.now(), nudged: [], invoiceStatus: 'unpaid', invoicePaidRef: null, invoicePaidVia: null };
}
const need = () => { if (!supabase) throw new Error('Supabase env missing'); return supabase; };

export async function fetchLive(): Promise<LiveState | null> {
  const db = need();
  const [s, o, d, p] = await Promise.all([
    db.from('makan_session').select('*').eq('id', SESSION).maybeSingle(),
    db.from('makan_orders').select('*').eq('session_id', SESSION),
    db.from('makan_drops').select('*').eq('session_id', SESSION),
    db.from('makan_profiles').select('*').eq('session_id', SESSION),
  ]);
  if (!s.data) return null;
  const r = s.data;
  hasTopUpCols = 'topups_allowed' in r;
  return {
    session: { cutoffPassed: r.cutoff_passed, batchConfirmed: r.batch_confirmed, clockBase: r.clock_base, clockStartedAt: Date.parse(r.clock_started_at), nudged: r.nudged ?? [], invoiceStatus: r.invoice_status, invoicePaidRef: r.invoice_paid_ref, invoicePaidVia: r.invoice_paid_via, ...(hasTopUpCols ? { topUpsAllowed: r.topups_allowed, topUpPaidRef: r.topup_paid_ref } : {}) },
    orders: (o.data ?? []).map(x => ({ id: x.id, employeeId: x.employee_id, officeId: x.office_id, dishId: x.dish_id, placedAt: x.placed_at })),
    drops: (d.data ?? []).map(x => ({ officeId: x.office_id, catererId: x.caterer_id, stage: x.stage as DropStage, dueAt: x.due_at, delayMin: x.delay_min, delayNotifiedAt: x.delay_notified_at, deliveredAt: x.delivered_at, rider: x.rider })).sort((a, b) => a.officeId.localeCompare(b.officeId)),
    profiles: Object.fromEntries((p.data ?? []).map(x => [x.employee_id, { floor: x.floor, desk: x.desk }])),
  };
}

export async function writeSession(patch: Partial<LiveSession>) {
  const m: Record<string, unknown> = { id: SESSION, updated_at: new Date().toISOString() };
  if (patch.cutoffPassed !== undefined) m.cutoff_passed = patch.cutoffPassed;
  if (patch.batchConfirmed !== undefined) m.batch_confirmed = patch.batchConfirmed;
  if (patch.clockBase !== undefined) { m.clock_base = patch.clockBase; m.clock_started_at = new Date(patch.clockStartedAt ?? Date.now()).toISOString(); }
  if (patch.nudged !== undefined) m.nudged = patch.nudged;
  if (patch.invoiceStatus !== undefined) m.invoice_status = patch.invoiceStatus;
  if (patch.invoicePaidRef !== undefined) m.invoice_paid_ref = patch.invoicePaidRef;
  if (patch.invoicePaidVia !== undefined) m.invoice_paid_via = patch.invoicePaidVia;
  if (hasTopUpCols && patch.topUpsAllowed !== undefined) m.topups_allowed = patch.topUpsAllowed;
  if (hasTopUpCols && patch.topUpPaidRef !== undefined) m.topup_paid_ref = patch.topUpPaidRef;
  const { error } = await need().from('makan_session').update(m).eq('id', SESSION); if (error) throw error;
}
export async function writeOrder(o: Order) {
  const { error } = await need().from('makan_orders').upsert({ id: o.id, session_id: SESSION, employee_id: o.employeeId, office_id: o.officeId, dish_id: o.dishId, placed_at: o.placedAt }); if (error) throw error;
}
export async function removeOrder(id: string) { const { error } = await need().from('makan_orders').delete().eq('id', id); if (error) throw error; }
export async function writeDrop(d: Drop) {
  // Rows are pre-seeded; anon may only update them (see supabase/makan_rls.sql).
  const { error } = await need().from('makan_drops').update({ caterer_id: d.catererId, stage: d.stage, due_at: d.dueAt, delay_min: d.delayMin, delay_notified_at: d.delayNotifiedAt, delivered_at: d.deliveredAt, rider: d.rider }).eq('session_id', SESSION).eq('office_id', d.officeId); if (error) throw error;
}
export async function writeProfile(employeeId: string, floor: string, desk: string) {
  const { error } = await need().from('makan_profiles').upsert({ session_id: SESSION, employee_id: employeeId, floor, desk }); if (error) throw error;
}
export async function resetLive() {
  const db = need();
  await db.from('makan_orders').delete().eq('session_id', SESSION);
  await db.from('makan_profiles').delete().eq('session_id', SESSION);
  const s = defaultSession();
  await db.from('makan_session').update({ cutoff_passed: false, batch_confirmed: false, clock_base: s.clockBase, clock_started_at: new Date().toISOString(), nudged: [], invoice_status: 'unpaid', invoice_paid_ref: null, invoice_paid_via: null, ...(hasTopUpCols ? { topups_allowed: true, topup_paid_ref: null } : {}) }).eq('id', SESSION);
  for (const d of seedDrops()) await writeDrop(d);
}

export function subscribe(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const db = supabase;
  const ch = db.channel('makan-demo');
  for (const t of ['makan_session', 'makan_orders', 'makan_drops', 'makan_profiles']) ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, onChange);
  ch.subscribe();
  return () => { db.removeChannel(ch); };
}

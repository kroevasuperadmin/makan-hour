import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Drop, DropStage, Employee, Invoice, Order } from './types';
import * as seed from './seed';
import { defaultSession, fetchLive, LiveState, removeOrder, resetLive, subscribe, supabase, writeDrop, writeOrder, writeProfile, writeSession } from './live';

export interface State {
  caterers: typeof seed.caterers; dishes: typeof seed.dishes; offices: typeof seed.offices;
  employees: Employee[]; orders: Order[]; drops: Drop[]; invoice: Invoice;
  clock: number; cutoffPassed: boolean; batchConfirmed: boolean; nudged: string[]; meId: string;
  connected: boolean; mode: 'live' | 'local';
  topUpsAllowed: boolean; topUpPaidRef: string | null;
}
export type Action =
  | { t: 'order'; dishId: string } | { t: 'cancel' } | { t: 'spot'; floor: string; desk: string } | { t: 'cutoff' } | { t: 'confirmBatch' }
  | { t: 'advance'; officeId: string } | { t: 'delay'; officeId: string; minutes: number } | { t: 'nudge'; ids: string[] }
  | { t: 'pay'; via: string; ref: string } | { t: 'reset' }
  | { t: 'topups'; on: boolean } | { t: 'topupPaid'; ref: string };

const seedOrders = seed.seedOrders();
const blankLive = (): LiveState => ({ session: defaultSession(), orders: [], drops: seed.seedDrops(), profiles: {} });
const clockOf = (l: LiveState, now: number) => l.session.clockBase + Math.floor((now - l.session.clockStartedAt) / 1000);

type Local = { topUpsAllowed: boolean; topUpPaidRef: string | null };
function derive(l: LiveState, now: number, connected: boolean, loc: Local): State {
  const inv = seed.seedInvoice();
  return {
    caterers: seed.caterers, dishes: seed.dishes, offices: seed.offices,
    employees: seed.employees.map(e => (l.profiles[e.id] ? { ...e, ...l.profiles[e.id] } : e)),
    orders: [...seedOrders, ...l.orders], drops: l.drops.length ? l.drops : seed.seedDrops(),
    invoice: { ...inv, status: l.session.invoiceStatus, paidRef: l.session.invoicePaidRef, paidVia: l.session.invoicePaidVia },
    clock: clockOf(l, now), cutoffPassed: l.session.cutoffPassed, batchConfirmed: l.session.batchConfirmed, nudged: l.session.nudged,
    meId: 'me', connected, mode: supabase ? 'live' : 'local', ...loc,
  };
}

// Applies an action to live state. Returns the next state and the writes to send.
function apply(l: LiveState, a: Action, now: number): [LiveState, (() => Promise<unknown>)[]] {
  const clock = clockOf(l, now);
  const S = (p: Partial<LiveState['session']>) => ({ ...l.session, ...p });
  const bump = (to: number) => (to > clock ? { clockBase: to, clockStartedAt: now } : {});
  const me = seed.employees.find(e => e.id === 'me')!;
  switch (a.t) {
    case 'order': {
      if (l.session.cutoffPassed) return [l, []];
      const o: Order = { id: 'ord-me', employeeId: 'me', officeId: me.officeId, dishId: a.dishId, placedAt: clock };
      return [{ ...l, orders: [...l.orders.filter(x => x.id !== o.id), o] }, [() => writeOrder(o)]];
    }
    case 'cancel':
      if (l.session.cutoffPassed) return [l, []];
      return [{ ...l, orders: l.orders.filter(x => x.id !== 'ord-me') }, [() => removeOrder('ord-me')]];
    case 'spot': return [{ ...l, profiles: { ...l.profiles, me: { floor: a.floor, desk: a.desk } } }, [() => writeProfile('me', a.floor, a.desk)]];
    case 'cutoff': { const p = { cutoffPassed: true, ...bump(seed.CUTOFF) }; return [{ ...l, session: S(p) }, [() => writeSession(p)]]; }
    case 'confirmBatch': {
      if (!l.session.cutoffPassed) return [l, []];
      const p = { batchConfirmed: true, ...bump(10 * 3600 + 41 * 60) };
      const drops = l.drops.map(d => ({ ...d, stage: Math.max(d.stage, 1) as DropStage }));
      return [{ ...l, session: S(p), drops }, [() => writeSession(p), ...drops.map(d => () => writeDrop(d))]];
    }
    case 'advance': {
      const d0 = l.drops.find(d => d.officeId === a.officeId); if (!d0) return [l, []];
      const stage = Math.min(4, d0.stage + 1) as DropStage;
      const d = { ...d0, stage, deliveredAt: stage === 4 ? d0.dueAt + d0.delayMin * 60 - 120 : d0.deliveredAt };
      const target = stage === 4 ? d.deliveredAt! : [0, 0, 11 * 3600 + 20 * 60, 11 * 3600 + 48 * 60][stage] || 0;
      const p = bump(target);
      return [{ ...l, session: S(p), drops: l.drops.map(x => (x.officeId === d.officeId ? d : x)) }, [() => writeDrop(d), ...(Object.keys(p).length ? [() => writeSession(p)] : [])]];
    }
    case 'delay': {
      const d0 = l.drops.find(d => d.officeId === a.officeId); if (!d0) return [l, []];
      const d = { ...d0, delayMin: d0.delayMin + a.minutes, delayNotifiedAt: clock };
      return [{ ...l, drops: l.drops.map(x => (x.officeId === d.officeId ? d : x)) }, [() => writeDrop(d)]];
    }
    case 'nudge': { const p = { nudged: Array.from(new Set([...l.session.nudged, ...a.ids])) }; return [{ ...l, session: S(p) }, [() => writeSession(p)]]; }
    case 'pay': { const p = { invoiceStatus: 'paid' as const, invoicePaidRef: a.ref, invoicePaidVia: a.via }; return [{ ...l, session: S(p) }, [() => writeSession(p)]]; }
    case 'reset': return [blankLive(), [() => resetLive()]];
    default: return [l, []];
  }
}

let queue: Promise<void> = Promise.resolve();
const Ctx = createContext<{ s: State; dispatch: (a: Action) => void } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<LiveState>(blankLive);
  const [now, setNow] = useState(Date.now());
  const [connected, setConnected] = useState(false);
  const pending = useRef(0);
  const liveRef = useRef(live); liveRef.current = live;

  const refresh = useCallback(async () => {
    if (!supabase || pending.current > 0) return;
    try {
      let l = await fetchLive();
      if (!l) { await resetLive(); l = await fetchLive(); }
      if (l && pending.current === 0) { setLive(l); setConnected(true); }
    } catch { setConnected(false); }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribe(() => refresh());
    const poll = setInterval(refresh, 4000); // fallback if the realtime socket drops
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { unsub(); clearInterval(poll); clearInterval(tick); };
  }, [refresh]);

  const [loc, setLoc] = useState<Local>({ topUpsAllowed: true, topUpPaidRef: null });
  const dispatch = useCallback((a: Action) => {
    // Top-up policy and the employee's top-up payment are kept on the device for now (no DB column yet).
    if (a.t === 'topups') { setLoc(x => ({ ...x, topUpsAllowed: a.on })); return; }
    if (a.t === 'topupPaid') { setLoc(x => ({ ...x, topUpPaidRef: a.ref })); return; }
    if (a.t === 'reset') setLoc({ topUpsAllowed: true, topUpPaidRef: null });
    if (a.t === 'order' || a.t === 'cancel') setLoc(x => ({ ...x, topUpPaidRef: null }));
    const [next, writes] = apply(liveRef.current, a, Date.now());
    setLive(next);
    if (!supabase) return;
    pending.current++;
    // Writes go through one queue so rapid taps land in the database in the order they were made.
    queue = queue.then(async () => { try { for (const w of writes) await w(); } catch { setConnected(false); } finally { pending.current--; refresh(); } });
  }, [refresh]);

  const s = useMemo(() => derive(live, now, connected, loc), [live, now, connected, loc]);
  const v = useMemo(() => ({ s, dispatch }), [s, dispatch]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useStore() { const c = useContext(Ctx); if (!c) throw new Error('no store'); return c; }

export const rm = (sen: number) => `RM ${(sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const hhmm = (sec: number) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
export function me(s: State) { return s.employees.find(e => e.id === s.meId)!; }
export function myOrder(s: State) { return s.orders.find(o => o.employeeId === s.meId) ?? null; }
export function dish(s: State, id: string) { return s.dishes.find(d => d.id === id)!; }
export function officeOrders(s: State, officeId: string) { return s.orders.filter(o => o.officeId === officeId); }

// Amount the employee pays above the company allowance for a dish (0 if within it).
export const topUpSen = (priceSen: number) => Math.max(0, priceSen - seed.ALLOWANCE_SEN);

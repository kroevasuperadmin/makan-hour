import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { MarketAction, MarketState, reduceMarket, seedMarket } from './market';
import { loadMarket, riderDeliver, riderPickup, vendorAdvance, vendorToggle } from './market-db';

type Api = {
  s: MarketState;
  dispatch: (a: MarketAction) => void;
  live: boolean;
  refresh: () => Promise<void>;
  goLive: () => () => void;
};

const Ctx = createContext<Api | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<MarketState>(seedMarket);
  const [live, setLive] = useState(false);
  const mode = useRef<'local' | 'live'>('local');
  const stopPoll = useRef<(() => void) | null>(null);

  const pull = useCallback(async () => {
    const next = await loadMarket();
    setS(prev => ({ ...prev, restaurants: next.restaurants, items: next.items, orders: next.orders }));
  }, []);

  const refresh = useCallback(async () => { if (mode.current === 'live') await pull(); }, [pull]);

  const goLive = useCallback(() => {
    mode.current = 'live';
    setLive(true);
    let stop = false;
    const tick = () => { if (!stop) pull().catch(() => {}); };
    tick();
    const timer = setInterval(tick, 4000);
    stopPoll.current?.();
    const haltPoll = () => { stop = true; clearInterval(timer); };
    stopPoll.current = haltPoll;
    return () => {
      haltPoll();
      if (stopPoll.current === haltPoll) stopPoll.current = null;
      mode.current = 'local';
      setLive(false);
      setS(seedMarket());
    };
  }, [pull]);

  const dispatch = useCallback((a: MarketAction) => {
    if (mode.current !== 'live' || a.t === 'add' || a.t === 'setQty' || a.t === 'clearCart') {
      setS(prev => reduceMarket(prev, a));
      return;
    }
    if (a.t === 'reset' || a.t === 'place') return;
    const run = a.t === 'vendor' ? vendorAdvance(a.orderId)
      : a.t === 'pickup' ? riderPickup(a.orderId)
      : a.t === 'deliver' ? riderDeliver(a.orderId)
      : a.t === 'toggle' ? vendorToggle(a.itemId)
      : Promise.resolve();
    void run.then(() => pull()).catch(() => pull());
  }, [pull]);

  const v = useMemo(() => ({ s, dispatch, live, refresh, goLive }), [s, dispatch, live, refresh, goLive]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useMarket() {
  const c = useContext(Ctx);
  if (!c) throw new Error('no market store');
  return c;
}

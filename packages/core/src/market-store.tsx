import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MarketAction, MarketState, reduceMarket, seedMarket } from './market';

const Ctx = createContext<{ s: MarketState; dispatch: (a: MarketAction) => void } | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<MarketState>(seedMarket);
  const dispatch = useCallback((a: MarketAction) => { setS(prev => reduceMarket(prev, a)); }, []);
  const v = useMemo(() => ({ s, dispatch }), [s, dispatch]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useMarket() {
  const c = useContext(Ctx);
  if (!c) throw new Error('no market store');
  return c;
}

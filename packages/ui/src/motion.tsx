import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View } from 'react-native';
import { color, space } from './theme';
import { T } from './kit';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function useReducedMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (live) setOn(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setOn(!!v));
    return () => { live = false; sub.remove(); };
  }, []);
  return on;
}

const STEP: Record<string, number> = {
  awaiting_payment: 0.22,
  placed: 0.36,
  accepted: 0.5,
  preparing: 0.64,
  ready: 0.76,
  picked_up: 0.88,
  delivered: 1,
};

// State indication for an order. Transform only, from the left edge. No loop.
export function StatusRail({ status }: { status: string }) {
  const reduced = useReducedMotion();
  const target = STEP[status] ?? 0;
  const scale = useRef(new Animated.Value(target)).current;
  const first = useRef(true);
  useEffect(() => {
    const duration = reduced || first.current ? 0 : 220;
    first.current = false;
    Animated.timing(scale, { toValue: target, duration, easing: EASE_OUT, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [target, reduced, scale]);
  if (status === 'cancelled' || target === 0) return null;
  return (
    <View style={{ marginTop: space.m }}>
      <View style={{ height: 4, backgroundColor: color.sunk, overflow: 'hidden' }}>
        <Animated.View style={{ height: 4, width: '100%', backgroundColor: color.ink, transformOrigin: 'left center', transform: [{ scaleX: scale }] }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s }}>
        <T v="small">Kitchen</T>
        <T v="small">Rider</T>
        <T v="small">Door</T>
      </View>
    </View>
  );
}

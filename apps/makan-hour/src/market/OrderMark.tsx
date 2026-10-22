import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { color, useReducedMotion } from '@makan/ui';
import mark from './order-mark.json';

function rgba(hex: string) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255, 1];
}

// Ink line, one green fill, painted from the current theme so the bowl reads on paper and on charcoal.
function paint(ink: string, fill: string) {
  const src = JSON.parse(JSON.stringify(mark)) as typeof mark;
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { nm?: string; c?: { k?: number[] } };
    if (n.nm === 'fill' && n.c?.k) n.c.k = rgba(fill);
    if (n.nm === 'stroke' && n.c?.k) n.c.k = rgba(ink);
    for (const v of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(v)) v.forEach(walk);
      else walk(v);
    }
  };
  walk(src);
  return src;
}

// Plays once when an order is placed, and again when it is delivered. Reduced motion keeps the still bowl.
export function OrderMark() {
  const reduced = useReducedMotion();
  const [dead, setDead] = useState(false);
  const source = useMemo(() => paint(color.ink, color.accent), [color.ink, color.accent]);
  if (reduced || dead) {
    return (
      <View style={{ width: 72, height: 48, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ width: 64, height: 28, borderTopWidth: 3, borderWidth: 3, borderColor: color.ink, backgroundColor: color.accent, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }} />
      </View>
    );
  }
  return (
    <LottieView
      source={source}
      autoPlay
      loop={false}
      style={{ width: 96, height: 72 }}
      webStyle={{ width: 96, height: 72 }}
      onAnimationFailure={() => setDead(true)}
    />
  );
}

import React from 'react';
import { View } from 'react-native';
import { MarketOrder, orderTotalSen, rm, STATUS_LABEL, whenLabel } from '@makan/core';
import { color, font, Gap, nameStyle, space, StatusRail, T } from '@makan/ui';
import { OrderMark } from './OrderMark';

const bandKind = (status: MarketOrder['status']) => status === 'placed' || status === 'awaiting_payment' ? 'warn' as const : status === 'cancelled' ? 'danger' as const : status === 'accepted' || status === 'preparing' ? 'info' as const : 'ink' as const;

function bandPaint(kind: 'warn' | 'info' | 'ink' | 'danger') {
  if (kind === 'warn') return { bg: color.warn, fg: color.warnSoft };
  if (kind === 'info') return { bg: color.info, fg: color.infoSoft };
  if (kind === 'danger') return { bg: color.danger, fg: color.dangerSoft };
  return { bg: color.ink, fg: color.onInk };
}

// band: ops lists (vendor, rider) get a paper-tint row and a filled status strip.
// Customer orders stay bare. Green is not a status.
export function OrderBlock({ order, restaurant, children, band = false, mark = false }: { order: MarketOrder; restaurant?: string; children?: React.ReactNode; band?: boolean; mark?: boolean }) {
  const paint = bandPaint(bandKind(order.status));
  const body = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
        <View style={{ flex: 1 }}>
          <T style={nameStyle(22)}>{restaurant ?? order.customerName}</T>
          {!!restaurant && <T v="small">{order.customerName}</T>}
        </View>
      </View>
      {!band && <T testID={`market-status-${order.id}`} v="small" style={{ marginTop: space.s, color: color.ink, fontFamily: font.bodyStrong }}>{STATUS_LABEL[order.status]} · {whenLabel(order.placedAt)}</T>}
      {mark && <><Gap h={space.s} /><OrderMark /></>}
      <StatusRail status={order.status} />
      <Gap h={space.s} />
      {order.lines.map(l => <T key={l.itemId} v="body">{l.name} × {l.qty}</T>)}
      <Gap h={space.s} />
      <T v="body">{order.address}</T>
      {!!order.note && <T v="small">{order.note}</T>}
      {!!order.riderName && <T v="small">Rider · {order.riderName}</T>}
      <T v="num" style={{ marginTop: space.s }}>{rm(orderTotalSen(order))}</T>
      {children}
    </>
  );
  if (!band) return <View testID={`market-order-${order.id}`} style={{ marginBottom: space.l }}>{body}</View>;
  return (
    <View testID={`market-order-${order.id}`} style={{ marginBottom: space.m, backgroundColor: color.surface, borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ backgroundColor: paint.bg, paddingHorizontal: space.l, paddingVertical: space.s, minHeight: 36, justifyContent: 'center' }}>
        <T testID={`market-status-${order.id}`} style={{ color: paint.fg, fontFamily: font.bodyStrong, fontSize: 16, lineHeight: 20 }}>{STATUS_LABEL[order.status]}</T>
      </View>
      <View style={{ padding: space.l, minHeight: 56 }}>{body}</View>
    </View>
  );
}

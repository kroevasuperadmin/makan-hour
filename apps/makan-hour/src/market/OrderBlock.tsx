import React from 'react';
import { View } from 'react-native';
import { MarketOrder, orderTotalSen, rm, STATUS_LABEL, whenLabel } from '@makan/core';
import { Badge, Card, Gap, space, StatusRail, T } from '@makan/ui';

const tone = (status: MarketOrder['status']) => status === 'placed' || status === 'awaiting_payment' ? 'warn' as const : status === 'cancelled' ? 'danger' as const : status === 'accepted' || status === 'preparing' ? 'info' as const : 'accent' as const;

export function OrderBlock({ order, restaurant, children }: { order: MarketOrder; restaurant?: string; children?: React.ReactNode }) {
  return (
    <View testID={`market-order-${order.id}`} style={{ marginBottom: space.m }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
          <View style={{ flex: 1 }}>
            <T v="h2">{restaurant ?? order.customerName}</T>
            {!!restaurant && <T v="small">{order.customerName}</T>}
          </View>
          <Badge label={STATUS_LABEL[order.status]} tone={tone(order.status)} />
        </View>
        <T testID={`market-status-${order.id}`} v="small" style={{ marginTop: space.s }}>{STATUS_LABEL[order.status]} · {whenLabel(order.placedAt)}</T>
        <StatusRail status={order.status} />
        <Gap h={space.s} />
        {order.lines.map(l => <T key={l.itemId} v="body">{l.name} × {l.qty}</T>)}
        <Gap h={space.s} />
        <T v="small">{order.address}</T>
        {!!order.note && <T v="small">{order.note}</T>}
        {!!order.riderName && <T v="small">Rider · {order.riderName}</T>}
        <T v="num" style={{ marginTop: space.s }}>{rm(orderTotalSen(order))}</T>
        {children}
      </Card>
    </View>
  );
}

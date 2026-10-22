import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { isOpenStatus, useMarket } from '@makan/core';
import { Card, color, font, Gap, radius, Row, Screen, space, T } from '@makan/ui';
import { OrderBlock } from './OrderBlock';

type Filter = 'all' | 'open' | 'delivered';

export default function MarketAdmin() {
  const { s, dispatch, live } = useMarket();
  const [filter, setFilter] = useState<Filter>('all');
  const placed = s.orders.filter(o => o.status === 'placed').length;
  const active = s.orders.filter(o => o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'picked_up').length;
  const delivered = s.orders.filter(o => o.status === 'delivered').length;
  const shown = s.orders.filter(o => filter === 'all' ? true : filter === 'delivered' ? o.status === 'delivered' : isOpenStatus(o.status));
  return (
    <ScrollView style={{ flex: 1 }}>
      <Screen>
        <T v="h1">Every order</T>
        <Gap h={space.s} />
        <T v="body">{live ? 'Every saved marketplace order. Office lunch stays separate.' : 'Customers, vendors and riders on this device. Office lunch is a separate demo.'}</T>
        <Gap h={space.xl} />
        <Row style={{ gap: space.s }}>
          <Stat id="market-count-all" n={s.orders.length} label="Orders" />
          <Stat id="market-count-placed" n={placed} label="Placed" />
        </Row>
        <Gap h={space.s} />
        <Row style={{ gap: space.s }}>
          <Stat id="market-count-active" n={active} label="In progress" />
          <Stat id="market-count-delivered" n={delivered} label="Delivered" />
        </Row>
        <Gap h={space.xl} />
        <Row style={{ gap: space.s }}>
          {(['all', 'open', 'delivered'] as const).map(k => (
            <Pressable key={k} testID={`market-filter-${k}`} onPress={() => setFilter(k)} style={{ paddingVertical: space.s, paddingHorizontal: space.m, borderRadius: radius.s, backgroundColor: filter === k ? color.ink : color.sunk }}>
              <T v="small" style={{ color: filter === k ? color.onInk : color.ink, fontFamily: font.semi }}>{k === 'all' ? 'All' : k === 'open' ? 'Open' : 'Delivered'}</T>
            </Pressable>
          ))}
        </Row>
        <Gap h={space.l} />
        {shown.map(o => <OrderBlock key={o.id} order={o} restaurant={s.restaurants.find(r => r.id === o.restaurantId)?.name} />)}
        {!shown.length && <T v="body">Nothing in this filter.</T>}
        {!live && <>
          <Gap h={space.xl} />
          <Pressable testID="market-reset" onPress={() => dispatch({ t: 'reset' })} hitSlop={8}>
            <T v="small" style={{ textDecorationLine: 'underline', fontFamily: font.semi, color: color.ink }}>Reset this preview</T>
          </Pressable>
          <T v="small">Clears marketplace orders on this device only.</T>
        </>}
      </Screen>
    </ScrollView>
  );
}

function Stat({ id, n, label }: { id: string; n: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Card>
        <T testID={id} v="num" style={{ fontSize: 28 }}>{n}</T>
        <T v="small">{label}</T>
      </Card>
    </View>
  );
}

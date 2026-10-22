import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { isOpenStatus, ordersVisibleTo, rm, useMarket, vendorNext, vendorNextLabel } from '@makan/core';
import { Badge, Button, Card, Gap, Screen, space, T } from '@makan/ui';
import { Account } from '../accounts';
import { TabBar } from './TabBar';
import { OrderBlock } from './OrderBlock';

export default function Vendor({ account }: { account: Account }) {
  const { s, dispatch, live } = useMarket();
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const restaurant = s.restaurants.find(r => r.id === account.restaurantId);
  const orders = ordersVisibleTo('vendor', account.actorId ?? '', account.restaurantId ?? null, s.orders).slice().sort((a, b) => Number(isOpenStatus(b.status)) - Number(isOpenStatus(a.status)) || b.placedAt - a.placedAt);
  const open = orders.filter(o => isOpenStatus(o.status)).length;
  if (!restaurant) return <Screen><T v="body">This account is not tied to a restaurant.</T></Screen>;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>
        {tab === 'menu' ? <Menu restaurantId={restaurant.id} vendorId={account.actorId ?? ''} live={live} /> : (
          <Screen>
            <T v="hero" style={{ fontSize: 36 }}>{restaurant.name}</T>
            <Gap h={space.s} />
            <T v="body">Only your orders. Accept one, then mark it preparing, then ready for a rider.</T>
            <Gap h={space.xl} />
            {!orders.length && <T v="body">No orders yet.</T>}
            {orders.map(o => {
              const next = vendorNext(o.status);
              const label = vendorNextLabel(o.status);
              return (
                <OrderBlock key={o.id} order={o}>
                  {next && label && <>
                    <Gap h={space.m} />
                    <Button testID={`market-advance-${o.id}`} label={label} onPress={() => dispatch({ t: 'vendor', orderId: o.id, restaurantId: restaurant.id, to: next })} />
                  </>}
                </OrderBlock>
              );
            })}
          </Screen>
        )}
      </ScrollView>
      <TabBar value={tab} onChange={setTab} tabs={[{ key: 'orders', label: 'Orders', icon: 'receipt', badge: open || undefined }, { key: 'menu', label: 'Menu', icon: 'bowl' }]} />
    </View>
  );
}

function Menu({ restaurantId, vendorId, live }: { restaurantId: string; vendorId: string; live: boolean }) {
  const { s, dispatch } = useMarket();
  const items = s.items.filter(i => i.restaurantId === restaurantId);
  return (
    <Screen>
      <T v="hero" style={{ fontSize: 36 }}>Menu</T>
      <Gap h={space.s} />
      <T v="body">{live ? 'Customers only see dishes you leave available. This switch is saved.' : 'Customers only see dishes you leave available. This switch stays on this device.'}</T>
      <Gap h={space.xl} />
      {items.map(item => (
        <View key={item.id} testID={`menu-${item.id}`} style={{ marginBottom: space.m }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
              <View style={{ flex: 1 }}>
                <T v="h2">{item.name}</T>
                <T v="small">{item.description}</T>
                <T v="num" style={{ marginTop: space.s }}>{rm(item.priceSen)}</T>
              </View>
              <Badge label={item.available ? 'Available' : 'Hidden'} tone={item.available ? 'accent' : 'neutral'} />
            </View>
            <Gap h={space.m} />
            <Button testID={`market-toggle-${item.id}`} kind="secondary" label={item.available ? 'Hide from customers' : 'Put back on the menu'} onPress={() => dispatch({ t: 'toggle', itemId: item.id, vendorId })} />
          </Card>
        </View>
      ))}
    </Screen>
  );
}

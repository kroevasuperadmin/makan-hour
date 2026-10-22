import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { isOpenStatus, rm, useMarket, vendorNext, vendorNextLabel } from '@makan/core';
import { Button, Gap, nameStyle, Screen, space, T, color } from '@makan/ui';
import { Account } from '../accounts';
import { dishPhoto, Thumb } from '../photos';
import { TabBar } from './TabBar';
import { OrderBlock } from './OrderBlock';

export default function Vendor({ account }: { account: Account }) {
  const { s, dispatch } = useMarket();
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const restaurant = s.restaurants.find(r => r.id === account.restaurantId);
  const orders = s.orders.filter(o => o.restaurantId === account.restaurantId).slice().sort((a, b) => Number(isOpenStatus(b.status)) - Number(isOpenStatus(a.status)) || b.placedAt - a.placedAt);
  const open = orders.filter(o => isOpenStatus(o.status)).length;
  if (!restaurant) return <Screen><T v="body">This account is not tied to a restaurant.</T></Screen>;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>
        {tab === 'menu' ? <Menu restaurantId={restaurant.id} vendorId={account.actorId ?? ''} /> : (
          <Screen>
            <T style={nameStyle(36)} numberOfLines={2}>{restaurant.name}</T>
            <Gap h={space.s} />
            <T v="body">Only your orders. Accept one, then mark it preparing, then ready for a rider.</T>
            <Gap h={space.xl} />
            {!orders.length && <T v="body">No orders yet.</T>}
            {orders.map(o => {
              const next = vendorNext(o.status);
              const label = vendorNextLabel(o.status);
              return (
                <OrderBlock key={o.id} band order={o}>
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

function Menu({ restaurantId, vendorId }: { restaurantId: string; vendorId: string }) {
  const { s, dispatch } = useMarket();
  const items = s.items.filter(i => i.restaurantId === restaurantId);
  return (
    <Screen>
      <T v="hero">Menu</T>
      <Gap h={space.s} />
      <T v="body">Customers only see dishes you leave available. This switch stays on this device.</T>
      <Gap h={space.xl} />
      {items.map(item => (
        <Pressable key={item.id} testID={`menu-${item.id}`} onPress={() => dispatch({ t: 'toggle', itemId: item.id, vendorId })} style={({ pressed }) => ({ minHeight: 56, marginBottom: space.s, paddingVertical: space.m, backgroundColor: pressed ? color.sunk : 'transparent' })}>
          <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
            <Thumb source={dishPhoto(item.id)} label={item.name} />
            <View style={{ flex: 1 }}>
              <T style={nameStyle(20)}>{item.name}</T>
              <T v="small">{item.description}</T>
              <T v="num" style={{ marginTop: space.xs }}>{rm(item.priceSen)}</T>
            </View>
          </View>
          <T testID={`market-toggle-${item.id}`} v="small" style={{ color: color.ink, marginTop: space.s }}>{item.available ? 'Hide from customers' : 'Put back on the menu'}</T>
        </Pressable>
      ))}
    </Screen>
  );
}

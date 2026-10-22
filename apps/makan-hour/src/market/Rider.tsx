import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MarketOrder, useMarket } from '@makan/core';
import { Button, color, font, Gap, nameStyle, Screen, space, T } from '@makan/ui';
import { Account } from '../accounts';
import { OrderBlock } from './OrderBlock';
import { OrderMark } from './OrderMark';

export default function Rider({ account }: { account: Account }) {
  const { s, dispatch } = useMarket();
  const nameOf = (id: string) => s.restaurants.find(r => r.id === id)?.name;
  const ready = s.orders.filter(o => o.status === 'ready' && !o.riderId).slice().sort((a, b) => a.placedAt - b.placedAt);
  const mine = s.orders.filter(o => o.riderId === account.actorId && o.status === 'picked_up');
  const done = s.orders.filter(o => o.riderId === account.actorId && o.status === 'delivered');
  const active = mine[0];
  const next = active ?? ready[0];
  const restReady = active ? ready : ready.slice(1);
  const restMine = active ? mine.slice(1) : [];
  const act = (order: MarketOrder, kind: 'pickup' | 'deliver') => {
    if (kind === 'pickup') dispatch({ t: 'pickup', orderId: order.id, riderId: account.actorId ?? '', riderName: account.name });
    else {
      dispatch({ t: 'deliver', orderId: order.id, riderId: account.actorId ?? '' });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };
  return (
    <ScrollView style={{ flex: 1 }}>
      <Screen>
        <T v="label">{active ? 'On the way' : 'Next stop'}</T>
        <Gap h={space.s} />
        {!next && <T testID="market-rider-empty" v="body">Nothing is waiting.</T>}
        {next && <>
          <T style={{ fontFamily: font.bodyStrong, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: color.ink }}>{next.address}</T>
          <Gap h={space.s} />
          <T style={nameStyle(22)}>{nameOf(next.restaurantId)}</T>
          {next.lines.map(l => <T key={l.itemId} v="body">{l.name} × {l.qty}</T>)}
          <T v="small">{next.customerName}</T>
          <Gap h={space.l} />
          <Button
            testID={active ? `market-deliver-${next.id}` : `market-pickup-${next.id}`}
            size="lg"
            label={active ? 'Deliver' : 'Pick up'}
            onPress={() => act(next, active ? 'deliver' : 'pickup')}
            style={{ borderRadius: 0, marginHorizontal: -space.xl }}
          />
        </>}
        {!!restReady.length && <>
          <Gap h={space.xl} />
          <T v="label">Also ready</T>
          <Gap h={space.m} />
          {restReady.map(o => (
            <OrderBlock key={o.id} band order={o} restaurant={nameOf(o.restaurantId)}>
              <Gap h={space.m} />
              <Button testID={`market-pickup-${o.id}`} size="lg" label="Pick up" onPress={() => act(o, 'pickup')} />
            </OrderBlock>
          ))}
        </>}
        {!!restMine.length && <>
          <Gap h={space.xl} />
          <T v="label">Also with you</T>
          <Gap h={space.m} />
          {restMine.map(o => (
            <OrderBlock key={o.id} band order={o} restaurant={nameOf(o.restaurantId)}>
              <Gap h={space.m} />
              <Button testID={`market-deliver-${o.id}`} size="lg" label="Deliver" onPress={() => act(o, 'deliver')} />
            </OrderBlock>
          ))}
        </>}
        {!!done.length && <>
          <Gap h={space.xl} />
          <T v="label">Delivered</T>
          <Gap h={space.m} />
          {done.map(o => (
            <View key={o.id}>
              <OrderMark />
              <OrderBlock band mark={false} order={o} restaurant={nameOf(o.restaurantId)} />
            </View>
          ))}
        </>}
      </Screen>
    </ScrollView>
  );
}

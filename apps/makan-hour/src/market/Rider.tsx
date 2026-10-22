import React from 'react';
import { ScrollView } from 'react-native';
import { useMarket } from '@makan/core';
import { Button, Gap, Screen, space, T } from '@makan/ui';
import { Account } from '../accounts';
import { OrderBlock } from './OrderBlock';

export default function Rider({ account }: { account: Account }) {
  const { s, dispatch } = useMarket();
  const nameOf = (id: string) => s.restaurants.find(r => r.id === id)?.name;
  const ready = s.orders.filter(o => o.status === 'ready' && !o.riderId).slice().sort((a, b) => a.placedAt - b.placedAt);
  const mine = s.orders.filter(o => o.riderId === account.actorId && o.status === 'picked_up');
  const done = s.orders.filter(o => o.riderId === account.actorId && o.status === 'delivered');
  return (
    <ScrollView style={{ flex: 1 }}>
      <Screen>
        <T v="hero" style={{ fontSize: 36 }}>Jobs</T>
        <Gap h={space.s} />
        <T v="body">{account.name}, pick up a ready order, then mark it delivered.</T>
        <Gap h={space.xl} />
        <T v="label">Ready for pickup</T>
        <Gap h={space.m} />
        {!ready.length && <T testID="market-rider-empty" v="body">Nothing is waiting.</T>}
        {ready.map(o => (
          <OrderBlock key={o.id} order={o} restaurant={nameOf(o.restaurantId)}>
            <Gap h={space.m} />
            <Button testID={`market-pickup-${o.id}`} label="Pick up" onPress={() => dispatch({ t: 'pickup', orderId: o.id, riderId: account.actorId ?? '', riderName: account.name })} />
          </OrderBlock>
        ))}
        <Gap h={space.l} />
        <T v="label">With you</T>
        <Gap h={space.m} />
        {!mine.length && <T v="small">No active delivery.</T>}
        {mine.map(o => (
          <OrderBlock key={o.id} order={o} restaurant={nameOf(o.restaurantId)}>
            <Gap h={space.m} />
            <Button testID={`market-deliver-${o.id}`} label="Mark delivered" onPress={() => dispatch({ t: 'deliver', orderId: o.id, riderId: account.actorId ?? '' })} />
          </OrderBlock>
        ))}
        {!!done.length && <>
          <Gap h={space.l} />
          <T v="label">Delivered</T>
          <Gap h={space.m} />
          {done.map(o => <OrderBlock key={o.id} order={o} restaurant={nameOf(o.restaurantId)} />)}
        </>}
      </Screen>
    </ScrollView>
  );
}

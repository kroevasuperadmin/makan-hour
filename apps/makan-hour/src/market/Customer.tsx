import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { cartCount, cartRestaurant, cartTotalSen, Restaurant, rm, useMarket } from '@makan/core';
import { Badge, Button, Card, color, font, Gap, Icon, radius, Row, Screen, space, T } from '@makan/ui';
import { Account } from '../accounts';
import { TabBar } from './TabBar';
import { OrderBlock } from './OrderBlock';

export default function Customer({ account }: { account: Account }) {
  const { s, dispatch } = useMarket();
  const [tab, setTab] = useState<'browse' | 'cart' | 'orders'>('browse');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [address, setAddress] = useState(account.dropAddress ?? '');
  const [note, setNote] = useState('');
  const [swap, setSwap] = useState<string | null>(null);
  const [justId, setJustId] = useState<string | null>(null);
  const mine = s.orders.filter(o => o.customerId === account.actorId);
  const current = cartRestaurant(s);
  const count = cartCount(s);

  const add = (itemId: string, restaurant: string) => {
    if (current && current.id !== restaurant) { setSwap(itemId); return; }
    dispatch({ t: 'add', itemId });
    setSwap(null);
  };
  const place = () => {
    if (!account.actorId || address.trim().length < 4 || !current) return;
    const id = `mkt-${s.seq}`;
    dispatch({ t: 'place', customerId: account.actorId, customerName: account.name, address, note, at: Date.now() });
    setJustId(id);
    setRestaurantId(null);
    setTab('orders');
  };

  const restaurant = s.restaurants.find(r => r.id === restaurantId) ?? null;
  const body = tab === 'orders' ? <Orders mine={mine} restaurants={s.restaurants} justId={justId} />
    : tab === 'cart' ? <Cart address={address} setAddress={setAddress} note={note} setNote={setNote} onPlace={place} />
    : restaurant ? <Menu restaurant={restaurant} onBack={() => { setRestaurantId(null); setSwap(null); }} add={add} swap={swap} onReplace={id => { dispatch({ t: 'add', itemId: id, replace: true }); setSwap(null); }} onKeep={() => setSwap(null)} />
    : <Browse onOpen={setRestaurantId} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>{body}</ScrollView>
      <TabBar value={tab} onChange={k => { setTab(k); if (k !== 'browse') setRestaurantId(null); }} tabs={[
        { key: 'browse', label: 'Browse', icon: 'bowl' },
        { key: 'cart', label: 'Cart', icon: 'receipt', badge: count || undefined },
        { key: 'orders', label: 'Orders', icon: 'clock' },
      ]} />
    </View>
  );
}

function Browse({ onOpen }: { onOpen: (id: string) => void }) {
  const { s } = useMarket();
  return (
    <Screen>
      <T v="hero">What are you eating?</T>
      <Gap h={space.s} />
      <T v="body">Kitchens around Bangsar South and Brickfields. One restaurant per cart.</T>
      <Gap h={space.xl} />
      {s.restaurants.map(r => (
        <Pressable key={r.id} testID={`restaurant-${r.id}`} onPress={() => onOpen(r.id)} style={({ pressed }) => ({ marginBottom: space.m, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
          <Card>
            <Row style={{ justifyContent: 'space-between', gap: space.m }}>
              <View style={{ flex: 1 }}>
                <T v="h2">{r.name}</T>
                <T v="small">{r.cuisine} · {r.area}</T>
              </View>
              <Icon name="chevron" size={16} c={color.faint} />
            </Row>
            <Gap h={space.s} />
            <Row style={{ gap: space.s }}>
              <Badge label={r.halal ? 'Halal' : 'Not halal'} tone={r.halal ? 'accent' : 'neutral'} />
              <T v="small">{r.etaMin} min</T>
            </Row>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function Menu({ restaurant, onBack, add, swap, onReplace, onKeep }: { restaurant: Restaurant; onBack: () => void; add: (itemId: string, restaurantId: string) => void; swap: string | null; onReplace: (id: string) => void; onKeep: () => void }) {
  const { s } = useMarket();
  const items = s.items.filter(i => i.restaurantId === restaurant.id && i.available);
  const current = cartRestaurant(s);
  return (
    <Screen>
      <Pressable testID="market-back" onPress={onBack} hitSlop={8}><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>All restaurants</T></Pressable>
      <Gap h={space.l} />
      <T v="hero" style={{ fontSize: 36 }}>{restaurant.name}</T>
      <Gap h={space.s} />
      <T v="body">{restaurant.cuisine} · {restaurant.area} · about {restaurant.etaMin} min</T>
      <Gap h={space.xl} />
      {swap && current && (
        <View style={{ marginBottom: space.l }}>
          <Card tone="warn">
            <T v="body" style={{ color: color.ink }}>Your cart is for {current.name}. Start a new cart for {restaurant.name}?</T>
            <Gap h={space.m} />
            <Button testID="market-replace-cart" label="Start a new cart" onPress={() => onReplace(swap)} />
            <Gap h={space.s} />
            <Button kind="ghost" label="Keep this cart" onPress={onKeep} />
          </Card>
        </View>
      )}
      {items.map(item => {
        const qty = s.cart.find(l => l.itemId === item.id)?.qty ?? 0;
        return (
          <View key={item.id} style={{ marginBottom: space.m }}>
            <Card>
              <T v="h2">{item.name}</T>
              <T v="small">{item.description}</T>
              <Gap h={space.m} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="num">{rm(item.priceSen)}</T>
                <Button testID={`add-${item.id}`} kind="secondary" label={qty ? `Add · ${qty}` : 'Add'} onPress={() => add(item.id, restaurant.id)} style={{ minHeight: 40, paddingHorizontal: space.m }} />
              </Row>
            </Card>
          </View>
        );
      })}
      {!items.length && <T v="body">Nothing on the menu right now.</T>}
    </Screen>
  );
}

function Cart({ address, setAddress, note, setNote, onPlace }: { address: string; setAddress: (v: string) => void; note: string; setNote: (v: string) => void; onPlace: () => void }) {
  const { s, dispatch } = useMarket();
  const restaurant = cartRestaurant(s);
  const input = { borderWidth: 1, borderColor: color.line, borderRadius: radius.s, padding: space.m, fontFamily: font.body, fontSize: 15, color: color.ink, backgroundColor: color.surface } as const;
  if (!restaurant) return <Screen><T testID="market-cart-empty" v="h1">Your cart is empty.</T><Gap h={space.s} /><T v="body">Add a dish from a restaurant first.</T></Screen>;
  const blocked = s.cart.some(l => s.items.find(i => i.id === l.itemId)?.available === false);
  return (
    <Screen>
      <T v="hero" style={{ fontSize: 36 }}>Cart</T>
      <Gap h={space.s} />
      <T v="body">{restaurant.name}</T>
      <Gap h={space.xl} />
      {s.cart.map(l => {
        const item = s.items.find(i => i.id === l.itemId);
        if (!item) return null;
        return (
          <View key={l.itemId} style={{ marginBottom: space.m }}>
            <Card>
              <T v="h2">{item.name}</T>
              {!item.available && <T v="small" style={{ color: color.danger }}>No longer available</T>}
              <Gap h={space.m} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="num">{rm(item.priceSen * l.qty)}</T>
                <Row style={{ gap: space.s }}>
                  <Button testID={`cart-dec-${l.itemId}`} kind="secondary" label="−" onPress={() => dispatch({ t: 'setQty', itemId: l.itemId, qty: l.qty - 1 })} style={{ minHeight: 40, minWidth: 44 }} />
                  <T testID={`qty-${l.itemId}`} v="num">{l.qty}</T>
                  <Button testID={`cart-inc-${l.itemId}`} kind="secondary" label="+" onPress={() => dispatch({ t: 'setQty', itemId: l.itemId, qty: l.qty + 1 })} style={{ minHeight: 40, minWidth: 44 }} />
                </Row>
              </Row>
            </Card>
          </View>
        );
      })}
      <T v="label">Deliver to</T>
      <Gap h={space.s} />
      <TextInput testID="market-address" value={address} onChangeText={setAddress} placeholder="Building, level" placeholderTextColor={color.faint} style={input} />
      <Gap h={space.l} />
      <T v="label">Note for the kitchen</T>
      <Gap h={space.s} />
      <TextInput testID="market-note" value={note} onChangeText={setNote} placeholder="Optional" placeholderTextColor={color.faint} style={input} />
      <Gap h={space.l} />
      <Row style={{ justifyContent: 'space-between' }}><T v="h2">Total</T><T v="num">{rm(cartTotalSen(s))}</T></Row>
      <Gap h={space.l} />
      <Button testID="market-place-order" label="Place order" onPress={onPlace} disabled={address.trim().length < 4 || blocked} />
      <Gap h={space.s} />
      <T v="small">Placing an order does not charge a card. Stripe checkout is unchanged and is not used here.</T>
    </Screen>
  );
}

function Orders({ mine, restaurants, justId }: { mine: { id: string; restaurantId: string }[]; restaurants: Restaurant[]; justId: string | null }) {
  const { s } = useMarket();
  const orders = s.orders.filter(o => mine.some(m => m.id === o.id));
  return (
    <Screen>
      <T v="hero" style={{ fontSize: 36 }}>Your orders</T>
      <Gap h={space.m} />
      {justId && <View style={{ marginBottom: space.l }}><Card tone="accent"><T testID="market-placed" v="body" style={{ color: color.ink }}>Order {justId} is with the vendor on this device.</T></Card></View>}
      {!orders.length && <T v="body">You have not ordered yet.</T>}
      {orders.map(o => <OrderBlock key={o.id} order={o} restaurant={restaurants.find(r => r.id === o.restaurantId)?.name} />)}
    </Screen>
  );
}

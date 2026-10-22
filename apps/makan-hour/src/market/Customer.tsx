import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { cartCount, cartRestaurant, cartTotalSen, placeMarketOrder, Restaurant, rm, useMarket } from '@makan/core';
import { Button, Card, color, fieldStyle, font, Gap, nameStyle, Row, Screen, space, T } from '@makan/ui';
import { Account } from '../accounts';
import { dishPhoto, restaurantPhoto, Thumb } from '../photos';
import PayButton from '../PayButton';
import { TabBar } from './TabBar';
import { OrderBlock } from './OrderBlock';
import { OrderMark } from './OrderMark';

function placedHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export default function Customer({ account }: { account: Account }) {
  const { s, dispatch, refresh } = useMarket();
  const [tab, setTab] = useState<'browse' | 'cart' | 'orders'>('browse');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [address, setAddress] = useState(account.dropAddress ?? '');
  const [note, setNote] = useState('');
  const [swap, setSwap] = useState<string | null>(null);
  const [justId, setJustId] = useState<string | null>(null);
  const [payErr, setPayErr] = useState<string | null>(null);
  const mine = s.orders.filter(o => o.customerId === account.actorId);
  const current = cartRestaurant(s);
  const count = cartCount(s);

  const add = (itemId: string, restaurant: string) => {
    if (current && current.id !== restaurant) { setSwap(itemId); return; }
    dispatch({ t: 'add', itemId });
    setSwap(null);
  };
  const place = async () => {
    if (!account.actorId || address.trim().length < 4 || !current) return;
    if (account.real) {
      setPayErr(null);
      try {
        const order = await placeMarketOrder({ restaurantId: current.id, address, note, lines: s.cart.map(l => ({ itemId: l.itemId, qty: l.qty })) });
        dispatch({ t: 'clearCart' });
        setJustId(order.id);
        setRestaurantId(null);
        setTab('orders');
        placedHaptic();
        await refresh();
      } catch (e) { setPayErr(e instanceof Error ? e.message : 'Could not start the order'); }
      return;
    }
    const id = `mkt-${s.seq}`;
    dispatch({ t: 'place', customerId: account.actorId, customerName: account.name, address, note, at: Date.now() });
    setJustId(id);
    setRestaurantId(null);
    setTab('orders');
    placedHaptic();
  };

  const restaurant = s.restaurants.find(r => r.id === restaurantId) ?? null;
  const body = tab === 'orders' ? <Orders mine={mine} restaurants={s.restaurants} justId={justId} account={account} />
    : tab === 'cart' ? <Cart address={address} setAddress={setAddress} note={note} setNote={setNote} onPlace={place} real={!!account.real} payErr={payErr} />
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
      <T v="body">Kitchens around Bangsar South and Brickfields. One restaurant in the cart.</T>
      <Gap h={space.xl} />
      {s.restaurants.map(r => (
        <Pressable key={r.id} testID={`restaurant-${r.id}`} onPress={() => onOpen(r.id)} style={({ pressed }) => ({ minHeight: 56, marginHorizontal: -space.xl, paddingHorizontal: space.xl, paddingVertical: space.m, backgroundColor: pressed ? color.sunk : 'transparent', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Row style={{ gap: space.m, alignItems: 'center' }}>
            <Thumb source={restaurantPhoto(r.id)} label={r.name} />
            <View style={{ flex: 1 }}>
              <T style={nameStyle(22)} numberOfLines={2}>{r.name}</T>
              <T v="body">{r.cuisine} · {r.area}</T>
              <T v="small" style={{ color: r.halal ? color.ink : color.muted }}>{r.halal ? 'Halal' : 'Not halal'}</T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T v="num" style={{ fontSize: 28, lineHeight: 32 }}>{r.etaMin}</T>
              <T v="small">min</T>
            </View>
          </Row>
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
      <Pressable testID="market-back" onPress={onBack} hitSlop={8}><T v="body" style={{ fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>All restaurants</T></Pressable>
      <Gap h={space.l} />
      <T style={nameStyle(40)} numberOfLines={2}>{restaurant.name}</T>
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
          <Pressable key={item.id} testID={`add-${item.id}`} onPress={() => add(item.id, restaurant.id)} style={({ pressed }) => ({ minHeight: 56, marginHorizontal: -space.xl, paddingHorizontal: space.xl, paddingVertical: space.m, backgroundColor: pressed || qty ? color.sunk : 'transparent' })}>
            <Row style={{ gap: space.m, alignItems: 'center' }}>
              <Thumb source={dishPhoto(item.id)} label={item.name} />
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: space.m }}>
                  <T style={[nameStyle(20), { flex: 1 }]}>{item.name}</T>
                  <T v="num">{rm(item.priceSen)}</T>
                </Row>
                <T v="body" style={{ color: color.ink2 }}>{item.description}</T>
                <T v="small" style={{ color: color.ink, marginTop: 2 }}>{qty ? `${qty} in the cart` : 'Add'}</T>
              </View>
            </Row>
          </Pressable>
        );
      })}
      {!items.length && <T v="body">Nothing on the menu right now.</T>}
    </Screen>
  );
}

function Cart({ address, setAddress, note, setNote, onPlace, real, payErr }: { address: string; setAddress: (v: string) => void; note: string; setNote: (v: string) => void; onPlace: () => void; real: boolean; payErr: string | null }) {
  const { s, dispatch } = useMarket();
  const restaurant = cartRestaurant(s);
  const input = fieldStyle();
  if (!restaurant) return <Screen><T testID="market-cart-empty" v="h1">Your cart is empty.</T><Gap h={space.s} /><T v="body">Add a dish from a restaurant first.</T></Screen>;
  const blocked = s.cart.some(l => s.items.find(i => i.id === l.itemId)?.available === false);
  return (
    <Screen>
      <T v="hero">Cart</T>
      <Gap h={space.s} />
      <T v="body">{restaurant.name}</T>
      <Gap h={space.xl} />
      {s.cart.map(l => {
        const item = s.items.find(i => i.id === l.itemId);
        if (!item) return null;
        return (
          <View key={l.itemId} style={{ marginBottom: space.m }}>
            <Card>
              <T style={nameStyle(20)}>{item.name}</T>
              {!item.available && <T v="small" style={{ color: color.danger }}>No longer available</T>}
              <Gap h={space.m} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="num">{rm(item.priceSen * l.qty)}</T>
                <Row style={{ gap: space.s }}>
                  <Button testID={`cart-dec-${l.itemId}`} kind="secondary" label="−" onPress={() => dispatch({ t: 'setQty', itemId: l.itemId, qty: l.qty - 1 })} style={{ minHeight: 48, minWidth: 48 }} />
                  <T testID={`qty-${l.itemId}`} v="num">{l.qty}</T>
                  <Button testID={`cart-inc-${l.itemId}`} kind="secondary" label="+" onPress={() => dispatch({ t: 'setQty', itemId: l.itemId, qty: l.qty + 1 })} style={{ minHeight: 48, minWidth: 48 }} />
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
      <T v="small">Total</T>
      <T v="num" style={{ fontSize: 44, lineHeight: 48 }}>{rm(cartTotalSen(s))}</T>
      <Gap h={space.l} />
      <Button testID={real ? 'market-continue-pay' : 'market-place-order'} label={real ? 'Continue to payment' : 'Place order'} onPress={onPlace} disabled={address.trim().length < 4 || blocked} />
      <Gap h={space.s} />
      <T v="small">{real ? 'Next is Stripe Checkout, by FPX or card. The kitchen sees the order only after Stripe confirms. Apple in-app purchase is not used.' : 'This device preview does not charge a card.'}</T>
      {!!payErr && <T v="small" style={{ color: color.danger, marginTop: space.s }}>{payErr}</T>}
    </Screen>
  );
}

function Orders({ mine, restaurants, justId, account }: { mine: { id: string; restaurantId: string }[]; restaurants: Restaurant[]; justId: string | null; account: Account }) {
  const { s, refresh } = useMarket();
  const orders = s.orders.filter(o => mine.some(m => m.id === o.id));
  return (
    <Screen>
      <T v="hero">Your orders</T>
      <Gap h={space.m} />
      {justId && <View style={{ marginBottom: space.l }}>
        <View style={{ backgroundColor: color.ink, paddingHorizontal: space.l, paddingVertical: space.s }}><T v="label" style={{ color: color.onInk }}>Ordered</T></View>
        <Gap h={space.m} />
        <OrderMark />
        <Gap h={space.s} />
        <T testID="market-placed" v="body">{account.real ? `Order ${justId} is saved. Pay to send it to the kitchen.` : `Order ${justId} is with the vendor on this device.`}</T>
      </View>}
      {!orders.length && <T v="body">You have not ordered yet.</T>}
      {orders.map(o => (
        <OrderBlock key={o.id} order={o} restaurant={restaurants.find(r => r.id === o.restaurantId)?.name} mark={o.status === 'delivered'}>
          {account.real && o.status === 'awaiting_payment' && <>
            <Gap h={space.m} />
            <PayButton testID={`market-pay-${o.id}`} kind="order" payRef={o.id} amountSen={o.lines.reduce((n, l) => n + l.priceSen * l.qty, 0)} email={account.email} description={`Makan Hour ${o.id}`} label="Pay with FPX or card" onPaid={() => { refresh(); }} />
          </>}
        </OrderBlock>
      ))}
    </Screen>
  );
}

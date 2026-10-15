import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ALLOWANCE_SEN, CUTOFF, dish, hhmm, me, myOrder, rm, topUpSen, useStore } from '@makan/core';
import FpxPay from '../FpxPay';
import { askPermission, useAlertOnChange } from '../notify';
import { Badge, Button, Card, color, Divider, font, Gap, Icon, radius, Row, Screen, space, T } from '@makan/ui';

function Countdown() {
  const { s } = useStore();
  const left = Math.max(0, CUTOFF - s.clock);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
  if (s.cutoffPassed) return <Row style={{ gap: space.s }}><Icon name="lock" size={16} c={color.muted} /><T v="small">Ordering closed at 10:30 am. Orders are with the caterer.</T></Row>;
  return (
    <Row style={{ gap: space.s }} >
      <Icon name="clock" size={16} c={color.warn} />
      <T v="small" style={{ color: color.warn, fontFamily: font.bodyStrong }}>Order by 10:30 am</T>
      <T v="small" testID="countdown">· {h > 0 ? `${h}h ` : ''}{m}m left</T>
    </Row>
  );
}

function SpotCard() {
  const { s, dispatch } = useStore();
  const u = me(s);
  const [edit, setEdit] = useState(false);
  const [floor, setFloor] = useState(u.floor), [desk, setDesk] = useState(u.desk);
  const office = s.offices.find(o => o.id === u.officeId)!;
  if (edit) return (
    <Card>
      <T v="label">Deliver to</T><Gap h={space.s} />
      <TextInput testID="floor-input" value={floor} onChangeText={setFloor} style={inp()} placeholder="Floor" />
      <Gap h={space.s} />
      <TextInput testID="desk-input" value={desk} onChangeText={setDesk} style={inp()} placeholder="Desk" />
      <Gap h={space.m} />
      <Button testID="save-spot" label="Save as my default" onPress={() => { dispatch({ t: 'spot', floor, desk }); setEdit(false); }} />
    </Card>
  );
  return (
    <Card>
      <Row style={{ gap: space.m }}>
        <Icon name="pin" size={20} />
        <View style={{ flex: 1 }}>
          <T v="h2">{u.floor} · {u.desk}</T>
          <T v="small">{office.building} · drop at {office.dropSpot}</T>
        </View>
        <Pressable testID="edit-spot" onPress={() => setEdit(true)} hitSlop={12}><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>Change</T></Pressable>
      </Row>
      <Gap h={space.s} />
      <Row style={{ gap: space.xs }}><Icon name="check" size={14} c={color.accent} /><T v="small" style={{ color: color.accent }}>Saved to your profile for every order.</T></Row>
    </Card>
  );
}
const inp = () => ({ borderWidth: 1, borderColor: color.line, borderRadius: radius.s, padding: space.m, fontFamily: font.body, fontSize: 15, color: color.ink, backgroundColor: color.canvas } as const);

function ConfirmedPanel() {
  const { s, dispatch } = useStore();
  const o = myOrder(s)!; const d = dish(s, o.dishId); const u = me(s);
  const drop = s.drops.find(x => x.officeId === u.officeId)!;
  const eta = drop.dueAt + drop.delayMin * 60;
  if (drop.stage === 4) return (
    <View testID="delivered-panel" style={{ backgroundColor: color.accent, borderRadius: radius.m, padding: space.xl }}>
      <Row style={{ gap: space.s }}><Icon name="check" size={18} c={color.onAccent} w={2.5} /><T v="label" style={{ color: color.onAccentMuted }}>Delivered {hhmm(drop.deliveredAt!)}</T></Row>
      <Gap h={space.m} />
      <T v="hero" style={{ color: color.onAccent }}>Lunch is at {s.offices.find(x => x.id === u.officeId)!.dropSpot}.</T>
      <Gap h={space.m} />
      <T v="body" style={{ color: color.onAccent, opacity: 0.85 }}>Look for the bag labelled “{u.name} · {d.name}”. Shelf {s.offices.find(x => x.id === u.officeId)!.dropCode}, slot 12.</T>
    </View>
  );
  return (
    <View testID="ordered-panel" style={{ backgroundColor: color.accent, borderRadius: radius.m, padding: space.xl }}>
      <Row style={{ gap: space.s }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.onAccent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} c={color.accent} w={3} /></View>
        <T v="label" style={{ color: color.onAccentMuted }}>Ordered · {s.cutoffPassed ? 'locked' : 'confirmed'}</T>
      </Row>
      <Gap h={space.l} />
      <T v="hero" style={{ color: color.onAccent }}>You're in for lunch.</T>
      <Gap h={space.m} />
      <T v="body" style={{ color: color.onAccent, fontFamily: font.bodyStrong }}>{d.name}</T>
      <T v="body" style={{ color: color.onAccent, opacity: 0.85 }}>To {u.floor}, {u.desk} · arrives {hhmm(eta)}{drop.delayMin ? ' (revised)' : ''}</T>
      <T v="small" style={{ color: color.onAccentMuted, marginTop: space.xs }}>Order MH-{String(o.placedAt).slice(-4)} · {topUpSen(d.priceSen) ? `${s.offices.find(x => x.id === u.officeId)!.company} pays ${rm(ALLOWANCE_SEN)}, you pay ${rm(topUpSen(d.priceSen))}` : `paid by ${s.offices.find(x => x.id === u.officeId)!.company}`}</T>
      {topUpSen(d.priceSen) > 0 && <>
        <Gap h={space.m} />
        {s.topUpPaidRef ? <T v="small" testID="topup-paid" style={{ color: color.onAccent, fontFamily: font.bodyStrong }}>Top-up {rm(topUpSen(d.priceSen))} paid by FPX · ref {s.topUpPaidRef}</T>
          : <FpxPay testID="pay-topup" kind="topup" kindOfButton="secondary" payRef={`ord-me-${o.placedAt}`} amountSen={topUpSen(d.priceSen)} name={u.name} email="aina.rahman@example.com"
              description={`Top-up for ${d.name}`} label={`Pay ${rm(topUpSen(d.priceSen))} top-up by FPX`} onPaid={id => dispatch({ t: 'topupPaid', ref: id })} />}
      </>}
      {!s.cutoffPassed && <>
        <Gap h={space.l} />
        <Row style={{ gap: space.s }}>
          <Pressable testID="cancel-order" onPress={() => dispatch({ t: 'cancel' })} style={{ paddingVertical: space.s }}><T v="small" style={{ color: color.onAccent, textDecorationLine: 'underline', fontFamily: font.bodyStrong }}>Change or cancel</T></Pressable>
          <T v="small" style={{ color: color.onAccentMuted }}>until 10:30 am</T>
        </Row>
      </>}
    </View>
  );
}

function DelayAlert() {
  const { s } = useStore();
  const u = me(s); const drop = s.drops.find(x => x.officeId === u.officeId)!;
  if (!drop.delayMin || drop.stage === 4 || !myOrder(s)) return null;
  const minsBefore = Math.round((drop.dueAt - (drop.delayNotifiedAt ?? 0)) / 60);
  return (
    <Card tone="warn" style={{ marginBottom: space.l }}>
      <Row style={{ gap: space.s, alignItems: 'flex-start' }}>
        <Icon name="alert" size={18} c={color.warn} />
        <View style={{ flex: 1 }}>
          <T v="h2" style={{ color: color.warn }} testID="delay-alert">Running {drop.delayMin} min late. New time {hhmm(drop.dueAt + drop.delayMin * 60)}.</T>
          <T v="small" style={{ color: color.warn }}>Heavy traffic on Jalan Kerinchi. We sent this at {hhmm(drop.delayNotifiedAt!)}, {minsBefore} min before the original time. You don't need to do anything.</T>
        </View>
      </Row>
    </Card>
  );
}

export default function Employee() {
  const { s, dispatch } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const order = myOrder(s); const u = me(s);
  const myDrop = s.drops.find(x => x.officeId === u.officeId)!;
  useAlertOnChange(myDrop.delayNotifiedAt ? `${myDrop.delayNotifiedAt}-${myDrop.delayMin}` : null,
    `Lunch is ${myDrop.delayMin} min late`, `New time ${hhmm(myDrop.dueAt + myDrop.delayMin * 60)} at ${s.offices.find(x => x.id === u.officeId)!.dropSpot}.`, !!order && myDrop.stage < 4);
  const today = s.dishes;
  return (
    <Screen>
      <T v="label">Thursday, 22 October</T>
      <Gap h={space.s} />
      <T v="h1">Selamat pagi, {u.name.split(' ')[0]}.</T>
      <Gap h={space.s} />
      <Countdown />
      <Gap h={space.xl} />
      <DelayAlert />
      {order ? <ConfirmedPanel /> : s.cutoffPassed ? (
        <Card tone="sunk"><T v="h2">No lunch ordered today</T><T v="small">The 10:30 am cutoff has passed. Tomorrow's menu opens at 4 pm.</T></Card>
      ) : null}
      {order && <Gap h={space.xl} />}
      <SpotCard />
      {!order && !s.cutoffPassed && <>
        <Gap h={space.xxl} />
        <Row style={{ justifyContent: 'space-between' }}><T v="label">Today's menu</T><T v="small">Company pays up to {rm(ALLOWANCE_SEN)}</T></Row>
        <Gap h={space.m} />
        {today.map(d => {
          const c = s.caterers.find(x => x.id === d.catererId)!; const on = sel === d.id;
          const extra = topUpSen(d.priceSen); const blocked = extra > 0 && !s.topUpsAllowed;
          if (blocked) return (
            <View key={d.id} testID={`dish-${d.id}-blocked`} style={{ borderWidth: 1, borderColor: color.line, borderRadius: radius.m, padding: space.l, marginBottom: space.m, opacity: 0.55 }}>
              <Row style={{ justifyContent: 'space-between' }}><T v="h2">{d.name}</T><T v="num">{rm(d.priceSen)}</T></Row>
              <T v="small" style={{ marginTop: 2 }}>Over your {rm(ALLOWANCE_SEN)} allowance. Your office has top-ups switched off.</T>
            </View>
          );
          return (
            <Pressable key={d.id} testID={`dish-${d.id}`} onPress={() => setSel(d.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ borderWidth: on ? 2 : 1, borderColor: on ? color.ink : color.line, borderRadius: radius.m, padding: on ? space.l - 1 : space.l, backgroundColor: color.surface, marginBottom: space.m }}>
              <Row style={{ alignItems: 'flex-start', gap: space.m }}>
                <View style={{ flex: 1 }}>
                  <T v="h2">{d.name}</T>
                  <T v="small" style={{ marginTop: 2 }}>{d.description}</T>
                  <Row style={{ gap: space.s, marginTop: space.s, flexWrap: 'wrap' }}>
                    <T v="small" style={{ color: color.ink2 }}>{c.name}</T>
                    {c.halalCertOnFile ? <Badge label="Halal cert on file" tone="accent" /> : null}
                    {d.tags.map(t => <Badge key={t} label={t} />)}
                    {extra > 0 && <Badge label={`You add ${rm(extra)}`} tone="warn" />}
                  </Row>
                </View>
                <View style={{ alignItems: 'flex-end', gap: space.s }}>
                  <T v="num" style={{ fontFamily: font.bodyStrong }}>{rm(d.priceSen)}</T>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? color.ink : color.line, backgroundColor: on ? color.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={14} c={color.onInk} w={3} />}</View>
                </View>
              </Row>
            </Pressable>
          );
        })}
        <Gap h={space.s} />
        <Button testID="place-order" label={sel ? (topUpSen(dish(s, sel).priceSen) ? `Order · you top up ${rm(topUpSen(dish(s, sel).priceSen))}` : `Order ${dish(s, sel).name}`) : 'Choose a dish'} disabled={!sel} onPress={() => { if (sel) { dispatch({ t: 'order', dishId: sel }); askPermission(); } }} />
        <Gap h={space.s} />
        <T v="small" style={{ textAlign: 'center' }}>Your order goes in with one tap and no checkout. You can change it until 10:30 am.</T>
      </>}
      {order && <>
        <Gap h={space.xl} /><Divider /><Gap h={space.l} />
        <T v="small">Your lunch arrives in one drop with the rest of your office's orders, so you pay no delivery fee.</T>
      </>}
    </Screen>
  );
}

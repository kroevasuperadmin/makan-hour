import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { dish, hhmm, officeOrders, useStore } from '@makan/core';
import { Badge, Button, Card, color, Divider, font, Gap, Icon, radius, Row, Screen, Segmented, space, T } from '@makan/ui';

function Batch({ catererId, setCaterer }: { catererId: string; setCaterer: (c: string) => void }) {
  const { s, dispatch } = useStore();
  const c = s.caterers.find(x => x.id === catererId)!;
  const mine = s.orders.filter(o => dish(s, o.dishId).catererId === catererId);
  const myDishes = s.dishes.filter(d => d.catererId === catererId);
  return (
    <>
      <Segmented testPrefix="caterer" value={catererId} onChange={setCaterer} items={s.caterers.map(x => ({ key: x.id, label: x.name.split(' ').slice(0, 2).join(' ') }))} />
      <Gap h={space.xl} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label">{c.name} · Thu 22 Oct</T>
        {s.batchConfirmed ? <Badge label="Confirmed" tone="accent" /> : s.cutoffPassed ? <Badge label="Final" tone="info" /> : <Badge label="Provisional" tone="warn" />}
      </Row>
      <Gap h={space.s} />
      <Row style={{ alignItems: 'flex-end', gap: space.s }}><T v="hero" testID="batch-total">{mine.length}</T><T v="body" style={{ marginBottom: 6 }}>meals · {s.offices.filter(o => mine.some(m => m.officeId === o.id)).length} offices · pickup 11:30 am</T></Row>
      {!s.cutoffPassed && <T v="small" style={{ color: color.warn, marginTop: space.xs }}>These numbers can still change. The final list locks at 10:30 am.</T>}
      <Gap h={space.xl} />
      <T v="label">Cook list</T><Gap h={space.s} />
      <Card style={{ paddingVertical: space.xs }}>
        {myDishes.map((d, i) => (
          <View key={d.id}>{i > 0 && <Divider />}
            <Row style={{ paddingVertical: space.m }}>
              <T v="body" style={{ flex: 1, color: color.ink, fontFamily: font.semi }}>{d.name}</T>
              <T v="num" style={{ fontSize: 34, lineHeight: 36 }} testID={`count-${d.id}`}>{mine.filter(o => o.dishId === d.id).length}</T>
            </Row>
          </View>
        ))}
      </Card>
      <Gap h={space.xl} />
      <T v="label">By office drop</T><Gap h={space.s} />
      {s.offices.map(o => {
        const oo = mine.filter(m => m.officeId === o.id); if (!oo.length) return null;
        return (
          <Card key={o.id} style={{ marginBottom: space.m }}>
            <Row style={{ gap: space.m, alignItems: 'flex-start' }}>
              <View style={{ width: 36, height: 36, borderRadius: radius.s, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}><T v="h2" style={{ color: color.onInk }}>{o.dropCode}</T></View>
              <View style={{ flex: 1 }}>
                <T v="h2">{o.company}</T>
                <T v="small">{o.building} · {o.dropSpot}</T>
                <Gap h={space.s} />
                <T v="body" style={{ color: color.ink }}>{myDishes.map(d => [d, oo.filter(x => x.dishId === d.id).length] as const).filter(([, n]) => n).map(([d, n]) => `${n} × ${d.name}`).join('\n')}</T>
              </View>
              <T v="num" style={{ fontFamily: font.bodyStrong }}>{oo.length}</T>
            </Row>
          </Card>
        );
      })}
      <Gap h={space.l} />
      {s.batchConfirmed ? (
        <Card tone="accent"><Row style={{ gap: space.s }}><Icon name="check" size={18} c={color.accent} /><T v="body" style={{ color: color.accent, fontFamily: font.semi }}>Batch confirmed at 10:41 am. Rider arrives 11:30 am.</T></Row></Card>
      ) : (
        <Button testID="confirm-batch" label={s.cutoffPassed ? 'Confirm batch' : 'Confirm opens at 10:30 am'} disabled={!s.cutoffPassed} onPress={() => dispatch({ t: 'confirmBatch' })} />
      )}
    </>
  );
}

// Labels render as the printed sticker would look: paper, black ink.
const PAPER = '#F4F1EA', INK = '#161513';
function Labels({ catererId }: { catererId: string }) {
  const { s } = useStore();
  const mine = s.orders.filter(o => dish(s, o.dishId).catererId === catererId)
    .sort((a, b) => a.officeId.localeCompare(b.officeId) || a.dishId.localeCompare(b.dishId));
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <View><T v="label">Bag labels</T><T v="h1">{mine.length} labels</T></View>
        <Button kind="secondary" icon="printer" label="Print PDF" onPress={() => {}} testID="print-labels" />
      </Row>
      <T v="small">Sorted by drop, then dish. Each bag carries name, floor and desk.</T>
      <Gap h={space.xl} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
        {mine.map((o, i) => {
          const e = s.employees.find(x => x.id === o.employeeId)!; const off = s.offices.find(x => x.id === o.officeId)!;
          return (
            <View key={o.id} testID={i === 0 ? 'label-first' : undefined} style={{ width: '48.5%', borderWidth: 1, borderColor: e.id === 'me' ? color.warn : PAPER, borderRadius: radius.s, padding: space.m, backgroundColor: PAPER }}>
              <Row style={{ justifyContent: 'space-between' }}><T v="label" style={{ color: INK }}>Drop {off.dropCode}</T><T v="small" style={{ fontFamily: font.mono, color: INK }}>{String(i + 1).padStart(3, '0')}</T></Row>
              <Gap h={space.s} />
              <T v="h2" numberOfLines={1} style={{ color: INK }}>{e.name}</T>
              <T v="small" numberOfLines={1} style={{ color: '#4A4741' }}>{e.floor} · {e.desk}</T>
              <Gap h={space.s} />
              <T v="small" style={{ color: INK, fontFamily: font.semi }} numberOfLines={1}>{dish(s, o.dishId).name}</T>
            </View>
          );
        })}
      </View>
    </>
  );
}

const STAGES = ['Awaiting cutoff', 'Batch confirmed', 'Preparing', 'Out for delivery', 'Delivered'];
function Drops() {
  const { s, dispatch } = useStore();
  return (
    <>
      <T v="label">Ops · drop tracker</T>
      <T v="h1">{s.drops.length} drops today</T>
      <T v="small">One rider stop per office. If an ETA slips, staff get an alert straight away, before the food is due.</T>
      <Gap h={space.xl} />
      {s.drops.map(d => {
        const o = s.offices.find(x => x.id === d.officeId)!; const n = officeOrders(s, o.id).length;
        const eta = d.dueAt + d.delayMin * 60;
        return (
          <Card key={o.id} style={{ marginBottom: space.l }}>
            <Row style={{ gap: space.m }}>
              <View style={{ width: 36, height: 36, borderRadius: radius.s, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}><T v="h2" style={{ color: color.onInk }}>{o.dropCode}</T></View>
              <View style={{ flex: 1 }}><T v="h2" numberOfLines={1}>{o.company}</T><T v="small">{n} meals · {d.rider}</T></View>
              <View style={{ alignItems: 'flex-end' }}><T v="label">{d.stage === 4 ? 'Arrived' : 'ETA'}</T><T v="num" style={{ fontFamily: font.bodyStrong, color: d.delayMin && d.stage < 4 ? color.warn : color.ink }}>{hhmm(d.stage === 4 ? d.deliveredAt! : eta)}</T></View>
            </Row>
            <Gap h={space.l} />
            <Row style={{ gap: 3 }}>{[1, 2, 3, 4].map(k => <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: d.stage >= k ? (k === 4 ? color.accent : color.ink) : color.sunk }} />)}</Row>
            <Gap h={space.s} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong }} testID={`stage-${o.id}`}>{STAGES[d.stage]}</T>
              {d.delayMin > 0 && d.stage < 4 && <Badge label={`+${d.delayMin} min · staff alerted`} tone="warn" />}
              {d.stage === 4 && <Badge label="Photo + count signed" tone="accent" />}
            </Row>
            {d.delayMin > 0 && d.stage < 4 && <T v="small" style={{ color: color.warn, marginTop: space.xs }}>Alert sent {hhmm(d.delayNotifiedAt!)} to {n} people and the office admin, {Math.round((d.dueAt - d.delayNotifiedAt!) / 60)} min before due.</T>}
            {d.stage >= 1 && d.stage < 4 && <>
              <Gap h={space.l} />
              <Row style={{ gap: space.s }}>
                <Button testID={`advance-${o.id}`} style={{ flex: 1 }} label={d.stage === 3 ? 'Mark delivered' : `Mark ${STAGES[d.stage + 1].toLowerCase()}`} kind={d.stage === 3 ? 'accent' : 'primary'} onPress={() => dispatch({ t: 'advance', officeId: o.id })} />
                {d.stage === 3 && d.delayMin === 0 && <Button testID={`delay-${o.id}`} kind="secondary" icon="alert" label="Traffic +12" onPress={() => dispatch({ t: 'delay', officeId: o.id, minutes: 12 })} />}
              </Row>
            </>}
            {d.stage === 0 && <T v="small" style={{ marginTop: space.m }}>Starts when the caterer confirms the batch.</T>}
          </Card>
        );
      })}
    </>
  );
}

export type KitchenTab = 'batch' | 'labels' | 'drops';
export default function Kitchen({ tab, cat, setCat }: { tab: KitchenTab; cat: string; setCat: (c: string) => void }) {
  return <Screen>{tab === 'batch' ? <Batch catererId={cat} setCaterer={setCat} /> : tab === 'labels' ? <Labels catererId={cat} /> : <Drops />}</Screen>;
}

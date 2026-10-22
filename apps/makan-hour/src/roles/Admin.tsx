import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { ALLOWANCE_SEN, CUTOFF, dish, hhmm, me, officeOrders, rm, topUpSen, useStore } from '@makan/core';
import PayButton from '../PayButton';
import { useAlertOnChange, useRegisterPush } from '../notify';
import { Badge, Bar, Button, Card, color, Divider, font, Gap, Icon, radius, Row, Screen, Segmented, space, T } from '@makan/ui';

function Today() {
  const { s, dispatch } = useStore();
  const office = s.offices.find(o => o.id === me(s).officeId)!;
  const orders = officeOrders(s, office.id);
  // The company only pays up to the allowance; anything above is the employee's top-up.
  const spend = orders.reduce((a, o) => a + Math.min(ALLOWANCE_SEN, dish(s, o.dishId).priceSen), 0);
  const topUps = orders.filter(o => topUpSen(dish(s, o.dishId).priceSen) > 0);
  const staff = s.employees.filter(e => e.officeId === office.id);
  const missing = staff.filter(e => !orders.some(o => o.employeeId === e.id));
  const notNudged = missing.filter(e => !s.nudged.includes(e.id));
  const drop = s.drops.find(d => d.officeId === office.id)!;
  const left = Math.max(0, CUTOFF - s.clock);
  useRegisterPush('admin');
  useAlertOnChange(drop.delayNotifiedAt ? `${drop.delayNotifiedAt}-${drop.delayMin}` : null, `Lunch drop ${drop.delayMin} min late`, `${office.dropSpot}: new time ${hhmm(drop.dueAt + drop.delayMin * 60)}. Staff have been told.`, drop.stage < 4);
  return (
    <>
      <T v="label">{office.company}</T>
      <Gap h={space.s} />
      <T v="h1">Lunch today</T>
      <T v="small">{office.building} · drop at {office.dropSpot}</T>
      <Gap h={space.xl} />
      <View style={{ flexDirection: 'row', gap: space.m }}>
        <Card style={{ flex: 1 }}>
          <T v="label">Ordered</T><Gap h={space.s} />
          <Row style={{ alignItems: 'flex-end', gap: space.xs }}><T v="hero" testID="headcount">{orders.length}</T><T v="body" style={{ marginBottom: 6 }}>/ {staff.length}</T></Row>
          <Gap h={space.s} /><Bar pct={orders.length / staff.length} tone={color.accent} />
        </Card>
        <Card style={{ flex: 1 }}>
          <T v="label">Spend today</T><Gap h={space.s} />
          <T v="hero" style={{ fontSize: 26, lineHeight: 36 }} numberOfLines={1} testID="spend">{rm(spend).replace('RM ', 'RM')}</T>
          <Gap h={space.s} /><Bar pct={spend / office.dailyBudgetSen} tone={spend > office.dailyBudgetSen ? color.danger : color.ink} />
          <T v="small" style={{ marginTop: space.xs }}>of {rm(office.dailyBudgetSen)} budget</T>
        </Card>
      </View>
      <Gap h={space.m} />
      <Card>
        <Row style={{ gap: space.m }}>
          <View style={{ flex: 1 }}>
            <T v="h2">Allowance {rm(ALLOWANCE_SEN)} per person</T>
            <T v="small">{s.topUpsAllowed ? `Top-ups on. Staff pay the difference themselves, by FPX or card. ${topUps.length} today.` : 'Top-ups off. Staff only see dishes within the allowance.'}</T>
          </View>
          <Pressable testID="toggle-topups" accessibilityRole="switch" accessibilityState={{ checked: s.topUpsAllowed }} onPress={() => dispatch({ t: 'topups', on: !s.topUpsAllowed })}
            style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: s.topUpsAllowed ? color.accent : color.sunk, alignItems: s.topUpsAllowed ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color.surface }} />
          </Pressable>
        </Row>
      </Card>
      <Gap h={space.m} />
      <Card tone={s.cutoffPassed ? 'sunk' : 'warn'}>
        <Row style={{ gap: space.s }}>
          <Icon name={s.cutoffPassed ? 'lock' : 'clock'} size={18} c={s.cutoffPassed ? color.ink2 : color.warn} />
          <T v="body" style={{ flex: 1, color: s.cutoffPassed ? color.ink2 : color.warn, fontFamily: font.semi }}>
            {s.cutoffPassed ? `Locked at 10:30 am. ${orders.length} meals sent to caterers as one drop.` : `Cutoff 10:30 am · ${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m left`}
          </T>
        </Row>
      </Card>
      {!s.cutoffPassed && <><Gap h={space.m} /><Button testID="simulate-cutoff" icon="lock" label="Run the 10:30 am cutoff now" onPress={() => dispatch({ t: 'cutoff' })} /></>}
      {s.cutoffPassed && <><Gap h={space.m} /><Card>
        <Row style={{ gap: space.m }}><Icon name="truck" size={20} /><View style={{ flex: 1 }}>
          <T v="h2">{['Waiting for caterer', 'Caterer confirmed', 'Preparing', 'Out for delivery', 'Delivered'][drop.stage]}</T>
          <T v="small">{drop.stage === 4 ? `Arrived ${hhmm(drop.deliveredAt!)}` : `Due ${hhmm(drop.dueAt + drop.delayMin * 60)}`}{drop.delayMin && drop.stage < 4 ? ` · ${drop.delayMin} min late, staff already told` : ''}</T>
        </View></Row>
      </Card></>}
      <Gap h={space.xxl} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="label">Not ordered yet · {missing.length}</T>
        {!s.cutoffPassed && notNudged.length > 0 && <Pressable testID="nudge-all" onPress={() => dispatch({ t: 'nudge', ids: notNudged.map(e => e.id) })} hitSlop={10}><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>Nudge all</T></Pressable>}
      </Row>
      <Gap h={space.s} />
      <Card style={{ paddingVertical: space.xs }}>
        {missing.length === 0 && <T v="small" style={{ paddingVertical: space.m }}>Everyone has ordered.</T>}
        {missing.map((e, i) => (
          <View key={e.id}>
            {i > 0 && <Divider />}
            <Row style={{ paddingVertical: space.m, gap: space.m }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color.sunk, alignItems: 'center', justifyContent: 'center' }}><T v="small" style={{ color: color.ink2, fontFamily: font.bodyStrong }}>{e.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</T></View>
              <View style={{ flex: 1 }}><T v="body" style={{ color: color.ink, fontFamily: font.semi }}>{e.name}</T><T v="small">{e.floor} · {e.desk}</T></View>
              {s.cutoffPassed ? <Badge label="Missed" /> : s.nudged.includes(e.id) ? <Badge label="Reminded" tone="accent" /> :
                <Pressable testID={`nudge-${e.id}`} onPress={() => dispatch({ t: 'nudge', ids: [e.id] })} style={{ backgroundColor: color.sunk, borderRadius: radius.s, paddingHorizontal: space.m, minHeight: 44, justifyContent: 'center' }}>
                  <Row style={{ gap: space.xs }}><Icon name="bell" size={14} /><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong }}>Nudge</T></Row>
                </Pressable>}
            </Row>
          </View>
        ))}
      </Card>
      <Gap h={space.xxl} />
      <T v="label">Month to date</T><Gap h={space.s} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><T v="body">October spend</T><T v="num">{rm(783200 + spend)}</T></Row>
        <Gap h={space.s} /><Bar pct={(783200 + spend) / office.monthlyBudgetSen} />
        <T v="small" style={{ marginTop: space.xs }}>{Math.round(((783200 + spend) / office.monthlyBudgetSen) * 100)}% of {rm(office.monthlyBudgetSen)} monthly budget · 7 working days left</T>
      </Card>
    </>
  );
}

const banks = ['Sandbox Bank Berhad (Corporate)', 'Test Islamic Bank (Business)', 'Demo Commerce Bank (B2B)'];

function Invoice() {
  const { s, dispatch } = useStore();
  const [step, setStep] = useState<'invoice' | 'bank' | 'approve'>('invoice');
  const [bank, setBank] = useState<string | null>(null);
  const inv = s.invoice; const office = s.offices.find(o => o.id === inv.officeId)!;
  const total = inv.lines.reduce((a, l) => a + l.amountSen, 0);
  if (step === 'bank' || step === 'approve') return (
    <>
      <View testID="sandbox-banner" style={{ padding: space.m, backgroundColor: color.warnSoft }}>
        <Row style={{ gap: space.s }}><Icon name="alert" size={18} c={color.warn} /><T v="h2" style={{ color: color.warn }}>Payment sandbox · no real money</T></Row>
        <T v="small" style={{ color: color.warn }}>A mock of an FPX B2B (corporate internet banking) flow. No bank is contacted, and the bank names are made up.</T>
      </View>
      <Gap h={space.xl} />
      <T v="label">FPX B2B · Corporate account</T><Gap h={space.s} />
      <T v="h1">{rm(total)}</T>
      <T v="small">To Makan Hour Sdn Bhd (demo) · {inv.id}</T>
      <Gap h={space.xl} />
      {step === 'bank' ? <>
        <T v="label">Choose your bank</T><Gap h={space.s} />
        {banks.map(b => (
          <Pressable key={b} testID={`bank-${banks.indexOf(b)}`} onPress={() => setBank(b)} style={{ padding: space.l, marginBottom: space.s, backgroundColor: bank === b ? color.ink : color.surface }}>
            <Row style={{ gap: space.m }}><Icon name="building" size={18} c={bank === b ? color.onInk : color.ink} /><T v="body" style={{ flex: 1, color: bank === b ? color.onInk : color.ink, fontFamily: font.semi }}>{b}</T>{bank === b && <Icon name="check" size={18} c={color.onInk} />}</Row>
          </Pressable>
        ))}
        <Gap h={space.l} />
        <Button testID="to-approve" label="Continue to bank" disabled={!bank} onPress={() => setStep('approve')} />
        <Gap h={space.s} /><Button kind="ghost" label="Back to invoice" onPress={() => setStep('invoice')} />
      </> : <>
        <Card>
          <T v="label">{bank}</T><Gap h={space.m} />
          <Row style={{ justifyContent: 'space-between' }}><T v="body">Maker</T><T v="body" style={{ color: color.ink }}>Nadia Osman (Finance)</T></Row>
          <Gap h={space.s} /><Row style={{ justifyContent: 'space-between' }}><T v="body">Checker</T><T v="body" style={{ color: color.ink }}>Lokman Zainal (CFO)</T></Row>
          <Gap h={space.s} /><Row style={{ justifyContent: 'space-between' }}><T v="body">Debit from</T><T v="num">xxxx-xxxx-4410</T></Row>
        </Card>
        <Gap h={space.l} />
        <Button testID="approve-pay" kind="accent" icon="shield" label="Approve sandbox payment" onPress={() => { dispatch({ t: 'pay', via: `FPX B2B · ${bank}`, ref: 'SBX-FPX-2026103100417' }); setStep('invoice'); }} />
        <Gap h={space.s} /><Button kind="ghost" label="Cancel" onPress={() => setStep('bank')} />
      </>}
    </>
  );
  return (
    <>
      <T v="label">Monthly invoice</T><Gap h={space.s} />
      <T v="h1">{inv.period}</T>
      <T v="small">{office.company} · one invoice for every lunch this month</T>
      <Gap h={space.xl} />
      {inv.status === 'paid' && <><View testID="paid-panel" style={{ backgroundColor: color.accent, borderRadius: radius.m, padding: space.xl }}>
        <Row style={{ gap: space.s }}><Icon name="check" size={18} c={color.onAccent} w={2.5} /><T v="label" style={{ color: color.onAccentMuted }}>Paid · sandbox</T></Row>
        <Gap h={space.s} /><T v="hero" style={{ color: color.onAccent }}>{rm(total)} settled.</T>
        <Gap h={space.s} /><T v="small" style={{ color: color.onAccent, opacity: 0.85 }}>{inv.paidVia}</T><T v="num" style={{ color: color.onAccent, fontSize: 13 }}>Ref {inv.paidRef}</T>
      </View><Gap h={space.xl} /></>}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><T v="num" style={{ fontSize: 13 }}>{inv.id}</T><Badge label={inv.status === 'paid' ? 'Paid' : `Due ${inv.dueOn}`} tone={inv.status === 'paid' ? 'accent' : 'warn'} /></Row>
        <Gap h={space.l} />
        {inv.lines.map(l => (
          <View key={l.label} style={{ marginBottom: space.m }}>
            <Row style={{ justifyContent: 'space-between' }}><T v="body" style={{ color: color.ink, fontFamily: font.semi }}>{l.label}</T><T v="num">{l.amountSen < 0 ? '– ' : ''}{rm(Math.abs(l.amountSen))}</T></Row>
            <T v="small">{l.detail}</T>
          </View>
        ))}
        <Divider /><Gap h={space.m} />
        <Row style={{ justifyContent: 'space-between' }}><T v="h2">Total</T><T v="num" style={{ fontSize: 18, fontFamily: font.bodyStrong }}>{rm(total)}</T></Row>
        <T v="small" style={{ marginTop: space.xs }}>Issued {inv.issuedOn}. Per-employee average {rm(Math.round(total / 612))} per meal, delivery included.</T>
      </Card>
      <Gap h={space.xl} />
      {inv.status === 'unpaid' && <PayButton testID="pay-invoice" kind="invoice" payRef={inv.id} amountSen={total} email="finance@example.com"
        description={`Makan Hour invoice ${inv.id} (${inv.period})`} label={`Pay ${rm(total)} by FPX or card`}
        onPaid={(ref, m) => dispatch({ t: 'pay', via: `Stripe · ${m === 'fpx' ? 'FPX' : m === 'card' ? 'Card' : 'online'}`, ref })} onUnavailable={() => setStep('bank')} />}
      <T v="small" style={{ marginTop: space.s }}>Staff top-ups above the allowance are paid by staff and never appear on this invoice.</T>
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<'today' | 'invoice'>('today');
  const { width } = useWindowDimensions();
  if (width >= 820) return (
    <View style={{ flexDirection: 'row', gap: space.xxl, paddingHorizontal: space.xxl, paddingTop: space.xl, paddingBottom: space.xxxl }}>
      <View style={{ flex: 1.2 }}><Today /></View>
      <View style={{ flex: 1 }}><Invoice /></View>
    </View>
  );
  return (
    <Screen>
      <Segmented testPrefix="admin-tab" value={tab} onChange={setTab} items={[{ key: 'today', label: 'Today' }, { key: 'invoice', label: 'Invoice' }]} />
      <Gap h={space.xl} />
      {tab === 'today' ? <Today /> : <Invoice />}
    </Screen>
  );
}

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, color, font, Gap, Icon, IconName, radius, Row, space, T } from '@makan/ui';
import { hhmm, me, myOrder, useStore } from '@makan/core';
import Employee from './roles/Employee';
import Admin from './roles/Admin';
import Kitchen, { KitchenTab } from './roles/Kitchen';
import { Wordmark } from './Wordmark';
import { Account } from './accounts';
import Team, { SampleNote } from './Team';
import { DeleteAccount } from './DeleteAccount';

type P = { account: Account; onSignOut: () => void };
const LiveDot = () => { const { s } = useStore(); return <View testID="live-dot" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.connected ? color.accent : color.faint }} />; };
const SignOut = ({ onPress, c }: { onPress: () => void; c: string }) => (
  <Pressable testID="sign-out" onPress={onPress} hitSlop={10} accessibilityLabel="Sign out"><T v="small" style={{ color: c, fontFamily: font.semi, textDecorationLine: 'underline' }}>Sign out</T></Pressable>
);

export function EmployeeShell({ account, onSignOut }: P) {
  const { s } = useStore();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <StatusBar style="dark" />
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.l }}>
        <Wordmark />
        <Row style={{ gap: space.m }}>
          <Row style={{ gap: space.s }}><LiveDot /><T v="num" style={{ fontSize: 13 }} testID="clock">{hhmm(s.clock)}</T></Row>
          <DeleteAccount account={account} onDone={onSignOut} c={color.muted} />
          <SignOut onPress={onSignOut} c={color.muted} />
        </Row>
      </Row>
      <ScrollView key={`${!!myOrder(s)}-${s.cutoffPassed}`} style={{ flex: 1 }}>{account.real && <SampleNote account={account} />}<Employee /></ScrollView>
    </SafeAreaView>
  );
}

export function AdminShell({ account, onSignOut }: P) {
  const { s, dispatch } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const office = s.offices.find(o => o.id === me(s).officeId)!;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.ink }} edges={['top']}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: color.ink, paddingHorizontal: space.xl, paddingVertical: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          {/* Hold the wordmark for 1.5 s to reset the shared demo. Hidden on purpose. */}
          <Pressable testID="brand" delayLongPress={1500} onLongPress={() => setResetOpen(true)}>
            <Wordmark role="Admin" tone="light" roleFont={font.bodyStrong} />
          </Pressable>
          <Row style={{ gap: space.m }}>
            <Row style={{ gap: space.s }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.connected ? '#7FC29A' : color.faint }} /><T v="num" style={{ fontSize: 13, color: color.onInk }} testID="clock">{hhmm(s.clock)}</T></Row>
            <SignOut onPress={onSignOut} c={color.faint} />
          </Row>
        </Row>
        <Row style={{ justifyContent: 'space-between', gap: space.m, marginTop: 2 }}>
          <T v="small" style={{ color: color.faint, flexShrink: 1 }}>{account.name} · {account.real ? account.org : office.company} · Thu 22 Oct 2026</T>
          <DeleteAccount account={account} onDone={onSignOut} c={color.faint} />
        </Row>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: color.canvas }}>{account.real && <><Gap h={space.xl} /><Team account={account} /><SampleNote account={account} /></>}<Admin /></ScrollView>
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,15,20,0.45)', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: color.surface, borderRadius: radius.m, padding: space.xl, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
            <T v="h1" style={{ fontSize: 24 }}>Reset the demo?</T>
            <Gap h={space.s} />
            <T v="body">This clears the order, nudges, cutoff, drops and invoice payment for everyone signed in, and sets the clock back to 9:18 am.</T>
            <Gap h={space.xl} />
            <Button testID="confirm-reset" label="Reset the demo" onPress={() => { dispatch({ t: 'reset' }); setResetOpen(false); }} />
            <Gap h={space.s} />
            <Button kind="ghost" label="Keep going" onPress={() => setResetOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const TABS: { key: KitchenTab; label: string; icon: IconName }[] = [
  { key: 'batch', label: 'Batch', icon: 'bowl' }, { key: 'labels', label: 'Labels', icon: 'printer' }, { key: 'drops', label: 'Drops', icon: 'truck' },
];
export function KitchenShell({ account, onSignOut }: P) {
  const { s } = useStore();
  const [tab, setTab] = useState<KitchenTab>('batch');
  const [cat, setCat] = useState('c1');
  const c = s.caterers.find(x => x.id === cat)!;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.l }}>
        <View>
          <Wordmark role="Kitchen" tone="dark" roleFont={font.display} />
          <T v="small" style={{ marginTop: space.xs }}>{tab === 'drops' ? 'Ops · all drops' : c.name}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="num" style={{ fontSize: 26, lineHeight: 28 }} testID="clock">{hhmm(s.clock)}</T>
          <Row style={{ gap: space.m }}>
            <Row style={{ gap: space.xs }}><LiveDot /><T v="small">{s.connected ? 'Live' : 'Offline'}</T></Row>
            <SignOut onPress={onSignOut} c={color.muted} />
          </Row>
          <View style={{ marginTop: space.xs }}><DeleteAccount account={account} onDone={onSignOut} c={color.muted} /></View>
        </View>
      </Row>
      <ScrollView style={{ flex: 1 }}>{account.real && <SampleNote account={account} />}<Kitchen tab={tab} cat={cat} setCat={setCat} /></ScrollView>
      <Row style={{ backgroundColor: color.surface }}>
        {TABS.map(t => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} testID={`cat-tab-${t.key}`} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: space.m, gap: space.xs, borderTopWidth: 3, borderTopColor: on ? color.warn : 'transparent' }}>
              <Icon name={t.icon} size={20} c={on ? color.ink : color.muted} />
              <T v="label" style={{ color: on ? color.ink : color.muted }}>{t.label}</T>
            </Pressable>
          );
        })}
      </Row>
    </SafeAreaView>
  );
}

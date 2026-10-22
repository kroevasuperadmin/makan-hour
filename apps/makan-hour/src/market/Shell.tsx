import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { checkoutStatus, openDemoOn, useMarket } from '@makan/core';
import { color, font, Gap, Row, Segmented, space, T } from '@makan/ui';
import { Wordmark } from '../Wordmark';
import { Account, MarketSide } from '../accounts';
import Customer from './Customer';
import Vendor from './Vendor';
import Rider from './Rider';
import MarketAdmin from './Admin';

const roleWord = (role: Account['role']) => role === 'vendor' ? 'Vendor' : role === 'rider' ? 'Rider' : role === 'admin' ? 'Admin' : 'Customer';

const SIDES: { key: MarketSide; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'rider', label: 'Rider' },
  { key: 'admin', label: 'Admin' },
];

export function MarketShell({ account, onSignOut, onSwitchRole }: { account: Account; onSignOut: () => void; onSwitchRole?: (role: MarketSide) => void }) {
  const { goLive, refresh } = useMarket();
  const admin = account.role === 'admin';
  const word = roleWord(account.role);
  const demo = openDemoOn();
  const side: MarketSide = account.role === 'vendor' || account.role === 'rider' || account.role === 'admin' ? account.role : 'customer';
  useEffect(() => {
    if (demo || !account.real) return;
    const stop = goLive();
    if (typeof window !== 'undefined') {
      const paid = new URLSearchParams(window.location.search).get('paid');
      if (paid && paid.startsWith('cs_')) checkoutStatus(paid).then(() => refresh()).catch(() => {});
    }
    return stop;
  }, [account.real, account.email, demo, goLive, refresh]);
  return (
    <SafeAreaView testID={`market-shell-${account.role === 'admin' ? 'admin' : account.role}`} style={{ flex: 1, backgroundColor: admin ? color.ink : color.canvas }} edges={['top', 'bottom']}>
      <StatusBar style={admin ? 'light' : 'dark'} />
      <View style={{ paddingHorizontal: space.xl, paddingVertical: space.m, borderBottomWidth: admin ? 0 : 1, borderBottomColor: color.line, backgroundColor: admin ? color.ink : color.canvas }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Wordmark role={word} tone={admin ? 'light' : 'dark'} roleFont={font.bodyStrong} />
            <T v="small" style={{ color: admin ? color.faint : color.muted, marginTop: 2 }}>{account.name} · {account.org}</T>
          </View>
          <Pressable testID="sign-out" onPress={onSignOut} hitSlop={10} accessibilityLabel="Sign out">
            <T v="small" style={{ color: admin ? color.faint : color.muted, fontFamily: font.semi, textDecorationLine: 'underline' }}>Sign out</T>
          </Pressable>
        </Row>
        <T testID="market-preview" v="small" style={{ color: admin ? color.faint : color.muted, marginTop: space.s }}>{demo ? 'Open demo. Sample kitchens on this device only. Office lists and saved orders stay hidden.' : account.real ? 'Signed in. Orders are saved. Payment is Stripe, by FPX or card.' : 'Preview on this device. No charge, and nothing is written to the database.'}</T>
      </View>
      {demo && onSwitchRole && (
        <View testID="role-switcher" style={{ paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.m, backgroundColor: color.canvas, borderBottomWidth: 1, borderBottomColor: color.line }}>
          <T v="label">Use as</T>
          <Gap h={space.s} />
          <Segmented testPrefix="role-switch" items={SIDES} value={side} onChange={onSwitchRole} />
        </View>
      )}
      <View style={{ flex: 1, backgroundColor: color.canvas }}>
        {account.role === 'customer' ? <Customer account={account} />
          : account.role === 'vendor' ? <Vendor account={account} />
          : account.role === 'rider' ? <Rider account={account} />
          : <MarketAdmin />}
      </View>
    </SafeAreaView>
  );
}

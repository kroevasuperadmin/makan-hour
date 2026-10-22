import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { checkoutStatus, isMarketDoor, marketplaceDbOn, useMarket } from '@makan/core';
import { color, font, Row, space, T } from '@makan/ui';
import { Wordmark } from '../Wordmark';
import { Account } from '../accounts';
import Customer from './Customer';
import Vendor from './Vendor';
import Rider from './Rider';
import MarketAdmin from './Admin';

const roleWord = (role: Account['role']) => role === 'vendor' ? 'Vendor' : role === 'rider' ? 'Rider' : role === 'admin' ? 'Admin' : 'Customer';

export function MarketShell({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const { goLive, refresh } = useMarket();
  const admin = account.role === 'admin';
  const word = roleWord(account.role);
  useEffect(() => {
    if (!account.real || !marketplaceDbOn() || !isMarketDoor(account.role)) return;
    const stop = goLive(account.role);
    if (typeof window !== 'undefined') {
      const paid = new URLSearchParams(window.location.search).get('paid');
      if (paid && paid.startsWith('cs_')) checkoutStatus(paid).then(() => refresh()).catch(() => {});
    }
    return stop;
  }, [account.real, account.role, account.email, goLive, refresh]);
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
        <T testID="market-preview" v="small" style={{ color: admin ? color.faint : color.muted, marginTop: space.s }}>{account.real ? 'Signed in. Orders are saved. Payment is Stripe, by FPX or card.' : 'Preview on this device. No charge, and nothing is written to the database.'}</T>
      </View>
      <View style={{ flex: 1, backgroundColor: color.canvas }}>
        {account.role === 'customer' ? <Customer account={account} />
          : account.role === 'vendor' ? <Vendor account={account} />
          : account.role === 'rider' ? <Rider account={account} />
          : <MarketAdmin />}
      </View>
    </SafeAreaView>
  );
}

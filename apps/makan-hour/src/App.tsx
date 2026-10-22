import './openDemoFlag';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { adminFonts, adminPalette, applyTheme, color, employeeFonts, employeePalette, kitchenFonts, kitchenPalette, riderPalette } from '@makan/ui';
import { MarketProvider, openDemoOn, setRealPayments, signOutReal, StoreProvider } from '@makan/core';
import SignIn from './SignIn';
import { AdminShell, EmployeeShell, KitchenShell } from './Shells';
import { MarketShell } from './market/Shell';
import { Account, accountAsSide, MarketSide, openDemoAccount } from './accounts';

// Office lunch keeps its three shells. The marketplace preview (customer, vendor, rider, admin)
// is a separate surface with its own in-memory store.
const THEMES = {
  signin: { p: employeePalette, f: employeeFonts, hero: 40, frame: '#E7E3DA', max: 440 },
  employee: { p: employeePalette, f: employeeFonts, hero: 40, frame: '#E7E3DA', max: 440 },
  customer: { p: employeePalette, f: employeeFonts, hero: 40, frame: '#E7E3DA', max: 440 },
  admin: { p: adminPalette, f: adminFonts, hero: 34, frame: '#DADDD7', max: 1100 },
  caterer: { p: kitchenPalette, f: kitchenFonts, hero: 60, frame: '#0B0B0A', max: 820 },
  vendor: { p: kitchenPalette, f: kitchenFonts, hero: 48, frame: '#0B0B0A', max: 820 },
  rider: { p: riderPalette, f: employeeFonts, hero: 40, frame: '#E6D9C8', max: 440 },
} as const;
type ThemeKey = keyof typeof THEMES;

function themeKey(account: Account | null): ThemeKey {
  if (!account) return 'signin';
  if (account.surface === 'market') {
    if (account.role === 'vendor') return 'vendor';
    if (account.role === 'rider') return 'rider';
    if (account.role === 'admin') return 'admin';
    return 'customer';
  }
  if (account.role === 'admin' || account.role === 'caterer' || account.role === 'employee') return account.role;
  return 'employee';
}

export default function App() {
  const [loaded] = useFonts({
    InstrumentSerif_400Regular: require('../assets/fonts/InstrumentSerif_400Regular.ttf'),
    Manrope_500Medium: require('../assets/fonts/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('../assets/fonts/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('../assets/fonts/Manrope_700Bold.ttf'),
    IBMPlexSans_400Regular: require('../assets/fonts/IBMPlexSans_400Regular.ttf'),
    IBMPlexSans_500Medium: require('../assets/fonts/IBMPlexSans_500Medium.ttf'),
    IBMPlexSans_600SemiBold: require('../assets/fonts/IBMPlexSans_600SemiBold.ttf'),
    IBMPlexMono_500Medium: require('../assets/fonts/IBMPlexMono_500Medium.ttf'),
    BarlowCondensed_600SemiBold: require('../assets/fonts/BarlowCondensed_600SemiBold.ttf'),
  });
  const [account, setAccount] = useState<Account | null>(null);
  const demo = openDemoOn();
  // Office shells read the shared lunch session. Open demo never mounts them.
  const shown = account && demo && account.surface !== 'market' ? openDemoAccount(account.email, account.name) : account;
  const key = themeKey(shown);
  const th = THEMES[key];
  applyTheme(th.p, th.f, th.hero); // synchronous, before this render's children read the tokens
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas }}><ActivityIndicator color={color.ink} /></View>;
  setRealPayments(!!shown?.real && !demo);
  const enter = (a: Account) => setAccount(demo && a.surface === 'office' ? openDemoAccount(a.email, a.name) : a);
  const switchRole = (role: MarketSide) => setAccount(prev => (prev ? accountAsSide(prev, role) : prev));
  const out = () => { if (shown?.real || demo) signOutReal(); setAccount(null); };
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <MarketProvider>
          <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? th.frame : color.canvas, alignItems: 'center' }}>
            <View key={key} style={{ flex: 1, width: '100%', maxWidth: th.max, backgroundColor: color.canvas }}>
              {!shown ? <SignIn onSignedIn={enter} />
                : shown.surface === 'market' ? <MarketShell account={shown} onSignOut={out} onSwitchRole={demo ? switchRole : undefined} />
                : shown.role === 'employee' ? <EmployeeShell account={shown} onSignOut={out} />
                : shown.role === 'admin' ? <AdminShell account={shown} onSignOut={out} />
                : <KitchenShell account={shown} onSignOut={out} />}
            </View>
          </View>
        </MarketProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

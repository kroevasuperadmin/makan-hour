import React, { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { adminFonts, adminPalette, applyTheme, color, employeeFonts, employeePalette, kitchenFonts, kitchenPalette } from '@makan/ui';
import { setRealPayments, signOutReal, StoreProvider } from '@makan/core';
import SignIn from './SignIn';
import { AdminShell, EmployeeShell, KitchenShell } from './Shells';
import { Account } from './accounts';

// One app, three experiences. Each role gets its own palette, type and navigation;
// the bowl mark and serif wordmark stay the same so it reads as one product.
const THEMES = {
  signin: { p: employeePalette, f: employeeFonts, hero: 40, frame: '#E7E3DA', max: 440 },
  employee: { p: employeePalette, f: employeeFonts, hero: 40, frame: '#E7E3DA', max: 440 },
  admin: { p: adminPalette, f: adminFonts, hero: 34, frame: '#DADDD7', max: 1100 },
  caterer: { p: kitchenPalette, f: kitchenFonts, hero: 60, frame: '#0B0B0A', max: 820 },
} as const;

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
  const key = account ? account.role : 'signin';
  const th = THEMES[key];
  applyTheme(th.p, th.f, th.hero); // synchronous, before this render's children read the tokens
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas }}><ActivityIndicator color={color.ink} /></View>;
  setRealPayments(!!account?.real);
  const out = () => { if (account?.real) signOutReal(); setAccount(null); };
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? th.frame : color.canvas, alignItems: 'center' }}>
          <View key={key} style={{ flex: 1, width: '100%', maxWidth: th.max, backgroundColor: color.canvas }}>
            {!account ? <SignIn onSignedIn={setAccount} />
              : account.role === 'employee' ? <EmployeeShell account={account} onSignOut={out} />
              : account.role === 'admin' ? <AdminShell account={account} onSignOut={out} />
              : <KitchenShell account={account} onSignOut={out} />}
          </View>
        </View>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

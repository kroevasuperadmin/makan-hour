import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { adminFonts, adminPalette, applyTheme, color, employeeFonts, employeePalette, kitchenFonts, kitchenPalette } from '@makan/ui';
import { MarketProvider, setRealPayments, signOutReal, StoreProvider } from '@makan/core';
import SignIn from './SignIn';
import { AdminShell, EmployeeShell, KitchenShell } from './Shells';
import { MarketShell } from './market/Shell';
import { Account } from './accounts';

// Office lunch keeps its three shells. The marketplace preview (customer, vendor, rider, admin)
// is a separate surface with its own in-memory store.
const THEMES = {
  signin: { p: employeePalette, f: employeeFonts, hero: 44, frame: '#E4DDD0', max: 440 },
  employee: { p: employeePalette, f: employeeFonts, hero: 44, frame: '#E4DDD0', max: 440 },
  customer: { p: employeePalette, f: employeeFonts, hero: 44, frame: '#E4DDD0', max: 440 },
  admin: { p: adminPalette, f: adminFonts, hero: 40, frame: '#D9DCD6', max: 1100 },
  caterer: { p: kitchenPalette, f: kitchenFonts, hero: 56, frame: '#0C0B0A', max: 820 },
  vendor: { p: kitchenPalette, f: kitchenFonts, hero: 48, frame: '#0C0B0A', max: 820 },
  rider: { p: kitchenPalette, f: employeeFonts, hero: 40, frame: '#0C0B0A', max: 440 },
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

function useWebChrome(canvas: string) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let style = document.getElementById('makan-chrome') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'makan-chrome';
      document.head.appendChild(style);
    }
    style.textContent = `
      html { -webkit-tap-highlight-color: transparent; }
      body { overscroll-behavior: none; background: ${canvas}; }
      input, textarea { font-size: 16px; }
      [role="button"], button { -webkit-user-select: none; user-select: none; touch-action: manipulation; }
      [role="button"]:focus-visible, button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
        outline: 2px solid #1A1814; outline-offset: 2px;
      }
      body::after {
        content: "";
        position: fixed; inset: 0; pointer-events: none; z-index: 40; opacity: 0.045;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        mix-blend-mode: multiply;
      }
    `;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', canvas);
  }, [canvas]);
}

export default function App() {
  const [loaded] = useFonts({
    InstrumentSerif_400Regular: require('../assets/fonts/InstrumentSerif_400Regular.ttf'),
    Manrope_500Medium: require('../assets/fonts/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('../assets/fonts/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('../assets/fonts/Manrope_700Bold.ttf'),
  });
  const [account, setAccount] = useState<Account | null>(null);
  const key = themeKey(account);
  const th = THEMES[key];
  applyTheme(th.p, th.f, th.hero); // synchronous, before this render's children read the tokens
  useWebChrome(th.p.canvas);
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas }}><ActivityIndicator color={color.ink} /></View>;
  setRealPayments(!!account?.real);
  const out = () => { if (account?.real) signOutReal(); setAccount(null); };
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <MarketProvider>
          <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? th.frame : color.canvas, alignItems: 'center' }}>
            <View key={key} style={{ flex: 1, width: '100%', maxWidth: th.max, backgroundColor: color.canvas }}>
              {!account ? <SignIn onSignedIn={setAccount} />
                : account.surface === 'market' ? <MarketShell account={account} onSignOut={out} />
                : account.role === 'employee' ? <EmployeeShell account={account} onSignOut={out} />
                : account.role === 'admin' ? <AdminShell account={account} onSignOut={out} />
                : <KitchenShell account={account} onSignOut={out} />}
            </View>
          </View>
        </MarketProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

import React from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { applyTheme, color, employeeFonts, employeePalette, font, Icon, Row, space, T } from '@makan/ui';
applyTheme(employeePalette, employeeFonts, 40);
import { hhmm, myOrder, StoreProvider, useStore } from '@makan/core';
import Employee from './Employee';

function Shell() {
  const { s } = useStore();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: color.line }}>
        <Row style={{ gap: space.s }}>
          <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="bowl" size={14} c={color.onInk} w={2.2} /></View>
          <T v="h2" style={{ fontFamily: font.display, fontSize: 22, letterSpacing: -0.3 }}>Makan Hour</T>
        </Row>
        <Row style={{ gap: space.s }}>
          <View testID="live-dot" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.connected ? color.accent : color.faint }} />
          <T v="small" style={{ fontFamily: font.mono, color: color.ink2 }} testID="clock">{hhmm(s.clock)}</T>
        </Row>
      </Row>
      <ScrollView key={`${!!myOrder(s)}-${s.cutoffPassed}`} style={{ flex: 1 }}><Employee /></ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    InstrumentSerif_400Regular: require('../assets/fonts/InstrumentSerif_400Regular.ttf'),
    Manrope_500Medium: require('../assets/fonts/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('../assets/fonts/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('../assets/fonts/Manrope_700Bold.ttf'),
  });
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas }}><ActivityIndicator color={color.ink} /></View>;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? color.sunk : color.canvas, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 440, backgroundColor: color.canvas }}><StoreProvider><Shell /></StoreProvider></View>
      </View>
    </SafeAreaProvider>
  );
}

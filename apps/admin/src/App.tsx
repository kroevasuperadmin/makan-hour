import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { adminFonts, adminPalette, applyTheme, Button, color, font, Gap, radius, Row, space, T } from '@makan/ui';
applyTheme(adminPalette, adminFonts, 34);
import { hhmm, me, StoreProvider, useStore } from '@makan/core';
import Admin from './Admin';

function Shell() {
  const { s, dispatch } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const office = s.offices.find(o => o.id === me(s).officeId)!;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>
      <View style={{ backgroundColor: color.ink, paddingHorizontal: space.xl, paddingVertical: space.m }}>
        <Row style={{ justifyContent: 'space-between' }}>
          {/* Long-press the wordmark for 1.5 s to reset the shared demo. Hidden on purpose. */}
          <Pressable testID="brand" delayLongPress={1500} onLongPress={() => setResetOpen(true)}>
            <Row style={{ gap: space.s }}>
              <View style={{ width: 22, height: 22, borderRadius: 3, borderWidth: 1.5, borderColor: color.onInk, alignItems: 'center', justifyContent: 'center' }}><T v="small" style={{ color: color.onInk, fontFamily: font.bodyStrong, fontSize: 12 }}>MH</T></View>
              <T v="h2" style={{ color: color.onInk, fontFamily: font.bodyStrong, fontSize: 16 }}>Makan Hour <T v="h2" style={{ color: color.faint, fontFamily: font.body, fontSize: 16 }}>Admin</T></T>
            </Row>
          </Pressable>
          <Row style={{ gap: space.s }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.connected ? '#7FC29A' : color.faint }} />
            <T v="small" style={{ color: color.onInk, fontFamily: font.mono }} testID="clock">{hhmm(s.clock)}</T>
          </Row>
        </Row>
        <T v="small" style={{ color: color.faint, marginTop: 2 }}>{office.company} · Thu 22 Oct 2026</T>
      </View>
      <ScrollView style={{ flex: 1 }}><Admin /></ScrollView>
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,15,20,0.45)', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: color.surface, borderRadius: radius.m, padding: space.xl, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
            <T v="h1" style={{ fontSize: 24 }}>Reset the demo?</T>
            <Gap h={space.s} />
            <T v="body">This clears the order, nudges, cutoff, drops and invoice payment on all three apps, and sets the clock back to 9:18 am.</T>
            <Gap h={space.xl} />
            <Button testID="confirm-reset" label="Reset all three apps" onPress={() => { dispatch({ t: 'reset' }); setResetOpen(false); }} />
            <Gap h={space.s} />
            <Button kind="ghost" label="Keep going" onPress={() => setResetOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    IBMPlexSans_400Regular: require('../assets/fonts/IBMPlexSans_400Regular.ttf'),
    IBMPlexSans_500Medium: require('../assets/fonts/IBMPlexSans_500Medium.ttf'),
    IBMPlexSans_600SemiBold: require('../assets/fonts/IBMPlexSans_600SemiBold.ttf'),
    IBMPlexMono_500Medium: require('../assets/fonts/IBMPlexMono_500Medium.ttf'),
  });
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas }}><ActivityIndicator color={color.ink} /></View>;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? color.sunk : color.canvas, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 1100, backgroundColor: color.canvas }}><StoreProvider><Shell /></StoreProvider></View>
      </View>
    </SafeAreaProvider>
  );
}

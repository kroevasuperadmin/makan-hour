import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { applyTheme, color, font, Icon, IconName, kitchenFonts, kitchenPalette, Row, space, T } from '@makan/ui';
applyTheme(kitchenPalette, kitchenFonts, 60);
import { hhmm, StoreProvider, useStore } from '@makan/core';
import Kitchen, { KitchenTab } from './Kitchen';

const TABS: { key: KitchenTab; label: string; icon: IconName }[] = [
  { key: 'batch', label: 'Batch', icon: 'bowl' }, { key: 'labels', label: 'Labels', icon: 'printer' }, { key: 'drops', label: 'Drops', icon: 'truck' },
];

function Shell() {
  const { s } = useStore();
  const [tab, setTab] = useState<KitchenTab>('batch');
  const [cat, setCat] = useState('c1');
  const c = s.caterers.find(x => x.id === cat)!;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: color.line }}>
        <View>
          <T v="h2" style={{ fontFamily: font.display, fontSize: 24, lineHeight: 26, letterSpacing: 0.5, textTransform: 'uppercase' }}>Makan Hour Kitchen</T>
          <T v="small">{tab === 'drops' ? 'Ops · all drops' : c.name}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="num" style={{ fontSize: 26, lineHeight: 28 }} testID="clock">{hhmm(s.clock)}</T>
          <Row style={{ gap: space.xs }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.connected ? color.accent : color.faint }} /><T v="small">{s.connected ? 'Live' : 'Offline'}</T></Row>
        </View>
      </Row>
      <ScrollView style={{ flex: 1 }}><Kitchen tab={tab} cat={cat} setCat={setCat} /></ScrollView>
      <Row style={{ borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface }}>
        {TABS.map(t => {
          const on = t.key === tab;
          return (
            <Pressable key={t.key} testID={`cat-tab-${t.key}`} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: space.m, gap: space.xs, borderTopWidth: 2, borderTopColor: on ? color.warn : 'transparent' }}>
              <Icon name={t.icon} size={20} c={on ? color.ink : color.muted} />
              <T v="label" style={{ color: on ? color.ink : color.muted }}>{t.label}</T>
            </Pressable>
          );
        })}
      </Row>
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    BarlowCondensed_600SemiBold: require('../assets/fonts/BarlowCondensed_600SemiBold.ttf'),
    Manrope_500Medium: require('../assets/fonts/Manrope_500Medium.ttf'),
    Manrope_600SemiBold: require('../assets/fonts/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('../assets/fonts/Manrope_700Bold.ttf'),
  });
  if (!loaded) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas }}><ActivityIndicator color={color.ink} /></View>;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#0B0B0A' : color.canvas, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 820, backgroundColor: color.canvas }}><StoreProvider><Shell /></StoreProvider></View>
      </View>
    </SafeAreaProvider>
  );
}

import React from 'react';
import { View } from 'react-native';
import { color, Icon, Row, space, T } from '@makan/ui';
// One brand mark across all three experiences: the bowl tile and the serif wordmark.
// The role name sits beside it in that role's own typeface.
export function Wordmark({ role, tone = 'dark', roleFont }: { role?: string; tone?: 'dark' | 'light'; roleFont?: string }) {
  const fg = tone === 'dark' ? color.ink : color.onInk;
  return (
    <Row style={{ gap: space.s }}>
      <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: fg, alignItems: 'center', justifyContent: 'center' }}><Icon name="bowl" size={14} c={tone === 'dark' ? color.canvas : color.ink} w={2.2} /></View>
      <T v="h2" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, letterSpacing: -0.3, color: fg }}>Makan Hour</T>
      {role && <T v="label" style={{ color: tone === 'dark' ? color.muted : color.faint, fontFamily: roleFont, marginTop: 3 }}>{role}</T>}
    </Row>
  );
}

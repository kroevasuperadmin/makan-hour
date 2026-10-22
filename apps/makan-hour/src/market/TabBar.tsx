import React from 'react';
import { Pressable, View } from 'react-native';
import { color, Icon, IconName, Row, space, T } from '@makan/ui';

export function TabBar<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: string; icon: IconName; badge?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <Row style={{ borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface }}>
      {tabs.map(t => {
        const on = t.key === value;
        return (
          <Pressable key={t.key} testID={`market-tab-${t.key}`} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: space.m, gap: space.xs, borderTopWidth: 2, borderTopColor: on ? color.accent : 'transparent' }}>
            <View>
              <Icon name={t.icon} size={20} c={on ? color.ink : color.muted} />
              {!!t.badge && <View style={{ position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><T testID={`market-badge-${t.key}`} v="label" style={{ color: color.onAccent, fontSize: 10, letterSpacing: 0 }}>{t.badge}</T></View>}
            </View>
            <T v="label" style={{ color: on ? color.ink : color.muted }}>{t.label}</T>
          </Pressable>
        );
      })}
    </Row>
  );
}

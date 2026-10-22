import React from 'react';
import { Pressable, View } from 'react-native';
import { color, Icon, IconName, Row, space, T } from '@makan/ui';

export function TabBar<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: string; icon: IconName; badge?: number }[]; value: K; onChange: (k: K) => void }) {
  return (
    <Row style={{ backgroundColor: color.surface }}>
      {tabs.map(t => {
        const on = t.key === value;
        return (
          <Pressable key={t.key} testID={`market-tab-${t.key}`} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: space.m, gap: space.xs, borderTopWidth: 3, borderTopColor: on ? color.ink : 'transparent' }}>
            <View>
              <Icon name={t.icon} size={20} c={on ? color.ink : color.muted} />
              {!!t.badge && <View style={{ position: 'absolute', top: -7, right: -12, minWidth: 18, height: 18, borderRadius: 4, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><T testID={`market-badge-${t.key}`} v="small" style={{ color: color.onInk, fontSize: 13, lineHeight: 16 }}>{t.badge}</T></View>}
            </View>
            <T v="label" style={{ color: on ? color.ink : color.muted }}>{t.label}</T>
          </Pressable>
        );
      })}
    </Row>
  );
}

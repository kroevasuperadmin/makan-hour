import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { color, font, radius, space, type } from './theme';
import { Icon, IconName } from './Icon';

export const T = ({ v = 'body', style, children, ...r }: { v?: keyof typeof type; style?: TextStyle | TextStyle[]; children: React.ReactNode; numberOfLines?: number; testID?: string }) =>
  <Text style={[type[v] as TextStyle, style as TextStyle]} {...r}>{children}</Text>;

export const Card = ({ children, style, tone }: { children: React.ReactNode; style?: ViewStyle; tone?: 'accent' | 'warn' | 'danger' | 'sunk' | 'info' }) => {
  const bg = tone === 'accent' ? color.accentSoft : tone === 'warn' ? color.warnSoft : tone === 'danger' ? color.dangerSoft : tone === 'sunk' ? color.sunk : tone === 'info' ? color.infoSoft : color.surface;
  return <View style={[st.card, { backgroundColor: bg, borderColor: tone ? 'transparent' : color.line }, style]}>{children}</View>;
};

export function Button({ label, onPress, kind = 'primary', icon, disabled, testID, style }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'accent'; icon?: IconName; disabled?: boolean; testID?: string; style?: ViewStyle }) {
  const bg = kind === 'primary' ? color.ink : kind === 'accent' ? color.accent : kind === 'secondary' ? color.surface : 'transparent';
  const fg = kind === 'primary' ? color.onInk : kind === 'accent' ? color.onAccent : color.ink;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [st.btn, { backgroundColor: bg, borderColor: kind === 'secondary' ? color.line : 'transparent', opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {icon && <Icon name={icon} size={18} c={fg} />}
      <Text style={{ fontFamily: font.bodyStrong, fontSize: 15, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export const Badge = ({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'info' }) => {
  const m = { neutral: [color.sunk, color.ink2], accent: [color.accentSoft, color.accent], warn: [color.warnSoft, color.warn], danger: [color.dangerSoft, color.danger], info: [color.infoSoft, color.info] }[tone];
  return <View style={[st.badge, { backgroundColor: m[0] }]}><Text style={[type.label, { color: m[1], fontSize: 10 }]}>{label}</Text></View>;
};

export const Divider = ({ style }: { style?: ViewStyle }) => <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color.line }, style]} />;
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
export const Gap = ({ h = space.l }: { h?: number }) => <View style={{ height: h }} />;

export function Segmented<K extends string>({ items, value, onChange, testPrefix }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void; testPrefix: string }) {
  return (
    <View style={[st.seg, { backgroundColor: color.sunk }]}>
      {items.map(it => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} testID={`${testPrefix}-${it.key}`} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(it.key)} style={[st.segItem, on && { backgroundColor: color.surface }]}>
            <Text style={{ fontFamily: on ? font.bodyStrong : font.semi, fontSize: 13, color: on ? color.ink : color.muted }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Bar = ({ pct, tone = color.ink }: { pct: number; tone?: string }) => (
  <View style={{ height: 6, backgroundColor: color.sunk, borderRadius: 3, overflow: 'hidden' }}>
    <View style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, height: 6, backgroundColor: tone }} />
  </View>
);

export const Screen = ({ children }: { children: React.ReactNode }) => <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl * 2 }}>{children}</View>;

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.m, padding: space.l },
  btn: { minHeight: 50, borderRadius: radius.s, borderWidth: 1, paddingHorizontal: space.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  badge: { paddingHorizontal: space.s, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  seg: { flexDirection: 'row', borderRadius: radius.s + 2, padding: 3 },
  segItem: { flex: 1, paddingVertical: space.s, alignItems: 'center', borderRadius: radius.s },
});

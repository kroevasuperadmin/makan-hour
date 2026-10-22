import React from 'react';
import { Platform, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { color, font, radius, space, type } from './theme';
import { Icon, IconName } from './Icon';

export const T = ({ v = 'body', style, children, ...r }: { v?: keyof typeof type; style?: TextStyle | TextStyle[]; children: React.ReactNode; numberOfLines?: number; testID?: string }) =>
  <Text style={[type[v] as TextStyle, style as TextStyle]} {...r}>{children}</Text>;

export const Card = ({ children, style, tone }: { children: React.ReactNode; style?: ViewStyle; tone?: 'accent' | 'warn' | 'danger' | 'sunk' | 'info' }) => {
  const bg = tone === 'accent' ? color.accentSoft : tone === 'warn' ? color.warnSoft : tone === 'danger' ? color.dangerSoft : tone === 'sunk' ? color.sunk : tone === 'info' ? color.infoSoft : color.surface;
  return <View style={[st.card, { backgroundColor: bg }, style]}>{children}</View>;
};

const pressWeb = (Platform.OS === 'web' ? { transitionProperty: 'transform', transitionDuration: '120ms', transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' } : {}) as ViewStyle;

// Green is the press colour. Primary and accent are the same green. Finished states stay ink.
export function Button({ label, onPress, kind = 'primary', icon, disabled, testID, style, size = 'md' }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'accent'; icon?: IconName; disabled?: boolean; testID?: string; style?: ViewStyle; size?: 'md' | 'lg' }) {
  const press = kind === 'primary' || kind === 'accent';
  const bg = press ? color.accent : kind === 'secondary' ? color.sunk : 'transparent';
  const fg = press ? color.onAccent : color.ink;
  const big = size === 'lg';
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} pressRetentionOffset={12}
      style={({ pressed }) => [st.btn, pressWeb, { backgroundColor: bg, minHeight: big ? 64 : 48, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed && !disabled ? 0.97 : 1 }] }, style]}>
      {icon && <Icon name={icon} size={big ? 22 : 18} c={fg} />}
      <Text style={{ fontFamily: font.bodyStrong, fontSize: big ? 20 : 16, lineHeight: big ? 24 : 20, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function nameStyle(size = 22): TextStyle {
  return { fontFamily: font.display, fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: -0.4, color: color.ink };
}

export const Badge = ({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'info' }) => {
  const m = { neutral: [color.sunk, color.ink], accent: [color.ink, color.onInk], warn: [color.warnSoft, color.warn], danger: [color.dangerSoft, color.danger], info: [color.infoSoft, color.info] }[tone];
  return <View style={[st.badge, { backgroundColor: m[0] }]}><Text style={{ fontFamily: font.bodyStrong, fontSize: 13, lineHeight: 16, color: m[1] }}>{label}</Text></View>;
};

export const Divider = ({ style }: { style?: ViewStyle }) => <View style={[{ height: space.s }, style]} />;
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
export const Gap = ({ h = space.l }: { h?: number }) => <View style={{ height: h }} />;

export function fieldStyle(): TextStyle {
  return { borderWidth: 1, borderColor: color.line, borderRadius: radius.s, paddingHorizontal: space.l, paddingVertical: space.m, minHeight: 48, fontFamily: font.body, fontSize: 16, color: color.ink, backgroundColor: color.surface };
}

export function Segmented<K extends string>({ items, value, onChange, testPrefix }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void; testPrefix: string }) {
  return (
    <View style={[st.seg, { backgroundColor: color.sunk }]}>
      {items.map(it => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} testID={`${testPrefix}-${it.key}`} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(it.key)} style={[st.segItem, on && { backgroundColor: color.ink }]}>
            <Text style={{ fontFamily: on ? font.bodyStrong : font.semi, fontSize: 15, lineHeight: 20, color: on ? color.onInk : color.ink }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Bar = ({ pct, tone = color.ink }: { pct: number; tone?: string }) => (
  <View style={{ height: 4, backgroundColor: color.sunk, overflow: 'hidden' }}>
    <View style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, height: 4, backgroundColor: tone }} />
  </View>
);

export const Screen = ({ children }: { children: React.ReactNode }) => <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl * 2 }}>{children}</View>;

const st = StyleSheet.create({
  card: { borderRadius: radius.m, padding: space.l },
  btn: { minHeight: 48, borderRadius: radius.s, paddingHorizontal: space.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  badge: { paddingHorizontal: space.s, paddingVertical: 4, borderRadius: radius.s, alignSelf: 'flex-start' },
  seg: { flexDirection: 'row', borderRadius: radius.s, padding: 3 },
  segItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.s },
});

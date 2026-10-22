import { Platform } from 'react-native';
// Printed lunch list. One paper, one ink, one green. Five type steps. One radius.
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { s: 4, m: 4 } as const;

export type Palette = typeof employeePalette;
export const employeePalette = {
  canvas: '#F3EFE6', surface: '#FBF8F2', sunk: '#E7E1D4', line: '#DDD6C8', ink: '#1A1814', ink2: '#3C352C', muted: '#6E665C', faint: '#9A9186', onInk: '#FBF8F2',
  accent: '#1B4332', accentSoft: '#E3EFE8', onAccent: '#F7F3EA', onAccentMuted: '#D5E4DA',
  warn: '#8A5300', warnSoft: '#F8EED9', danger: '#9F2F2D', dangerSoft: '#F8E6E4', info: '#24577A', infoSoft: '#E4EEF5',
};
export const adminPalette: Palette = {
  canvas: '#F1F2EF', surface: '#FBFBF9', sunk: '#E4E6E1', line: '#D5D8D1', ink: '#161C24', ink2: '#2E3844', muted: '#66707A', faint: '#96A0A8', onInk: '#FBFBF9',
  accent: '#1B4332', accentSoft: '#E3EFE8', onAccent: '#F7F3EA', onAccentMuted: '#D5E4DA',
  warn: '#8A5300', warnSoft: '#F8EED9', danger: '#9F2F2D', dangerSoft: '#F8E6E4', info: '#1F4E79', infoSoft: '#E2ECF5',
};
export const riderPalette: Palette = {
  canvas: '#F3EFE6', surface: '#FBF8F2', sunk: '#E7E1D4', line: '#DDD6C8', ink: '#1A1814', ink2: '#3C352C', muted: '#6E665C', faint: '#9A9186', onInk: '#FBF8F2',
  accent: '#1B4332', accentSoft: '#E3EFE8', onAccent: '#F7F3EA', onAccentMuted: '#D5E4DA',
  warn: '#8A5300', warnSoft: '#F8EED9', danger: '#9F2F2D', dangerSoft: '#F8E6E4', info: '#24577A', infoSoft: '#E4EEF5',
};
export const kitchenPalette: Palette = {
  canvas: '#12110F', surface: '#24221E', sunk: '#2E2B27', line: '#3A3632', ink: '#F4F0E8', ink2: '#D9D2C6', muted: '#A39B90', faint: '#6E675F', onInk: '#12110F',
  accent: '#8FBF9E', accentSoft: '#1C2820', onAccent: '#102016', onAccentMuted: '#2C4434',
  warn: '#E5A93E', warnSoft: '#2D2310', danger: '#E58276', dangerSoft: '#2E1916', info: '#93BAD8', infoSoft: '#16212B',
};

const textFace = Platform.select({ default: 'Manrope_700Bold' }) as string;
export type Fonts = { display: string; body: string; bodyStrong: string; semi: string; mono: string; displayTracking: number };
export const employeeFonts: Fonts = { display: 'InstrumentSerif_400Regular', body: 'Manrope_500Medium', bodyStrong: 'Manrope_700Bold', semi: 'Manrope_600SemiBold', mono: textFace, displayTracking: -1.2 };
export const adminFonts: Fonts = { display: 'IBMPlexSans_600SemiBold', body: 'IBMPlexSans_400Regular', bodyStrong: 'IBMPlexSans_600SemiBold', semi: 'IBMPlexSans_500Medium', mono: 'IBMPlexSans_600SemiBold', displayTracking: -0.8 };
export const kitchenFonts: Fonts = { display: 'BarlowCondensed_600SemiBold', body: 'Manrope_500Medium', bodyStrong: 'Manrope_700Bold', semi: 'Manrope_600SemiBold', mono: 'BarlowCondensed_600SemiBold', displayTracking: 0 };

// Mutable singletons so the shared kit picks up each app's identity. Call applyTheme() once, before first render.
export const color: Palette = { ...employeePalette };
export const font: Fonts = { ...employeeFonts };
export const type = {} as Record<'hero' | 'h1' | 'h2' | 'body' | 'small' | 'label' | 'num', any>;
function buildType(heroSize: number) {
  Object.assign(type, {
    hero: { fontFamily: font.display, fontSize: heroSize, lineHeight: Math.round(heroSize * 0.98), letterSpacing: font.displayTracking, color: color.ink },
    h1: { fontFamily: font.display, fontSize: Math.round(heroSize * 0.72), lineHeight: Math.round(heroSize * 0.78), letterSpacing: font.displayTracking * 0.7, color: color.ink },
    h2: { fontFamily: font.bodyStrong, fontSize: 18, lineHeight: 24, color: color.ink },
    body: { fontFamily: font.body, fontSize: 16, lineHeight: 24, color: color.ink },
    small: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted },
    label: { fontFamily: font.bodyStrong, fontSize: 13, lineHeight: 18, color: color.muted },
    num: { fontFamily: font.mono, fontSize: 16, lineHeight: 22, color: color.ink, fontVariant: ['tabular-nums'] },
  });
}
buildType(44);
export function applyTheme(p: Palette, f: Fonts, heroSize = 44) { Object.assign(color, p); Object.assign(font, f); buildType(heroSize); }

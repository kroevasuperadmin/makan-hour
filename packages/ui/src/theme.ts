import { Platform } from 'react-native';
// One spacing scale shared by all three apps. No ad-hoc numbers in screens.
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { s: 6, m: 10 } as const;

export type Palette = typeof employeePalette;
export const employeePalette = {
  canvas: '#F5F3EE', surface: '#FFFFFF', sunk: '#EDEAE3', line: '#E3DFD6', ink: '#1D1C1A', ink2: '#3A3834', muted: '#76716A', faint: '#A39E95', onInk: '#FFFFFF',
  accent: '#1F4D3A', accentSoft: '#E5EEE7', onAccent: '#FFFFFF', onAccentMuted: '#CFE0D5',
  warn: '#8A5300', warnSoft: '#FAEFD9', danger: '#9F2F2D', dangerSoft: '#FBE9E8', info: '#24577A', infoSoft: '#E4EEF5',
};
export const adminPalette: Palette = {
  canvas: '#F2F3F1', surface: '#FFFFFF', sunk: '#E6E8E4', line: '#DADDD7', ink: '#16222E', ink2: '#33404C', muted: '#6B7480', faint: '#9AA2AB', onInk: '#FFFFFF',
  accent: '#2E5E45', accentSoft: '#E3EDE6', onAccent: '#FFFFFF', onAccentMuted: '#CDE0D3',
  warn: '#8A5300', warnSoft: '#F8EEDA', danger: '#9F2F2D', dangerSoft: '#F8E6E5', info: '#1F4E79', infoSoft: '#E2ECF5',
};
export const kitchenPalette: Palette = {
  canvas: '#121211', surface: '#1B1B1A', sunk: '#262624', line: '#302F2C', ink: '#F2EFE8', ink2: '#D3CFC6', muted: '#8F8B82', faint: '#66635D', onInk: '#121211',
  accent: '#86B897', accentSoft: '#1D2A21', onAccent: '#0F1A13', onAccentMuted: '#2C4434',
  warn: '#E5A93E', warnSoft: '#2D2310', danger: '#E58276', dangerSoft: '#2E1916', info: '#93BAD8', infoSoft: '#16212B',
};

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, monospace' }) as string;
export type Fonts = { display: string; body: string; bodyStrong: string; semi: string; mono: string; displayTracking: number };
export const employeeFonts: Fonts = { display: 'InstrumentSerif_400Regular', body: 'Manrope_500Medium', bodyStrong: 'Manrope_700Bold', semi: 'Manrope_600SemiBold', mono, displayTracking: -0.8 };
export const adminFonts: Fonts = { display: 'IBMPlexSans_600SemiBold', body: 'IBMPlexSans_400Regular', bodyStrong: 'IBMPlexSans_600SemiBold', semi: 'IBMPlexSans_500Medium', mono: 'IBMPlexMono_500Medium', displayTracking: -0.6 };
export const kitchenFonts: Fonts = { display: 'BarlowCondensed_600SemiBold', body: 'Manrope_500Medium', bodyStrong: 'Manrope_700Bold', semi: 'Manrope_600SemiBold', mono: 'BarlowCondensed_600SemiBold', displayTracking: 0 };

// Mutable singletons so the shared kit picks up each app's identity. Call applyTheme() once, before first render.
export const color: Palette = { ...employeePalette };
export const font: Fonts = { ...employeeFonts };
export const type = {} as Record<'hero' | 'h1' | 'h2' | 'body' | 'small' | 'label' | 'num', any>;
function buildType(heroSize: number) {
  Object.assign(type, {
    hero: { fontFamily: font.display, fontSize: heroSize, lineHeight: heroSize * 1.05, letterSpacing: font.displayTracking, color: color.ink },
    h1: { fontFamily: font.display, fontSize: Math.round(heroSize * 0.75), lineHeight: Math.round(heroSize * 0.85), letterSpacing: font.displayTracking * 0.6, color: color.ink },
    h2: { fontFamily: font.bodyStrong, fontSize: 17, lineHeight: 22, color: color.ink },
    body: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ink2 },
    small: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted },
    label: { fontFamily: font.bodyStrong, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase', color: color.muted },
    num: { fontFamily: font.mono, fontSize: 15, color: color.ink },
  });
}
buildType(40);
export function applyTheme(p: Palette, f: Fonts, heroSize = 40) { Object.assign(color, p); Object.assign(font, f); buildType(heroSize); }

import Constants from 'expo-constants';
import { setOpenDemo } from '@makan/core';

// The only switch is MAKAN_OPEN_DEMO. app.config.js copies it onto the public
// name Metro inlines, and onto extra for the native manifest.
function extraOn(): boolean {
  const c = Constants as unknown as {
    expoConfig?: { extra?: { makanOpenDemo?: unknown } } | null;
    manifest?: { extra?: { makanOpenDemo?: unknown } } | null;
  };
  const vals = [
    c.expoConfig?.extra?.makanOpenDemo,
    c.manifest && typeof c.manifest === 'object' ? c.manifest.extra?.makanOpenDemo : undefined,
  ];
  return vals.some(v => v === true || v === 'on');
}

const inlined = process.env.EXPO_PUBLIC_MAKAN_OPEN_DEMO === 'on' || process.env.MAKAN_OPEN_DEMO === 'on';
setOpenDemo(inlined || extraOn());

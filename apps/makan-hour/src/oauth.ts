// Provider sign-in. iOS uses the native Apple sheet; everything else goes through Supabase's
// OAuth page in a browser and comes back on a deep link (makan-hour://auth) or, on the web,
// to this same page.
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authClient, SB_KEY, SB_URL } from '@makan/core';

WebBrowser.maybeCompleteAuthSession();
export type Provider = 'google' | 'azure' | 'apple';
export const PROVIDER_NAME: Record<Provider, string> = { google: 'Google', azure: 'Microsoft', apple: 'Apple' };

export const returnUrl = () => Platform.OS === 'web' ? window.location.origin + window.location.pathname : Linking.createURL('auth');

const notOn = (p: Provider) => `${PROVIDER_NAME[p]} sign-in isn’t switched on yet. Use another option for now.`;
const clean = (p: Provider, m: string) => /not enabled|unsupported provider|missing oauth secret|invalid client/i.test(m) ? notOn(p) : m;

export const nativeApple = () => Platform.OS === 'ios';
// Apple on the web and Android needs a Services ID and secret in Supabase. Until that exists the
// button only shows on iOS, where native sign-in needs neither (and where guideline 4.8 applies).
export const appleOffered = () => nativeApple() || process.env.EXPO_PUBLIC_APPLE_WEB === '1';

// Ask Supabase which providers are on, so a switched-off one gets a plain sentence instead of a JSON error page.
async function enabled(p: Provider) {
  try {
    const r = await fetch(`${SB_URL}/auth/v1/settings`, { headers: { apikey: SB_KEY ?? '' } });
    const j = await r.json() as { external?: Record<string, boolean> };
    return j.external?.[p] !== false;
  } catch { return true; }
}
export async function appleAvailable() {
  if (!appleOffered()) return false;
  if (!nativeApple()) return true;
  try { return await AppleAuthentication.isAvailableAsync(); } catch { return false; }
}

async function appleNative() {
  const raw = Crypto.randomUUID() + Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  let cred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    cred = await AppleAuthentication.signInAsync({ nonce: hashed, requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
  if (!cred.identityToken) throw new Error('Apple didn’t return a sign-in token. Try again.');
  const { error } = await authClient().auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw });
  if (error) throw new Error(clean('apple', error.message));
  return true;
}

// Resolves true when signed in, false when the person backed out. On the web the page navigates
// away and the promise never settles; the session is picked up when the page loads again.
export async function signInWith(p: Provider): Promise<boolean> {
  if (p === 'apple' && nativeApple()) return appleNative();
  if (!(await enabled(p))) throw new Error(notOn(p));
  const sb = authClient();
  const redirectTo = returnUrl();
  const scopes = p === 'azure' ? 'email openid profile' : undefined;
  const { data, error } = await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo, scopes, skipBrowserRedirect: Platform.OS !== 'web', queryParams: p === 'google' ? { prompt: 'select_account' } : undefined } });
  if (error) throw new Error(clean(p, error.message));
  if (Platform.OS === 'web') return new Promise<boolean>(() => {});
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return false;
  const { queryParams } = Linking.parse(res.url);
  const fragment = new URLSearchParams(res.url.split('#')[1] ?? '');
  const errText = (queryParams?.error_description as string) || fragment.get('error_description');
  if (errText) throw new Error(clean(p, errText));
  const code = queryParams?.code as string | undefined;
  if (!code) throw new Error('Sign-in didn’t finish. Try again.');
  const ex = await sb.auth.exchangeCodeForSession(code);
  if (ex.error) throw new Error(clean(p, ex.error.message));
  return true;
}

// Web only: did this page load come back from a provider with an error?
export function webReturnError(): string | null {
  if (Platform.OS !== 'web') return null;
  const q = new URLSearchParams(window.location.search), h = new URLSearchParams(window.location.hash.slice(1));
  const e = q.get('error_description') || h.get('error_description');
  if (e) window.history.replaceState(null, '', window.location.pathname);
  return e ? (/not enabled|unsupported provider/i.test(e) ? 'That sign-in option isn’t switched on yet. Use another option for now.' : e) : null;
}

// Small key-value memory that survives the web redirect (sessionStorage) and is plain memory on native.
const mem: Record<string, string> = {};
export const stash = {
  set(k: string, v: unknown) { const s = JSON.stringify(v); if (Platform.OS === 'web') sessionStorage.setItem('makan-' + k, s); else mem[k] = s; },
  take<T>(k: string): T | null {
    const s = Platform.OS === 'web' ? sessionStorage.getItem('makan-' + k) : mem[k] ?? null;
    if (Platform.OS === 'web') sessionStorage.removeItem('makan-' + k); else delete mem[k];
    return s ? JSON.parse(s) as T : null;
  },
};

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button, color, fieldStyle, font, Gap, IconName, nameStyle, radius, Row, space, T, useReducedMotion } from '@makan/ui';
import { LUNCH, LUNCH_CREDIT, LUNCH_LABEL } from './photos';
import { authAvailable, claimMarket, createOffice, looksLikeEmail, MarketMembership, Membership, myMemberships, NotSetUp, Role, signedInEmail, signInPassword, signOutReal, signUpPassword } from '@makan/core';
import { Account, ACCOUNTS, accountTestId, corporateFlowOn, DEMO_CODE, MARKET_ACCOUNTS, OFFICE_ACCOUNTS } from './accounts';
import { Wordmark } from './Wordmark';
import { appleAvailable, nativeApple, Provider, PROVIDER_NAME, returnUrl, signInWith, stash, webReturnError } from './oauth';

// Microsoft stays off the phone apps until the Azure provider is configured. The web keeps the
// button and its "not switched on yet" message.
const azureShown = Platform.OS === 'web' || process.env.EXPO_PUBLIC_AZURE_ON !== '0';
const ROLE_WORD = { admin: 'Office admin', employee: 'Staff', caterer: 'Caterer' } as const;
// Which doors each role gets. Apple sits next to Google for staff (App Store guideline 4.8).
const OPTIONS: Record<Role, { providers: Provider[]; password: boolean }> = {
  employee: { providers: ['google', 'azure', 'apple'], password: true },
  admin: { providers: ['google', 'azure'], password: false },
  caterer: { providers: ['google'], password: true },
};
const CHOICES: { role: Role; title: string; line: string; icon: IconName }[] = [
  { role: 'employee', title: 'I’m staff', line: 'Pick lunch before the 10:30 cutoff.', icon: 'users' },
  { role: 'admin', title: 'I’m an office admin', line: 'Budget, invoices and who’s on the team.', icon: 'building' },
  { role: 'caterer', title: 'I’m a caterer', line: 'Batches, labels and the noon drop.', icon: 'bowl' },
];
const MARKET_DOORS: { id: string; title: string; line: string; icon: IconName }[] = [
  { id: 'customer', title: 'I’m a customer', line: 'Browse kitchens, build a cart, place an order.', icon: 'bowl' },
  { id: 'vendor', title: 'I’m a vendor', line: 'Your menu, and orders to accept and prepare.', icon: 'receipt' },
  { id: 'rider', title: 'I’m a rider', line: 'Pick up a ready order and mark it delivered.', icon: 'truck' },
  { id: 'market-admin', title: 'I’m admin', line: 'Every restaurant and every order.', icon: 'shield' },
];
const roleLabel = (a: Account) => a.surface === 'market'
  ? (a.role === 'customer' ? 'Customer' : a.role === 'vendor' ? 'Vendor' : a.role === 'rider' ? 'Rider' : 'Admin')
  : ROLE_WORD[a.role as Role];
const HEAD: Record<Role, { title: string; body: string }> = {
  employee: { title: 'Staff sign-in', body: 'Use the email your office admin added. Any option below works as long as it signs in with that address.' },
  admin: { title: 'Office admin sign-in', body: azureShown ? 'Use your work Google or Microsoft account.' : 'Use your work Google account.' },
  caterer: { title: 'Caterer sign-in', body: 'Use the email the office added for your kitchen.' },
};
type Pending = { role: Role; signup?: { company: string; building: string; name: string } };
const toAccount = (m: Membership, email: string): Account => ({
  role: m.role, surface: 'office', email, name: m.name || email.split('@')[0], org: m.company, real: true, officeId: m.officeId,
  detail: `${ROLE_WORD[m.role]} · ${m.company}`,
});
const NOT_READY = 'Sign-in for real offices isn’t open yet. Until it is, use one of the demo accounts.';

function Masthead() {
  const reduced = useReducedMotion();
  const open = React.useRef(new Animated.Value(reduced ? 1 : 0.04)).current;
  const zoom = React.useRef(new Animated.Value(reduced ? 1 : 1.12)).current;
  React.useEffect(() => {
    if (reduced) { open.setValue(1); zoom.setValue(1); return; }
    const ease = Easing.bezier(0.23, 1, 0.32, 1);
    Animated.parallel([
      Animated.timing(open, { toValue: 1, duration: 700, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(zoom, { toValue: 1, duration: 900, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [reduced, open, zoom]);
  return (
    <View style={{ marginHorizontal: -space.xl }}>
      <Animated.View style={{ height: 168, overflow: 'hidden', transformOrigin: 'left center', transform: [{ scaleX: open }] }}>
        <Animated.Image source={LUNCH} accessibilityLabel={LUNCH_LABEL} style={{ width: '100%', height: 168, transform: [{ scale: zoom }] }} />
      </Animated.View>
      <T v="small" style={{ marginTop: space.s, paddingHorizontal: space.xl }}>{LUNCH_CREDIT}</T>
    </View>
  );
}

function Door({ id, title, line, onPress }: { id: string; title: string; line: string; onPress: () => void }) {
  return (
    <Pressable testID={id} onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, justifyContent: 'center', backgroundColor: pressed ? color.sunk : color.surface, paddingVertical: 14, paddingHorizontal: space.l, marginBottom: space.s, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <T style={{ fontFamily: font.bodyStrong, fontSize: 20, lineHeight: 26, color: color.ink }}>{title}</T>
      <T v="body" style={{ marginTop: 2 }}>{line}</T>
    </Pressable>
  );
}
type MarketDoor = 'customer' | 'vendor' | 'rider' | 'admin';
const toMarket = (m: MarketMembership, email: string): Account => ({
  role: m.role, surface: 'market', real: true, email, actorId: m.memberId, restaurantId: m.restaurantId || undefined,
  name: m.name || email.split('@')[0],
  org: m.restaurantName || (m.role === 'rider' ? 'Riders' : 'Makan Hour'),
  detail: `${m.role} · signed in`,
});

export default function SignIn({ onSignedIn }: { onSignedIn: (a: Account) => void }) {
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<'role' | 'options' | 'signup' | 'demo' | 'pick' | 'confirm' | 'market'>('role');
  const [door, setDoor] = useState<MarketDoor | null>(null);
  const [demo, setDemo] = useState<Account | null>(null);
  const [pwMode, setPwMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [company, setCompany] = useState(''), [building, setBuilding] = useState(''), [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [picks, setPicks] = useState<{ ms: Membership[]; email: string }>({ ms: [], email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [apple, setApple] = useState(true);
  useEffect(() => { appleAvailable().then(setApple); }, []);

  const run = async (f: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await f(); } catch (e) { setErr(e instanceof NotSetUp ? NOT_READY : e instanceof Error ? e.message : 'Something went wrong. Try again.'); } finally { setBusy(false); }
  };

  // Signed in with some identity. Now find out what the office admin made this person.
  const finish = async (p: Pending | null) => {
    const who = await signedInEmail();
    if (!who) throw new Error('Sign-in didn’t finish. Try again.');
    if (p?.signup) {
      const s = p.signup;
      const officeId = await createOffice({ company: s.company, building: s.building, district: '', name: s.name });
      onSignedIn({ role: 'admin', surface: 'office', email: who, name: s.name || who.split('@')[0], org: s.company, detail: `Office admin · ${s.company}`, real: true, officeId });
      return;
    }
    const all = await myMemberships();
    const ms = p ? all.filter(m => m.role === p.role) : all;
    if (ms.length === 0) {
      if (!p) {
        try {
          const market = await claimMarket();
          if (market[0]) { onSignedIn(toMarket(market[0], who)); return; }
        } catch (e) { if (!(e instanceof NotSetUp)) throw e; }
      }
      await signOutReal();
      if (p && all.length > 0) {
        const m = all[0];
        throw new Error(`${who} is set up as ${ROLE_WORD[m.role].toLowerCase()} at ${m.company}. Go back and choose that instead.`);
      }
      throw new Error(`No office has added ${who}${p ? ` as ${ROLE_WORD[p.role].toLowerCase()}` : ''} yet. Ask your office admin to add this email, then sign in again.`);
    }
    if (ms.length === 1) onSignedIn(toAccount(ms[0], who)); else { setPicks({ ms, email: who }); setStep('pick'); }
  };

  // Web: the page reloads after Google or Microsoft, or after a confirmation link. Pick up from there.
  useEffect(() => {
    const e = webReturnError();
    if (e) { setErr(e); return; }
    const p = stash.take<Pending>('pending');
    if (p) { setRole(p.role); setStep(p.signup ? 'signup' : 'options'); }
    signedInEmail().then(who => { if (who) run(() => finish(p)); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provider = (pr: Provider) => {
    if (!role) return;
    if (!authAvailable()) { setErr(NOT_READY); return; }
    const p: Pending = step === 'signup' ? { role: 'admin', signup: { company: company.trim(), building: building.trim(), name: name.trim() } } : { role };
    if (p.signup && p.signup.company.length < 2) { setErr('Add your company name first.'); return; }
    run(async () => {
      stash.set('pending', p);
      const ok = await signInWith(pr);
      const back = stash.take<Pending>('pending');
      if (ok) await finish(back);
    });
  };
  const withPassword = () => {
    if (!role) return;
    if (!looksLikeEmail(email)) { setErr('Enter a full email, like name@company.my.'); return; }
    if (ACCOUNTS.some(a => a.email === email.trim().toLowerCase())) { setErr('That’s a demo account. Tap it below the role list instead.'); return; }
    if (!password) { setErr('Enter your password.'); return; }
    run(async () => {
      if (pwMode === 'create') {
        const ready = await signUpPassword(email, password, returnUrl());
        if (!ready) { setStep('confirm'); return; }
      } else await signInPassword(email, password);
      await finish({ role });
    });
  };
  const verifyDemo = () => {
    if (!demo) return;
    if (code !== DEMO_CODE) { setErr('That code doesn’t match. Check the demo code above.'); return; }
    onSignedIn(demo);
  };
  const pickRole = (r: Role) => { setRole(r); setStep('options'); setErr(null); setPwMode('signin'); };
  const openMarket = (id: string) => { setDoor(id === 'market-admin' ? 'admin' : id as MarketDoor); setEmail(''); setPassword(''); setErr(null); setStep('market'); };
  const signInMarket = () => {
    if (!door) return;
    if (!looksLikeEmail(email)) { setErr('Enter a full email, like name@company.my.'); return; }
    if (ACCOUNTS.some(a => a.email === email.trim().toLowerCase())) { setErr('That’s a device preview. Tap it in the list on the role screen.'); return; }
    if (!password) { setErr('Enter your password.'); return; }
    run(async () => {
      await signInPassword(email, password);
      let rows: MarketMembership[] = [];
      try { rows = await claimMarket(); } catch (e) { await signOutReal(); throw e; }
      const m = rows.find(r => r.role === door);
      if (!m) {
        await signOutReal();
        const other = rows[0];
        throw new Error(other ? `That email is a ${other.role}. Go back and choose that side.` : 'That email is not on the marketplace yet.');
      }
      onSignedIn(toMarket(m, email.trim().toLowerCase()));
    });
  };
  const toRoles = () => { setStep('role'); setRole(null); setErr(null); setPassword(''); };
  const startDemo = (a: Account) => { setDemo(a); setCode(''); setErr(null); setStep('demo'); };

  const input = fieldStyle();
  const link = { color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' } as const;
  const errLine = err && <T v="small" testID="signin-error" style={{ color: color.danger, marginTop: space.s }}>{err}</T>;
  const backLink = (label: string, onPress: () => void, id: string) => <><Pressable testID={id} onPress={onPress} hitSlop={10}><T v="small" style={link}>{label}</T></Pressable><Gap h={space.xl} /></>;
  const providerButtons = (list: Provider[]) => list.filter(p => (p !== 'apple' || apple) && (p !== 'azure' || azureShown)).map(p => (
    <View key={p} style={{ marginBottom: space.s }}>
      {p === 'apple' && nativeApple()
        ? <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={radius.s} style={{ height: 50, width: '100%' }} onPress={() => provider('apple')} />
        : <Button testID={`oauth-${p}`} kind={p === list[0] ? 'primary' : 'secondary'} label={`Continue with ${PROVIDER_NAME[p]}`} onPress={() => provider(p)} disabled={busy} />}
    </View>
  ));
  const rule = (label: string) => <T v="h2">{label}</T>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
          <Wordmark />
          <Gap h={space.xxxl} />
          {step === 'market' && door ? <>
            {backLink('Change role', toRoles, 'market-back')}
            <T v="h1">{door === 'admin' ? 'Admin' : door[0].toUpperCase() + door.slice(1)} sign-in</T>
            <Gap h={space.s} />
            <T v="body">Use the email set up for this side. Payment later is Stripe, by FPX or card.</T>
            <Gap h={space.xl} />
            <T v="label">Email</T><Gap h={space.s} />
            <TextInput testID="market-email" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="name@company.my" placeholderTextColor={color.faint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={input} />
            <Gap h={space.l} />
            <T v="label">Password</T><Gap h={space.s} />
            <TextInput testID="market-password" value={password} onChangeText={t => { setPassword(t); setErr(null); }} secureTextEntry autoCapitalize="none" autoComplete="current-password" style={input} onSubmitEditing={signInMarket} />
            {errLine}
            <Gap h={space.m} />
            <Button testID="market-signin" label={busy ? 'Checking…' : 'Sign in'} onPress={signInMarket} disabled={busy || !email.includes('@') || !password} />
          </> : step === 'pick' ? <>
            <T v="h1">Which office?</T><Gap h={space.s} />
            <T v="body">{picks.email} is on more than one team.</T><Gap h={space.xl} />
            {picks.ms.map(m => (
              <Pressable key={m.memberId} onPress={() => onSignedIn(toAccount(m, picks.email))} style={{ backgroundColor: color.surface, borderRadius: radius.s, padding: space.l, marginBottom: space.s }}>
                <T v="h2" style={{ fontSize: 16 }}>{m.company}</T><T v="small">{ROLE_WORD[m.role]}</T>
              </Pressable>
            ))}
          </> : step === 'confirm' ? <>
            {backLink('Back to sign-in', () => { setStep('options'); setPwMode('signin'); }, 'confirm-back')}
            <T v="h1">Confirm your email</T><Gap h={space.s} />
            <T v="body">We sent one confirmation to <T v="body" style={{ color: color.ink, fontFamily: font.bodyStrong }}>{email.trim()}</T>. Open it once, then sign in here with your password. You won’t need email again after that.</T>
          </> : step === 'demo' && demo ? <>
            {backLink('Back', () => setStep('role'), 'back-to-email')}
            <T v="h1">Demo: {demo.name.split(' ')[0]}</T><Gap h={space.s} />
            <T v="body">{demo.detail}. {demo.surface === 'market' ? 'This preview stays on this device. It does not charge a card or write to the database.' : 'Nothing here touches a real office.'}</T>
            <Gap h={space.l} />
            <View style={{ backgroundColor: color.warnSoft, borderRadius: radius.s, padding: space.m }}>
              <T v="small" style={{ color: color.warn }}>The demo code is <T v="small" style={{ color: color.warn, fontFamily: font.bodyStrong }}>{DEMO_CODE}</T>.</T>
            </View>
            <Gap h={space.xl} />
            <TextInput testID="code-input" value={code} onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setErr(null); }} placeholder="000000" placeholderTextColor={color.faint} keyboardType="number-pad" maxLength={6} style={[input, { fontFamily: font.bodyStrong, fontSize: 28, letterSpacing: 8, textAlign: 'center' }]} onSubmitEditing={verifyDemo} />
            {errLine}
            <Gap h={space.m} />
            <Button testID="fill-code" kind="secondary" label="Paste demo code" onPress={() => { setCode(DEMO_CODE); setErr(null); }} />
            <Gap h={space.s} />
            <Button testID="verify" label={`Sign in as ${demo.name.split(' ')[0]}`} onPress={verifyDemo} disabled={code.length !== 6} />
          </> : step === 'signup' ? <>
            {backLink('I already have an office', () => setStep('options'), 'to-signin')}
            <T v="hero">Set up your office.</T><Gap h={space.m} />
            <T v="body">You become the office admin. Then you add staff and caterers by email and choose what each person sees.</T>
            <Gap h={space.xxl} />
            <T v="label">Company</T><Gap h={space.s} />
            <TextInput testID="signup-company" value={company} onChangeText={setCompany} placeholder="Syarikat Contoh Sdn Bhd" placeholderTextColor={color.faint} autoComplete="organization" style={input} />
            <Gap h={space.l} />
            <T v="label">Building and floor</T><Gap h={space.s} />
            <TextInput testID="signup-building" value={building} onChangeText={setBuilding} placeholder="Tower B, Level 12" placeholderTextColor={color.faint} style={input} />
            <Gap h={space.l} />
            <T v="label">Your name</T><Gap h={space.s} />
            <TextInput testID="signup-name" value={name} onChangeText={setName} placeholder="Nadia Osman" placeholderTextColor={color.faint} autoComplete="name" style={input} />
            <Gap h={space.xl} />
            {providerButtons(OPTIONS.admin.providers)}
            {errLine}
          </> : step === 'options' && role ? <>
            {backLink('Change role', toRoles, 'change-role')}
            <T v="h1">{HEAD[role].title}</T><Gap h={space.s} />
            <T v="body">{HEAD[role].body}</T>
            <Gap h={space.xl} />
            {providerButtons(OPTIONS[role].providers)}
            {OPTIONS[role].password && <>
              <Gap h={space.l} /><T v="body">Or use a password.</T><Gap h={space.l} />
              <T v="label">Email</T><Gap h={space.s} />
              <TextInput testID="email-input" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="name@company.my" placeholderTextColor={color.faint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" style={input} />
              <Gap h={space.l} />
              <T v="label">Password</T><Gap h={space.s} />
              <TextInput testID="password-input" value={password} onChangeText={t => { setPassword(t); setErr(null); }} placeholder={pwMode === 'create' ? 'At least 8 characters' : ''} placeholderTextColor={color.faint} secureTextEntry autoCapitalize="none" autoComplete={pwMode === 'create' ? 'new-password' : 'current-password'} textContentType={pwMode === 'create' ? 'newPassword' : 'password'} style={input} onSubmitEditing={withPassword} />
              <Gap h={space.m} />
              <Button testID="password-submit" kind="secondary" label={busy ? 'Checking…' : pwMode === 'create' ? 'Create password' : 'Sign in'} onPress={withPassword} disabled={busy || !email.includes('@') || !password} />
              <Gap h={space.m} />
              <Pressable testID="password-mode" onPress={() => { setPwMode(pwMode === 'create' ? 'signin' : 'create'); setErr(null); }} hitSlop={10} style={{ flexDirection: 'row', gap: space.xs, justifyContent: 'center' }}>
                <T v="small">{pwMode === 'create' ? 'Already have a password?' : 'First time here?'}</T><T v="small" style={link}>{pwMode === 'create' ? 'Sign in' : 'Create a password'}</T>
              </Pressable>
            </>}
            {errLine}
            {role === 'admin' && <>
              <Gap h={space.xl} />
              <Pressable testID="to-signup" onPress={() => { setStep('signup'); setErr(null); }} hitSlop={10} style={{ flexDirection: 'row', gap: space.xs, justifyContent: 'center' }}>
                <T v="small">New office?</T><T v="small" style={link}>Set it up</T>
              </Pressable>
            </>}
          </> : <>
            <Masthead />
            <Gap h={space.l} />
            <T v="hero">What’s for lunch today?</T>
            <Gap h={space.m} />
            <T v="body">Customers, kitchens and riders each use their own email. Device previews are listed below.</T>
            <Gap h={space.xl} />
            {MARKET_DOORS.map(c => (
              <Door key={c.id} id={`role-${c.id}`} title={c.title} line={c.line} onPress={() => openMarket(c.id)} />
            ))}
            {corporateFlowOn && <>
              <Gap h={space.l} />
              <T v="h2">Office lunch</T>
              <Gap h={space.s} />
              {CHOICES.map(c => (
                <Door key={c.role} id={`role-${c.role}`} title={c.title} line={c.line} onPress={() => pickRole(c.role)} />
              ))}
            </>}
            {errLine}
            <Gap h={space.xxxl} />
            {rule('Demo accounts')}
            <Gap h={space.l} />
            {[...MARKET_ACCOUNTS, ...(corporateFlowOn ? OFFICE_ACCOUNTS : [])].map(a => (
              <Pressable key={a.email} testID={accountTestId(a)} onPress={() => startDemo(a)} style={({ pressed }) => ({ minHeight: 56, justifyContent: 'center', paddingVertical: space.m, backgroundColor: pressed ? color.sunk : 'transparent', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                <Row style={{ gap: space.m }}>
                  <View style={{ flex: 1 }}>
                    <T style={nameStyle(18)}>{a.name}</T>
                    <T v="small" numberOfLines={1}>{a.detail}</T>
                  </View>
                  <T v="small">{roleLabel(a)}</T>
                </Row>
              </Pressable>
            ))}
          </>}
          {busy && <ActivityIndicator style={{ marginTop: space.l }} color={color.ink} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

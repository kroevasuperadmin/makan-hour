import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, color, font, Gap, Icon, radius, Row, space, T } from '@makan/ui';
import { createOffice, looksLikeEmail, Membership, myMemberships, NotSetUp, sendCode as sendRealCode, signUpReady, verifyCode } from '@makan/core';
import { Account, ACCOUNTS, DEMO_CODE, findAccount } from './accounts';
import { Wordmark } from './Wordmark';

const ROLE_WORD = { admin: 'Office admin', employee: 'Staff', caterer: 'Caterer' } as const;
const toAccount = (m: Membership, email: string): Account => ({
  role: m.role, email, name: m.name || email.split('@')[0], org: m.company, real: true, officeId: m.officeId,
  detail: `${ROLE_WORD[m.role]} · ${m.company}`,
});
const NOT_READY = 'Sign-up for new offices isn’t open yet. Until it is, sign in with one of the demo accounts.';

export default function SignIn({ onSignedIn }: { onSignedIn: (a: Account) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'form' | 'code' | 'pick'>('form');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''), [building, setBuilding] = useState(''), [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [picks, setPicks] = useState<Membership[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const demo = findAccount(email);
  const input = { borderWidth: 1, borderColor: color.line, borderRadius: radius.s, paddingHorizontal: space.l, paddingVertical: space.m, fontFamily: font.body, fontSize: 17, color: color.ink, backgroundColor: color.surface } as const;
  const run = async (f: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await f(); } catch (e) { setErr(e instanceof NotSetUp ? NOT_READY : e instanceof Error ? e.message : 'Something went wrong. Try again.'); } finally { setBusy(false); }
  };

  const sendCode = (e = email) => {
    setEmail(e); setCode(''); setErr(null);
    if (mode === 'signin' && findAccount(e)) { setStep('code'); return; }
    if (mode === 'signup' && findAccount(e)) { setErr('That’s a demo account. Sign up with your own work email.'); return; }
    if (!looksLikeEmail(e)) { setErr('Enter a full work email, like name@company.my.'); return; }
    if (mode === 'signup' && company.trim().length < 2) { setErr('Add your company name.'); return; }
    run(async () => {
      if (!(await signUpReady())) throw new NotSetUp('');
      await sendRealCode(e); setStep('code');
    });
  };
  const verify = () => {
    if (demo && mode === 'signin') { if (code !== DEMO_CODE) { setErr('That code doesn’t match. Check the demo code above.'); return; } onSignedIn(demo); return; }
    run(async () => {
      await verifyCode(email, code);
      if (mode === 'signup') {
        const officeId = await createOffice({ company, building, district: '', name });
        onSignedIn({ role: 'admin', email: email.trim().toLowerCase(), name: name.trim() || email.split('@')[0], org: company.trim(), detail: `Office admin · ${company.trim()}`, real: true, officeId });
        return;
      }
      const ms = await myMemberships();
      if (ms.length === 0) throw new Error(`No office has added ${email.trim()} yet. Ask your office admin to invite you, or sign up a new office.`);
      if (ms.length === 1) onSignedIn(toAccount(ms[0], email.trim().toLowerCase())); else { setPicks(ms); setStep('pick'); }
    });
  };
  const back = () => { setStep('form'); setErr(null); };
  const switchMode = (m: 'signin' | 'signup') => { setMode(m); setStep('form'); setErr(null); setCode(''); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
          <Wordmark />
          <Gap h={space.xxxl} />
          {step === 'pick' ? <>
            <T v="h1">Which office?</T><Gap h={space.s} />
            <T v="body">{email} belongs to more than one office.</T><Gap h={space.xl} />
            {picks.map(m => (
              <Pressable key={m.memberId} onPress={() => onSignedIn(toAccount(m, email.trim().toLowerCase()))} style={{ borderWidth: 1, borderColor: color.line, borderRadius: radius.m, padding: space.l, marginBottom: space.s, backgroundColor: color.surface }}>
                <T v="h2" style={{ fontSize: 15 }}>{m.company}</T><T v="small">{ROLE_WORD[m.role]}</T>
              </Pressable>
            ))}
          </> : step === 'code' ? <>
            <Pressable testID="back-to-email" onPress={back} hitSlop={10}><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>Use a different email</T></Pressable>
            <Gap h={space.xl} />
            <T v="h1">Enter your code</T>
            <Gap h={space.s} />
            <T v="body">We sent a 6-digit code to <T v="body" style={{ color: color.ink, fontFamily: font.bodyStrong }}>{email}</T>.{!demo ? ' It expires in an hour.' : ''}</T>
            {demo && mode === 'signin' && <>
              <Gap h={space.l} />
              <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: color.warn, backgroundColor: color.warnSoft, borderRadius: radius.s, padding: space.m }}>
                <T v="small" style={{ color: color.warn }}>Demo account: no email is sent. The code is <T v="small" style={{ color: color.warn, fontFamily: font.bodyStrong }}>{DEMO_CODE}</T>.</T>
              </View>
            </>}
            <Gap h={space.xl} />
            <TextInput testID="code-input" value={code} onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setErr(null); }} placeholder="000000" placeholderTextColor={color.faint} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} style={[input, { fontFamily: font.mono, fontSize: 28, letterSpacing: 8, textAlign: 'center' }]} onSubmitEditing={verify} />
            {err && <T v="small" style={{ color: color.danger, marginTop: space.s }}>{err}</T>}
            <Gap h={space.m} />
            {demo && mode === 'signin' && <><Button testID="fill-code" kind="secondary" label="Paste demo code" onPress={() => { setCode(DEMO_CODE); setErr(null); }} /><Gap h={space.s} /></>}
            <Button testID="verify" label={busy ? 'Checking…' : mode === 'signup' ? 'Create my office' : demo ? `Sign in as ${demo.name.split(' ')[0]}` : 'Sign in'} onPress={verify} disabled={code.length !== 6 || busy} />
            {!demo && <><Gap h={space.m} /><Pressable onPress={() => sendCode()} hitSlop={10}><T v="small" style={{ textAlign: 'center', textDecorationLine: 'underline' }}>Send a new code</T></Pressable></>}
          </> : mode === 'signup' ? <>
            <Pressable testID="to-signin" onPress={() => switchMode('signin')} hitSlop={10}><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>I already have an account</T></Pressable>
            <Gap h={space.xl} />
            <T v="hero">Set up your office.</T>
            <Gap h={space.m} />
            <T v="body">You become the office admin. After that you add your staff and caterers by email and choose what each person can do.</T>
            <Gap h={space.xxl} />
            <T v="label">Company</T><Gap h={space.s} />
            <TextInput testID="signup-company" value={company} onChangeText={setCompany} placeholder="Syarikat Contoh Sdn Bhd" placeholderTextColor={color.faint} autoComplete="organization" style={input} />
            <Gap h={space.l} />
            <T v="label">Building and floor</T><Gap h={space.s} />
            <TextInput testID="signup-building" value={building} onChangeText={setBuilding} placeholder="Tower B, Level 12" placeholderTextColor={color.faint} style={input} />
            <Gap h={space.l} />
            <T v="label">Your name</T><Gap h={space.s} />
            <TextInput testID="signup-name" value={name} onChangeText={setName} placeholder="Nadia Osman" placeholderTextColor={color.faint} autoComplete="name" style={input} />
            <Gap h={space.l} />
            <T v="label">Work email</T><Gap h={space.s} />
            <TextInput testID="signup-email" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="name@company.my" placeholderTextColor={color.faint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={input} onSubmitEditing={() => sendCode()} />
            {err && <T v="small" testID="signin-error" style={{ color: color.danger, marginTop: space.s }}>{err}</T>}
            <Gap h={space.m} />
            <Button testID="signup-send" label={busy ? 'Sending…' : 'Email me a code'} onPress={() => sendCode()} disabled={busy || !email.includes('@')} />
          </> : <>
            <T v="hero">Lunch for the whole office, ordered by 10:30.</T>
            <Gap h={space.m} />
            <T v="body">Sign in with your work email. Your office admin decides whether you see the staff, admin or caterer side.</T>
            <Gap h={space.xxl} />
            <T v="label">Work email</T><Gap h={space.s} />
            <TextInput testID="email-input" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="name@company.my" placeholderTextColor={color.faint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={input} onSubmitEditing={() => sendCode()} />
            {err && <T v="small" testID="signin-error" style={{ color: color.danger, marginTop: space.s }}>{err}</T>}
            <Gap h={space.m} />
            <Button testID="send-code" label={busy ? 'Sending…' : 'Send sign-in code'} onPress={() => sendCode()} disabled={busy || !email.includes('@')} />
            <Gap h={space.l} />
            <Pressable testID="to-signup" onPress={() => switchMode('signup')} hitSlop={10} style={{ flexDirection: 'row', gap: space.xs, justifyContent: 'center' }}>
              <T v="small">New office?</T><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>Sign up</T>
            </Pressable>
            <Gap h={space.xxxl} />
            <Row style={{ gap: space.s }}><View style={{ flex: 1, height: 1, backgroundColor: color.line }} /><T v="label">Demo accounts</T><View style={{ flex: 1, height: 1, backgroundColor: color.line }} /></Row>
            <Gap h={space.l} />
            {ACCOUNTS.map(a => (
              <Pressable key={a.role} testID={`account-${a.role}`} onPress={() => sendCode(a.email)} style={({ pressed }) => ({ borderWidth: 1, borderColor: color.line, borderRadius: radius.m, padding: space.l, marginBottom: space.s, backgroundColor: color.surface, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
                <Row style={{ gap: space.m }}>
                  <View style={{ width: 36, height: 36, borderRadius: radius.s, backgroundColor: a.role === 'admin' ? '#16222E' : a.role === 'caterer' ? '#121211' : color.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={a.role === 'admin' ? 'building' : a.role === 'caterer' ? 'bowl' : 'users'} size={18} c={a.role === 'caterer' ? '#E5A93E' : '#FFFFFF'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="h2" style={{ fontSize: 15 }}>{a.name}</T>
                    <T v="small" numberOfLines={1}>{a.detail}</T>
                    <T v="small" style={{ fontFamily: font.mono, fontSize: 12, color: color.faint }} numberOfLines={1}>{a.email}</T>
                  </View>
                  <Icon name="chevron" size={16} c={color.faint} />
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

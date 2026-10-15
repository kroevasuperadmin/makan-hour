import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, color, font, Gap, Icon, radius, Row, space, T } from '@makan/ui';
import { Account, ACCOUNTS, DEMO_CODE, findAccount } from './accounts';
import { Wordmark } from './Wordmark';

export default function SignIn({ onSignedIn }: { onSignedIn: (a: Account) => void }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const acct = findAccount(email);
  const input = { borderWidth: 1, borderColor: color.line, borderRadius: radius.s, paddingHorizontal: space.l, paddingVertical: space.m, fontFamily: font.body, fontSize: 17, color: color.ink, backgroundColor: color.surface } as const;

  const sendCode = (e = email) => {
    if (!findAccount(e)) { setErr('We don’t recognise that work email. Use one of the demo accounts below.'); return; }
    setEmail(e); setErr(null); setCode(''); setStep('code');
  };
  const verify = () => {
    if (code !== DEMO_CODE) { setErr('That code doesn’t match. Check the demo code above.'); return; }
    const a = findAccount(email); if (a) onSignedIn(a);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
          <Wordmark />
          <Gap h={space.xxxl} />
          {step === 'email' ? <>
            <T v="hero">Lunch for the whole office, ordered by 10:30.</T>
            <Gap h={space.m} />
            <T v="body">Sign in with your work email. Staff, office admins and caterers all use this app, and each sees their own part of it.</T>
            <Gap h={space.xxl} />
            <T v="label">Work email</T><Gap h={space.s} />
            <TextInput testID="email-input" value={email} onChangeText={t => { setEmail(t); setErr(null); }} placeholder="name@company.my" placeholderTextColor={color.faint} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={input} onSubmitEditing={() => sendCode()} />
            {err && <T v="small" style={{ color: color.danger, marginTop: space.s }}>{err}</T>}
            <Gap h={space.m} />
            <Button testID="send-code" label="Send sign-in code" onPress={() => sendCode()} disabled={!email.includes('@')} />
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
          </> : <>
            <Pressable testID="back-to-email" onPress={() => { setStep('email'); setErr(null); }} hitSlop={10}><T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong, textDecorationLine: 'underline' }}>Use a different email</T></Pressable>
            <Gap h={space.xl} />
            <T v="h1">Enter your code</T>
            <Gap h={space.s} />
            <T v="body">We sent a 6-digit code to <T v="body" style={{ color: color.ink, fontFamily: font.bodyStrong }}>{email}</T>.</T>
            <Gap h={space.l} />
            <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: color.warn, backgroundColor: color.warnSoft, borderRadius: radius.s, padding: space.m }}>
              <T v="small" style={{ color: color.warn }}>Demo build: no email is sent. The code is <T v="small" style={{ color: color.warn, fontFamily: font.bodyStrong }}>{DEMO_CODE}</T>.</T>
            </View>
            <Gap h={space.xl} />
            <TextInput testID="code-input" value={code} onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setErr(null); }} placeholder="000000" placeholderTextColor={color.faint} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} style={[input, { fontFamily: font.mono, fontSize: 28, letterSpacing: 8, textAlign: 'center' }]} onSubmitEditing={verify} />
            {err && <T v="small" style={{ color: color.danger, marginTop: space.s }}>{err}</T>}
            <Gap h={space.m} />
            <Button testID="fill-code" kind="secondary" label="Paste demo code" onPress={() => { setCode(DEMO_CODE); setErr(null); }} />
            <Gap h={space.s} />
            <Button testID="verify" label={acct ? `Sign in as ${acct.name.split(' ')[0]}` : 'Sign in'} onPress={verify} disabled={code.length !== 6} />
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

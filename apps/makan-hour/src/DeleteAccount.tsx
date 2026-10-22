import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { Button, color, fieldStyle, font, Gap, radius, space, T } from '@makan/ui';
import { deleteMyAccount, useStore } from '@makan/core';
import { Account } from './accounts';

// Sits next to Sign out in every role's header. Real accounts are deleted on the server
// (api/account/delete.js). Demo accounts are shared, so they only reset the demo and sign out.
export function DeleteAccount({ account, onDone, c }: { account: Account; onDone: () => void; c: string }) {
  const { dispatch } = useStore();
  const [open, setOpen] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const close = () => { if (busy) return; setOpen(false); setTyped(''); setErr(''); };
  const go = async () => {
    setBusy(true); setErr('');
    try {
      if (account.real) await deleteMyAccount(); else dispatch({ t: 'reset' });
      setOpen(false); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <Pressable testID="delete-account" onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="Delete account"><T v="small" style={{ color: c, fontFamily: font.semi, textDecorationLine: 'underline' }}>Delete account</T></Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,15,20,0.45)', justifyContent: 'center', padding: space.xl }}>
          <View style={{ backgroundColor: color.surface, borderRadius: radius.m, padding: space.xl, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
            <T v="h1" style={{ fontSize: 24 }}>Delete your account?</T>
            <Gap h={space.s} />
            {account.real
              ? <T v="body">This deletes your sign-in, your name, email and office membership, and your notification tokens. Your past orders stay in our records without your name on them. You can't undo this.</T>
              : <T v="body">This is a demo account, so it won't be deleted. The demo resets for everyone signed in and you're signed out.</T>}
            <Gap h={space.l} />
            <T v="small">Type DELETE to confirm.</T>
            <Gap h={space.xs} />
            <TextInput testID="delete-confirm-input" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" placeholderTextColor={color.faint}
              style={[fieldStyle(), { fontFamily: font.bodyStrong, letterSpacing: 2, backgroundColor: color.canvas }]} />
            {!!err && <><Gap h={space.s} /><T v="small" style={{ color: color.danger }} testID="delete-error">{err}</T></>}
            <Gap h={space.xl} />
            <Button testID="confirm-delete" label={busy ? 'Deleting…' : account.real ? 'Delete my account' : 'Reset demo and sign out'} disabled={typed.trim() !== 'DELETE' || busy} onPress={go} />
            <Gap h={space.s} />
            <Button kind="ghost" label="Keep my account" onPress={close} />
          </View>
        </View>
      </Modal>
    </>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { getAdminDomain, inviteMember, listMembers, setAdminDomain, looksLikeEmail, Member, NotSetUp, removeMember, Role, setMemberRole } from '@makan/core';
import { Badge, Button, Card, color, Divider, fieldStyle, font, Gap, radius, Row, Segmented, space, T } from '@makan/ui';
import { Account } from './accounts';

const ROLES: { key: Role; label: string }[] = [{ key: 'employee', label: 'Staff' }, { key: 'caterer', label: 'Caterer' }, { key: 'admin', label: 'Admin' }];
const word = (r: Role) => ROLES.find(x => x.key === r)!.label;

// Office admins add people and set their role. Nobody picks their own: the database only
// accepts new member rows from an admin of that office (supabase/makan_migration_2.sql).
export default function Team({ account }: { account: Account }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState(''), [name, setName] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const officeId = account.officeId!;
  const load = useCallback(async () => {
    try { setMembers(await listMembers(officeId)); } catch (e) { setMsg({ ok: false, t: e instanceof NotSetUp ? 'Team management needs the latest database update.' : (e as Error).message }); }
  }, [officeId]);
  useEffect(() => { load(); }, [load]);
  const [domain, setDomain] = useState(''), [savedDomain, setSavedDomain] = useState<string | null>(null);
  useEffect(() => { getAdminDomain(officeId).then(d => { setSavedDomain(d); setDomain(d ?? ''); }).catch(() => {}); }, [officeId]);
  const saveDomain = () => {
    const d = domain.trim().replace(/^@/, '').toLowerCase();
    if (d && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { setMsg({ ok: false, t: 'Enter a domain like contoh-capital.my.' }); return; }
    if (d && !account.email.endsWith('@' + d)) { setMsg({ ok: false, t: `Your own email isn’t at ${d}, so this would lock you out.` }); return; }
    act(async () => { await setAdminDomain(officeId, d); setSavedDomain(d || null); }, d ? `Only @${d} addresses can sign in as admin now.` : 'Any added email can sign in as admin.');
  };
  const act = async (f: () => Promise<void>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await f(); setMsg({ ok: true, t: ok }); await load(); }
    catch (e) { const m = (e as Error).message; setMsg({ ok: false, t: /duplicate|unique/i.test(m) ? 'That email is already on your team.' : m }); }
    finally { setBusy(false); }
  };
  const invite = () => {
    if (!looksLikeEmail(email)) { setMsg({ ok: false, t: 'Enter a full email address.' }); return; }
    const e = email.trim().toLowerCase();
    act(async () => { await inviteMember(officeId, e, role, name); setEmail(''); setName(''); },
      `${e} added as ${word(role).toLowerCase()}. They sign in as ${word(role).toLowerCase()} with Google, Microsoft or a password on that address.`);
  };
  const input = fieldStyle();
  return (
    <View style={{ paddingHorizontal: space.xl, paddingBottom: space.xxxl }}>
      <T v="label">{account.org}</T><Gap h={space.s} />
      <T v="h1">Your team</T>
      <T v="small">Add people by work email and choose their role. You can change it later.</T>
      <Gap h={space.l} />
      <Card>
        <T v="label">Add someone</T><Gap h={space.s} />
        <TextInput testID="invite-email" value={email} onChangeText={setEmail} placeholder="name@company.my" placeholderTextColor={color.faint} autoCapitalize="none" keyboardType="email-address" style={input} />
        <Gap h={space.s} />
        <TextInput testID="invite-name" value={name} onChangeText={setName} placeholder="Name (optional)" placeholderTextColor={color.faint} style={input} />
        <Gap h={space.m} />
        <Segmented testPrefix="invite-role" value={role} onChange={setRole} items={ROLES} />
        <Gap h={space.m} />
        <Button testID="invite-send" label={busy ? 'Adding…' : `Add as ${word(role).toLowerCase()}`} onPress={invite} disabled={busy || !email.includes('@')} />
        {msg && <T v="small" style={{ marginTop: space.s, color: msg.ok ? color.accent : color.danger }}>{msg.t}</T>}
      </Card>
      <Gap h={space.l} />
      <Card>
        <T v="label">Admin email domain</T><Gap h={space.s} />
        <T v="small">Optional. When set, admins must sign in with an address at this domain, even if someone added them.</T>
        <Gap h={space.s} />
        <Row style={{ gap: space.s }}>
          <TextInput testID="admin-domain" value={domain} onChangeText={setDomain} placeholder={account.email.split('@')[1] ?? 'company.my'} placeholderTextColor={color.faint} autoCapitalize="none" style={[input, { flex: 1 }]} />
          <Button testID="admin-domain-save" kind="secondary" label="Save" onPress={saveDomain} disabled={busy || domain.trim().toLowerCase() === (savedDomain ?? '')} />
        </Row>
      </Card>
      <Gap h={space.l} />
      <Card style={{ paddingVertical: space.xs }}>
        {members === null && <T v="small" style={{ paddingVertical: space.m }}>Loading…</T>}
        {members?.map((m, i) => {
          const self = m.email === account.email;
          return (
            <View key={m.id}>{i > 0 && <Divider />}
              <Row style={{ paddingVertical: space.m, gap: space.m }}>
                <View style={{ flex: 1 }}>
                  <T v="body" style={{ color: color.ink, fontFamily: font.semi }} numberOfLines={1}>{m.name || m.email}</T>
                  <T v="small" numberOfLines={1}>{m.name ? `${m.email} · ` : ''}{m.userId ? 'Signed in' : 'Not signed in yet'}</T>
                </View>
                {self ? <Badge label="You · admin" tone="accent" /> : <>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Change role for ${m.email}`} disabled={busy}
                    onPress={() => { const next = ROLES[(ROLES.findIndex(r => r.key === m.role) + 1) % ROLES.length].key; act(() => setMemberRole(m.id, next), `${m.email} is now ${word(next).toLowerCase()}.`); }}
                    style={{ backgroundColor: color.sunk, borderRadius: 4, paddingHorizontal: space.m, minHeight: 44, justifyContent: 'center' }}>
                    <T v="small" style={{ color: color.ink, fontFamily: font.bodyStrong }}>{word(m.role)} ▾</T>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.email}`} disabled={busy} hitSlop={8} onPress={() => act(() => removeMember(m.id), `${m.email} removed.`)}>
                    <T v="small" style={{ color: color.danger, textDecorationLine: 'underline' }}>Remove</T>
                  </Pressable>
                </>}
              </Row>
            </View>
          );
        })}
      </Card>
      <T v="small" style={{ marginTop: space.s }}>Tap a role to cycle it: staff, caterer, admin.</T>
    </View>
  );
}

// Shown at the top of every role view for a real (non-demo) account.
export function SampleNote({ account }: { account: Account }) {
  return (
    <View style={{ marginHorizontal: space.xl, marginTop: space.l, padding: space.m, borderRadius: radius.s, backgroundColor: color.infoSoft }}>
      <T v="small" style={{ color: color.info }}>Signed in as {account.email} · {account.org}. Menus, orders and drops below are sample data until your caterers go live.</T>
    </View>
  );
}

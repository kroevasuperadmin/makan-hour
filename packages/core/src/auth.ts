// Real sign-up and sign-in with Supabase Auth: Google, Microsoft, Apple and email + password.
// The identity only proves who someone is; the role comes from makan_members, set by an office
// admin. Tables and functions come from supabase/makan_migration_2.sql and _3.sql. Until it has run, calls throw NotSetUp and the app says so.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SB_KEY, SB_URL } from './live';
import { openDemoOn } from './open-demo';
import { Role } from './types';

export class NotSetUp extends Error {}
export type Membership = { memberId: string; officeId: string; company: string; building: string | null; role: Role; name: string | null };
export type Member = { id: string; email: string; name: string | null; role: Role; userId: string | null };

const MISSING = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
function check<T>(r: { data: T; error: { code?: string; message: string } | null }): T {
  if (r.error) { if (MISSING.has(r.error.code ?? '')) throw new NotSetUp('Sign-up is not switched on yet'); throw new Error(r.error.message); }
  return r.data;
}
// A separate client: once someone signs in, this one sends their user token. The shared demo
// tables stay on the anon client in live.ts, which keeps working for everyone.
// On the web the OAuth round trip reloads the page, so the session and PKCE verifier live in
// localStorage. Native keeps them in memory: the in-app browser returns to the same process.
const isWeb = typeof document !== 'undefined';
const auth: SupabaseClient | null = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { flowType: 'pkce', persistSession: isWeb, detectSessionInUrl: isWeb, autoRefreshToken: true, storageKey: 'makan-auth' } }) : null;
export const authClient = () => db();
export { SB_URL, SB_KEY };
const db = () => { if (!auth) throw new NotSetUp('No database configured'); return auth; };
export const authAvailable = () => !!auth;
export const normEmail = (e: string) => e.trim().toLowerCase();
export const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const friendly = (m: string) =>
  /invalid login credentials/i.test(m) ? 'That email and password don’t match.'
  : /email not confirmed/i.test(m) ? 'Confirm your email first. The link is in your inbox.'
  : /already registered/i.test(m) ? 'That email already has an account. Sign in instead.'
  : /password should be/i.test(m) ? 'Use at least 8 characters for your password.'
  : m;
export async function signInPassword(email: string, password: string) {
  const { error } = await db().auth.signInWithPassword({ email: normEmail(email), password });
  if (error) throw new Error(friendly(error.message));
}
// Returns true when the account is ready, false when Supabase wants the address confirmed first.
export async function signUpPassword(email: string, password: string, redirectTo: string): Promise<boolean> {
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
  const { data, error } = await db().auth.signUp({ email: normEmail(email), password, options: { emailRedirectTo: redirectTo } });
  if (error) throw new Error(friendly(error.message));
  return !!data.session;
}
export async function accessToken(): Promise<string | null> {
  if (!auth) return null;
  const { data } = await auth.auth.getSession();
  return data.session?.access_token ?? null;
}
export async function signedInEmail(): Promise<string | null> {
  if (!auth) return null;
  const { data } = await auth.auth.getSession();
  return data.session?.user.email?.toLowerCase() ?? null;
}
export async function getAdminDomain(officeId: string): Promise<string | null> {
  if (openDemoOn()) return null;
  const r = check(await db().from('makan_offices').select('admin_domain').eq('id', officeId).maybeSingle()) as { admin_domain: string | null } | null;
  return r?.admin_domain ?? null;
}
export async function setAdminDomain(officeId: string, domain: string) {
  if (openDemoOn()) throw new Error('Open demo cannot change office members');
  check(await db().rpc('makan_set_admin_domain', { p_office: officeId, p_domain: domain }));
}
export async function myMemberships(): Promise<Membership[]> {
  if (openDemoOn()) return [];
  const rows = check(await db().rpc('makan_claim_invites')) as { member_id: string; office_id: string; company: string; building: string | null; role: Role; name: string | null }[];
  return (rows ?? []).map(r => ({ memberId: r.member_id, officeId: r.office_id, company: r.company, building: r.building, role: r.role, name: r.name }));
}
export async function createOffice(p: { company: string; building: string; district: string; name: string }): Promise<string> {
  if (openDemoOn()) throw new Error('Open demo cannot create an office');
  return check(await db().rpc('makan_create_office', { p_company: p.company, p_building: p.building, p_district: p.district, p_name: p.name })) as string;
}
export async function listMembers(officeId: string): Promise<Member[]> {
  if (openDemoOn()) return [];
  const rows = check(await db().from('makan_members').select('id,email,name,role,user_id').eq('office_id', officeId).order('created_at')) as { id: string; email: string; name: string | null; role: Role; user_id: string | null }[];
  return rows.map(r => ({ id: r.id, email: r.email, name: r.name, role: r.role, userId: r.user_id }));
}
export async function inviteMember(officeId: string, email: string, role: Role, name: string) {
  if (openDemoOn()) throw new Error('Open demo cannot change office members');
  const { data } = await db().auth.getUser();
  check(await db().from('makan_members').insert({ office_id: officeId, email: normEmail(email), role, name: name.trim() || null, invited_by: data.user?.id }));
}
export async function setMemberRole(id: string, role: Role) {
  if (openDemoOn()) throw new Error('Open demo cannot change office members');
  check(await db().from('makan_members').update({ role }).eq('id', id));
}
export async function removeMember(id: string) {
  if (openDemoOn()) throw new Error('Open demo cannot change office members');
  check(await db().from('makan_members').delete().eq('id', id));
}
export async function signOutReal() { try { await auth?.auth.signOut(); } catch { /* already out */ } }
// True once makan_migration_2.sql has run. Before sign-in the RPC answers "permission denied"
// if it exists, or "not found" if it doesn't.
export async function signUpReady(): Promise<boolean> {
  if (!auth) return false;
  const { error } = await auth.rpc('makan_claim_invites');
  return !(error && MISSING.has(error.code ?? ''));
}
// Deletes the signed-in user's account through the server route apps/makan-hour/api/account/delete.js.
const API = (process.env.EXPO_PUBLIC_API_URL || 'https://makanhour.rizqey.com/app').replace(/\/$/, '');
export async function deleteMyAccount() {
  const { data } = await db().auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Your session has expired. Sign in again, then delete.');
  const r = await fetch(`${API}/api/account/delete`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: '{}' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Deletion failed (${r.status})`);
  await signOutReal();
}

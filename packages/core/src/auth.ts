// Real sign-up and sign-in with Supabase Auth email codes. Tables and functions come from
// supabase/makan_migration_2.sql. Until it has run, calls throw NotSetUp and the app says so.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SB_KEY, SB_URL } from './live';
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
const auth: SupabaseClient | null = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: true, storageKey: 'makan-auth' } }) : null;
const db = () => { if (!auth) throw new NotSetUp('No database configured'); return auth; };
export const authAvailable = () => !!auth;
export const normEmail = (e: string) => e.trim().toLowerCase();
export const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export async function sendCode(email: string) {
  const { error } = await db().auth.signInWithOtp({ email: normEmail(email), options: { shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}
export async function verifyCode(email: string, token: string) {
  const { error } = await db().auth.verifyOtp({ email: normEmail(email), token, type: 'email' });
  if (error) throw new Error(error.message.includes('expired') || error.message.includes('invalid') ? 'That code is wrong or has expired.' : error.message);
}
export async function myMemberships(): Promise<Membership[]> {
  const rows = check(await db().rpc('makan_claim_invites')) as { member_id: string; office_id: string; company: string; building: string | null; role: Role; name: string | null }[];
  return (rows ?? []).map(r => ({ memberId: r.member_id, officeId: r.office_id, company: r.company, building: r.building, role: r.role, name: r.name }));
}
export async function createOffice(p: { company: string; building: string; district: string; name: string }): Promise<string> {
  return check(await db().rpc('makan_create_office', { p_company: p.company, p_building: p.building, p_district: p.district, p_name: p.name })) as string;
}
export async function listMembers(officeId: string): Promise<Member[]> {
  const rows = check(await db().from('makan_members').select('id,email,name,role,user_id').eq('office_id', officeId).order('created_at')) as { id: string; email: string; name: string | null; role: Role; user_id: string | null }[];
  return rows.map(r => ({ id: r.id, email: r.email, name: r.name, role: r.role, userId: r.user_id }));
}
export async function inviteMember(officeId: string, email: string, role: Role, name: string) {
  const { data } = await db().auth.getUser();
  check(await db().from('makan_members').insert({ office_id: officeId, email: normEmail(email), role, name: name.trim() || null, invited_by: data.user?.id }));
}
export async function setMemberRole(id: string, role: Role) { check(await db().from('makan_members').update({ role }).eq('id', id)); }
export async function removeMember(id: string) { check(await db().from('makan_members').delete().eq('id', id)); }
export async function signOutReal() { try { await auth?.auth.signOut(); } catch { /* already out */ } }
// True once makan_migration_2.sql has run. Before sign-in the RPC answers "permission denied"
// if it exists, or "not found" if it doesn't.
export async function signUpReady(): Promise<boolean> {
  if (!auth) return false;
  const { error } = await auth.rpc('makan_claim_invites');
  return !(error && MISSING.has(error.code ?? ''));
}

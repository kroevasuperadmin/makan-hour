// Signed-in marketplace reads and writes. The user JWT calls security-definer functions.
// Roles come from makan_members. Order rows still use the migration 5 tables.
// This file never uses the service role, never prints a key, and never touches office-lunch tables.
// Calls throw before any network when MAKAN_MARKETPLACE_DB is not exactly "on".
import { authClient, NotSetUp } from './auth';
import { requireMarketplaceDb } from './market-flag';
import { isMarketDoor, MarketDoor, MarketState } from './market';

export type MarketMembership = {
  memberId: string;
  role: MarketDoor;
  name: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
};

const MISSING = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
function gate() { requireMarketplaceDb(); }
function unwrap<T>(r: { data: T; error: { code?: string; message: string } | null }): T {
  if (r.error) {
    if (MISSING.has(r.error.code ?? '')) throw new NotSetUp('Marketplace sign-in is not on the database yet');
    throw new Error(r.error.message);
  }
  return r.data;
}

type ClaimRow = { member_id: string; role: string; name: string | null; restaurant_id: string | null; restaurant_name: string | null };

export async function claimMarket(): Promise<MarketMembership[]> {
  gate();
  const rows = unwrap(await authClient().rpc('makan_claim_market')) as ClaimRow[] | null;
  return (rows ?? []).flatMap(r => isMarketDoor(r.role) ? [{ memberId: r.member_id, role: r.role, name: r.name, restaurantId: r.restaurant_id, restaurantName: r.restaurant_name }] : []);
}

export async function loadMarket(role: MarketDoor): Promise<Pick<MarketState, 'restaurants' | 'items' | 'orders'>> {
  gate();
  const data = unwrap(await authClient().rpc('makan_market_feed', { p_role: role })) as Pick<MarketState, 'restaurants' | 'items' | 'orders'>;
  return { restaurants: data?.restaurants ?? [], items: data?.items ?? [], orders: data?.orders ?? [] };
}

export async function placeMarketOrder(p: { restaurantId: string; address: string; note: string; lines: { itemId: string; qty: number }[] }): Promise<{ id: string; totalSen: number }> {
  gate();
  return unwrap(await authClient().rpc('makan_place_order', { p_restaurant: p.restaurantId, p_address: p.address, p_note: p.note, p_lines: p.lines })) as { id: string; totalSen: number };
}

export async function vendorAdvance(orderId: string) { gate(); unwrap(await authClient().rpc('makan_vendor_advance', { p_order: orderId })); }
export async function riderPickup(orderId: string) { gate(); unwrap(await authClient().rpc('makan_rider_pickup', { p_order: orderId })); }
export async function riderDeliver(orderId: string) { gate(); unwrap(await authClient().rpc('makan_rider_deliver', { p_order: orderId })); }
export async function vendorToggle(itemId: string) { gate(); unwrap(await authClient().rpc('makan_vendor_toggle', { p_item: itemId })); }

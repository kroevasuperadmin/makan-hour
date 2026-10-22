// Signed-in marketplace reads and writes. The user JWT calls security-definer functions.
// This file never uses the service role and never touches office-lunch tables.
import { authClient, NotSetUp } from './auth';
import { MarketState } from './market';

export type MarketMembership = {
  memberId: string;
  role: 'customer' | 'vendor' | 'rider' | 'admin';
  name: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
};

const MISSING = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
function unwrap<T>(r: { data: T; error: { code?: string; message: string } | null }): T {
  if (r.error) {
    if (MISSING.has(r.error.code ?? '')) throw new NotSetUp('Marketplace sign-in is not on the database yet');
    throw new Error(r.error.message);
  }
  return r.data;
}

export async function claimMarket(): Promise<MarketMembership[]> {
  const rows = unwrap(await authClient().rpc('makan_claim_market')) as { member_id: string; role: MarketMembership['role']; name: string | null; restaurant_id: string | null; restaurant_name: string | null }[] | null;
  return (rows ?? []).map(r => ({ memberId: r.member_id, role: r.role, name: r.name, restaurantId: r.restaurant_id, restaurantName: r.restaurant_name }));
}

export async function loadMarket(): Promise<Pick<MarketState, 'restaurants' | 'items' | 'orders'>> {
  const data = unwrap(await authClient().rpc('makan_market_feed')) as Pick<MarketState, 'restaurants' | 'items' | 'orders'>;
  return { restaurants: data?.restaurants ?? [], items: data?.items ?? [], orders: data?.orders ?? [] };
}

export async function placeMarketOrder(p: { restaurantId: string; address: string; note: string; lines: { itemId: string; qty: number }[] }): Promise<{ id: string; totalSen: number }> {
  return unwrap(await authClient().rpc('makan_place_order', { p_restaurant: p.restaurantId, p_address: p.address, p_note: p.note, p_lines: p.lines })) as { id: string; totalSen: number };
}

export async function vendorAdvance(orderId: string) { unwrap(await authClient().rpc('makan_vendor_advance', { p_order: orderId })); }
export async function riderPickup(orderId: string) { unwrap(await authClient().rpc('makan_rider_pickup', { p_order: orderId })); }
export async function riderDeliver(orderId: string) { unwrap(await authClient().rpc('makan_rider_deliver', { p_order: orderId })); }
export async function vendorToggle(itemId: string) { unwrap(await authClient().rpc('makan_vendor_toggle', { p_item: itemId })); }

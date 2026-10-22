// The marketplace stays on in-memory mock data unless this is exactly "on".
// Expo only inlines EXPO_PUBLIC_* into the client, so the app switch is
// EXPO_PUBLIC_MAKAN_MARKETPLACE_DB. Scripts can set MAKAN_MARKETPLACE_DB.
// The public name wins when both are set, so a build cannot be turned on by accident
// from a server-only variable the client cannot see.

export function marketplaceDbOn(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.EXPO_PUBLIC_MAKAN_MARKETPLACE_DB ?? env.MAKAN_MARKETPLACE_DB ?? '';
  return raw === 'on';
}

export function requireMarketplaceDb(env: Record<string, string | undefined> = process.env): void {
  if (!marketplaceDbOn(env)) throw new Error('Marketplace database is off');
}

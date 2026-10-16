// Late-delivery alerts as system notifications. Native: expo-notifications (local notification,
// fired the moment the delay reaches this device over realtime). Web: the browser Notification API.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

if (Platform.OS !== 'web') {
  // While the app is open, the in-app banner plus the local alert already cover a delay, so a server
  // push arriving in the foreground goes to the list only. With the app closed, iOS shows it normally.
  Notifications.setNotificationHandler({ handleNotification: async n => {
    const remote = (n.request.trigger as { type?: string } | null)?.type === 'push';
    return { shouldShowBanner: !remote, shouldShowList: true, shouldPlaySound: !remote, shouldSetBadge: false };
  } });
}

let asked: Promise<boolean> | null = null;
export function askPermission(): Promise<boolean> {
  if (asked) return asked;
  asked = (async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof Notification === 'undefined') return false;
        if (Notification.permission === 'granted') return true;
        return (await Notification.requestPermission()) === 'granted';
      }
      const cur = await Notifications.getPermissionsAsync();
      if (cur.granted) return true;
      return (await Notifications.requestPermissionsAsync()).granted;
    } catch { return false; }
  })();
  return asked;
}

export async function notify(title: string, body: string) {
  if (!(await askPermission())) return;
  try {
    if (Platform.OS === 'web') { new Notification(title, { body, tag: 'makan-delay' }); return; }
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch { /* the in-app banner still shows */ }
}

const API = (process.env.EXPO_PUBLIC_API_URL || 'https://makanhour.rizqey.com/app').replace(/\/$/, '');

// Registers this iPhone's APNs token with our server so late-drop alerts arrive with the app closed.
export async function registerForPush(role: 'employee' | 'admin') {
  if (Platform.OS !== 'ios') return;
  try {
    if (!(await askPermission())) return;
    const t = await Notifications.getDevicePushTokenAsync();
    await fetch(`${API}/api/push/register`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: String(t.data), platform: 'ios', role, employeeId: role === 'admin' ? 'admin' : 'me', officeId: 'o1' }) });
  } catch { /* local alerts still work */ }
}
export function useRegisterPush(role: 'employee' | 'admin') { useEffect(() => { registerForPush(role); }, [role]); }

// Asks the server to push a delay to that office's phones. It re-reads the drop from the database.
export function pushDelay(officeId: string) {
  setTimeout(() => { fetch(`${API}/api/push/delay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ officeId }) }).catch(() => {}); }, 2500);
}

// Fires once each time `key` changes to a new non-null value after the first render.
export function useAlertOnChange(key: string | null, title: string, body: string, enabled = true) {
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prev.current !== undefined && key && key !== prev.current && enabled) notify(title, body);
    prev.current = key;
  }, [key, enabled]);
}

// Late-delivery alerts as system notifications. Native: expo-notifications (local notification,
// fired the moment the delay reaches this device over realtime). Web: the browser Notification API.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
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

// Fires once each time `key` changes to a new non-null value after the first render.
export function useAlertOnChange(key: string | null, title: string, body: string, enabled = true) {
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prev.current !== undefined && key && key !== prev.current && enabled) notify(title, body);
    prev.current = key;
  }, [key, enabled]);
}

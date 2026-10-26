import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const KEY = 'bolingo.remindersOn';

/** Foreground presentation: banner + sound + badge. */
export function configureReminderHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Daily 7pm streak nudge. Client-scheduled (no server needed): fires every
 * day; the copy assumes the streak logic in lib/progress.
 * Push (remote) delivery needs EAS + a push service — this is local-only.
 */
export async function setRemindersOn(on: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (!on) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.setItem(KEY, '0');
      return false;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keep your streak alive! 🔥',
        body: 'One quick lesson keeps the XP flowing. Your future self says thanks.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
    });
    await AsyncStorage.setItem(KEY, '1');
    return true;
  } catch (e) {
    console.warn('Reminders failed:', e);
    return false;
  }
}

export async function areRemindersOn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

const KEY = 'bolingo.remindersOn';
const ID_KEY = 'bolingo.reminderId';
const CHANNEL_ID = 'lesson-reminders';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;
const REMINDER_KIND = 'lesson-reminder';
const TEST_KIND = 'lesson-reminder-test';

type ScheduledRequest = Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>[number];

/** Local notifications are a native feature; the web build has no OS scheduler. */
export function remindersSupported(): boolean {
  return Platform.OS !== 'web';
}

/** Foreground presentation: banner + sound, no badge noise. */
export function configureReminderHandler(): void {
  if (!remindersSupported()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lesson reminders',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
  });
}

async function scheduleDaily(): Promise<string> {
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bingo saved your spot 🦉',
      body: 'One quick lesson today keeps your streak alive. Pick up where you left off.',
      sound: 'default',
      data: { kind: REMINDER_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
      channelId: CHANNEL_ID,
    },
  });
}

async function cancelReminder(id: string | null): Promise<void> {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** The scheduled nudge, whether or not the stored id survived a reinstall. */
async function findScheduledReminder(): Promise<ScheduledRequest | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const id = await AsyncStorage.getItem(ID_KEY);
  return scheduled.find((r) => r.identifier === id || r.content.data?.kind === REMINDER_KIND) ?? null;
}

async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * Daily 7pm streak nudge. Client-scheduled (no server needed): the OS fires it
 * every evening, even when the app is closed. Push (remote) delivery would need
 * EAS + a push service — this is local-only.
 *
 * Returns whether the requested state is actually in effect, so the Settings
 * switch can render the truth instead of optimism.
 */
export async function setRemindersOn(on: boolean): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    if (!on) {
      const storedId = await AsyncStorage.getItem(ID_KEY);
      // Clear state first: if the OS call fails midway, the next launch must
      // not interpret a stale "on" flag as permission to reschedule.
      await AsyncStorage.multiRemove([KEY, ID_KEY]);
      await cancelReminder(storedId);
      // Catch an orphan from an older build that only cancelled by id.
      const legacy = await findScheduledReminder();
      if (legacy) await cancelReminder(legacy.identifier);
      return false;
    }

    if (!(await requestPermission())) {
      // A revoked permission means any earlier schedule is a ghost: make the
      // stored state match the switch the learner is looking at.
      const ghost = await findScheduledReminder();
      if (ghost) await cancelReminder(ghost.identifier);
      await AsyncStorage.multiRemove([KEY, ID_KEY]);
      return false;
    }

    // Replace our previous nudge (and any orphan) so toggling never stacks them.
    const existing = await findScheduledReminder();
    if (existing) await cancelReminder(existing.identifier);

    const id = await scheduleDaily();
    await AsyncStorage.multiSet([
      [KEY, '1'],
      [ID_KEY, id],
    ]);
    return true;
  } catch (e) {
    console.warn('Reminders failed:', e);
    return false;
  }
}

/**
 * Truthful state: on-device flag + OS permission + a nudge actually queued.
 * A revoked permission or a cleared schedule reads as off.
 */
export async function areRemindersOn(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    if ((await AsyncStorage.getItem(KEY)) !== '1') return false;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return false;
    return (await findScheduledReminder()) !== null;
  } catch {
    return false;
  }
}

/**
 * Startup reconciliation. If the learner opted in and permission still holds,
 * make sure exactly one daily nudge is queued; never prompts on launch.
 */
export async function ensureReminderScheduled(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    if ((await AsyncStorage.getItem(KEY)) !== '1') return false;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return false;

    const existing = await findScheduledReminder();
    if (existing) {
      const storedId = await AsyncStorage.getItem(ID_KEY);
      if (storedId !== existing.identifier) {
        await AsyncStorage.setItem(ID_KEY, existing.identifier);
      }
      return true;
    }

    const id = await scheduleDaily();
    await AsyncStorage.setItem(ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/** Settings helper: a real notification five seconds out, same channel/copy style. */
export async function sendTestReminder(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    if (!(await requestPermission())) return false;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bolingo reminder test 🔔',
        body: "This is the nudge you'll get every evening at 7:00. Your streak is safe with Bingo.",
        sound: 'default',
        data: { kind: TEST_KIND },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  } catch (e) {
    console.warn('Test reminder failed:', e);
    return false;
  }
}

import * as Notifications from 'expo-notifications';
import { differenceInDays, parseISO } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleRegExpiryReminders(
  vehicleId: number,
  vehicleName: string,
  expiryDate: string
) {
  await cancelRegReminders(vehicleId);

  const expiry = parseISO(expiryDate);
  const now = new Date();
  const daysUntilExpiry = differenceInDays(expiry, now);

  const reminders = [
    { days: 30, label: '30 days' },
    { days: 7, label: '7 days' },
    { days: 0, label: 'today' },
  ];

  for (const reminder of reminders) {
    const daysFromNow = daysUntilExpiry - reminder.days;
    if (daysFromNow > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Registration Expiring',
          body: `${vehicleName} registration expires ${reminder.label === 'today' ? 'today!' : `in ${reminder.label}`}`,
          data: { vehicleId, type: 'reg_expiry' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: daysFromNow * 86400,
        },
        identifier: `reg-${vehicleId}-${reminder.days}`,
      });
    }
  }
}

export async function cancelRegReminders(vehicleId: number) {
  for (const days of [30, 7, 0]) {
    await Notifications.cancelScheduledNotificationAsync(`reg-${vehicleId}-${days}`).catch(() => {});
  }
}

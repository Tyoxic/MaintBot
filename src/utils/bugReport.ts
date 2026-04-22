import { Platform, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { getDatabase } from '../db/database';
import {
  getRecentErrors,
  getBreadcrumbs,
  getPreviousSession,
  LogEntry,
  Breadcrumb,
} from './errorLog';

const REPORT_EMAIL = 'tyoxic@gmail.com';

interface ReportContext {
  appVersion: string;
  updateId: string;
  platform: string;
  osVersion: string;
  deviceName: string;
  vehicleCount: number;
  maintenanceLogCount: number;
  currentErrors: LogEntry[];
  breadcrumbs: Breadcrumb[];
  previousSession: {
    startedAt: string;
    errors: LogEntry[];
    breadcrumbs: Breadcrumb[];
  } | null;
}

async function gatherContext(): Promise<ReportContext> {
  const db = await getDatabase();
  const vehicleRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vehicles'
  );
  const logRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM maintenance_log'
  );

  const prev = getPreviousSession();

  return {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    updateId: Updates.updateId ?? 'embedded',
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    deviceName: Constants.deviceName ?? 'unknown',
    vehicleCount: vehicleRow?.count ?? 0,
    maintenanceLogCount: logRow?.count ?? 0,
    currentErrors: getRecentErrors(),
    breadcrumbs: getBreadcrumbs(),
    previousSession: prev
      ? {
          startedAt: prev.sessionStartedAt,
          errors: prev.errors,
          breadcrumbs: prev.breadcrumbs,
        }
      : null,
  };
}

function formatErrors(errors: LogEntry[]): string {
  if (errors.length === 0) return '(none)';
  return errors
    .map((e) => `[${e.timestamp}] ${e.level.toUpperCase()}: ${e.message}`)
    .join('\n\n');
}

function formatBreadcrumbs(crumbs: Breadcrumb[]): string {
  if (crumbs.length === 0) return '(none)';
  return crumbs
    .map((c) => {
      const data = c.data ? ` ${JSON.stringify(c.data)}` : '';
      return `[${c.timestamp}] ${c.category}: ${c.message}${data}`;
    })
    .join('\n');
}

function buildBody(ctx: ReportContext): string {
  const prevBlock = ctx.previousSession
    ? `

PREVIOUS SESSION (started ${ctx.previousSession.startedAt}):
Errors:
${formatErrors(ctx.previousSession.errors)}

Breadcrumbs:
${formatBreadcrumbs(ctx.previousSession.breadcrumbs)}`
    : '';

  return `Describe the issue or feedback below this line:

------------------------------------------------------------

(Type your message here)




------------------------------------------------------------
DIAGNOSTIC DETAILS (auto-generated, please leave attached):

App Version:        ${ctx.appVersion}
Update ID:          ${ctx.updateId}
Platform:           ${ctx.platform}
OS Version:         ${ctx.osVersion}
Device:             ${ctx.deviceName}
Vehicles in app:    ${ctx.vehicleCount}
Maintenance logs:   ${ctx.maintenanceLogCount}

CURRENT SESSION:
Errors:
${formatErrors(ctx.currentErrors)}

Breadcrumbs (recent user actions):
${formatBreadcrumbs(ctx.breadcrumbs)}${prevBlock}
`;
}

export async function sendBugReport(): Promise<void> {
  const ctx = await gatherContext();
  const subject = `MaintBot Bug Report — v${ctx.appVersion}`;
  const body = buildBody(ctx);

  const url = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert(
      'No email app',
      `Couldn't open an email app. Please email ${REPORT_EMAIL} directly with your issue.`
    );
    return;
  }
  await Linking.openURL(url);
}

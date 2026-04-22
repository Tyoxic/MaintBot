import { File, Paths } from 'expo-file-system';

export interface LogEntry {
  level: 'error' | 'warn' | 'fatal';
  timestamp: string;
  message: string;
}

export interface Breadcrumb {
  category: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface PersistedLog {
  sessionStartedAt: string;
  errors: LogEntry[];
  breadcrumbs: Breadcrumb[];
}

const MAX_ERRORS = 20;
const MAX_BREADCRUMBS = 50;
const LOG_FILE_NAME = 'error_log.json';

const errorBuffer: LogEntry[] = [];
const breadcrumbBuffer: Breadcrumb[] = [];
const sessionStartedAt = new Date().toISOString();
let previousSession: PersistedLog | null = null;
let initialized = false;

function getLogFile(): File {
  return new File(Paths.document, LOG_FILE_NAME);
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}\n${arg.stack ?? ''}`;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function persist(): void {
  try {
    const file = getLogFile();
    const data: PersistedLog = {
      sessionStartedAt,
      errors: errorBuffer,
      breadcrumbs: breadcrumbBuffer,
    };
    file.write(JSON.stringify(data));
  } catch {
    // Persistence failure must not block operation
  }
}

function record(level: LogEntry['level'], args: unknown[]): void {
  const message = args.map(formatArg).join(' ');
  errorBuffer.push({ level, timestamp: new Date().toISOString(), message });
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.shift();
  }
  persist();
}

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  breadcrumbBuffer.push({
    category,
    message,
    timestamp: new Date().toISOString(),
    data,
  });
  if (breadcrumbBuffer.length > MAX_BREADCRUMBS) {
    breadcrumbBuffer.shift();
  }
}

function loadPreviousSession(): void {
  try {
    const file = getLogFile();
    if (!file.exists) return;
    const content = file.textSync();
    const parsed = JSON.parse(content) as PersistedLog;
    if (parsed.sessionStartedAt !== sessionStartedAt) {
      previousSession = parsed;
    }
  } catch {
    previousSession = null;
  }
}

export function initErrorLog(): void {
  if (initialized) return;
  initialized = true;

  loadPreviousSession();

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    record('error', args);
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    record('warn', args);
    originalWarn(...args);
  };

  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  };

  if (g.ErrorUtils?.setGlobalHandler && g.ErrorUtils.getGlobalHandler) {
    const originalHandler = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      record(isFatal ? 'fatal' : 'error', [
        `Uncaught${isFatal ? ' (fatal)' : ''}: ${error.message}`,
        error.stack ?? '',
      ]);
      originalHandler(error, isFatal);
    });
  }

  addBreadcrumb('app', 'Session started');
}

export function getRecentErrors(): LogEntry[] {
  return [...errorBuffer];
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbBuffer];
}

export function getPreviousSession(): PersistedLog | null {
  return previousSession;
}

export function clearPersistedLog(): void {
  try {
    const file = getLogFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore
  }
}

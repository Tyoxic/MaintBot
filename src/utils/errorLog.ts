interface LogEntry {
  level: 'error' | 'warn';
  timestamp: string;
  message: string;
}

const MAX_ENTRIES = 20;
const buffer: LogEntry[] = [];
let initialized = false;

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

function record(level: 'error' | 'warn', args: unknown[]): void {
  const message = args.map(formatArg).join(' ');
  buffer.push({ level, timestamp: new Date().toISOString(), message });
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }
}

export function initErrorLog(): void {
  if (initialized) return;
  initialized = true;

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
}

export function getRecentErrors(): LogEntry[] {
  return [...buffer];
}

export function clearErrorLog(): void {
  buffer.length = 0;
}

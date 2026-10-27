enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

const LOG_LEVEL_VALUES = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel =
  LOG_LEVEL_VALUES[
    (process.env.LOG_LEVEL || "info").toLowerCase() as keyof typeof LOG_LEVEL_VALUES
  ] ?? 2;

function formatTimestamp(): string {
  return new Date().toISOString();
}

const MAX_STRING_LENGTH = 4096;
const MAX_CAUSE_DEPTH = 5;

/**
 * Error properties that carry request data or user input: a pg unique violation's `detail` names
 * the conflicting email, HTTP client errors carry headers and bodies.
 */
const DROPPED_ERROR_KEYS = new Set(["detail", "headers", "config", "request", "response"]);

/**
 * V-255: an email address never reaches a log line. The privacy policy describes server logs as
 * request metadata, so every string the logger writes (message, meta, error messages and stacks)
 * has its addresses masked here, in one place, rather than at each call site:
 * `jane.doe@example.com` → `j***@e***.com`. Enough to tell two recipients apart in an incident,
 * not enough to recover either.
 */
const EMAIL =
  /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9])[A-Za-z0-9.-]*\.([A-Za-z]{2,63})\b/g;

export function maskEmails(value: string): string {
  return value.replace(EMAIL, "$1***@$2***.$3");
}

/** Meta keys that hold a URL whose path or query can carry personal data: only the origin stays. */
const ORIGIN_ONLY_KEYS = new Set(["referer", "referrer"]);

function originOnly(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "[unparseable]";
  }
}

function truncate(value: string): string {
  const masked = maskEmails(value);
  return masked.length > MAX_STRING_LENGTH
    ? `${masked.slice(0, MAX_STRING_LENGTH)}…[truncated ${masked.length - MAX_STRING_LENGTH} chars]`
    : masked;
}

/**
 * Copies log data into something `JSON.stringify` can write (V-159): an `Error` anywhere becomes
 * name, message, stack, own properties and cause (`JSON.stringify` alone writes `{}`), a reference
 * back to an ancestor becomes "[Circular]", the cause chain stops at MAX_CAUSE_DEPTH, and strings
 * are cut at MAX_STRING_LENGTH.
 */
function toLoggable(value: unknown, ancestors: WeakSet<object>, causeDepth: number): unknown {
  if (typeof value === "string") return truncate(value);
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value)) return "[Circular]";
  if (!(value instanceof Error) && typeof (value as { toJSON?: unknown }).toJSON === "function")
    return value;

  ancestors.add(value);
  try {
    if (value instanceof Error) return serializeError(value, ancestors, causeDepth);
    if (Array.isArray(value)) return value.map((item) => toLoggable(item, ancestors, causeDepth));
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        ORIGIN_ONLY_KEYS.has(key.toLowerCase()) && typeof item === "string"
          ? originOnly(item)
          : toLoggable(item, ancestors, causeDepth),
      ]),
    );
  } finally {
    ancestors.delete(value);
  }
}

function serializeError(
  error: Error,
  ancestors: WeakSet<object>,
  causeDepth: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(error)) {
    if (DROPPED_ERROR_KEYS.has(key) || key === "cause") continue;
    out[key] = toLoggable(item, ancestors, causeDepth);
  }

  out.name = truncate(String(error.name));
  out.message = truncate(String(error.message));
  if (error.stack) out.stack = truncate(error.stack);

  if (error.cause !== undefined)
    out.cause =
      causeDepth >= MAX_CAUSE_DEPTH
        ? "[Cause chain truncated]"
        : toLoggable(error.cause, ancestors, causeDepth + 1);

  return out;
}

function serialize(data: unknown, space?: number): string {
  return JSON.stringify(toLoggable(data, new WeakSet(), 0), null, space);
}

function writeLog(level: LogLevel, rawMessage: string, data?: unknown) {
  // Read per call, not from `#config`: the logger tests toggle NODE_ENV at runtime.
  const isProduction = process.env.NODE_ENV === "production";
  const message = maskEmails(rawMessage);

  if (isProduction) {
    const logObject: Record<string, unknown> = {
      timestamp: formatTimestamp(),
      level,
      message,
    };

    if (data !== undefined && data !== null) {
      if (data instanceof Error) logObject.error = data;
      else logObject.data = data;
    }

    let output: string;
    try {
      output = serialize(logObject) + "\n";
    } catch {
      // Still one parseable line carrying the message when the data cannot be written.
      const { timestamp } = logObject;
      output = JSON.stringify({ timestamp, level, message, data: "[Unserializable Data]" }) + "\n";
    }

    if (level === LogLevel.ERROR) process.stderr.write(output);
    else process.stdout.write(output);
  } else {
    const timestamp = formatTimestamp();
    const prefix = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined && data !== null) {
      let formattedData = "";

      if (data instanceof Error) formattedData = maskEmails(data.stack || data.message);
      else if (typeof data === "object") {
        try {
          formattedData = serialize(data, 2);
        } catch {
          formattedData = String(data);
        }
      } else formattedData = maskEmails(String(data));

      if (level === LogLevel.ERROR) console.error(prefix, formattedData);
      else if (level === LogLevel.WARN) console.warn(prefix, formattedData);
      else console.log(prefix, formattedData);
    } else {
      if (level === LogLevel.ERROR) console.error(prefix);
      else if (level === LogLevel.WARN) console.warn(prefix);
      else console.log(prefix);
    }
  }
}

export const logger = {
  error: (message: string, error?: unknown) => {
    if (LOG_LEVEL_VALUES.error <= currentLevel) writeLog(LogLevel.ERROR, message, error);
  },

  warn: (message: string, data?: unknown) => {
    if (LOG_LEVEL_VALUES.warn <= currentLevel) writeLog(LogLevel.WARN, message, data);
  },

  info: (message: string, data?: unknown) => {
    if (LOG_LEVEL_VALUES.info <= currentLevel) writeLog(LogLevel.INFO, message, data);
  },

  debug: (message: string, data?: unknown) => {
    if (LOG_LEVEL_VALUES.debug <= currentLevel) writeLog(LogLevel.DEBUG, message, data);
  },
};

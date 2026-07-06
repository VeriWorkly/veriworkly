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

function safeSerialize(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return "[Unserializable Data]";
  }
}

function writeLog(level: LogLevel, message: string, data?: unknown) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const logObject: Record<string, unknown> = {
      timestamp: formatTimestamp(),
      level,
      message,
    };

    if (data !== undefined && data !== null) {
      if (data instanceof Error)
        logObject.error = {
          name: data.name,
          message: data.message,
          stack: data.stack,
        };
      else logObject.data = data;
    }

    const output = safeSerialize(logObject) + "\n";

    if (level === LogLevel.ERROR) process.stderr.write(output);
    else process.stdout.write(output);
  } else {
    const timestamp = formatTimestamp();
    const prefix = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined && data !== null) {
      let formattedData = "";

      if (data instanceof Error) formattedData = data.stack || data.message;
      else if (typeof data === "object") {
        try {
          formattedData = JSON.stringify(data, null, 2);
        } catch {
          formattedData = String(data);
        }
      } else formattedData = String(data);

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

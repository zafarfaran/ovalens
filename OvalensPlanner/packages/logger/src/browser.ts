import type { Logger, LogLevel, LogEntry } from "./types";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(module: string, minLevel: LogLevel = "info"): Logger {
  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  };

  const log = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      module,
      context,
    };

    const consoleMethod = level === "debug" ? "log" : level;
    // eslint-disable-next-line no-console
    console[consoleMethod](`[${entry.module}]`, entry.message, context ?? "");
  };

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
  };
}

/**
 * Simple logger utility for consistent logging throughout the application
 */

/**
 * Log levels for the application
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  serviceName: string;
  minLogLevel?: LogLevel;
  enableTimestamps?: boolean;
}

/**
 * Create a new logger instance
 * @param config Logger configuration
 * @returns Logger instance
 */
export function createLogger(config: LoggerConfig): Logger {
  const { 
    serviceName, 
    minLogLevel = LogLevel.INFO, 
    enableTimestamps = true 
  } = config;
  
  const logLevelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };
  
  const shouldLog = (level: LogLevel): boolean => {
    return logLevelPriority[level] >= logLevelPriority[minLogLevel];
  };
  
  const formatMessage = (level: LogLevel, message: string): string => {
    const timestamp = enableTimestamps ? `[${new Date().toISOString()}]` : '';
    return `${timestamp} [${level}] [${serviceName}] ${message}`;
  };
  
  const formatData = (data: any): string | undefined => {
    if (!data) return undefined;
    try {
      return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    } catch (error) {
      return `[Error formatting data: ${error instanceof Error ? error.message : String(error)}]`;
    }
  };
  
  const log = (level: LogLevel, message: string, data?: any): void => {
    if (!shouldLog(level)) return;
    
    const formattedMessage = formatMessage(level, message);
    const formattedData = formatData(data);
    
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formattedMessage);
        if (formattedData) console.log(formattedData);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (formattedData) console.warn(formattedData);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (formattedData) console.error(formattedData);
        break;
    }
  };
  
  return {
    debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
    info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
    warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
    error: (message: string, data?: any) => log(LogLevel.ERROR, message, data)
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger({ serviceName: 'RefAgent' }); 
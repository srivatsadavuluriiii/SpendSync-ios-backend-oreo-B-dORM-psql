/**
 * Logger Utility
 * 
 * Simple logger for the settlement service
 */

const logger = {
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  info: (...args) => console.info(...args),
  debug: (...args) => console.debug(...args),
  log: (...args) => console.log(...args)
};

export { logger }; 
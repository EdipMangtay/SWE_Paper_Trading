// src/utils/logger.js
// Tiny logger wrapper. Consistent format, easy to swap for winston/pino later.

const ts = () => new Date().toISOString();
const silent = process.env.NODE_ENV === 'test';

const logger = {
  info:  (...a) => { if (!silent) console.log(`[${ts()}] [INFO ]`, ...a); },
  warn:  (...a) => { if (!silent) console.warn(`[${ts()}] [WARN ]`, ...a); },
  error: (...a) => { if (!silent) console.error(`[${ts()}] [ERROR]`, ...a); },
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production' && !silent) {
      console.log(`[${ts()}] [DEBUG]`, ...a);
    }
  }
};

module.exports = logger;

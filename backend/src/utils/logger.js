// src/utils/logger.js
// Tiny logger wrapper. Consistent format, easy to swap for winston/pino later.

const ts = () => new Date().toISOString();

const logger = {
  info:  (...a) => console.log(`[${ts()}] [INFO ]`, ...a),
  warn:  (...a) => console.warn(`[${ts()}] [WARN ]`, ...a),
  error: (...a) => console.error(`[${ts()}] [ERROR]`, ...a),
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${ts()}] [DEBUG]`, ...a);
    }
  }
};

module.exports = logger;

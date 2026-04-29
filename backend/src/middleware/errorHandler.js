// src/middleware/errorHandler.js
// Last-resort error handler. Mounted last so all uncaught errors land here.

const logger = require('../utils/logger');

function notFound(req, res, _next) {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const payload = { message: err.message || 'Internal server error' };
  if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;
  if (status >= 500) logger.error(err);
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };

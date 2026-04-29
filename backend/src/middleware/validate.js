// src/middleware/validate.js
// Wraps express-validator: collects validation errors into a 400 response.

const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, msg: e.msg }))
  });
}

module.exports = validate;

// Runs before each test file is loaded, before Jest framework is initialized.
// Sets process.env so config/env.js picks up deterministic values.

process.env.NODE_ENV       = 'test';
process.env.JWT_SECRET     = 'test_secret_change_in_production_at_least_32_chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.INITIAL_BALANCE = '100000';
process.env.MONGODB_URI    = ''; // explicit: tests connect to in-memory server directly

// Shared HTTP helpers for supertest-driven endpoint tests.

const request = require('supertest');
const app = require('../src/app');

async function registerUser(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const username = overrides.username ?? `u_${suffix}`;
  const email    = overrides.email    ?? `${username}@test.com`;
  const password = overrides.password ?? 'password123';

  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password });

  return { res, token: res.body.token, user: res.body.user, password, email, username };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { app, request, registerUser, auth };
